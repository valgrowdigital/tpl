import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ObsMatchStreamResult } from "@/hooks/useObsMatchStream";
import { BALLS_PER_OVER } from "@/types/cricket";
import { lookup } from "@/lib/repositories";
import { usePlayers, useTeams, useMatches } from "@/hooks/useCricketData";
import { calculateTournamentStats } from "@/lib/scoring/statistics";
import { oversText } from "@/lib/scoring/engine";

export type ObsBroadcastEvent =
  | {
      id: string;
      type: "FOUR";
      priority: number;
      durationMs: number;
      batterName: string;
      runs: number;
      balls: number;
      tournamentTotalFours?: number;
    }
  | {
      id: string;
      type: "SIX";
      priority: number;
      durationMs: number;
      batterName: string;
      runs: number;
      balls: number;
      tournamentTotalSixes?: number;
    }
  | {
      id: string;
      type: "NO_BALL";
      priority: number;
      durationMs: number;
      bowlerName: string;
      freeHitNext: boolean;
      runs: number;
    }
  | {
      id: string;
      type: "WICKET";
      priority: number;
      durationMs: number;
      batterName: string;
      dismissalType: string;
      dismissalText: string;
      bowlerName: string;
      fielderName?: string;
      runs: number;
      balls: number;
    }
  | {
      id: string;
      type: "FIFTY";
      priority: number;
      durationMs: number;
      batterName: string;
      runs: number;
      balls: number;
    }
  | {
      id: string;
      type: "CENTURY";
      priority: number;
      durationMs: number;
      batterName: string;
      runs: number;
      balls: number;
    }
  | {
      id: string;
      type: "TEAM_MILESTONE";
      priority: number;
      durationMs: number;
      teamName: string;
      milestoneRuns: number;
      oversText: string;
      scoreText: string;
      crr: number;
    }
  | {
      id: string;
      type: "NEW_BATTER";
      priority: number;
      durationMs: number;
      batterName: string;
      teamName?: string;
      role?: string;
      avatar?: string;
      stats?: string;
    }
  | {
      id: string;
      type: "NEW_BOWLER";
      priority: number;
      durationMs: number;
      bowlerName: string;
      teamName?: string;
      role?: string;
      avatar?: string;
      figures?: string;
    }
  | {
      id: string;
      type: "OVER_COMPLETE";
      priority: number;
      durationMs: number;
      overNumber: number;
      runs: number;
      wickets: number;
      crr: number;
    }
  | {
      id: string;
      type: "MATCH_START";
      priority: number;
      durationMs: number;
      teamAName: string;
      teamBName: string;
      matchNumber: number;
      venue: string;
      overs: number;
    }
  | {
      id: string;
      type: "PARTNERSHIP";
      priority: number;
      durationMs: number;
      milestoneRuns: number;
      batterAId: string;
      batterAName: string;
      batterARuns: number;
      batterABalls: number;
      batterAFours: number;
      batterASixes: number;
      batterAAvatar?: string;
      batterBId: string;
      batterBName: string;
      batterBRuns: number;
      batterBBalls: number;
      batterBFours: number;
      batterBSixes: number;
      batterBAvatar?: string;
      totalRuns: number;
      totalBalls: number;
    }
  | {
      id: string;
      type: "INNINGS_BREAK";
      priority: number;
      durationMs: number;
      battingTeamName: string;
      runs: number;
      wickets: number;
      oversText: string;
      target?: number;
    }
  | {
      id: string;
      type: "MATCH_RESULT";
      priority: number;
      durationMs: number;
      resultText: string;
      winnerName?: string;
    };

// Priority map (Higher number = higher priority)
// Immediate ball events (WICKET, SIX, FOUR, NO_BALL) execute FIRST, followed by milestones (CENTURY, FIFTY, PARTNERSHIP)
const EVENT_PRIORITIES = {
  MATCH_RESULT: 100,
  INNINGS_BREAK: 95,
  WICKET: 90,
  SIX: 85,
  FOUR: 80,
  NO_BALL: 75,
  CENTURY: 65,
  FIFTY: 60,
  PARTNERSHIP: 55,
  TEAM_MILESTONE: 50,
  OVER_COMPLETE: 35,
  NEW_BATTER: 30,
  NEW_BOWLER: 25,
  MATCH_START: 10,
};

export function getCustomEventDuration(baseMs: number): number {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("tpl_obs_event_duration_ms");
      if (stored) {
        const val = Number(stored);
        if (!isNaN(val) && val >= 500 && val <= 60000) return val;
      }
    } catch {}
  }
  return baseMs;
}

export function useObsMatchEvents(stream: ObsMatchStreamResult) {
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers();
  const { data: teams = [] } = useTeams();

  const [currentEvent, setCurrentEvent] = useState<ObsBroadcastEvent | null>(null);
  const queueRef = useRef<ObsBroadcastEvent[]>([]);

  // Tournament-wide boundary statistics
  const tournamentStats = useMemo(() => {
    return calculateTournamentStats(matches);
  }, [matches]);

  // State refs to detect genuine transitions
  const lastMatchIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const processedDeliveryIdsRef = useRef<Set<string>>(new Set());
  const milestonesReachedRef = useRef<Set<string>>(new Set());
  const lastActiveBowlerIdRef = useRef<string | null>(null);
  const lastStrikerIdRef = useRef<string | null>(null);
  const lastNonStrikerIdRef = useRef<string | null>(null);
  const knownActiveBatterIdsRef = useRef<Set<string>>(new Set());
  const lastCompletedOverRef = useRef<number>(-1);
  const lastPhaseRef = useRef<string | null>(null);

  const getPlayerName = useCallback(
    (id?: string) => {
      if (!id) return "";
      return lookup.player(id)?.name || players.find((p) => p.id === id)?.name || id;
    },
    [players]
  );

  const getPlayerRole = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      return lookup.player(id)?.role || players.find((p) => p.id === id)?.role;
    },
    [players]
  );

  const getPlayerAvatar = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const p = lookup.player(id) || players.find((p) => p.id === id);
      return p?.avatar || (p as any)?.avatarUrl || undefined;
    },
    [players]
  );

  // Queue runner
  const processNextEvent = useCallback(() => {
    if (queueRef.current.length === 0) {
      setCurrentEvent(null);
      return;
    }

    // Sort queue by priority descending
    queueRef.current.sort((a, b) => b.priority - a.priority);
    const next = queueRef.current.shift()!;
    setCurrentEvent(next);

    setTimeout(() => {
      processNextEvent();
    }, next.durationMs);
  }, []);

  const enqueueEvent = useCallback(
    (event: ObsBroadcastEvent) => {
      if (queueRef.current.some((e) => e.id === event.id) || currentEvent?.id === event.id) {
        return;
      }

      queueRef.current.push(event);
      if (!currentEvent) {
        processNextEvent();
      }
    },
    [currentEvent, processNextEvent]
  );

  // Event Detection Engine
  useEffect(() => {
    if (!stream.matchState || stream.loading) return;

    // Reset all event state if match changes
    const currentMatchId = stream.match?.id || null;
    if (lastMatchIdRef.current !== currentMatchId) {
      lastMatchIdRef.current = currentMatchId;
      isInitializedRef.current = false;
      processedDeliveryIdsRef.current.clear();
      milestonesReachedRef.current.clear();
      knownActiveBatterIdsRef.current.clear();
      lastActiveBowlerIdRef.current = null;
      lastStrikerIdRef.current = null;
      lastNonStrikerIdRef.current = null;
      lastCompletedOverRef.current = -1;
      lastPhaseRef.current = null;
      queueRef.current = [];
      setCurrentEvent(null);
    }

    const { matchState, currentInnings } = stream;
    const innDeliveries = (matchState.innings || []).flatMap((inn) => (inn.overGroups || []).flatMap((og) => (og.balls || []).map((b) => b.delivery))).filter(Boolean);
    const recentDeliveries = (currentInnings?.recentBalls || []).map((b) => b.delivery).filter(Boolean);

    // Deduplicate all active deliveries by id
    const deliveryMap = new Map<string, typeof innDeliveries[0]>();
    [...innDeliveries, ...recentDeliveries].forEach((d) => {
      if (d?.id) deliveryMap.set(d.id, d);
    });
    const allDeliveries = Array.from(deliveryMap.values());

    // ── INITIAL MOUNT HYDRATION (Do NOT play historical animations on refresh) ──
    if (!isInitializedRef.current) {
      allDeliveries.forEach((d) => {
        if (d?.id) processedDeliveryIdsRef.current.add(d.id);
      });

      // Hydrate historical milestones
      matchState.innings.forEach((inn, innIdx) => {
        inn.batters.forEach((b) => {
          if (b.runs >= 50) milestonesReachedRef.current.add(`${innIdx}-${b.playerId}-50`);
          if (b.runs >= 100) milestonesReachedRef.current.add(`${innIdx}-${b.playerId}-100`);
        });
        [50, 75, 100, 125, 150, 200].forEach((m) => {
          if (inn.runs >= m) milestonesReachedRef.current.add(`team-milestone-${innIdx}-${m}`);
        });
      });

      if (currentInnings?.currentBowlerId) {
        lastActiveBowlerIdRef.current = currentInnings.currentBowlerId;
      }

      if (allDeliveries.length > 0) {
        // Only mark batters who have actually faced balls as already seen
        currentInnings?.batters?.forEach((b) => {
          if (b.balls > 0) {
            knownActiveBatterIdsRef.current.add(b.playerId);
          }
        });
        if (currentInnings?.strikerId) lastStrikerIdRef.current = currentInnings.strikerId;
        if (currentInnings?.nonStrikerId) lastNonStrikerIdRef.current = currentInnings.nonStrikerId;
      }

      lastCompletedOverRef.current = Math.floor(
        currentInnings?.legalBalls ? currentInnings.legalBalls / BALLS_PER_OVER : 0,
      );
      lastPhaseRef.current = matchState.phase;

      isInitializedRef.current = true;
      return;
    }

    // ── 1. MATCH RESULT DETECTION ───────────────────────────────────────────
    if (matchState.phase === "complete" && lastPhaseRef.current !== "complete" && matchState.resultText) {
      lastPhaseRef.current = "complete";
      enqueueEvent({
        id: `match-result-${stream.match?.id}`,
        type: "MATCH_RESULT",
        priority: EVENT_PRIORITIES.MATCH_RESULT,
        durationMs: getCustomEventDuration(5000),
        resultText: matchState.resultText,
        winnerName: stream.match?.winnerId ? lookup.team(stream.match.winnerId)?.name : undefined,
      });
    }

    // ── 2. INNINGS BREAK DETECTION ──────────────────────────────────────────
    if (matchState.phase === "break" && lastPhaseRef.current !== "break") {
      lastPhaseRef.current = "break";
      const inn1 = matchState.innings[0];
      const team1 = lookup.team(inn1?.battingTeamId) ?? teams.find((t) => t.id === inn1?.battingTeamId);
      enqueueEvent({
        id: `innings-break-${stream.match?.id}`,
        type: "INNINGS_BREAK",
        priority: EVENT_PRIORITIES.INNINGS_BREAK,
        durationMs: getCustomEventDuration(6000),
        battingTeamName: team1?.name || "1st Innings",
        runs: inn1?.runs ?? 0,
        wickets: inn1?.wickets ?? 0,
        oversText: inn1?.oversText ?? "5.0",
        target: matchState.innings[1]?.target,
      });
    }

    // ── 3. DELIVERY EVENTS (NO BALL, WICKET, SIX, FOUR, MILESTONES) ──────────
    const newDeliveries = allDeliveries.filter((d) => d?.id && !processedDeliveryIdsRef.current.has(d.id));

    newDeliveries.forEach((deliv) => {
      processedDeliveryIdsRef.current.add(deliv.id);

      const batterId = deliv.strikerId || currentInnings?.strikerId;
      const batter = getPlayerName(batterId) || "BATTER";
      const bowler = getPlayerName(deliv.bowlerId);
      const batterStats = currentInnings?.batters?.find((b) => b.playerId === batterId);
      const runs = batterStats?.runs ?? Number(deliv.batterRuns ?? 0);
      const balls = batterStats?.balls ?? 1;
      const bRuns = Number(deliv.batterRuns ?? 0);

      // Check for NO BALL
      if (deliv.extraType === "noball") {
        enqueueEvent({
          id: `noball-${deliv.id}`,
          type: "NO_BALL",
          priority: EVENT_PRIORITIES.NO_BALL,
          durationMs: getCustomEventDuration(3500),
          bowlerName: bowler,
          freeHitNext: true,
          runs: (deliv.extraRuns ?? 1) + (deliv.batterRuns ?? 0),
        });
      }

      // WICKET Takes Top Delivery Priority
      if (deliv.wicket) {
        const outPlayerName = getPlayerName(deliv.wicket.batterOutId);
        const fielderName = deliv.wicket.fielderId ? getPlayerName(deliv.wicket.fielderId) : undefined;
        let dismissalText = deliv.wicket.type.toUpperCase();

        if (deliv.wicket.type === "Caught" && fielderName) {
          dismissalText = `c ${fielderName} b ${bowler}`;
        } else if (deliv.wicket.type === "Bowled") {
          dismissalText = `b ${bowler}`;
        } else if (deliv.wicket.type === "LBW") {
          dismissalText = `lbw b ${bowler}`;
        } else if (deliv.wicket.type === "Run Out") {
          dismissalText = fielderName ? `run out (${fielderName})` : "run out";
        } else if (deliv.wicket.type === "Stumped" && fielderName) {
          dismissalText = `st ${fielderName} b ${bowler}`;
        }

        enqueueEvent({
          id: `wicket-${deliv.id}`,
          type: "WICKET",
          priority: EVENT_PRIORITIES.WICKET,
          durationMs: getCustomEventDuration(4000),
          batterName: outPlayerName,
          dismissalType: deliv.wicket.type,
          dismissalText,
          bowlerName: bowler,
          fielderName,
          runs,
          balls,
        });
      } else if (bRuns === 6) {
        enqueueEvent({
          id: `six-${deliv.id}`,
          type: "SIX",
          priority: EVENT_PRIORITIES.SIX,
          durationMs: getCustomEventDuration(3800),
          batterName: batter,
          runs,
          balls,
          tournamentTotalSixes: (tournamentStats?.totalSixes ?? 0) + 1,
        });
      } else if (bRuns === 4) {
        enqueueEvent({
          id: `four-${deliv.id}`,
          type: "FOUR",
          priority: EVENT_PRIORITIES.FOUR,
          durationMs: getCustomEventDuration(3500),
          batterName: batter,
          runs,
          balls,
          tournamentTotalFours: (tournamentStats?.totalFours ?? 0) + 1,
        });
      }

      // Check Batting Milestones (50 / 100)
      if (currentInnings) {
        const innIdx = currentInnings.index;
        if (runs >= 100 && !milestonesReachedRef.current.has(`${innIdx}-${deliv.strikerId}-100`)) {
          milestonesReachedRef.current.add(`${innIdx}-${deliv.strikerId}-100`);
          enqueueEvent({
            id: `century-${innIdx}-${deliv.strikerId}`,
            type: "CENTURY",
            priority: EVENT_PRIORITIES.CENTURY,
            durationMs: getCustomEventDuration(3200),
            batterName: batter,
            runs,
            balls,
          });
        } else if (runs >= 50 && !milestonesReachedRef.current.has(`${innIdx}-${deliv.strikerId}-50`)) {
          milestonesReachedRef.current.add(`${innIdx}-${deliv.strikerId}-50`);
          enqueueEvent({
            id: `fifty-${innIdx}-${deliv.strikerId}`,
            type: "FIFTY",
            priority: EVENT_PRIORITIES.FIFTY,
            durationMs: getCustomEventDuration(3000),
            batterName: batter,
            runs,
            balls,
          });
        }
      }
    });

    // ── 4. TEAM SCORE MILESTONES (50, 75, 100, 125, 150, 200 Runs) ─────────
    if (currentInnings) {
      const innIdx = currentInnings.index;
      const battingTeam = lookup.team(currentInnings.battingTeamId) || teams.find((t) => t.id === currentInnings.battingTeamId);
      const teamMilestones = [50, 75, 100, 125, 150, 200];

      teamMilestones.forEach((m) => {
        const key = `team-milestone-${innIdx}-${m}`;
        if (currentInnings.runs >= m && !milestonesReachedRef.current.has(key)) {
          milestonesReachedRef.current.add(key);
          enqueueEvent({
            id: key,
            type: "TEAM_MILESTONE",
            priority: EVENT_PRIORITIES.TEAM_MILESTONE,
            durationMs: getCustomEventDuration(3800),
            teamName: battingTeam?.name || "Batting Team",
            milestoneRuns: m,
            oversText: `${currentInnings.oversText} Overs`,
            scoreText: `${currentInnings.runs}/${currentInnings.wickets}`,
            crr: currentInnings.crr,
          });
        }
      });
    }

    // ── 5. OVER COMPLETE DETECTION ──────────────────────────────────────────
    if (currentInnings && currentInnings.legalBalls > 0 && currentInnings.legalBalls % BALLS_PER_OVER === 0) {
      const completedOver = currentInnings.legalBalls / BALLS_PER_OVER;
      if (completedOver > lastCompletedOverRef.current) {
        lastCompletedOverRef.current = completedOver;
        enqueueEvent({
          id: `over-complete-${currentInnings.index}-${completedOver}`,
          type: "OVER_COMPLETE",
          priority: EVENT_PRIORITIES.OVER_COMPLETE,
          durationMs: getCustomEventDuration(2200),
          overNumber: completedOver,
          runs: currentInnings.runs,
          wickets: currentInnings.wickets,
          crr: currentInnings.crr,
        });
      }
    }

    // ── 5b. NEW BOWLER INTRO POPUP (After Over Completion or Opening Bowler) ──
    const activeBowler = stream.bowler;
    if (activeBowler?.id && activeBowler.id !== lastActiveBowlerIdRef.current) {
      const bowlerId = activeBowler.id;
      lastActiveBowlerIdRef.current = bowlerId;

      const bowlingTeam = lookup.team(currentInnings?.bowlingTeamId) || teams.find((t) => t.id === currentInnings?.bowlingTeamId);
      const bStat = currentInnings?.bowlers?.find((b) => b.playerId === bowlerId);
      const figures = bStat ? `${bStat.wickets}/${bStat.runs} (${oversText(bStat.legalBalls)})` : undefined;

      enqueueEvent({
        id: `new-bowler-${bowlerId}-${Date.now()}`,
        type: "NEW_BOWLER",
        priority: EVENT_PRIORITIES.NEW_BOWLER,
        durationMs: getCustomEventDuration(3800),
        bowlerName: getPlayerName(bowlerId),
        teamName: bowlingTeam?.name,
        role: getPlayerRole(bowlerId) || "Bowler",
        avatar: getPlayerAvatar(bowlerId),
        figures,
      });
    }

    // ── 6. NEW BATTER AT THE CREASE DETECTION ───────────────────────────────
    if (currentInnings) {
      const battingTeam = lookup.team(currentInnings.battingTeamId) || teams.find((t) => t.id === currentInnings.battingTeamId);
      
      const checkBatterEntry = (batterId?: string, isStriker = true) => {
        if (!batterId) return;
        const lastId = isStriker ? lastStrikerIdRef.current : lastNonStrikerIdRef.current;
        const isNewSlot = batterId !== lastId;
        if (isStriker) lastStrikerIdRef.current = batterId;
        else lastNonStrikerIdRef.current = batterId;

        if (!knownActiveBatterIdsRef.current.has(batterId) || isNewSlot) {
          knownActiveBatterIdsRef.current.add(batterId);
          const batterStats = currentInnings.batters.find((b) => b.playerId === batterId);
          if ((batterStats?.balls ?? 0) <= 1) {
            enqueueEvent({
              id: `new-batter-${batterId}-${Date.now()}`,
              type: "NEW_BATTER",
              priority: EVENT_PRIORITIES.NEW_BATTER,
              durationMs: getCustomEventDuration(4200),
              batterName: getPlayerName(batterId),
              teamName: battingTeam?.name,
              role: getPlayerRole(batterId) && getPlayerRole(batterId) !== "Unspecified" ? getPlayerRole(batterId) : undefined,
              avatar: getPlayerAvatar(batterId),
            });
          }
        }
      };

      checkBatterEntry(stream.striker?.id || currentInnings.strikerId, true);
      checkBatterEntry(stream.nonStriker?.id || currentInnings.nonStrikerId, false);
    }

    // ── 7. PARTNERSHIP MILESTONE DETECTION (30, 50, 75, 100, 150 runs) ──────
    if (currentInnings?.partnership && currentInnings.partnership.runs >= 30) {
      const p = currentInnings.partnership;
      const bA = p.batterAId;
      const bB = p.batterBId;
      const innIdx = currentInnings.index;
      const milestones = [30, 50, 75, 100, 150];

      milestones.forEach((m) => {
        const mKey = `partnership-${innIdx}-${bA}-${bB}-${m}`;
        if (p.runs >= m && !milestonesReachedRef.current.has(mKey)) {
          milestonesReachedRef.current.add(mKey);
          const statA = currentInnings.batters.find((b) => b.playerId === bA);
          const statB = currentInnings.batters.find((b) => b.playerId === bB);
          enqueueEvent({
            id: mKey,
            type: "PARTNERSHIP",
            priority: EVENT_PRIORITIES.PARTNERSHIP,
            durationMs: getCustomEventDuration(4200),
            milestoneRuns: m,
            batterAId: bA,
            batterAName: getPlayerName(bA),
            batterARuns: statA?.runs ?? 0,
            batterABalls: statA?.balls ?? 0,
            batterAFours: statA?.fours ?? 0,
            batterASixes: statA?.sixes ?? 0,
            batterAAvatar: getPlayerAvatar(bA),
            batterBId: bB,
            batterBName: getPlayerName(bB),
            batterBRuns: statB?.runs ?? 0,
            batterBBalls: statB?.balls ?? 0,
            batterBFours: statB?.fours ?? 0,
            batterBSixes: statB?.sixes ?? 0,
            batterBAvatar: getPlayerAvatar(bB),
            totalRuns: p.runs,
            totalBalls: p.balls,
          });
        }
      });
    }
  }, [
    stream.matchState,
    stream.loading,
    stream.currentInnings,
    stream.match,
    teams,
    tournamentStats,
    getPlayerName,
    getPlayerRole,
    getPlayerAvatar,
    enqueueEvent,
  ]);

  return {
    currentEvent,
  };
}
