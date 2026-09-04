import type {
  Match,
  MatchStatus,
  Player,
  PlayerRole,
  SupabaseMatch,
  SupabaseRegistration,
  SupabaseTeam,
  Team,
} from "@/types/cricket";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  saveScheduleServerFn,
  resetScheduleServerFn,
  resetAllTournamentMatchesServerFn,
  resetCompletedAndLiveMatchesServerFn,
  resetSingleMatchServerFn,
  generateTournamentScheduleServerFn,
  type GenerateScheduleInput,
  createMatchServerFn,
  createSingleMatchServerFn,
  type CreateSingleMatchInput,
  updateMatchStatusServerFn,
  updateMatchOversServerFn,
} from "@/lib/server-fns/matches";
import { SEED_TEAMS, SEED_PLAYERS } from "./seedData";
import { getAuthoritativeLogo } from "@/components/team/TeamLogo";

export const TOURNAMENT_NAME = "TPL 2026";
const REQUEST_TIMEOUT_MS = 3500; // 3.5 seconds maximum timeout

/**
 * Strict timeout wrapper preventing infinite network hangs.
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
  fallbackMsg = "Request timed out",
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(fallbackMsg)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate a concise short name / abbreviation for a team name.
 */
function deriveTeamShortName(name: string, slug?: string | null): string {
  if (slug) {
    const parts = slug.split("-").filter(Boolean);
    if (parts.length >= 2) {
      return parts.map((p) => p[0]?.toUpperCase()).join("");
    }
  }
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0]![0]! + words[1]!.slice(0, 2)).toUpperCase();
  return words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 4);
}

/**
 * Generate a short display name for a player (e.g. "Mohamed Imran" -> "M. Imran").
 */
function derivePlayerShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName.trim();
  const last = parts[parts.length - 1];
  const initial = parts[0]![0]?.toUpperCase();
  return `${initial}. ${last}`;
}

/**
 * Canonical team identifier normalization for bulletproof matching across
 * UUIDs, short codes, slugs, and full name variations.
 */
export function getTeamCanonicalKey(idOrSlugOrName?: string | null): string {
  if (!idOrSlugOrName || !idOrSlugOrName.trim()) return "";
  const s = idOrSlugOrName.toLowerCase().trim();

  // Bary Mawathe Royals
  if (
    s === "832b3866-046c-4beb-970a-4d79cc72ba37" ||
    s === "team-bmr" ||
    s === "bmr" ||
    s.includes("bary") ||
    s.includes("mawathe") ||
    s.includes("royals")
  ) {
    return "team-bmr";
  }

  // Thundu Capital
  if (
    s === "edcc603d-db13-4191-813c-44abb06c883c" ||
    s === "team-tc" ||
    s === "tc" ||
    s.includes("thundu") ||
    s.includes("capital")
  ) {
    return "team-tc";
  }

  // Kurunduwatte Legends
  if (
    s === "c1397164-6f86-4639-93e6-888e0091bb51" ||
    s === "team-kl" ||
    s === "kl" ||
    s.includes("kurundu") ||
    s.includes("legend")
  ) {
    return "team-kl";
  }

  // Riverside Kings
  if (
    s === "9d930c5d-c96b-43ef-8be7-fed8c71133df" ||
    s === "team-rk" ||
    s === "rk" ||
    s.includes("riverside")
  ) {
    return "team-rk";
  }

  // New Garden Warriors
  if (
    s === "f36ace20-1b45-43e4-be94-7a0f8a678fd9" ||
    s === "team-ngw" ||
    s === "ngw" ||
    s.includes("garden") ||
    s.includes("warrior")
  ) {
    return "team-ngw";
  }

  // Dainagoda United
  if (
    s === "53a3ea75-b3cf-4908-a19b-d3f3b693b3fd" ||
    s === "team-du" ||
    s === "du" ||
    s.includes("dainagoda")
  ) {
    return "team-du";
  }

  return s;
}

export function isPlayerInTeam(
  player: { teamId?: string | null },
  team: { id: string; slug?: string | null; shortName?: string | null; name?: string | null } | string | null | undefined
): boolean {
  if (!player || !player.teamId || !player.teamId.trim()) return false;
  const playerTeamKey = getTeamCanonicalKey(player.teamId);
  if (!playerTeamKey) return false;

  let teamKey = "";
  if (typeof team === "string") {
    teamKey = getTeamCanonicalKey(team);
  } else if (team && typeof team === "object") {
    teamKey = getTeamCanonicalKey(team.id) || getTeamCanonicalKey(team.slug) || getTeamCanonicalKey(team.shortName) || getTeamCanonicalKey(team.name);
  }

  if (!teamKey) return false;
  return playerTeamKey === teamKey;
}

export function toTeam(row: SupabaseTeam): Team {
  const fallbackLogo = getAuthoritativeLogo(row.id) || getAuthoritativeLogo(row.slug) || getAuthoritativeLogo(row.name);
  return {
    id: row.id,
    name: row.name,
    shortName: deriveTeamShortName(row.name, row.slug),
    logoUrl: row.logo_url ?? fallbackLogo,
    ownerName: row.owner_name ?? undefined,
    groupName: row.group_name ?? undefined,
    purseBalance: row.purse_balance ?? undefined,
    slug: row.slug ?? undefined,
  };
}

export function toPlayer(row: SupabaseRegistration): Player {
  // Check localStorage custom overrides first
  let customAvatar: string | undefined;
  let customRole: PlayerRole | undefined;
  let customTeam: string | undefined;
  if (typeof window !== "undefined") {
    try {
      const rawAvatars = window.localStorage.getItem("tpl_player_custom_avatars");
      if (rawAvatars) {
        const avatarsMap = JSON.parse(rawAvatars);
        if (avatarsMap[row.id]) customAvatar = avatarsMap[row.id];
      }
    } catch {}
    try {
      const rawRoles = window.localStorage.getItem("tpl_player_custom_roles");
      if (rawRoles) {
        const rolesMap = JSON.parse(rawRoles);
        if (rolesMap[row.id]) customRole = rolesMap[row.id];
      }
    } catch {}
    try {
      const rawTeams = window.localStorage.getItem("tpl_player_custom_teams");
      if (rawTeams) {
        const teamsMap = JSON.parse(rawTeams);
        if (teamsMap[row.id]) customTeam = teamsMap[row.id];
      }
    } catch {}
  }

  const rawRole = (
    row.player_role ||
    (row as any).role ||
    (row as any).category ||
    (row as any).playing_role ||
    (row as any).player_category ||
    (row as any).player_type ||
    (row as any).skills ||
    ""
  ).toLowerCase().trim();

  let role: PlayerRole = customRole || "Unspecified";
  
  if (!customRole) {
    if (rawRole.includes("all") || rawRole.includes("round")) {
      role = "All-rounder";
    } else if (rawRole.includes("bowl")) {
      role = "Bowler";
    } else if (rawRole.includes("keep") || rawRole.includes("wk") || rawRole.includes("wicket")) {
      role = "Wicketkeeper";
    } else if (rawRole.includes("bat")) {
      role = "Batter";
    } else if (rawRole && rawRole !== "unspecified" && rawRole !== "null" && rawRole !== "none") {
      if (rawRole === "all-rounder" || rawRole === "allrounder") role = "All-rounder";
      else if (rawRole === "bowler") role = "Bowler";
      else if (rawRole === "wicketkeeper") role = "Wicketkeeper";
      else if (rawRole === "batter" || rawRole === "batsman") role = "Batter";
      else role = "Unspecified";
    } else {
      const seed = SEED_PLAYERS.find(
        (s) => s.id === row.id || s.name.toLowerCase() === (row.player_name || "").toLowerCase()
      );
      if (seed?.role && seed.role !== "Unspecified") {
        role = seed.role;
      } else {
        role = "Unspecified";
      }
    }
  }

  return {
    id: row.id,
    name: row.player_name?.trim() || "Unknown Player",
    shortName: derivePlayerShortName(row.player_name || "Unknown Player"),
    role,
    teamId: customTeam !== undefined ? customTeam : (row.team_id || ""),
    avatar: customAvatar || row.profile_photo_url || undefined,
    referenceId: row.reference_id || undefined,
    slug: row.slug || (row.player_name ? row.player_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : undefined),
    soldPrice: row.sold_price || undefined,
    teamRole: row.team_role || undefined,
    auctionStatus: row.auction_status || undefined,
    phone: row.player_phone || undefined,
    dateOfBirth: row.date_of_birth || undefined,
  };
}


/**
 * Maps a raw Supabase `match_status` enum value to the application domain MatchStatus.
 *
 * Valid database enum:  "scheduled" | "live" | "completed" | "abandoned"
 * Valid domain status:  "UPCOMING"  | "LIVE"  | "COMPLETED"
 *
 * NOTE: "READY" is a scorer-session-only UI concept derived from localStorage
 * (startMatchSession flag), never from the database. The database never contains
 * the value "ready" or "upcoming" — those are application-layer labels only.
 */
export function deriveFallbackMatchPin(matchId: string, matchNumber = 1): string {
  const num = Math.max(1, matchNumber || 1);
  return String(2100 + num);
}

export function toMatch(row: SupabaseMatch, matchNumber = 1): Match {
  let status: MatchStatus = "UPCOMING";
  const raw = (row.status || "").toLowerCase().trim();
  if (raw === "live") status = "LIVE";
  else if (raw === "completed" || raw === "finished" || raw === "abandoned") status = "COMPLETED";
  // "scheduled" and anything unrecognised → UPCOMING (the safe default)
  else status = "UPCOMING";

  const num = row.match_number || matchNumber;
  const pin = row.scorer_pin && String(row.scorer_pin).trim().length >= 4
    ? String(row.scorer_pin).trim()
    : deriveFallbackMatchPin(row.id, num);

  return {
    id: row.id,
    tournament: TOURNAMENT_NAME,
    matchNumber: num,
    teamAId: row.team_a_id,
    teamBId: row.team_b_id,
    venue: "TPL Cricket Ground",
    overs: row.total_overs || 5,
    scheduledAt: row.start_time,
    status,
    scorerPin: pin,
    winnerId: row.winner_id ?? undefined,
    resultText: undefined,
    manOfTheMatchId: row.man_of_the_match_id ?? undefined,
  };
}


// ── In-Memory & LocalStorage Persistent Lookup Cache ────────────────────────
const CACHE_TEAMS_KEY = "tpl_cache_teams";
const CACHE_PLAYERS_KEY = "tpl_cache_players";
const CACHE_MATCHES_KEY = "tpl_cache_matches";
const CACHE_MATCHES_MANAGED_KEY = "tpl_cache_matches_managed";

class LookupCache {
  private teamsMap = new Map<string, Team>();
  private playersMap = new Map<string, Player>();
  private matchesMap = new Map<string, Match>();
  private matchesManaged = false;
  private initialHydrated = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const rawTeams = window.localStorage.getItem(CACHE_TEAMS_KEY);
        if (rawTeams) {
          const parsed = JSON.parse(rawTeams);
          if (Array.isArray(parsed)) parsed.forEach((t) => this.teamsMap.set(t.id, t));
        }

        const rawManaged = window.localStorage.getItem(CACHE_MATCHES_MANAGED_KEY);
        if (rawManaged === "true") {
          this.matchesManaged = true;
        }

        const rawMatches = window.localStorage.getItem(CACHE_MATCHES_KEY);
        if (rawMatches) {
          const parsed = JSON.parse(rawMatches);
          if (Array.isArray(parsed)) {
            parsed.forEach((m) => this.matchesMap.set(m.id, m));
            this.matchesManaged = true;
          }
        }

        const rawPlayers = window.localStorage.getItem(CACHE_PLAYERS_KEY);
        if (rawPlayers) {
          const parsed = JSON.parse(rawPlayers);
          if (Array.isArray(parsed)) {
            // If cache has old 'Master Player' mock names or legacy all-batter cache with no custom roles, discard and re-seed
            const hasMockPlayers = parsed.some((p) => (p.name || "").startsWith("Master Player"));
            const rawCustomRoles = window.localStorage.getItem("tpl_player_custom_roles");
            const hasCustomRoles = Boolean(rawCustomRoles && Object.keys(JSON.parse(rawCustomRoles) || {}).length > 0);
            const isLegacyAllBatter = !hasCustomRoles && parsed.length > 5 && parsed.every((p) => !p.role || p.role === "Batter");

            if (!hasMockPlayers && !isLegacyAllBatter && parsed.length > 0) {
              parsed.forEach((p) => this.playersMap.set(p.id, p));
            }
          }
        }
      } catch {}
    }

    // Default initialization if empty
    if (this.teamsMap.size === 0) {
      SEED_TEAMS.forEach((t) => this.teamsMap.set(t.id, t));
    }
    if (this.playersMap.size === 0) {
      SEED_PLAYERS.forEach((p) => this.playersMap.set(p.id, p));
    }
  }

  setTeams(teams: Team[]) {
    this.teamsMap.clear();
    teams.forEach((t) => this.teamsMap.set(t.id, t));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CACHE_TEAMS_KEY, JSON.stringify(teams));
      } catch {}
    }
  }

  setPlayers(players: Player[]) {
    this.playersMap.clear();
    players.forEach((p) => this.playersMap.set(p.id, p));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CACHE_PLAYERS_KEY, JSON.stringify(players));
      } catch {}
    }
  }

  setMatches(matches: Match[]) {
    this.matchesMap.clear();
    matches.forEach((m) => this.matchesMap.set(m.id, m));
    this.matchesManaged = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CACHE_MATCHES_KEY, JSON.stringify(matches));
        window.localStorage.setItem(CACHE_MATCHES_MANAGED_KEY, "true");
      } catch {}
    }
  }

  isMatchesManaged(): boolean {
    return this.matchesManaged;
  }

  updateMatch(id: string, patch: Partial<Match>) {
    const existing = this.matchesMap.get(id);
    if (existing) {
      const updated: Match = { ...existing, ...patch };
      this.matchesMap.set(id, updated);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            CACHE_MATCHES_KEY,
            JSON.stringify(Array.from(this.matchesMap.values())),
          );
        } catch {}
      }
      return updated;
    }
    return undefined;
  }

  upsertMatch(match: Match): Match {
    const existing = this.matchesMap.get(match.id);
    const updated: Match = existing ? { ...existing, ...match } : match;
    this.matchesMap.set(match.id, updated);
    this.matchesManaged = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          CACHE_MATCHES_KEY,
          JSON.stringify(Array.from(this.matchesMap.values())),
        );
        window.localStorage.setItem(CACHE_MATCHES_MANAGED_KEY, "true");
      } catch {}
    }
    return updated;
  }

  team(idOrSlug?: string): Team | undefined {
    if (!idOrSlug) return undefined;
    const direct = this.teamsMap.get(idOrSlug);
    if (direct) return direct;

    const targetKey = getTeamCanonicalKey(idOrSlug);
    for (const t of this.teamsMap.values()) {
      const tKey = getTeamCanonicalKey(t.id) || getTeamCanonicalKey(t.slug) || getTeamCanonicalKey(t.shortName) || getTeamCanonicalKey(t.name);
      if (tKey === targetKey) return t;
    }
    return undefined;
  }

  player(idOrSlug?: string): Player | undefined {
    if (!idOrSlug) return undefined;
    const direct = this.playersMap.get(idOrSlug);
    if (direct) return direct;

    const normalized = idOrSlug.toLowerCase().trim();
    for (const p of this.playersMap.values()) {
      if (
        p.id === idOrSlug ||
        (p.slug && p.slug.toLowerCase() === normalized) ||
        (p.referenceId && p.referenceId.toLowerCase() === normalized) ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === normalized ||
        p.name.toLowerCase() === normalized
      ) {
        return p;
      }
    }
    return undefined;
  }

  updatePlayer(id: string, patch: Partial<Player>): Player | undefined {
    const existing = this.playersMap.get(id);
    if (existing) {
      const updated: Player = { ...existing, ...patch };
      this.playersMap.set(id, updated);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            CACHE_PLAYERS_KEY,
            JSON.stringify(Array.from(this.playersMap.values())),
          );
          if (patch.role) {
            const rawRoles = window.localStorage.getItem("tpl_player_custom_roles");
            const rolesMap = rawRoles ? JSON.parse(rawRoles) : {};
            rolesMap[id] = patch.role;
            window.localStorage.setItem("tpl_player_custom_roles", JSON.stringify(rolesMap));
          }
          if (patch.avatar !== undefined) {
            const rawAvatars = window.localStorage.getItem("tpl_player_custom_avatars");
            const avatarsMap = rawAvatars ? JSON.parse(rawAvatars) : {};
            if (patch.avatar) {
              avatarsMap[id] = patch.avatar;
            } else {
              delete avatarsMap[id];
            }
            window.localStorage.setItem("tpl_player_custom_avatars", JSON.stringify(avatarsMap));
          }
          if (patch.teamId !== undefined) {
            const rawTeams = window.localStorage.getItem("tpl_player_custom_teams");
            const teamsMap = rawTeams ? JSON.parse(rawTeams) : {};
            if (patch.teamId) {
              teamsMap[id] = patch.teamId;
            } else {
              delete teamsMap[id];
            }
            window.localStorage.setItem("tpl_player_custom_teams", JSON.stringify(teamsMap));
          }
        } catch {}
      }
      return updated;
    }
    return undefined;
  }

  upsertPlayer(player: Player): Player {
    this.playersMap.set(player.id, player);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          CACHE_PLAYERS_KEY,
          JSON.stringify(Array.from(this.playersMap.values())),
        );
      } catch {}
    }
    return player;
  }

  playersOf(teamIdOrSlug: string | { id?: string; name?: string; slug?: string }): Player[] {
    if (!teamIdOrSlug) return [];
    return Array.from(this.playersMap.values()).filter((p) => isPlayerInTeam(p, teamIdOrSlug));
  }

  match(id: string): Match | undefined {
    return this.matchesMap.get(id);
  }

  matches(): Match[] {
    return Array.from(this.matchesMap.values()).sort(
      (a, b) => a.matchNumber - b.matchNumber,
    );
  }

  getAllMatches(): Match[] {
    return this.matches();
  }

  allMatches(): Match[] {
    return this.matches();
  }

  teams(): Team[] {
    return Array.from(this.teamsMap.values());
  }

  getAllTeams(): Team[] {
    return this.teams();
  }

  allTeams(): Team[] {
    return this.teams();
  }

  players(): Player[] {
    return Array.from(this.playersMap.values());
  }

  getAllPlayers(): Player[] {
    return this.players();
  }

  allPlayers(): Player[] {
    return this.players();
  }

  getNextMatchNumber(): number {
    const all = this.matches();
    if (all.length === 0) return 1;
    const max = Math.max(...all.map((m) => m.matchNumber || 0));
    return max + 1;
  }

  isHydrated(): boolean {
    return this.initialHydrated || this.matchesMap.size > 0;
  }

  markHydrated() {
    this.initialHydrated = true;
  }
}

export const lookup = new LookupCache();

// ── Repository Contracts ─────────────────────────────────────────────────────

export interface TeamRepository {
  list(): Promise<Team[]>;
  get(id: string): Promise<Team | undefined>;
}

export interface CreatePlayerInput {
  name: string;
  role?: PlayerRole;
  teamId?: string | null;
  avatar?: string | null;
  phone?: string | null;
  referenceId?: string | null;
  soldPrice?: number | null;
}

export interface PlayerRepository {
  list(): Promise<Player[]>;
  listByTeam(teamId: string): Promise<Player[]>;
  get(id: string): Promise<Player | undefined>;
  search(query: string): Promise<Player[]>;
  updateRole(playerId: string, role: PlayerRole): Promise<Player>;
  updateAvatar(playerId: string, avatarUrl: string): Promise<Player>;
  updateTeam(playerId: string, teamId: string | null): Promise<Player>;
  createPlayer(input: CreatePlayerInput): Promise<Player>;
}


export interface MatchRepository {
  list(): Promise<Match[]>;
  get(id: string): Promise<Match | undefined>;
  saveSchedule(matches: Match[]): Promise<Match[]>;
  resetSchedule(): Promise<Match[]>;
  resetAllMatches(): Promise<Match[]>;
  resetPendingFixtures(): Promise<Match[]>;
  resetCompletedAndLiveMatches(): Promise<Match[]>;
  resetSingleMatch(matchId: string): Promise<Match[]>;
  generateTournamentSchedule(input: GenerateScheduleInput): Promise<Match[]>;
  createMatch(match: Match): Promise<Match>;
  createSingleMatch(input: {
    teamAId: string;
    teamBId: string;
    scheduledAt: string;
    overs: number;
    ballsPerOver?: number;
    venue?: string;
    matchNumber?: number;
  }): Promise<Match>;
}

export { SEED_TEAMS, SEED_PLAYERS };

// Initialize lookup cache with defaults if empty
if (lookup.teams().length === 0) {
  lookup.setTeams(SEED_TEAMS);
}
if (lookup.players().length === 0) {
  lookup.setPlayers(SEED_PLAYERS);
}

// ── Match Repository Implementations ────────────────────────────────────────
export class SupabaseTeamRepository implements TeamRepository {
  async list(): Promise<Team[]> {
    if (!isSupabaseConfigured) {
      return lookup.teams();
    }
    const startTime = Date.now();
    try {
      const response = await withTimeout(
        supabase.from("teams").select("*").order("name", { ascending: true }),
        REQUEST_TIMEOUT_MS,
        "Teams load timed out",
      );

      const duration = Date.now() - startTime;
      const { data, error, status } = response;

      if (error) {
        console.warn(`[TEAM_FETCH_NOTICE] — ${duration}ms — HTTP ${status}: ${error.message}`);
        return lookup.teams();
      }

      const domainTeams = (data as SupabaseTeam[] || []).map(toTeam);
      lookup.setTeams(domainTeams);
      return domainTeams;
    } catch (err: any) {
      return lookup.teams();
    }
  }

  async get(id: string): Promise<Team | undefined> {
    const cached = lookup.team(id);
    if (cached) return cached;

    if (!isSupabaseConfigured) return cached;

    try {
      const response = await withTimeout(
        supabase.from("teams").select("*").eq("id", id).single(),
        REQUEST_TIMEOUT_MS,
      );

      const { data, error } = response;
      if (error || !data) return undefined;

      const t = toTeam(data as SupabaseTeam);
      return t;
    } catch {
      return lookup.team(id);
    }
  }
}

export class SupabasePlayerRepository implements PlayerRepository {
  async list(): Promise<Player[]> {
    if (!isSupabaseConfigured) {
      return lookup.players();
    }
    const startTime = Date.now();
    try {
      const response = await withTimeout(
        supabase.from("registrations").select("*").order("player_name", { ascending: true }),
        REQUEST_TIMEOUT_MS,
        "Players load timed out",
      );

      const duration = Date.now() - startTime;
      const { data, error, status } = response;

      if (error) {
        console.warn(`[PLAYER_FETCH_NOTICE] — ${duration}ms — HTTP ${status}: ${error.message}`);
        return lookup.players();
      }

      const domainPlayers = (data as SupabaseRegistration[] || []).map(toPlayer);
      lookup.setPlayers(domainPlayers);
      return domainPlayers;
    } catch (err: any) {
      return lookup.players();
    }
  }

  async get(id: string): Promise<Player | undefined> {
    const cached = lookup.player(id);
    if (cached) return cached;

    if (!isSupabaseConfigured) return cached;

    try {
      const response = await withTimeout(
        supabase.from("registrations").select("*").eq("id", id).single(),
        REQUEST_TIMEOUT_MS,
      );

      const { data, error } = response;
      if (error || !data) return undefined;

      const p = toPlayer(data as SupabaseRegistration);
      return p;
    } catch {
      return lookup.player(id);
    }
  }

  async listByTeam(teamId: string): Promise<Player[]> {
    const cached = lookup.playersOf(teamId);
    if (cached.length > 0) return cached;

    if (!isSupabaseConfigured) return cached;

    try {
      const response = await withTimeout(
        supabase.from("registrations").select("*").eq("team_id", teamId).order("player_name", { ascending: true }),
        REQUEST_TIMEOUT_MS,
      );

      const { data, error } = response;
      if (error) throw new Error(`Failed to list team players: ${error.message}`);

      const domainPlayers = (data as SupabaseRegistration[] || []).map(toPlayer);
      return domainPlayers;
    } catch (err) {
      return lookup.playersOf(teamId);
    }
  }

  async search(query: string): Promise<Player[]> {
    const trimmed = query.trim();
    if (!trimmed) return this.list();

    if (!isSupabaseConfigured) {
      return lookup
        .players()
        .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()));
    }

    try {
      const response = await withTimeout(
        supabase
          .from("registrations")
          .select("*")
          .or(`player_name.ilike.%${trimmed}%,reference_id.ilike.%${trimmed}%`)
          .order("player_name", { ascending: true })
          .limit(50),
        REQUEST_TIMEOUT_MS,
      );

      const { data, error } = response;
      if (error) throw new Error(`Failed to search players: ${error.message}`);

      const domainPlayers = (data as SupabaseRegistration[] || []).map(toPlayer);
      return domainPlayers;
    } catch (err: any) {
      const cachedMatches = lookup
        .players()
        .filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()));
      if (cachedMatches.length > 0) return cachedMatches;
      throw new Error(`Failed to search players: ${err?.message || "Server error"}`);
    }
  }

  async updateRole(playerId: string, role: PlayerRole): Promise<Player> {
    const updated = lookup.updatePlayer(playerId, { role });
    if (isSupabaseConfigured) {
      try {
        await withTimeout(
          supabase
            .from("registrations")
            .update({ player_role: role })
            .eq("id", playerId),
          REQUEST_TIMEOUT_MS,
          "Update player role timed out",
        );
      } catch (err) {
        console.warn("[updateRole] Supabase update notice:", err);
      }
    }
    const result = updated || (await this.get(playerId));
    if (!result) throw new Error(`Player ${playerId} not found`);
    return result;
  }

  async updateAvatar(playerId: string, avatarUrl: string): Promise<Player> {
    const updated = lookup.updatePlayer(playerId, { avatar: avatarUrl || undefined });
    if (isSupabaseConfigured) {
      try {
        await withTimeout(
          supabase
            .from("registrations")
            .update({ profile_photo_url: avatarUrl || null })
            .eq("id", playerId),
          REQUEST_TIMEOUT_MS,
          "Update player avatar timed out",
        );
      } catch (err) {
        console.warn("[updateAvatar] Supabase update notice:", err);
      }
    }
    const result = updated || (await this.get(playerId));
    if (!result) throw new Error(`Player ${playerId} not found`);
    return result;
  }

  async updateTeam(playerId: string, teamId: string | null): Promise<Player> {
    const updated = lookup.updatePlayer(playerId, { teamId: teamId || "" });
    if (isSupabaseConfigured) {
      try {
        await withTimeout(
          supabase
            .from("registrations")
            .update({ team_id: teamId || null })
            .eq("id", playerId),
          REQUEST_TIMEOUT_MS,
          "Update player team timed out",
        );
      } catch (err) {
        console.warn("[updateTeam] Supabase update notice:", err);
      }
    }
    const result = updated || (await this.get(playerId));
    if (!result) throw new Error(`Player ${playerId} not found`);
    return result;
  }

  async createPlayer(input: CreatePlayerInput): Promise<Player> {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const role: PlayerRole = input.role || "Unspecified";
    const teamId = input.teamId || "";
    const referenceId = input.referenceId || `TPL-${String(lookup.players().length + 1).padStart(3, "0")}`;

    const newPlayer: Player = {
      id,
      name: input.name.trim(),
      shortName: derivePlayerShortName(input.name.trim()),
      role,
      teamId,
      avatar: input.avatar || undefined,
      phone: input.phone || undefined,
      referenceId,
      slug,
      soldPrice: input.soldPrice || undefined,
      auctionStatus: "AVAILABLE",
    };

    lookup.upsertPlayer(newPlayer);

    if (isSupabaseConfigured) {
      try {
        const insertPayload: any = {
          id,
          player_name: input.name.trim(),
          player_role: role,
          team_id: teamId || null,
          profile_photo_url: input.avatar || null,
          reference_id: referenceId,
          slug,
          player_phone: input.phone || null,
          sold_price: input.soldPrice || null,
          status: "APPROVED",
        };

        const { data, error } = await withTimeout(
          supabase.from("registrations").insert(insertPayload).select().single(),
          REQUEST_TIMEOUT_MS,
          "Create player timed out",
        );

        if (!error && data) {
          const created = toPlayer(data as SupabaseRegistration);
          lookup.upsertPlayer(created);
          return created;
        }
      } catch (err) {
        console.warn("[createPlayer] Supabase insert warning:", err);
      }
    }

    return newPlayer;
  }
}


export class SupabaseMatchRepository implements MatchRepository {
  async list(): Promise<Match[]> {
    if (!isSupabaseConfigured) {
      return lookup.matches();
    }
    const startTime = Date.now();
    try {
      const response = await withTimeout(
        supabase.from("matches").select("*").order("start_time", { ascending: true }),
        REQUEST_TIMEOUT_MS,
        "Matches load timed out",
      );

      const duration = Date.now() - startTime;
      const { data, error, status } = response;

      if (error) {
        console.warn(`[MATCH_FETCH_NOTICE] — ${duration}ms — HTTP ${status}: ${error.message}`);
        return lookup.matches();
      }

      const domainMatches = ((data as SupabaseMatch[]) || []).map((m, idx) => toMatch(m, idx + 1));
      lookup.setMatches(domainMatches);
      return domainMatches;
    } catch (err: any) {
      return lookup.matches();
    }
  }

  async get(id: string): Promise<Match | undefined> {
    const cached = lookup.match(id);
    if (cached) return cached;

    try {
      const response = await withTimeout(
        supabase.from("matches").select("*").eq("id", id).single(),
        REQUEST_TIMEOUT_MS,
      );

      const { data, error } = response;
      if (error || !data) return undefined;

      const m = toMatch(data as SupabaseMatch);
      lookup.upsertMatch(m);
      return m;
    } catch {
      return lookup.match(id);
    }
  }

  async saveSchedule(fixtures: Match[]): Promise<Match[]> {
    try {
      lookup.setMatches(fixtures);
      return fixtures;
    } catch (err: any) {
      throw new Error(`Failed to save schedule: ${err?.message || "Storage error"}`);
    }
  }

  async resetSchedule(): Promise<Match[]> {
    return this.resetPendingFixtures();
  }

  async resetAllMatches(): Promise<Match[]> {
    try {
      if (isSupabaseConfigured) {
        try {
          await resetAllTournamentMatchesServerFn();
        } catch (serverErr) {
          console.warn("[SupabaseMatchRepository] resetAllTournamentMatchesServerFn warning:", serverErr);
        }
      }

      // Reset all domain matches in cache to clean upcoming state
      const allCurrent = lookup.matches();
      const resetMatches: Match[] = allCurrent.map((m) => ({
        ...m,
        status: "UPCOMING",
        tossWinnerId: undefined,
        tossDecision: undefined,
        manOfTheMatchId: undefined,
        setup: undefined,
        scorecard: undefined,
      }));

      // Clean up all scoring localStorages across the app
      if (typeof window !== "undefined") {
        try {
          allCurrent.forEach((m) => {
            window.localStorage.removeItem("tpl-scoring:" + m.id);
            window.localStorage.removeItem("tpl-live-match:" + m.id);
            window.localStorage.removeItem("tpl-match-state:" + m.id);
            window.localStorage.removeItem("tpl_match_live_" + m.id);
            window.localStorage.removeItem("tpl_match_completed_" + m.id);
          });
          window.localStorage.removeItem("tpl-obs-active-match");
          window.localStorage.removeItem("tpl_active_scorer_match");
        } catch {}
      }

      lookup.setMatches(resetMatches);
      return resetMatches;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] resetAllMatches error:", err?.message);
      throw new Error(`Failed to reset all matches: ${err?.message || "Storage error"}`);
    }
  }

  async resetPendingFixtures(): Promise<Match[]> {
    try {
      if (isSupabaseConfigured) {
        await resetScheduleServerFn();
      }

      // Strictly protect and preserve all COMPLETED and LIVE matches in domain cache
      const allCurrent = lookup.matches();
      const preservedMatches = allCurrent.filter((m) => m.status === "COMPLETED" || m.status === "LIVE");

      // Clean up localStorage scoring documents ONLY for removed upcoming/ready matches
      if (typeof window !== "undefined") {
        try {
          const removedIds = allCurrent
            .filter((m) => m.status !== "COMPLETED" && m.status !== "LIVE")
            .map((m) => m.id);
          removedIds.forEach((id) => {
            window.localStorage.removeItem("tpl-scoring:" + id);
            window.localStorage.removeItem("tpl-live-match:" + id);
            window.localStorage.removeItem("tpl-match-state:" + id);
          });
        } catch {}
      }

      lookup.setMatches(preservedMatches);
      return preservedMatches;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] resetPendingFixtures server error:", err?.message);
      const cleanMsg = (err?.message || "Server error").replace(/^(Failed to reset upcoming fixtures:\s*)+/i, "").trim();
      throw new Error(`Failed to reset pending fixtures: ${cleanMsg}`);
    }
  }

  async resetCompletedAndLiveMatches(): Promise<Match[]> {
    try {
      if (isSupabaseConfigured) {
        try {
          await resetCompletedAndLiveMatchesServerFn();
        } catch (serverErr) {
          console.warn("[SupabaseMatchRepository] resetCompletedAndLiveMatchesServerFn warning:", serverErr);
        }
      }

      const allCurrent = lookup.matches();
      const updatedMatches: Match[] = allCurrent.map((m) => {
        if (m.status === "LIVE" || m.status === "COMPLETED") {
          return {
            ...m,
            status: "UPCOMING",
            tossWinnerId: undefined,
            tossDecision: undefined,
            manOfTheMatchId: undefined,
            setup: undefined,
            scorecard: undefined,
            resultText: undefined,
          };
        }
        return m;
      });

      if (typeof window !== "undefined") {
        try {
          allCurrent
            .filter((m) => m.status === "LIVE" || m.status === "COMPLETED")
            .forEach((m) => {
              window.localStorage.removeItem("tpl-scoring:" + m.id);
              window.localStorage.removeItem("tpl-live-match:" + m.id);
              window.localStorage.removeItem("tpl-match-state:" + m.id);
              window.localStorage.removeItem("tpl_match_live_" + m.id);
              window.localStorage.removeItem("tpl_match_completed_" + m.id);
              try {
                window.sessionStorage.removeItem("tpl_scorer_match_pin_" + m.id);
              } catch {}
            });
          window.localStorage.removeItem("tpl-obs-active-match");
          window.localStorage.removeItem("tpl_active_scorer_match");
        } catch {}
      }

      lookup.setMatches(updatedMatches);
      return updatedMatches;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] resetCompletedAndLiveMatches error:", err?.message);
      throw new Error(`Failed to reset completed and live matches: ${err?.message || "Storage error"}`);
    }
  }

  async resetSingleMatch(matchId: string): Promise<Match[]> {
    try {
      if (isSupabaseConfigured) {
        try {
          await resetSingleMatchServerFn({ data: { matchId } });
        } catch (serverErr) {
          console.warn("[SupabaseMatchRepository] resetSingleMatchServerFn warning:", serverErr);
        }
      }

      const allCurrent = lookup.matches();
      const updatedMatches: Match[] = allCurrent.map((m) => {
        if (m.id === matchId) {
          return {
            ...m,
            status: "UPCOMING",
            tossWinnerId: undefined,
            tossDecision: undefined,
            manOfTheMatchId: undefined,
            setup: undefined,
            scorecard: undefined,
            resultText: undefined,
          };
        }
        return m;
      });

      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("tpl-scoring:" + matchId);
          window.localStorage.removeItem("tpl-live-match:" + matchId);
          window.localStorage.removeItem("tpl-match-state:" + matchId);
          window.localStorage.removeItem("tpl_match_live_" + matchId);
          window.localStorage.removeItem("tpl_match_completed_" + matchId);
          try {
            window.sessionStorage.removeItem("tpl_scorer_match_pin_" + matchId);
          } catch {}
        } catch {}
      }

      lookup.setMatches(updatedMatches);
      return updatedMatches;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] resetSingleMatch error:", err?.message);
      throw new Error(`Failed to reset match: ${err?.message || "Storage error"}`);
    }
  }

  async generateTournamentSchedule(input: GenerateScheduleInput): Promise<Match[]> {
    try {
      const createdRows = await generateTournamentScheduleServerFn({ data: input });
      const domainMatches = createdRows.map((row, idx) => toMatch(row, idx + 1));
      lookup.setMatches(domainMatches);
      return domainMatches;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] generateTournamentSchedule server error:", err?.message);
      const cleanMsg = (err?.message || "Server error").replace(/^(Failed to generate schedule:\s*)+/i, "").trim();
      throw new Error(`Failed to generate schedule: ${cleanMsg}`);
    }
  }

  async createMatch(match: Match): Promise<Match> {
    try {
      const createdRow = await createMatchServerFn({
        data: {
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          scheduledAt: match.scheduledAt,
          overs: match.overs || 5,
          ballsPerOver: 6,
          venue: match.venue || "TPL Cricket Ground",
          matchNumber: match.matchNumber,
        },
      });

      const assignedMatchNum = match.matchNumber || lookup.getNextMatchNumber();
      const created = toMatch(createdRow, assignedMatchNum);
      lookup.upsertMatch(created);
      return created;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] createMatch server error:", err?.message);
      const cleanMsg = (err?.message || "Server error").replace(/^(Failed to create match:\s*)+/i, "").trim();
      throw new Error(`Failed to create match: ${cleanMsg}`);
    }
  }

  async createSingleMatch(input: {
    teamAId: string;
    teamBId: string;
    scheduledAt: string;
    overs: number;
    ballsPerOver?: number;
    venue?: string;
    matchNumber?: number;
  }): Promise<Match> {
    try {
      const createdRow = await createSingleMatchServerFn({
        data: input,
      });

      const assignedMatchNum = input.matchNumber || lookup.getNextMatchNumber();
      const created = toMatch(createdRow, assignedMatchNum);
      lookup.upsertMatch(created);
      return created;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] createSingleMatch server error:", err?.message);
      const cleanMsg = (err?.message || "Server error").replace(/^(Failed to create match fixture:\s*)+/i, "").trim();
      throw new Error(`Failed to create match fixture: ${cleanMsg}`);
    }
  }

  async updateMatchOvers(matchId: string, overs: number): Promise<Match> {
    try {
      const updatedRow = await updateMatchOversServerFn({ data: { matchId, overs } });
      const updatedMatch = toMatch(updatedRow);
      lookup.updateMatch(matchId, updatedMatch);
      return updatedMatch;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] updateMatchOvers server error:", err?.message);
      const existing = lookup.match(matchId);
      if (existing) {
        const updated = { ...existing, overs };
        lookup.updateMatch(matchId, updated);
        return updated;
      }
      throw new Error(`Failed to update match overs: ${err?.message || "Server error"}`);
    }
  }

  async updateStatus(
    matchId: string,
    status?: MatchStatus,
    options?: {
      tossWinnerId?: string | null;
      tossDecision?: "bat" | "bowl" | null;
      manOfTheMatchId?: string | null;
    },
  ): Promise<Match> {
    try {
      const dbStatus =
        status === "LIVE"
          ? "live"
          : status === "COMPLETED"
          ? "completed"
          : status === "UPCOMING"
          ? "scheduled"
          : undefined;

      const updatedRow = await updateMatchStatusServerFn({
        data: {
          matchId,
          status: dbStatus,
          tossWinnerId: options?.tossWinnerId,
          tossDecision: options?.tossDecision,
          manOfTheMatchId: options?.manOfTheMatchId,
        },
      });

      const updated = toMatch(updatedRow);
      lookup.updateMatch(matchId, updated);
      return updated;
    } catch (err: any) {
      console.error("[SupabaseMatchRepository] updateStatus server error:", err?.message);
      throw new Error(`Failed to update match status: ${err?.message || "Server error"}`);
    }
  }
}

export const teamRepository: TeamRepository = new SupabaseTeamRepository();
export const playerRepository: PlayerRepository = new SupabasePlayerRepository();
export const matchRepository: MatchRepository = new SupabaseMatchRepository();

/**
 * Preloads baseline metadata in the background with timeout safety.
 */
export async function prefetchCricketMetadata(): Promise<void> {
  try {
    const [teams, players, matches] = await Promise.allSettled([
      teamRepository.list(),
      playerRepository.list(),
      matchRepository.list(),
    ]);

    if (teams.status === "fulfilled") lookup.setTeams(teams.value);
    if (players.status === "fulfilled") lookup.setPlayers(players.value);
    if (matches.status === "fulfilled") lookup.setMatches(matches.value);
    lookup.markHydrated();
  } catch (err) {
    console.warn("Background prefetch finished with notice:", err);
  }
}
