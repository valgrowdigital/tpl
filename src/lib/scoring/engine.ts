import {
  BALLS_PER_OVER,
  TPL_TOURNAMENT_RULES,
  type BallSummary,
  type BatterStat,
  type BowlerStat,
  type Delivery,
  type FallOfWicket,
  type InningsState,
  type Match,
  type MatchSetup,
  type MatchState,
  type OverGroup,
} from "@/types/cricket";

export { BALLS_PER_OVER, TPL_TOURNAMENT_RULES };

/** ---------- delivery helpers (pure) ---------- */

export function isLegal(d: Delivery): boolean {
  return d.extraType !== "wide" && d.extraType !== "noball" && (d.extraType as string) !== "no-ball";
}

/** Runs added to the team total for this delivery. */
export function totalRunsOf(d: Delivery): number {
  return d.batterRuns + d.extraRuns;
}

/** Runs charged to the bowler (byes and leg byes are not). */
export function bowlerRunsOf(d: Delivery): number {
  if (d.extraType === "bye" || d.extraType === "legbye") return d.batterRuns;
  return d.batterRuns + d.extraRuns;
}

/** Runs credited to the striker. */
export function batterRunsOf(d: Delivery): number {
  if (d.extraType === "bye" || d.extraType === "legbye" || d.extraType === "wide") return 0;
  return d.batterRuns;
}

/** How many times the batters physically crossed. */
function crossings(d: Delivery): number {
  if (d.extraType === "wide") return Math.max(0, d.extraRuns - 1);
  if (d.extraType === "bye" || d.extraType === "legbye") return d.extraRuns;
  return d.batterRuns;
}

/** Does the striker's ball-faced count increase? */
function facesBall(d: Delivery): boolean {
  return d.extraType !== "wide";
}

export function oversText(legalBalls: number): string {
  return `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`;
}

/**
 * Converts legal balls to exact mathematical overs.
 * e.g. In TPL 5-ball overs: 12 legal balls = 2.4 overs (2 + 2/5 = 2.4)
 */
export function legalBallsToOvers(legalBalls: number): number {
  return legalBalls > 0 ? legalBalls / BALLS_PER_OVER : 0;
}

/**
 * Computes canonical runs per over (Run Rate) from runs and legal balls.
 * e.g. In TPL 5-ball overs: 45 runs in 15 legal balls = (45 / 15) * 5 = 15.00
 */
export function runsPerOver(runs: number, legalBalls: number): number {
  return legalBalls > 0 ? (runs / legalBalls) * BALLS_PER_OVER : 0;
}

/**
 * Calculates revised target under ARR (Average Run Rate) rule for rain-affected 2nd innings.
 * Target = floor((Team A Runs / Team A Max Overs) * Team B Reduced Overs) + 1
 */
export function calculateTargetARR(
  firstInningsRuns: number,
  firstInningsMaxOvers: number,
  secondInningsReducedOvers: number,
): number {
  const arr = firstInningsMaxOvers > 0 ? firstInningsRuns / firstInningsMaxOvers : 0;
  return Math.floor(arr * secondInningsReducedOvers) + 1;
}

/**
 * Calculates Required Run Rate (RRR) per 5-ball over.
 */
export function calculateRequiredRunRate(runsNeeded: number, ballsRemaining: number): number {
  return ballsRemaining > 0 ? Number(((runsNeeded / ballsRemaining) * BALLS_PER_OVER).toFixed(2)) : 0;
}

export function ballLabel(d?: Delivery | null): { label: string; kind: BallSummary["kind"] } {
  if (!d) return { label: "", kind: "dot" };
  if (d.wicket) return { label: "W", kind: "wicket" };
  const extraRuns = d.extraRuns ?? 0;
  const batterRuns = d.batterRuns ?? 0;
  switch (d.extraType) {
    case "wide":
      return { label: extraRuns > 1 ? `${extraRuns - 1}wd` : "wd", kind: "extra" };
    case "noball":
      return { label: batterRuns > 0 ? `${batterRuns}nb` : "nb", kind: "extra" };
    case "bye":
      return { label: `${extraRuns}b`, kind: "extra" };
    case "legbye":
      return { label: `${extraRuns}lb`, kind: "extra" };
    default:
      if (batterRuns === 4 || batterRuns === 6)
        return { label: String(batterRuns), kind: "boundary" };
      return { label: String(batterRuns), kind: batterRuns === 0 ? "dot" : "run" };
  }
}

export function describeDelivery(d?: Delivery | null): string {
  if (!d) return "";
  const parts: string[] = [];
  if (d.wicket) {
    const wicketType = d.wicket.type || "Out";
    parts.push(`WICKET (${wicketType})`);
  }
  const extraRuns = d.extraRuns ?? 0;
  const batterRuns = d.batterRuns ?? 0;
  switch (d.extraType) {
    case "wide":
      parts.push(extraRuns > 1 ? `WIDE + ${extraRuns - 1}` : "WIDE");
      break;
    case "noball":
      parts.push(batterRuns > 0 ? `NO BALL + ${batterRuns}` : "NO BALL");
      break;
    case "bye":
      parts.push(`${extraRuns} BYE${extraRuns > 1 ? "S" : ""}`);
      break;
    case "legbye":
      parts.push(`${extraRuns} LEG BYE${extraRuns > 1 ? "S" : ""}`);
      break;
    default:
      if (batterRuns === 4) parts.push("FOUR");
      else if (batterRuns === 6) parts.push("SIX");
      else if (batterRuns === 0 && !d.wicket) parts.push("DOT BALL");
      else if (batterRuns > 0) parts.push(`${batterRuns} RUN${batterRuns > 1 ? "S" : ""}`);
  }
  return parts.join(" · ") || "0 RUNS";
}

/** ---------- innings reduction ---------- */

export interface InningsConfig {
  index: 0 | 1;
  battingTeamId: string;
  bowlingTeamId: string;
  battingXI: string[];
  bowlingXI: string[];
  openers?: { strikerId: string; nonStrikerId: string } | undefined;
  maxOvers: number;
  target?: number;
}

function emptyBatter(playerId: string, position: number): BatterStat {
  return {
    playerId,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    strikeRate: 0,
    battingPosition: position,
  };
}

function emptyBowler(playerId: string): BowlerStat {
  return { playerId, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, economy: 0 };
}

export function buildInnings(config: InningsConfig, deliveries: Delivery[]): InningsState {
  const batters = new Map<string, BatterStat>();
  const bowlers = new Map<string, BowlerStat>();
  const fallOfWickets: FallOfWicket[] = [];
  const completedPartnerships: import("@/types/cricket").CompletedPartnership[] = [];
  const overGroups: OverGroup[] = [];
  const recent: BallSummary[] = [];

  let runs = 0;
  let extras = 0;
  let wickets = 0;
  let legalBalls = 0;
  let strikerId = config.openers?.strikerId || deliveries[0]?.strikerId;
  let nonStrikerId = config.openers?.nonStrikerId || deliveries[0]?.nonStrikerId;
  let position = 0;
  let partnershipRuns = 0;
  let partnershipBalls = 0;

  const ensureBatter = (id?: string) => {
    if (!id) return undefined;
    let b = batters.get(id);
    if (!b) {
      position += 1;
      b = emptyBatter(id, position);
      batters.set(id, b);
    }
    return b;
  };
  ensureBatter(strikerId);
  ensureBatter(nonStrikerId);

  const ensureBowler = (id: string) => {
    let b = bowlers.get(id);
    if (!b) {
      b = emptyBowler(id);
      bowlers.set(id, b);
    }
    return b;
  };

  for (const d of deliveries) {
    // If openers were not in setup, dynamically infer from delivery sequence
    if (!strikerId && d.strikerId) {
      strikerId = d.strikerId;
      ensureBatter(strikerId);
    }
    if (!nonStrikerId && d.nonStrikerId) {
      nonStrikerId = d.nonStrikerId;
      ensureBatter(nonStrikerId);
    }

    const overNumber = Math.floor(legalBalls / BALLS_PER_OVER);
    let group = overGroups[overGroups.length - 1];
    if (!group || group.overNumber !== overNumber || group.complete) {
      group = {
        overNumber,
        bowlerId: d.bowlerId,
        balls: [],
        runs: 0,
        wickets: 0,
        complete: false,
      };
      overGroups.push(group);
    }

    const total = totalRunsOf(d);
    runs += total;
    extras += d.extraRuns;
    if (d.extraType) extras += 0;

    const striker = ensureBatter(strikerId || d.strikerId);
    if (d.nonStrikerId) ensureBatter(d.nonStrikerId);

    if (striker) {
      striker.runs += batterRunsOf(d);
      if (facesBall(d)) striker.balls += 1;
      if (!d.extraType && d.batterRuns === 4) striker.fours += 1;
      if (!d.extraType && d.batterRuns === 6) striker.sixes += 1;
    }

    const bowler = ensureBowler(d.bowlerId);
    bowler.runs += bowlerRunsOf(d);
    if (isLegal(d)) bowler.legalBalls += 1;

    partnershipRuns += total;
    if (facesBall(d)) partnershipBalls += 1;

    if (isLegal(d)) legalBalls += 1;

    const ballOversText = oversText(isLegal(d) ? legalBalls : legalBalls + 1);
    const { label, kind } = ballLabel(d);
    const summary: BallSummary = { delivery: d, oversText: ballOversText, label, kind, totalRuns: total };
    group.balls.push(summary);
    group.runs += total;
    recent.push(summary);

    // strike rotation for runs run
    if (crossings(d) % 2 === 1) {
      const tmp = strikerId;
      strikerId = nonStrikerId;
      nonStrikerId = tmp;
    }

    // wicket handling
    if (d.wicket) {
      const outId = d.wicket.batterOutId;
      const outBatter = ensureBatter(outId);
      const creditedToBowler = !["Run Out", "Retired Hurt", "Retired Out", "Timed Out"].includes(
        d.wicket.type,
      );
      if (d.wicket.type !== "Retired Hurt") {
        wickets += 1;
        group.wickets += 1;
        if (outBatter) {
          outBatter.out = true;
          const bName = playerNameOf(d.bowlerId);
          const fName = d.wicket.fielderId ? playerNameOf(d.wicket.fielderId) : undefined;
          
          if (d.wicket.type === "Caught") {
            outBatter.dismissal = fName ? `c ${fName} b ${bName}` : `c & b ${bName}`;
          } else if (d.wicket.type === "Bowled") {
            outBatter.dismissal = `b ${bName}`;
          } else if (d.wicket.type === "LBW") {
            outBatter.dismissal = `lbw b ${bName}`;
          } else if (d.wicket.type === "Run Out") {
            outBatter.dismissal = fName ? `run out (${fName})` : "run out";
          } else if (d.wicket.type === "Stumped") {
            outBatter.dismissal = fName ? `st ${fName} b ${bName}` : `stumped b ${bName}`;
          } else if (d.wicket.type === "Hit Wicket") {
            outBatter.dismissal = `hit wicket b ${bName}`;
          } else {
            outBatter.dismissal = d.wicket.type;
          }
        }
        fallOfWickets.push({
          wicketNumber: wickets,
          runs,
          oversText: ballOversText,
          overs: ballOversText,
          batterId: outId,
        });

        completedPartnerships.push({
          runs: partnershipRuns,
          balls: partnershipBalls,
          batterAId: strikerId || "",
          batterBId: nonStrikerId || "",
          batterOutId: outId,
          overs: ballOversText,
        });
      } else if (outBatter) {
        outBatter.dismissal = "Retired Hurt";
      }
      if (creditedToBowler) bowler.wickets += 1;

      const replacement = d.wicket.newBatterId;
      if (outId === strikerId) strikerId = replacement;
      else if (outId === nonStrikerId) nonStrikerId = replacement;
      ensureBatter(replacement);
      partnershipRuns = 0;
      partnershipBalls = 0;
    }

    if (isLegal(d) && legalBalls % BALLS_PER_OVER === 0) {
      group.complete = true;
      const tmp = strikerId;
      strikerId = nonStrikerId;
      nonStrikerId = tmp;
      if (group.runs === 0) bowler.maidens += 1;
    }
  }

  for (const b of batters.values()) {
    b.strikeRate = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
  }
  for (const b of bowlers.values()) {
    b.economy = b.legalBalls > 0 ? b.runs / (b.legalBalls / BALLS_PER_OVER) : 0;
  }

  const maxBalls = config.maxOvers * BALLS_PER_OVER;
  const maxWickets = config.battingXI.length >= 2 ? config.battingXI.length - 1 : 10;
  const allOut = wickets >= maxWickets;
  const chased = config.target !== undefined && runs >= config.target;
  const isComplete = allOut || legalBalls >= maxBalls || chased;

  const lastGroup = overGroups[overGroups.length - 1];
  const overInProgress = lastGroup && !lastGroup.complete ? lastGroup : undefined;
  const previousBowlerId = overInProgress
    ? overGroups[overGroups.length - 2]?.bowlerId
    : lastGroup?.bowlerId;

  const currentBowlerId =
    overInProgress?.bowlerId ??
    (deliveries.length > 0 && legalBalls % BALLS_PER_OVER !== 0
      ? deliveries[deliveries.length - 1]?.bowlerId
      : undefined);

  if (strikerId) ensureBatter(strikerId);
  if (nonStrikerId) ensureBatter(nonStrikerId);

  const battedIds = new Set(batters.keys());
  const yetToBat = config.battingXI.filter((id) => !battedIds.has(id));

  const battersList = [...batters.values()].sort((a, b) => a.battingPosition - b.battingPosition);
  const bowlersList = [...bowlers.values()];

  const needsBatter = !isComplete && (!strikerId || !nonStrikerId);
  const missingBatterRole = !isComplete
    ? !strikerId
      ? ("striker" as const)
      : !nonStrikerId
      ? ("non-striker" as const)
      : null
    : null;

  const state: InningsState = {
    index: config.index,
    battingTeamId: config.battingTeamId,
    bowlingTeamId: config.bowlingTeamId,
    runs,
    wickets,
    legalBalls,
    extras,
    oversText: oversText(legalBalls),
    oversFloat: legalBalls / BALLS_PER_OVER,
    crr: legalBalls > 0 ? runs / (legalBalls / BALLS_PER_OVER) : 0,
    maxOvers: config.maxOvers,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    previousBowlerId,
    batters: battersList,
    bowlers: bowlersList,
    fallOfWickets,
    partnerships: completedPartnerships,
    overGroups,
    recentBalls: recent.slice(-12),
    partnership: {
      runs: partnershipRuns,
      balls: partnershipBalls,
      batterAId: strikerId,
      batterBId: nonStrikerId,
    },
    isComplete,
    needsBowler: !isComplete && !currentBowlerId,
    needsBatter,
    missingBatterRole,
    yetToBat,
  };

  if (config.target !== undefined) {
    state.target = config.target;
    state.runsNeeded = Math.max(0, config.target - runs);
    state.ballsRemaining = Math.max(0, maxBalls - legalBalls);
    state.requiredRunRate =
      state.ballsRemaining > 0 ? (state.runsNeeded / state.ballsRemaining) * BALLS_PER_OVER : 0;
  }

  return state;
}

/**
 * Validates whether a bowler is legally eligible to bowl in the current innings
 * based on the TPL tournament rules:
 * - Exactly one bowler can bowl 2 overs (10 legal balls)
 * - All other bowlers can bowl 1 over (5 legal balls)
 * - No consecutive overs for the same bowler
 */
export interface BowlerEligibilityResult {
  canBowl: boolean;
  reason?: string;
  oversBowledText: string;
  legalBallsBowled: number;
  maxOversAllowed: number;
}

export function validateBowlerEligibility(
  bowlerId: string,
  innings?: InningsState,
  previousBowlerId?: string,
): BowlerEligibilityResult {
  if (!innings) {
    return {
      canBowl: true,
      oversBowledText: "0.0",
      legalBallsBowled: 0,
      maxOversAllowed: TPL_TOURNAMENT_RULES.STANDARD_BOWLER_MAX_OVERS,
    };
  }

  const stat = innings.bowlers?.find((b) => b.playerId === bowlerId);
  const legalBallsBowled = stat?.legalBalls ?? 0;
  const oversBowledText = oversText(legalBallsBowled);

  // 1. Consecutive over check
  const prevId = previousBowlerId ?? innings.previousBowlerId;
  if (prevId && bowlerId === prevId && innings.legalBalls > 0) {
    return {
      canBowl: false,
      reason: "Bowler cannot bowl consecutive overs.",
      oversBowledText,
      legalBallsBowled,
      maxOversAllowed: TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER,
    };
  }

  // 2. Strict 1 over maximum check per bowler (5 legal balls)
  const maxBallsAllowed = TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER * BALLS_PER_OVER;
  if (legalBallsBowled >= maxBallsAllowed) {
    return {
      canBowl: false,
      reason: `Bowler has reached the maximum limit of ${TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER} over (${maxBallsAllowed} legal balls).`,
      oversBowledText,
      legalBallsBowled,
      maxOversAllowed: TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER,
    };
  }

  return {
    canBowl: true,
    oversBowledText,
    legalBallsBowled,
    maxOversAllowed: TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER,
  };
}

/** ---------- full match reduction ---------- */

export interface MatchInput {
  match: Match;
  setup: MatchSetup;
  deliveries: Delivery[];
  secondInningsStarted?: boolean;
  secondInningsOpeners?: { strikerId: string; nonStrikerId: string };
  reducedOvers?: number;
  secondInningsReducedOvers?: number;
}

export function buildMatchState(input: MatchInput): MatchState {
  const { match, setup, deliveries } = input;
  
  // Authoritatively derive battingFirstId if setup is empty or partial
  const firstDeliv = deliveries.find((d) => d.inningsIndex === 0);
  const battingFirstId = setup.battingFirstId || match.teamAId;
  const teamAId = battingFirstId;
  const teamBId = teamAId === match.teamAId ? match.teamBId : match.teamAId;

  const xiOf = (teamId: string) => {
    const custom = setup?.playingXI?.[teamId]?.playerIds;
    if (custom && custom.length > 0) return custom;
    const fallback = teamPlayersResolver(teamId);
    return fallback.length > 0 ? fallback : [];
  };

  // Scenario A: Rain before or during 1st innings -> equal overs reduction
  const maxOvers1 = input.reducedOvers ?? setup.reducedOvers ?? match.overs;

  const innings: InningsState[] = [];

  const firstOpeners =
    setup.openers ||
    (firstDeliv ? { strikerId: firstDeliv.strikerId, nonStrikerId: firstDeliv.nonStrikerId } : undefined);

  const first = buildInnings(
    {
      index: 0,
      battingTeamId: teamAId,
      bowlingTeamId: teamBId,
      battingXI: xiOf(teamAId),
      bowlingXI: xiOf(teamBId),
      openers: firstOpeners,
      maxOvers: maxOvers1,
    },
    deliveries.filter((d) => d.inningsIndex === 0),
  );
  innings.push(first);

  let phase: MatchState["phase"] = "innings1";
  if (deliveries.length === 0 && match.status !== "LIVE" && match.status !== "COMPLETED" && (!setup.battingFirstId || !setup.openers)) {
    phase = "setup";
  }

  // Scenario B: Rain during 2nd innings -> ARR target revision
  const secondReduced = input.secondInningsReducedOvers ?? setup.secondInningsReducedOvers;
  const isSecondReduced = typeof secondReduced === "number" && secondReduced > 0 && secondReduced < maxOvers1;
  const maxOvers2 = isSecondReduced ? secondReduced : maxOvers1;

  let target = first.runs + 1;
  let isTargetRevised = false;
  let arr: number | undefined;

  if (isSecondReduced) {
    // Official Formula: (Team A Total / Team A Overs) × Team B Reduced Overs + 1
    arr = maxOvers1 > 0 ? first.runs / maxOvers1 : 0;
    target = Math.floor(arr * maxOvers2) + 1;
    isTargetRevised = true;
  }

  let second: InningsState | undefined;
  const hasSecondInnings = Boolean(
    input.secondInningsStarted ||
    deliveries.some((d) => d.inningsIndex === 1)
  );

  if (first.isComplete || hasSecondInnings) {
    phase = hasSecondInnings ? "innings2" : "break";
    if (hasSecondInnings) {
      const secondDelivs = deliveries.filter((d) => d.inningsIndex === 1);
      const firstSecondDeliv = secondDelivs[0];
      const secondOpeners =
        input.secondInningsOpeners ||
        (firstSecondDeliv
          ? { strikerId: firstSecondDeliv.strikerId, nonStrikerId: firstSecondDeliv.nonStrikerId }
          : undefined);

      second = buildInnings(
        {
          index: 1,
          battingTeamId: teamBId,
          bowlingTeamId: teamAId,
          battingXI: xiOf(teamBId),
          bowlingXI: xiOf(teamAId),
          openers: secondOpeners,
          maxOvers: maxOvers2,
          target,
        },
        secondDelivs,
      );
      second.originalTarget = first.runs + 1;
      second.isTargetRevised = isTargetRevised;
      second.arr = arr;
      innings.push(second);
    }
  }

  let resultText: string | undefined;
  if (second?.isComplete) {
    phase = "complete";
    if (second.runs >= target) {
      const wicketsLeft = Math.max(0, xiOf(teamBId).length - 1 - second.wickets);
      resultText = `${nameOf(teamBId)} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}${isTargetRevised ? " (ARR)" : ""}`;
    } else if (second.runs === first.runs && !isTargetRevised) {
      resultText = "Match tied";
    } else {
      const margin = isTargetRevised ? Math.max(1, target - second.runs) : first.runs - second.runs;
      resultText = `${nameOf(teamAId)} won by ${margin} run${margin === 1 ? "" : "s"}${isTargetRevised ? " (ARR)" : ""}`;
    }
  }

  const isRainAffected = maxOvers1 < match.overs || isSecondReduced;

  return {
    match,
    setup,
    innings,
    currentInningsIndex: second ? 1 : 0,
    phase,
    resultText,
    isRainAffected,
    revisedOvers: isSecondReduced ? maxOvers2 : maxOvers1 < match.overs ? maxOvers1 : undefined,
  };
}

/** Team name resolver is injected lazily to keep the engine data-source agnostic. */
let nameResolver: (teamId: string) => string = (id) => id;
export function setTeamNameResolver(fn: (teamId: string) => string) {
  nameResolver = fn;
}
function nameOf(teamId: string) {
  return nameResolver(teamId);
}

/** Player name resolver is injected lazily for dismissal formatting. */
let playerNameResolver: (playerId: string) => string = (id) => id;
export function setPlayerNameResolver(fn: (playerId: string) => string) {
  playerNameResolver = fn;
}
function playerNameOf(playerId: string) {
  return playerNameResolver(playerId);
}

/** Team players resolver is injected lazily to provide roster fallback for yetToBat. */
let teamPlayersResolver: (teamId: string) => string[] = () => [];
export function setTeamPlayersResolver(fn: (teamId: string) => string[]) {
  teamPlayersResolver = fn;
}
