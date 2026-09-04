import { useEffect, useMemo, useState } from "react";
import { useMatchStore } from "@/lib/scoring/store";
import { lookup } from "@/lib/repositories";
import { useMatches, usePlayers, useTeams } from "@/hooks/useCricketData";
import type { BatterStat, BowlerStat, InningsState, Match, MatchState, Player, Team } from "@/types/cricket";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface ObsMatchStreamResult {
  match: Match | undefined;
  matchState: MatchState | undefined;
  currentInnings: InningsState | undefined;
  battingTeam: Team | undefined;
  bowlingTeam: Team | undefined;
  striker: Player | undefined;
  strikerStats: BatterStat | undefined;
  nonStriker: Player | undefined;
  nonStrikerStats: BatterStat | undefined;
  bowler: Player | undefined;
  bowlerStats: BowlerStat | undefined;
  recentBalls: InningsState["recentBalls"];
  loading: boolean;
  connected: boolean;
  isCompleted: boolean;
  error: string | null;
  reconnect: () => void;
}

/**
 * useObsMatchStream
 *
 * Dedicated real-time data hook for the OBS Browser Source overlay.
 * Composes the authoritative TPL scoring store, local BroadcastChannel,
 * and Supabase Realtime subscriptions to deliver zero-latency live broadcast updates.
 */
export function useObsMatchStream(matchId: string): ObsMatchStreamResult {
  const store = useMatchStore(matchId);
  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

  const [connected, setConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Diagnostic logging strictly scoped to route matchId
  useEffect(() => {
    if (!matchId) return;

    if (typeof window !== "undefined") {
      const activeMatch = store.match?.id === matchId ? store.match : undefined;
      const teamAName = activeMatch ? lookup.team(activeMatch.teamAId)?.name || activeMatch.teamAId : "undefined";
      const teamBName = activeMatch ? lookup.team(activeMatch.teamBId)?.name || activeMatch.teamBId : "undefined";
      const inn = store.state?.innings?.[store.state.currentInningsIndex] ?? store.state?.innings?.[0];
      const scoreStr = inn ? `${inn.runs}/${inn.wickets} (${inn.oversText} ov)` : "0/0 (0.0 ov)";

      console.log("[OBS] URL matchId =", matchId);
      console.log("[OBS] loaded matchId =", activeMatch?.id);
      console.log("[OBS] loaded match number =", activeMatch?.matchNumber);
      console.log("[OBS] team A =", teamAName);
      console.log("[OBS] team B =", teamBName);
      console.log("[OBS] score =", scoreStr);
      console.log("[OBS] innings =", inn?.index ?? 0);
    }
  }, [matchId, store.match, store.state]);

  // Monitor Supabase Realtime connection health and active sync handshake
  useEffect(() => {
    if (!matchId) return;

    const channelName = `match-live:${matchId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "score_update" }, ({ payload }) => {
        if (payload?.doc && payload.doc.matchId === matchId) {
          console.log("[OBS] realtime update received for matchId:", matchId);
          console.log("[OBS] scoreboard state updated");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[OBS] realtime subscription: SUBSCRIBED for matchId:", matchId);
          setConnected(true);
          setError(null);
          // Handshake: Request live match doc from active scorer on any origin / port
          channel.send({
            type: "broadcast",
            event: "request_sync",
            payload: { matchId },
          });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Strict match scoping: Ensure returned match belongs strictly to URL matchId, with instant fallback to tournament fixtures
  const match = (store.match?.id === matchId ? store.match : undefined) ?? matches.find((m) => m.id === matchId);
  const state = store.state;
  const hydrated = store.hydrated;

  // Derive current innings and active roles
  const currentInnings = useMemo(() => {
    if (!state || !state.innings || state.innings.length === 0) return undefined;
    return state.innings[state.currentInningsIndex] ?? state.innings[0];
  }, [state]);

  const battingTeam = useMemo(() => {
    if (!currentInnings?.battingTeamId) {
      return match ? lookup.team(match.teamAId) ?? teams.find((t) => t.id === match.teamAId) : undefined;
    }
    return lookup.team(currentInnings.battingTeamId) ?? teams.find((t) => t.id === currentInnings.battingTeamId);
  }, [currentInnings?.battingTeamId, match, teams]);

  const bowlingTeam = useMemo(() => {
    if (!currentInnings?.bowlingTeamId) {
      return match ? lookup.team(match.teamBId) ?? teams.find((t) => t.id === match.teamBId) : undefined;
    }
    return lookup.team(currentInnings.bowlingTeamId) ?? teams.find((t) => t.id === currentInnings.bowlingTeamId);
  }, [currentInnings?.bowlingTeamId, match, teams]);

  const activeStrikerId = useMemo(() => {
    return (
      currentInnings?.strikerId ||
      store.activeStrikerId ||
      store.doc?.pendingBatterIds?.[currentInnings?.index ?? 0]?.strikerId ||
      (currentInnings?.index === 1
        ? store.doc?.secondInningsOpeners?.strikerId || store.doc?.setup?.openers?.strikerId
        : store.doc?.setup?.openers?.strikerId)
    );
  }, [currentInnings?.strikerId, currentInnings?.index, store.doc, store.activeStrikerId]);

  const activeNonStrikerId = useMemo(() => {
    return (
      currentInnings?.nonStrikerId ||
      store.activeNonStrikerId ||
      store.doc?.pendingBatterIds?.[currentInnings?.index ?? 0]?.nonStrikerId ||
      (currentInnings?.index === 1
        ? store.doc?.secondInningsOpeners?.nonStrikerId || store.doc?.setup?.openers?.nonStrikerId
        : store.doc?.setup?.openers?.nonStrikerId)
    );
  }, [currentInnings?.nonStrikerId, currentInnings?.index, store.doc, store.activeNonStrikerId]);

  const activeBowlerId = useMemo(() => {
    return (
      currentInnings?.currentBowlerId ||
      store.activeBowlerId ||
      store.doc?.pendingBowlerIds?.[currentInnings?.index ?? 0] ||
      (currentInnings?.index === 1
        ? store.doc?.secondInningsOpeningBowlerId || store.doc?.setup?.openingBowlerId
        : store.doc?.setup?.openingBowlerId)
    );
  }, [currentInnings?.currentBowlerId, currentInnings?.index, store.doc, store.activeBowlerId]);

  const striker = useMemo(() => {
    if (!activeStrikerId) return undefined;
    return lookup.player(activeStrikerId) ?? players.find((p) => p.id === activeStrikerId);
  }, [activeStrikerId, players]);

  const strikerStats = useMemo(() => {
    if (!activeStrikerId) return undefined;
    return currentInnings?.batters?.find((b) => b.playerId === activeStrikerId);
  }, [activeStrikerId, currentInnings?.batters]);

  const nonStriker = useMemo(() => {
    if (!activeNonStrikerId) return undefined;
    return lookup.player(activeNonStrikerId) ?? players.find((p) => p.id === activeNonStrikerId);
  }, [activeNonStrikerId, players]);

  const nonStrikerStats = useMemo(() => {
    if (!activeNonStrikerId) return undefined;
    return currentInnings?.batters?.find((b) => b.playerId === activeNonStrikerId);
  }, [activeNonStrikerId, currentInnings?.batters]);

  const bowler = useMemo(() => {
    if (!activeBowlerId) return undefined;
    return lookup.player(activeBowlerId) ?? players.find((p) => p.id === activeBowlerId);
  }, [activeBowlerId, players]);

  const bowlerStats = useMemo(() => {
    if (!activeBowlerId) return undefined;
    return currentInnings?.bowlers?.find((b) => b.playerId === activeBowlerId);
  }, [activeBowlerId, currentInnings?.bowlers]);

  const recentBalls = useMemo(() => {
    return currentInnings?.recentBalls ?? [];
  }, [currentInnings]);

  const reconnect = () => {
    setConnected(true);
    setError(null);
  };

  const isCompleted = Boolean(
    match?.status === "COMPLETED" ||
    state?.phase === "complete" ||
    state?.isComplete ||
    store.doc?.isCompleted
  );

  return {
    match,
    matchState: state,
    currentInnings,
    battingTeam,
    bowlingTeam,
    striker,
    strikerStats,
    nonStriker,
    nonStrikerStats,
    bowler,
    bowlerStats,
    recentBalls,
    loading: !hydrated && !match,
    connected: connected || Boolean(match && hydrated) || (typeof window !== "undefined" && Boolean(window.BroadcastChannel)),
    isCompleted,
    error,
    reconnect,
  };
}
