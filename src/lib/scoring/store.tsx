import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BALLS_PER_OVER,
  type Delivery,
  type ExtraType,
  type Match,
  type MatchSetup,
  type MatchState,
  type WicketInfo,
} from "@/types/cricket";
import {
  buildMatchState,
  setPlayerNameResolver,
  setTeamNameResolver,
  setTeamPlayersResolver,
  validateBowlerEligibility,
} from "@/lib/scoring/engine";
import { lookup, matchRepository, playerRepository, teamRepository } from "@/lib/repositories";
import { supabase } from "@/lib/supabase";
import {
  ensureInningsPersisted,
  fetchMatchDeliveriesFromSupabase,
  persistBall,
  undoPersistedBall,
} from "@/lib/scoring/db-sync";

setTeamNameResolver((id) => lookup.team(id)?.name ?? id);
setPlayerNameResolver((id) => lookup.player(id)?.name ?? id);
setTeamPlayersResolver((id) => lookup.playersOf(id).map((p) => p.id));

export interface MatchDoc {
  matchId: string;
  setup: MatchSetup;
  deliveries: Delivery[];
  secondInningsStarted: boolean;
  secondInningsOpeners?: { strikerId: string; nonStrikerId: string };
  pendingBowlerIds: [string | null, string | null];
  pendingBatterIds?: [
    { strikerId?: string | null; nonStrikerId?: string | null } | null,
    { strikerId?: string | null; nonStrikerId?: string | null } | null,
  ];
  inningsDbIds?: [string | null, string | null];
  playerOfTheMatchId?: string;
  isStarted?: boolean;
  isCompleted?: boolean;
  startedAt?: string;
  syncQueue: string[];
  syncStatus?: "synced" | "syncing" | "unsynced" | "error";
  syncError?: string;
}

const STORAGE_PREFIX = "tpl-scoring:";

function emptyDoc(matchId: string): MatchDoc {
  return {
    matchId,
    setup: { playingXI: {} },
    deliveries: [],
    secondInningsStarted: false,
    pendingBowlerIds: [null, null],
    pendingBatterIds: [null, null],
    inningsDbIds: [null, null],
    syncQueue: [],
    syncStatus: "synced",
  };
}

export function loadMatchDoc(matchId: string, matchStatus?: MatchStatus): MatchDoc {
  if (typeof window === "undefined") return emptyDoc(matchId);
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + matchId);
    if (!raw) return emptyDoc(matchId);
    const parsed = JSON.parse(raw) as MatchDoc;
    if (matchStatus === "UPCOMING" || matchStatus === "READY") {
      if (parsed.isStarted || parsed.isCompleted || (parsed.deliveries && parsed.deliveries.length > 0)) {
        try {
          window.localStorage.removeItem(STORAGE_PREFIX + matchId);
        } catch {}
        return emptyDoc(matchId);
      }
    }
    return { ...emptyDoc(matchId), ...parsed };
  } catch {
    return emptyDoc(matchId);
  }
}

export function broadcastTournamentUpdate() {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel("tpl-global-tournament");
      bc.postMessage({ type: "tournament_updated", timestamp: Date.now() });
      bc.close();
    } catch {}
  }
  try {
    const channel = supabase.channel("tpl-tournament-matches");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "tournament_updated",
          payload: { timestamp: Date.now() },
        });
      }
    });
  } catch {}
}

export function startMatchSession(matchId: string) {
  if (typeof window === "undefined") return;
  const existing = loadMatchDoc(matchId);
  const next: MatchDoc = {
    ...existing,
    isStarted: true,
    isCompleted: false,
    startedAt: existing.startedAt || new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_PREFIX + matchId, JSON.stringify(next));
  } catch {}

  // 1. Authoritative DB status transition to LIVE
  matchRepository.updateStatus(matchId, "LIVE").catch((err) => {
    console.warn("[startMatchSession] DB status update notice:", err);
  });

  // 1b. Automatically trigger WhatsApp broadcast notification if active
  try {
    import("@/lib/whatsappService").then((mod) => {
      mod.notifyAutoMatchLive(matchId);
    }).catch(() => {});
  } catch {}

  // 2. Broadcast to other tabs & windows
  try {
    const bc = new BroadcastChannel(`tpl_match_${matchId}`);
    bc.postMessage(next);
    bc.close();
  } catch {}

  // 3. Broadcast to supabase realtime channel
  try {
    const channel = supabase.channel(`match-live:${matchId}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "score_update",
          payload: { doc: next },
        });
      }
    });
  } catch {}

  broadcastTournamentUpdate();
}

export interface DeliveryInput {
  batterRuns: number;
  extraRuns: number;
  extraType: ExtraType;
  wicket?: WicketInfo;
  shotZone?: string | null;
}

export function useMatchStore(matchId: string, initialMatch?: Match) {
  const [doc, setDoc] = useState<MatchDoc>(() => {
    const isUpcoming = initialMatch?.status === "UPCOMING" || initialMatch?.status === "READY";
    if (isUpcoming && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + matchId);
      } catch {}
      return emptyDoc(matchId);
    }
    return loadMatchDoc(matchId, initialMatch?.status);
  });
  const [matchData, setMatchData] = useState<Match | undefined>(
    initialMatch ?? lookup.match(matchId),
  );
  const [hydrated, setHydrated] = useState(false);
  const inningsDbIdsRef = useRef<[string | null, string | null]>([null, null]);
  const channelRef = useRef<any>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);


  // ── Load initial local storage state on mount or matchId change ───────────
  useEffect(() => {
    setHydrated(false);
    const m = initialMatch ?? lookup.match(matchId);
    setMatchData(m);
    inningsDbIdsRef.current = [null, null];
    const isUpcoming = m?.status === "UPCOMING" || m?.status === "READY";
    if (isUpcoming && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + matchId);
      } catch {}
      setDoc(emptyDoc(matchId));
    } else {
      const local = loadMatchDoc(matchId, m?.status);
      setDoc(local);
      if (local.inningsDbIds) {
        inningsDbIdsRef.current = local.inningsDbIds;
      }
    }
  }, [matchId, initialMatch]);

  // ── Preload match & team entities & rosters ───────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    async function preload() {
      try {
        let m = initialMatch ?? lookup.match(matchId);
        if (!m) {
          m = await matchRepository.get(matchId);
        }
        if (m && !isCancelled) {
          setMatchData(m);
          await Promise.all([
            teamRepository.get(m.teamAId),
            teamRepository.get(m.teamBId),
            playerRepository.listByTeam(m.teamAId),
            playerRepository.listByTeam(m.teamBId),
          ]);
        }
      } catch (err) {
        console.warn("[useMatchStore] preload entities notice:", err);
      }
    }

    preload();

    return () => {
      isCancelled = true;
    };
  }, [matchId, initialMatch]);

  // ── Reconcile authoritative scoring state from Supabase DB on load ────────
  useEffect(() => {
    if (!matchId) return;

    let isCancelled = false;

    async function syncFromDb() {
      try {
        const { deliveries, innings } = await fetchMatchDeliveriesFromSupabase(matchId);
        if (isCancelled) return;

        const inn1 = innings.find((i) => i.innings_number === 1);
        const inn2 = innings.find((i) => i.innings_number === 2);
        const dbInningsIds: [string | null, string | null] = [
          inn1?.id || null,
          inn2?.id || null,
        ];
        inningsDbIdsRef.current = dbInningsIds;

        setDoc((curr) => {
          // If DB has authoritative deliveries, reconcile with local state
          if (deliveries.length > 0) {
            const firstDeliv = deliveries.find((d) => d.inningsIndex === 0);
            const secondDeliv = deliveries.find((d) => d.inningsIndex === 1);
            const hasSecondInnings = deliveries.some((d) => d.inningsIndex === 1);

            const battingFirstId =
              curr.setup.battingFirstId ||
              inn1?.batting_team_id ||
              (firstDeliv?.strikerId ? lookup.player(firstDeliv.strikerId)?.teamId : undefined);

            const openers =
              curr.setup.openers ||
              (firstDeliv
                ? { strikerId: firstDeliv.strikerId, nonStrikerId: firstDeliv.nonStrikerId }
                : undefined);

            const openingBowlerId = curr.setup.openingBowlerId || firstDeliv?.bowlerId;

            const secondInningsOpeners =
              curr.secondInningsOpeners ||
              (secondDeliv
                ? { strikerId: secondDeliv.strikerId, nonStrikerId: secondDeliv.nonStrikerId }
                : undefined);

            const next: MatchDoc = {
              ...curr,
              deliveries,
              inningsDbIds: dbInningsIds,
              setup: {
                ...curr.setup,
                ...(battingFirstId ? { battingFirstId } : {}),
                ...(openers ? { openers } : {}),
                ...(openingBowlerId ? { openingBowlerId } : {}),
              },
              secondInningsStarted: curr.secondInningsStarted || hasSecondInnings,
              ...(secondInningsOpeners ? { secondInningsOpeners } : {}),
              isStarted: curr.isStarted || deliveries.length > 0,
              syncStatus: "synced",
            };
            try {
              window.localStorage.setItem(STORAGE_PREFIX + matchId, JSON.stringify(next));
            } catch {}
            return next;
          }

          if (dbInningsIds[0] || dbInningsIds[1]) {
            return {
              ...curr,
              inningsDbIds: dbInningsIds,
            };
          }

          return curr;
        });
      } catch (err) {
        console.warn("[useMatchStore] syncFromDb notice:", err);
      } finally {
        if (!isCancelled) {
          setHydrated(true);
        }
      }
    }

    syncFromDb();

    // Safety fallback: if DB sync takes too long or fails silently, unblock UI after 3s
    const fallbackTimer = setTimeout(() => {
      if (!isCancelled) setHydrated(true);
    }, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [matchId]);

  // ── Live Realtime Sync (Supabase Realtime Channel + BroadcastChannel + Storage)
  useEffect(() => {
    if (!matchId) return;

    // 1. Cross-device Realtime Broadcast Channel via Supabase
    const channelName = `match-live:${matchId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "score_update" }, ({ payload }) => {
        if (payload?.doc && payload.doc.matchId === matchId) {
          setDoc(payload.doc);
          if (payload.doc.inningsDbIds) {
            inningsDbIdsRef.current = payload.doc.inningsDbIds;
          }
          if (payload.match) {
            lookup.upsertMatch(payload.match);
            setMatchData((prev) => prev || payload.match);
          }
          try {
            window.localStorage.setItem(STORAGE_PREFIX + matchId, JSON.stringify(payload.doc));
          } catch {}
        }
      })
      .on("broadcast", { event: "request_sync" }, () => {
        // Scorer responds to remote clients (e.g. OBS on different origin) with current doc & match
        const localDoc = loadMatchDoc(matchId);
        const currentMatch = matchData || lookup.match(matchId);
        if (localDoc && currentMatch) {
          channel.send({
            type: "broadcast",
            event: "score_update",
            payload: { doc: localDoc, match: currentMatch },
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // If this client doesn't have deliveries yet (e.g. OBS client on another port), request sync
          channel.send({
            type: "broadcast",
            event: "request_sync",
            payload: { matchId },
          });
        }
      });

    channelRef.current = channel;

    // 2. Same-browser Instant Cross-Tab Sync via BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(`tpl_match_${matchId}`);
      bc.onmessage = (event) => {
        if (event.data && event.data.matchId === matchId) {
          setDoc(event.data);
          if (event.data.inningsDbIds) {
            inningsDbIdsRef.current = event.data.inningsDbIds;
          }
        }
      };
      bcRef.current = bc;
    }

    // 3. Fallback Storage Event Listener (for tabs in same origin)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + matchId && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.matchId === matchId) {
            setDoc(parsed);
            if (parsed.inningsDbIds) {
              inningsDbIdsRef.current = parsed.inningsDbIds;
            }
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (bcRef.current) {
        bcRef.current.close();
      }
    };
  }, [matchId, matchData]);

  // ── Broadcast doc helper (invoked on any scorer action) ────────────────────
  const broadcastDoc = useCallback(
    (newDoc: MatchDoc) => {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + matchId, JSON.stringify(newDoc));
      } catch {}

      // Broadcast to local tabs
      if (bcRef.current) {
        try {
          bcRef.current.postMessage(newDoc);
        } catch {}
      }

      // Broadcast to all remote clients over Supabase Realtime WebSocket
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: "broadcast",
            event: "score_update",
            payload: { doc: newDoc, match: matchData || lookup.match(matchId) },
          });
        } catch {}
      }
    },
    [matchId, matchData],
  );

  const match = matchData ?? lookup.match(matchId);

  const state: MatchState | undefined = useMemo(() => {
    if (!match) return undefined;
    return buildMatchState({
      match,
      setup: doc.setup,
      deliveries: doc.deliveries,
      secondInningsStarted: doc.secondInningsStarted,
      ...(doc.secondInningsOpeners ? { secondInningsOpeners: doc.secondInningsOpeners } : {}),
    });
  }, [match, doc]);

  const currentInningsIndex: 0 | 1 = state?.currentInningsIndex ?? 0;
  const innings = state?.innings[currentInningsIndex];
  const pendingBowlerId = doc.pendingBowlerIds[currentInningsIndex];
  const pendingBatters = doc.pendingBatterIds?.[currentInningsIndex];

  const currentInningsDeliveries = doc.deliveries.filter((d) => d.inningsIndex === currentInningsIndex);
  const isOverInProgress = innings ? innings.legalBalls % BALLS_PER_OVER !== 0 : false;
  const latestOverBowlerId =
    currentInningsDeliveries.length > 0 && isOverInProgress
      ? currentInningsDeliveries[currentInningsDeliveries.length - 1]?.bowlerId
      : undefined;

  const activeBowlerId =
    innings?.currentBowlerId ??
    latestOverBowlerId ??
    pendingBowlerId ??
    (innings?.legalBalls === 0 && currentInningsIndex === 0
      ? doc.setup.openingBowlerId ?? currentInningsDeliveries[0]?.bowlerId
      : undefined);

  const isNoBallsInnings = currentInningsDeliveries.length === 0;

  const activeStrikerId =
    innings?.strikerId ??
    pendingBatters?.strikerId ??
    (isNoBallsInnings
      ? currentInningsIndex === 0
        ? doc.setup.openers?.strikerId
        : doc.secondInningsOpeners?.strikerId
      : undefined);

  const activeNonStrikerId =
    innings?.nonStrikerId ??
    pendingBatters?.nonStrikerId ??
    (isNoBallsInnings
      ? currentInningsIndex === 0
        ? doc.setup.openers?.nonStrikerId
        : doc.secondInningsOpeners?.nonStrikerId
      : undefined);

  const updateSetup = useCallback(
    (patch: Partial<MatchSetup>) => {
      setDoc((d) => {
        const next = { ...d, setup: { ...d.setup, ...patch } };
        broadcastDoc(next);
        return next;
      });

      // If toss is updated, authoritatively persist toss info to matches table
      if (patch.tossWinnerId || patch.decision) {
        matchRepository
          .updateStatus(matchId, "LIVE", {
            tossWinnerId: patch.tossWinnerId,
            tossDecision: patch.decision,
          })
          .catch((err) => {
            console.warn("[updateSetup] toss persist notice:", err);
          });

        try {
          import("@/lib/whatsappService").then((mod) => {
            mod.notifyAutoMatchLive(matchId);
          }).catch(() => {});
        } catch {}
      }

      // If match overs are reduced/revised, authoritatively persist total_overs to matches table
      const revisedOvers = patch.secondInningsReducedOvers ?? patch.reducedOvers;
      if (typeof revisedOvers === "number" && revisedOvers > 0) {
        matchRepository
          .updateMatchOvers(matchId, revisedOvers)
          .then((updated) => {
            setMatchData(updated);
            broadcastTournamentUpdate();
          })
          .catch((err) => {
            console.warn("[updateSetup] overs persist notice:", err);
          });
      }
    },
    [matchId, broadcastDoc],
  );

  const adjustMatchOvers = useCallback(
    async (newOvers: number, reason?: string) => {
      if (newOvers < 1) return;

      setDoc((d) => {
        const isSecondInn = currentInningsIndex === 1 || d.secondInningsStarted;
        const nextSetup = {
          ...d.setup,
          reducedOvers: isSecondInn ? (d.setup.reducedOvers ?? match?.overs ?? 5) : newOvers,
          secondInningsReducedOvers: newOvers,
          targetRevisionReason: reason || undefined,
        };
        const next = { ...d, setup: nextSetup };
        broadcastDoc(next);
        return next;
      });

      try {
        const updated = await matchRepository.updateMatchOvers(matchId, newOvers);
        setMatchData(updated);
        broadcastTournamentUpdate();
      } catch (err) {
        console.warn("[adjustMatchOvers] persist error:", err);
      }
    },
    [matchId, currentInningsIndex, match?.overs, broadcastDoc],
  );

  const setBowler = useCallback(
    (bowlerId: string) => {
      setDoc((d) => {
        const nextPending: [string | null, string | null] = [...d.pendingBowlerIds] as [
          string | null,
          string | null,
        ];
        nextPending[currentInningsIndex] = bowlerId;
        const next = { ...d, pendingBowlerIds: nextPending };
        broadcastDoc(next);
        return next;
      });
    },
    [currentInningsIndex, broadcastDoc],
  );

  const setBatter = useCallback(
    (playerId: string, targetRole?: "striker" | "non-striker") => {
      setDoc((d) => {
        const currentIdx = state?.currentInningsIndex ?? 0;
        const currentInn = state?.innings[currentIdx];

        // Determine which slot needs this batter
        const role =
          targetRole ??
          (!currentInn?.strikerId ? "striker" : !currentInn?.nonStrikerId ? "non-striker" : "striker");

        // 1. If a wicket delivery exists in current innings, link the new batter to that wicket
        const currentDeliveries = d.deliveries;
        let lastWicketDeliveryIdx = -1;
        for (let i = currentDeliveries.length - 1; i >= 0; i--) {
          if (currentDeliveries[i].inningsIndex === currentIdx && currentDeliveries[i].wicket) {
            if (!currentDeliveries[i].wicket?.newBatterId) {
              lastWicketDeliveryIdx = i;
              break;
            }
          }
        }
        if (lastWicketDeliveryIdx === -1) {
          for (let i = currentDeliveries.length - 1; i >= 0; i--) {
            if (currentDeliveries[i].inningsIndex === currentIdx && currentDeliveries[i].wicket) {
              lastWicketDeliveryIdx = i;
              break;
            }
          }
        }

        let nextDeliveries = currentDeliveries;
        if (lastWicketDeliveryIdx !== -1) {
          nextDeliveries = currentDeliveries.map((deliv, i) =>
            i === lastWicketDeliveryIdx
              ? { ...deliv, wicket: { ...deliv.wicket!, newBatterId: playerId } }
              : deliv,
          );
        }

        // 2. Update pendingBatterIds
        const nextPendingBatters: [
          { strikerId?: string | null; nonStrikerId?: string | null } | null,
          { strikerId?: string | null; nonStrikerId?: string | null } | null,
        ] = [...(d.pendingBatterIds ?? [null, null])];

        const existingPending = nextPendingBatters[currentIdx] || {};
        nextPendingBatters[currentIdx] = {
          ...existingPending,
          [role === "striker" ? "strikerId" : "nonStrikerId"]: playerId,
        };

        // 3. Handle opening batters setup if no balls bowled yet
        let nextSetup = d.setup;
        let nextSecondOpeners = d.secondInningsOpeners;
        if (
          currentIdx === 0 &&
          (!d.setup.openers || !d.setup.openers.strikerId || !d.setup.openers.nonStrikerId)
        ) {
          const prev = d.setup.openers || { strikerId: "", nonStrikerId: "" };
          nextSetup = {
            ...d.setup,
            openers: {
              strikerId: role === "striker" ? playerId : prev.strikerId || playerId,
              nonStrikerId: role === "non-striker" ? playerId : prev.nonStrikerId || playerId,
            },
          };
        } else if (
          currentIdx === 1 &&
          (!d.secondInningsOpeners ||
            !d.secondInningsOpeners.strikerId ||
            !d.secondInningsOpeners.nonStrikerId)
        ) {
          const prev = d.secondInningsOpeners || { strikerId: "", nonStrikerId: "" };
          nextSecondOpeners = {
            strikerId: role === "striker" ? playerId : prev.strikerId || playerId,
            nonStrikerId: role === "non-striker" ? playerId : prev.nonStrikerId || playerId,
          };
        }

        const next: MatchDoc = {
          ...d,
          deliveries: nextDeliveries,
          pendingBatterIds: nextPendingBatters,
          setup: nextSetup,
          ...(nextSecondOpeners ? { secondInningsOpeners: nextSecondOpeners } : {}),
        };

        broadcastDoc(next);
        return next;
      });
    },
    [state?.currentInningsIndex, state?.innings, broadcastDoc],
  );

  const record = useCallback(
    (input: DeliveryInput) => {
      if (!match) return;

      const built = buildMatchState({
        match,
        setup: doc.setup,
        deliveries: doc.deliveries,
        secondInningsStarted: doc.secondInningsStarted,
        ...(doc.secondInningsOpeners ? { secondInningsOpeners: doc.secondInningsOpeners } : {}),
      });
      const idx = built.currentInningsIndex;
      const inn = built.innings[idx];
      if (!inn || inn.isComplete) return;

      const currentInnDeliveries = doc.deliveries.filter((d) => d.inningsIndex === idx);
      const innOverInProgress = inn.legalBalls % BALLS_PER_OVER !== 0;
      const latestInnBowlerId =
        currentInnDeliveries.length > 0 && innOverInProgress
          ? currentInnDeliveries[currentInnDeliveries.length - 1]?.bowlerId
          : undefined;

      const bowlerId =
        inn.currentBowlerId ??
        latestInnBowlerId ??
        doc.pendingBowlerIds[idx] ??
        (inn.legalBalls === 0 && idx === 0
          ? doc.setup.openingBowlerId ?? currentInnDeliveries[0]?.bowlerId
          : undefined);

      const strikerId =
        inn.strikerId ??
        doc.pendingBatterIds?.[idx]?.strikerId ??
        (currentInnDeliveries.length === 0
          ? idx === 0
            ? doc.setup.openers?.strikerId
            : doc.secondInningsOpeners?.strikerId
          : undefined);

      const nonStrikerId =
        inn.nonStrikerId ??
        doc.pendingBatterIds?.[idx]?.nonStrikerId ??
        (currentInnDeliveries.length === 0
          ? idx === 0
            ? doc.setup.openers?.nonStrikerId
            : doc.secondInningsOpeners?.nonStrikerId
          : undefined);

      if (!bowlerId || !strikerId || !nonStrikerId) return;

      // Disallow consecutive overs by the same bowler
      if (
        inn.needsBowler &&
        inn.previousBowlerId &&
        bowlerId === inn.previousBowlerId &&
        inn.overGroups.length > 0
      ) {
        return;
      }

      // Check bowler eligibility limits (1 over standard, max 1 bowler allowed 2 overs)
      const bowlerEligibility = validateBowlerEligibility(bowlerId, inn);
      if (!bowlerEligibility.canBowl && !innOverInProgress) {
        console.error(`[useMatchStore.record] Blocked: ${bowlerEligibility.reason}`);
        return;
      }

      // STRICT MULTI-LEVEL VALIDATION: Fielder is mandatory for Caught, Run Out, Stumped
      if (
        input.wicket &&
        (input.wicket.type === "Caught" || input.wicket.type === "Run Out" || input.wicket.type === "Stumped")
      ) {
        if (!input.wicket.fielderId || input.wicket.fielderId.trim() === "") {
          console.error(`[useMatchStore.record] Blocked: Fielder is strictly mandatory for ${input.wicket.type}.`);
          return;
        }
      }

      const clientTimestamp = Date.now();
      const delivery: Delivery = {
        id: `${clientTimestamp}-${Math.random().toString(36).slice(2, 8)}`,
        inningsIndex: idx,
        bowlerId,
        strikerId,
        nonStrikerId,
        batterRuns: input.batterRuns,
        extraRuns: input.extraRuns,
        extraType: input.extraType,
        ...(input.wicket ? { wicket: input.wicket } : {}),
        shotZone: input.shotZone ?? "unmapped",
        timestamp: clientTimestamp,
      };

      const isLegalBall = input.extraType !== "wide" && input.extraType !== "noball";
      const willCompleteOver = isLegalBall && (inn.legalBalls + 1) % BALLS_PER_OVER === 0;

      // When over completes, clear pendingBowlerId so next over forces bowler change
      const nextPending: [string | null, string | null] = [...doc.pendingBowlerIds] as [
        string | null,
        string | null,
      ];
      if (willCompleteOver) {
        nextPending[idx] = null;
      }

      // Clear pending batter since ball has been successfully formed
      const nextPendingBatters: [
        { strikerId?: string | null; nonStrikerId?: string | null } | null,
        { strikerId?: string | null; nonStrikerId?: string | null } | null,
      ] = [...(doc.pendingBatterIds ?? [null, null])];
      nextPendingBatters[idx] = null;

      // Compute resulting state for DB totals
      const projectedDeliveries = [...doc.deliveries, delivery];
      const nextBuilt = buildMatchState({
        match,
        setup: doc.setup,
        deliveries: projectedDeliveries,
        secondInningsStarted: doc.secondInningsStarted,
        ...(doc.secondInningsOpeners ? { secondInningsOpeners: doc.secondInningsOpeners } : {}),
      });
      const nextInn = nextBuilt.innings[idx];

      const nextDoc: MatchDoc = {
        ...doc,
        pendingBowlerIds: nextPending,
        pendingBatterIds: nextPendingBatters,
        deliveries: projectedDeliveries,
        syncQueue: [...doc.syncQueue, delivery.id],
        syncStatus: "syncing",
      };

      // 1. Instant optimistic state update + local broadcast
      setDoc(nextDoc);
      broadcastDoc(nextDoc);

      // 2. Asynchronously persist delivery to Supabase DB
      const overNumber = Math.floor(inn.legalBalls / BALLS_PER_OVER) + 1;
      const ballNumber = (inn.legalBalls % BALLS_PER_OVER) + 1;

      const battingTeamId = inn.battingTeamId;
      const bowlingTeamId = inn.bowlingTeamId;

      (async () => {
        try {
          // Ensure innings row exists in Supabase
          let inningsId = inningsDbIdsRef.current[idx];
          if (!inningsId) {
            const dbInnings = await ensureInningsPersisted(
              match.id,
              (idx + 1) as 1 | 2,
              battingTeamId,
              bowlingTeamId,
            );
            inningsId = dbInnings.id;
            inningsDbIdsRef.current[idx] = inningsId;
          }

          // Persist ball delivery record to balls table
          const res = await persistBall({
            matchId: match.id,
            inningsId,
            clientTimestamp,
            overNumber,
            ballNumber,
            strikerId: delivery.strikerId,
            nonStrikerId: delivery.nonStrikerId,
            bowlerId: delivery.bowlerId,
            runsOffBat: delivery.batterRuns,
            extras: delivery.extraRuns,
            extraType: delivery.extraType,
            wicket: delivery.wicket,
            shotZone: delivery.shotZone,
            totalRuns: nextInn?.runs ?? 0,
            totalWickets: nextInn?.wickets ?? 0,
            oversCompleted: nextInn?.legalBalls ? Number((nextInn.legalBalls / BALLS_PER_OVER).toFixed(2)) : 0,
            isInningsComplete: nextInn?.isComplete,
          });

          // Confirm DB persistence success
          setDoc((current) => {
            const updated = {
              ...current,
              inningsDbIds: inningsDbIdsRef.current,
              syncQueue: current.syncQueue.filter((id) => id !== delivery.id),
              syncStatus: "synced" as const,
              syncError: undefined,
            };
            broadcastDoc(updated);
            return updated;
          });
        } catch (err: any) {
          console.error("[useMatchStore] DB delivery persistence error:", err?.message);
          setDoc((current) => ({
            ...current,
            syncStatus: "error",
            syncError: "UNABLE TO SAVE SCORE TO DATABASE",
          }));
        }
      })();
    },
    [match, doc, broadcastDoc],
  );

  const undo = useCallback(() => {
    if (!match || doc.deliveries.length === 0) return;

    const last = doc.deliveries[doc.deliveries.length - 1]!;
    const remaining = doc.deliveries.slice(0, -1);

    const built = buildMatchState({
      match,
      setup: doc.setup,
      deliveries: remaining,
      secondInningsStarted: doc.secondInningsStarted,
      ...(doc.secondInningsOpeners ? { secondInningsOpeners: doc.secondInningsOpeners } : {}),
    });
    const inn = built.innings[last.inningsIndex];

    const nextDoc: MatchDoc = {
      ...doc,
      deliveries: remaining,
      syncQueue: doc.syncQueue.filter((id) => id !== last.id),
      syncStatus: "syncing",
    };

    setDoc(nextDoc);
    broadcastDoc(nextDoc);

    const inningsId = inningsDbIdsRef.current[last.inningsIndex];
    if (inningsId) {
      undoPersistedBall({
        inningsId,
        clientTimestamp: last.timestamp,
        totalRuns: inn?.score ?? 0,
        totalWickets: inn?.wickets ?? 0,
        oversCompleted: inn?.overs ?? 0,
        isInningsComplete: inn?.isComplete,
      })
        .then(() => {
          setDoc((curr) => {
            const updated = { ...curr, syncStatus: "synced" as const };
            broadcastDoc(updated);
            return updated;
          });
        })
        .catch((err) => {
          console.warn("[undo] server undo notice:", err?.message);
        });
    }
  }, [match, doc, broadcastDoc]);

  const editDelivery = useCallback(
    (deliveryId: string, patch: Partial<Delivery>) => {
      setDoc((d) => {
        const next = {
          ...d,
          deliveries: d.deliveries.map((x) => (x.id === deliveryId ? { ...x, ...patch } : x)),
          syncQueue: d.syncQueue.includes(deliveryId) ? d.syncQueue : [...d.syncQueue, deliveryId],
        };
        broadcastDoc(next);
        return next;
      });
    },
    [broadcastDoc],
  );

  const setPlayerOfTheMatch = useCallback(
    (playerId: string) => {
      setDoc((d) => {
        const next = { ...d, playerOfTheMatchId: playerId };
        broadcastDoc(next);
        lookup.updateMatch(matchId, { manOfTheMatchId: playerId });
        matchRepository
          .updateStatus(matchId, undefined, { manOfTheMatchId: playerId })
          .catch((err) => {
            console.warn("[setPlayerOfTheMatch] DB update notice:", err);
          });
        return next;
      });
    },
    [matchId, broadcastDoc],
  );

  const completeMatch = useCallback(
    (resultText?: string) => {
      setDoc((d) => {
        const next = { ...d, isCompleted: true };
        broadcastDoc(next);
        lookup.updateMatch(matchId, {
          status: "COMPLETED",
          resultText: resultText ?? state?.resultText,
          manOfTheMatchId: d.playerOfTheMatchId,
        });

        // Authoritatively persist COMPLETED status to Supabase DB
        matchRepository
          .updateStatus(matchId, "COMPLETED", {
            manOfTheMatchId: d.playerOfTheMatchId,
          })
          .catch((err) => {
            console.warn("[completeMatch] DB completion notice:", err);
          });

        broadcastTournamentUpdate();
        return next;
      });
    },
    [matchId, state?.resultText, broadcastDoc],
  );

  const startSecondInnings = useCallback(
    (openers: { strikerId: string; nonStrikerId: string }) => {
      setDoc((d) => {
        const next = { ...d, secondInningsStarted: true, secondInningsOpeners: openers };
        broadcastDoc(next);
        return next;
      });
    },
    [broadcastDoc],
  );

  const reset = useCallback(() => {
    const empty = emptyDoc(matchId);
    setDoc(empty);
    broadcastDoc(empty);
  }, [matchId, broadcastDoc]);

  // Keep lookup cache synchronized with completed state
  useEffect(() => {
    if (state?.phase === "complete" || doc.isCompleted) {
      lookup.updateMatch(matchId, {
        status: "COMPLETED",
        resultText: state?.resultText,
        manOfTheMatchId: doc.playerOfTheMatchId,
      });
    }
  }, [matchId, state?.phase, state?.resultText, doc.isCompleted, doc.playerOfTheMatchId]);

  return {
    doc,
    hydrated,
    match,
    state,
    innings,
    activeBowlerId,
    activeStrikerId,
    activeNonStrikerId,
    updateSetup,
    adjustMatchOvers,
    setBowler,
    setBatter,
    record,
    undo,
    editDelivery,
    startSecondInnings,
    setPlayerOfTheMatch,
    completeMatch,
    reset,
  };
}

export type MatchStore = ReturnType<typeof useMatchStore>;
