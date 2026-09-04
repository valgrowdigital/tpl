/**
 * Official TPL 2026 Tournament Rules Configuration
 */
export const TPL_TOURNAMENT_RULES = {
  BALLS_PER_OVER: 5,
  DEFAULT_MATCH_OVERS: 5,
  MAX_OVERS_PER_BOWLER: 1, // Strictly 1 over max per bowler (5 legal balls)
  SECOND_OVER_BOWLER_COUNT: 0, // No bowler allowed more than 1 over
  STANDARD_BOWLER_MAX_OVERS: 1, // All bowlers can bowl at most 1 over (5 legal balls)
} as const;

export const BALLS_PER_OVER = TPL_TOURNAMENT_RULES.BALLS_PER_OVER;

export type PlayerRole = "Batter" | "Bowler" | "All-rounder" | "Wicketkeeper" | "Unspecified" | "Batsman";

export interface Player {
  id: string;
  name: string;
  shortName: string;
  role: PlayerRole;
  teamId: string;
  avatar?: string | undefined;
  referenceId?: string | undefined;
  slug?: string | undefined;
  soldPrice?: number | undefined;
  teamRole?: string | null | undefined;
  auctionStatus?: string | undefined;
  phone?: string | undefined;
  dateOfBirth?: string | undefined;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string | undefined;
  ownerName?: string | undefined;
  groupName?: string | undefined;
  purseBalance?: number | undefined;
  slug?: string | undefined;
}

/**
 * Authoritative helper to determine a team's permanent tournament group.
 * Group 1: "Group 1", "Group A", "1", "A" (or seed teams: DU, BMR, KL)
 * Group 2: "Group 2", "Group B", "2", "B" (or seed teams: NGW, RK, TC)
 */
export function getTeamGroup(team: { id: string; name?: string | null; slug?: string | null; groupName?: string | null; group_name?: string | null }): "Group 1" | "Group 2" {
  const g = (team.groupName || team.group_name || "").toUpperCase().trim();
  if (g.includes("1") || g.includes("A")) return "Group 1";
  if (g.includes("2") || g.includes("B")) return "Group 2";
  const idOrSlug = `${team.id || ""} ${team.slug || ""} ${team.name || ""}`.toLowerCase();
  if (
    idOrSlug.includes("dainagoda") ||
    idOrSlug.includes("bary") ||
    idOrSlug.includes("kurundu") ||
    ["team-du", "team-bmr", "team-kl", "53a3ea75-b3cf-4908-a19b-d3f3b693b3fd", "832b3866-046c-4beb-970a-4d79cc72ba37", "c1397164-6f86-4639-93e6-888e0091bb51"].includes(team.id)
  ) {
    return "Group 1";
  }
  if (
    idOrSlug.includes("garden") ||
    idOrSlug.includes("riverside") ||
    idOrSlug.includes("thundu") ||
    ["team-ngw", "team-rk", "team-tc", "f36ace20-1b45-43e4-be94-7a0f8a678fd9", "9d930c5d-c96b-43ef-8be7-fed8c71133df", "edcc603d-db13-4191-813c-44abb06c883c"].includes(team.id)
  ) {
    return "Group 2";
  }
  return "Group 1";
}

export interface SupabaseTeam {
  id: string;
  name: string;
  slug?: string | null;
  owner_name?: string | null;
  logo_url?: string | null;
  group_name?: string | null;
  purse_balance?: number | null;
  passcode?: string | null;
  created_at?: string;
}

export interface SupabaseRegistration {
  id: string;
  reference_id?: string | null;
  slug?: string | null;
  player_name: string;
  player_phone?: string | null;
  status?: string | null;
  profile_photo_url?: string | null;
  date_of_birth?: string | null;
  team_id?: string | null;
  player_role?: string | null;
  team_role?: string | null;
  slug?: string | null;
  base_price?: number | null;
  sold_price?: number | null;
  auction_status?: string | null;
  attendance_status?: string | null;
  normalized_phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMatch {
  id: string;
  stage_id?: string | null;
  group_id?: string | null;
  team_a_id: string;
  team_b_id: string;
  start_time: string;
  status: "scheduled" | "live" | "completed" | "abandoned";
  total_overs: number;
  balls_per_over?: number;
  scorer_pin?: string | null;
  toss_winner_id?: string | null;
  toss_decision?: "bat" | "bowl" | null;
  man_of_the_match_id?: string | null;
  winner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseInnings {
  id: string;
  match_id: string;
  innings_number: 1 | 2;
  batting_team_id: string;
  bowling_team_id: string;
  total_runs: number;
  total_wickets: number;
  overs_completed: number;
  is_completed: boolean;
}

export type SupabaseExtraType = "none" | "wide" | "no-ball" | "bye" | "leg-bye";

export type SupabaseWicketType =
  | "none"
  | "bowled"
  | "caught"
  | "lbw"
  | "run-out"
  | "stumped"
  | "hit-wicket"
  | "retired-hurt"
  | "other";

export interface SupabaseBall {
  id: string;
  match_id?: string | null;
  innings_id: string;
  client_timestamp: number;
  over_number: number;
  ball_number: number;
  striker_id?: string | null;
  non_striker_id?: string | null;
  bowler_id?: string | null;
  runs_off_bat: number;
  extras: number;
  extra_type: SupabaseExtraType;
  is_wicket: boolean;
  wicket_type: SupabaseWicketType;
  player_out_id?: string | null;
  fielder_id?: string | null;
  shot_zone?: string | null;
  created_at?: string;
}

export type MatchStatus = "UPCOMING" | "READY" | "LIVE" | "COMPLETED";

export interface Match {
  id: string;
  tournament: string;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  venue: string;
  overs: number;
  scheduledAt: string;
  status: MatchStatus;
  scorerPin?: string | undefined;
  winnerId?: string | undefined;
  resultText?: string | undefined;
  manOfTheMatchId?: string | undefined;
}

export interface PlayingXI {
  teamId: string;
  playerIds: string[];
  captainId?: string | undefined;
  keeperId?: string | undefined;
}

export type TossDecision = "bat" | "bowl";

export interface MatchSetup {
  tossWinnerId?: string | undefined;
  decision?: TossDecision | undefined;
  battingFirstId?: string | undefined;
  playingXI: Record<string, PlayingXI>;
  openers?: { strikerId: string; nonStrikerId: string } | undefined;
  openingBowlerId?: string | undefined;
  reducedOvers?: number | undefined;
  secondInningsReducedOvers?: number | undefined;
  targetRevisionReason?: string | undefined;
}

export type ExtraType = "wide" | "noball" | "bye" | "legbye" | null;

export type DismissalType =
  | "Bowled"
  | "Caught"
  | "LBW"
  | "Run Out"
  | "Stumped"
  | "Hit Wicket"
  | "Retired Hurt"
  | "Retired Out"
  | "Timed Out"
  | "Other";

export interface WicketInfo {
  type: DismissalType;
  batterOutId: string;
  fielderId?: string | undefined;
  /** Batter walking in (undefined when innings ends on this ball). */
  newBatterId?: string | undefined;
}

/** The single source of truth for all match state. */
export interface Delivery {
  id: string;
  inningsIndex: 0 | 1;
  bowlerId: string;
  /** Recorded for audit; strike is always recomputed by the engine. */
  strikerId: string;
  nonStrikerId: string;
  batterRuns: number;
  /** For wide: 1 + extra runs run. For bye/legbye: runs run. For noball: 1. */
  extraRuns: number;
  extraType: ExtraType;
  wicket?: WicketInfo | undefined;
  shotZone?: string | null | undefined;
  timestamp: number;
}

export interface BatterStat {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: string | undefined;
  strikeRate: number;
  battingPosition: number;
}

export interface BowlerStat {
  playerId: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  economy: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  oversText: string;
  batterOutId: string;
  dismissalType?: string | undefined;
  bowlerId?: string | undefined;
  fielderId?: string | undefined;
}

export interface BallSummary {
  delivery: Delivery;
  oversText: string;
  label: string;
  kind: "run" | "boundary" | "wicket" | "extra" | "dot";
  totalRuns: number;
}

export interface OverGroup {
  overNumber: number;
  bowlerId: string;
  balls: BallSummary[];
  runs: number;
  wickets: number;
  complete: boolean;
}

export interface Partnership {
  runs: number;
  balls: number;
  batterAId?: string | undefined;
  batterBId?: string | undefined;
}

export interface CompletedPartnership {
  wicketNumber: number;
  runs: number;
  balls: number;
  batterAId: string;
  batterBId: string;
  batterOutId: string;
  oversText: string;
}

export interface InningsState {
  index: 0 | 1;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  oversText: string;
  oversFloat: number;
  crr: number;
  maxOvers: number;
  strikerId?: string | undefined;
  nonStrikerId?: string | undefined;
  currentBowlerId?: string | undefined;
  previousBowlerId?: string | undefined;
  batters: BatterStat[];
  bowlers: BowlerStat[];
  fallOfWickets: FallOfWicket[];
  partnerships: CompletedPartnership[];
  overGroups: OverGroup[];
  recentBalls: BallSummary[];
  partnership: Partnership;
  isComplete: boolean;
  needsBowler: boolean;
  needsBatter?: boolean;
  missingBatterRole?: "striker" | "non-striker" | null;
  yetToBat: string[];
  target?: number | undefined;
  originalTarget?: number | undefined;
  isTargetRevised?: boolean | undefined;
  arr?: number | undefined;
  runsNeeded?: number | undefined;
  ballsRemaining?: number | undefined;
  requiredRunRate?: number | undefined;
}

export interface MatchState {
  match: Match;
  setup: MatchSetup;
  innings: InningsState[];
  currentInningsIndex: 0 | 1;
  phase: "setup" | "innings1" | "break" | "innings2" | "complete";
  resultText?: string | undefined;
  isRainAffected?: boolean | undefined;
  revisedOvers?: number | undefined;
}
