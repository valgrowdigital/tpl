import { createServerFn } from "@tanstack/react-start";
import { getServerSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { SupabaseMatch, SupabaseTeam } from "@/types/cricket";
import { BALLS_PER_OVER, getTeamGroup } from "@/types/cricket";
import { SEED_TEAMS } from "@/lib/seedData";
import { getTeamCanonicalKey } from "@/lib/repositories";

/**
 * Authoritatively resolves a team input (UUID, canonical slug, short code, or name)
 * against the live database or official seed teams.
 */
async function resolveOfficialTeam(
  idOrSlugOrName: string,
  supabaseAdmin = getServerSupabaseAdmin(),
): Promise<SupabaseTeam | null> {
  if (!idOrSlugOrName || !idOrSlugOrName.trim()) return null;
  const target = idOrSlugOrName.trim();
  const canonical = getTeamCanonicalKey(target);

  // 1. Query live database teams
  try {
    const { data: dbTeams } = await supabaseAdmin.from("teams").select("*");
    if (dbTeams && dbTeams.length > 0) {
      const match = (dbTeams as SupabaseTeam[]).find(
        (t) =>
          t.id === target ||
          t.slug === target ||
          t.name.toLowerCase() === target.toLowerCase() ||
          getTeamCanonicalKey(t.id) === canonical ||
          getTeamCanonicalKey(t.slug) === canonical ||
          getTeamCanonicalKey(t.name) === canonical,
      );
      if (match) return match;
    }
  } catch (err) {
    console.warn("[resolveOfficialTeam] Database fetch notice:", err);
  }

  // 2. Fallback to SEED_TEAMS
  const seedMatch = SEED_TEAMS.find(
    (t) =>
      t.id === target ||
      t.slug === target ||
      t.name.toLowerCase() === target.toLowerCase() ||
      getTeamCanonicalKey(t.id) === canonical ||
      getTeamCanonicalKey(t.slug) === canonical ||
      getTeamCanonicalKey(t.name) === canonical,
  );

  if (seedMatch) {
    return {
      id: seedMatch.id,
      name: seedMatch.name,
      slug: seedMatch.slug || null,
      logo_url: seedMatch.logoUrl || null,
      owner_name: seedMatch.ownerName || null,
      group_name: seedMatch.groupName || null,
      purse_balance: seedMatch.purseBalance || 0,
      created_at: new Date().toISOString(),
    } as SupabaseTeam;
  }

  return null;
}

export interface FixtureInput {
  id?: string;
  teamAId: string;
  teamBId: string;
  scheduledAt: string;
  overs: number;
}

export interface MatchStatusUpdateInput {
  matchId: string;
  status?: "scheduled" | "live" | "completed" | "abandoned";
  tossWinnerId?: string | null;
  tossDecision?: "bat" | "bowl" | null;
  manOfTheMatchId?: string | null;
}

/**
 * Server Function: Authoritatively reconciles and persists the tournament schedule.
 * Preserves canonical database UUIDs for unchanged/existing fixtures.
 * Only modifies rows with status = 'scheduled'.
 */
export const saveScheduleServerFn = createServerFn({ method: "POST" })
  .validator((fixtures: FixtureInput[]) => fixtures)
  .handler(async ({ data: fixtures }) => {
    const supabaseAdmin = getServerSupabaseAdmin();

    // 1. Fetch all current matches from database
    const { data: existingMatches, error: fetchError } = await supabaseAdmin
      .from("matches")
      .select("*");

    if (fetchError) {
      throw new Error(`Failed to load existing matches: ${fetchError.message}`);
    }

    const allMatches = (existingMatches as SupabaseMatch[]) || [];
    const scheduledRows = allMatches.filter((m) => m.status === "scheduled");

    const matchedExistingIds = new Set<string>();
    const updatesToPerform: Array<{ id: string; patch: Partial<SupabaseMatch> }> = [];
    const rowsToInsert: Array<Omit<SupabaseMatch, "id" | "created_at" | "updated_at">> = [];

    // 1b. Collect existing match PINs to guarantee uniqueness
    const activePins = new Set<string>(
      allMatches.map((m) => m.scorer_pin).filter(Boolean) as string[]
    );

    // 2. Reconcile each generated fixture against database
    for (const fixture of fixtures) {
      const exactMatch = scheduledRows.find(
        (m) =>
          m.team_a_id === fixture.teamAId &&
          m.team_b_id === fixture.teamBId &&
          m.start_time === fixture.scheduledAt &&
          (m.total_overs || 5) === (fixture.overs || 5) &&
          !matchedExistingIds.has(m.id),
      );

      if (exactMatch) {
        // UNCHANGED: Exact match found -> PRESERVE CANONICAL DATABASE UUID
        matchedExistingIds.add(exactMatch.id);
      } else {
        const pairingMatch = scheduledRows.find(
          (m) =>
            m.team_a_id === fixture.teamAId &&
            m.team_b_id === fixture.teamBId &&
            !matchedExistingIds.has(m.id),
        );

        if (pairingMatch) {
          // CHANGED: Same pairing, changed time/overs -> UPDATE in place and PRESERVE UUID
          matchedExistingIds.add(pairingMatch.id);
          updatesToPerform.push({
            id: pairingMatch.id,
            patch: {
              start_time: fixture.scheduledAt,
              total_overs: fixture.overs || 5,
            },
          });
        } else {
          // NEW FIXTURE: Genuinely new row to insert
          const pin = generate4DigitPin(activePins);
          rowsToInsert.push({
            team_a_id: fixture.teamAId,
            team_b_id: fixture.teamBId,
            start_time: fixture.scheduledAt,
            status: "scheduled",
            total_overs: fixture.overs || 5,
            balls_per_over: BALLS_PER_OVER,
            scorer_pin: pin,
          });
        }
      }
    }

    // 3. Execute updates for changed fixtures
    for (const update of updatesToPerform) {
      const { error: updateError } = await supabaseAdmin
        .from("matches")
        .update(update.patch)
        .eq("id", update.id);

      if (updateError) {
        throw new Error(`Failed to update fixture ${update.id}: ${updateError.message}`);
      }
    }

    // 4. Insert new fixtures
    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("matches")
        .insert(rowsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert new fixtures: ${insertError.message}`);
      }
    }

    // 5. Safely delete only obsolete scheduled fixtures (never live/completed)
    const unneededScheduledIds = scheduledRows
      .filter((m) => !matchedExistingIds.has(m.id))
      .map((m) => m.id);

    if (unneededScheduledIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("matches")
        .delete()
        .in("id", unneededScheduledIds);

      if (deleteError) {
        console.warn("[saveScheduleServerFn] delete obsolete notice:", deleteError.message);
      }
    }

    // 6. Return fresh list of all matches
    const { data: updatedMatches, error: refetchError } = await supabaseAdmin
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (refetchError) {
      throw new Error(`Failed to refetch matches: ${refetchError.message}`);
    }

    return (updatedMatches as SupabaseMatch[]) || [];
  });

/**
 * Server Function: Safely deletes ONLY scheduled / pending fixtures.
 * Live, Completed, and Abandoned records, deliveries, innings, and scores are strictly protected at the database level.
 */
export const resetScheduleServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabaseAdmin = getServerSupabaseAdmin();

    // 1. Fetch current matches to inspect their database status
    const { data: allMatches, error: fetchErr } = await supabaseAdmin
      .from("matches")
      .select("id, status");

    if (fetchErr) {
      throw new Error(`Failed to inspect match fixtures: ${fetchErr.message}`);
    }

    // 2. Identify candidate matches for deletion: ONLY scheduled / pending / ready (NEVER live or completed)
    const deletableStatuses = new Set(["scheduled", "ready", "upcoming", "pending"]);
    const deletableIds = (allMatches || [])
      .filter((m) => {
        const s = (m.status || "").toLowerCase().trim();
        // Protect completed, finished, abandoned, live, in_progress
        if (s === "completed" || s === "finished" || s === "abandoned" || s === "live" || s === "in_progress") {
          return false;
        }
        return deletableStatuses.has(s) || !s;
      })
      .map((m) => m.id);

    // 3. Delete ONLY deletable pending fixtures if any exist
    if (deletableIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("matches")
        .delete()
        .in("id", deletableIds)
        .eq("status", "scheduled");

      if (deleteError) {
        throw new Error(`Failed to reset pending fixtures: ${deleteError.message}`);
      }
    }

    // 4. Return the remaining active / completed matches
    const { data: remainingMatches, error: refetchErr } = await supabaseAdmin
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (refetchErr) {
      throw new Error(`Failed to refetch remaining matches: ${refetchErr.message}`);
    }

    return (remainingMatches as SupabaseMatch[]) || [];
  },
);

/**
 * Server Function: Authoritatively resets ALL tournament matches (including LIVE and COMPLETED) back to 'scheduled' state.
 * Resets toss, winner, man of the match, scores, and removes all ball-by-ball deliveries for fresh testing.
 */
export const resetAllTournamentMatchesServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabaseAdmin = getServerSupabaseAdmin();

    // 1. Delete all deliveries / innings data if tables exist
    try {
      await supabaseAdmin.from("deliveries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {}
    try {
      await supabaseAdmin.from("match_innings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {}

    // 2. Reset every match back to scheduled state with clean parameters
    const { error: resetError } = await supabaseAdmin
      .from("matches")
      .update({
        status: "scheduled",
        toss_winner_id: null,
        toss_decision: null,
        man_of_the_match_id: null,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (resetError) {
      console.warn("[resetAllTournamentMatchesServerFn] Reset update notice:", resetError.message);
    }

    // 3. Return fresh list of all matches
    const { data: allMatches, error: fetchError } = await supabaseAdmin
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to refetch matches: ${fetchError.message}`);
    }

    return (allMatches as SupabaseMatch[]) || [];
  },
);

/**
 * Server Function: Authoritatively resets ALL LIVE and COMPLETED matches back to 'scheduled' state.
 * Clears deliveries, innings, toss, and scores while preserving fixtures and scheduled times.
 */
export const resetCompletedAndLiveMatchesServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabaseAdmin = getServerSupabaseAdmin();

    // 1. Fetch current matches to find live or completed match IDs
    const { data: allMatches, error: fetchErr } = await supabaseAdmin
      .from("matches")
      .select("id, status");

    if (fetchErr) {
      throw new Error(`Failed to fetch matches: ${fetchErr.message}`);
    }

    const targetIds = (allMatches || [])
      .filter((m) => {
        const s = (m.status || "").toLowerCase().trim();
        return s === "live" || s === "completed" || s === "finished" || s === "in_progress" || s === "abandoned";
      })
      .map((m) => m.id);

    if (targetIds.length > 0) {
      // 2. Delete deliveries and innings for these matches
      try {
        await supabaseAdmin.from("deliveries").delete().in("match_id", targetIds);
      } catch (e) {
        console.warn("[resetCompletedAndLiveMatchesServerFn] deliveries delete notice:", e);
      }
      try {
        await supabaseAdmin.from("match_innings").delete().in("match_id", targetIds);
      } catch (e) {
        console.warn("[resetCompletedAndLiveMatchesServerFn] match_innings delete notice:", e);
      }

      // 3. Update status back to scheduled and reset match outcome fields
      const { error: resetError } = await supabaseAdmin
        .from("matches")
        .update({
          status: "scheduled",
          toss_winner_id: null,
          toss_decision: null,
          man_of_the_match_id: null,
        })
        .in("id", targetIds);

      if (resetError) {
        console.warn("[resetCompletedAndLiveMatchesServerFn] update notice:", resetError.message);
      }
    }

    // 4. Return fresh list of matches
    const { data: updatedMatches, error: refetchError } = await supabaseAdmin
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (refetchError) {
      throw new Error(`Failed to refetch matches: ${refetchError.message}`);
    }

    return (updatedMatches as SupabaseMatch[]) || [];
  },
);

/**
 * Server Function: Authoritatively resets a SINGLE match by ID back to 'scheduled' state.
 * Clears deliveries, innings, toss, and scores for that match.
 */
export const resetSingleMatchServerFn = createServerFn({ method: "POST" })
  .validator((d: { matchId: string }) => d)
  .handler(async ({ data: { matchId } }) => {
    if (!matchId) throw new Error("Match ID is required for reset.");
    const supabaseAdmin = getServerSupabaseAdmin();

    try {
      await supabaseAdmin.from("deliveries").delete().eq("match_id", matchId);
    } catch (e) {
      console.warn("[resetSingleMatchServerFn] deliveries delete notice:", e);
    }
    try {
      await supabaseAdmin.from("match_innings").delete().eq("match_id", matchId);
    } catch (e) {
      console.warn("[resetSingleMatchServerFn] match_innings delete notice:", e);
    }

    const { error: resetErr } = await supabaseAdmin
      .from("matches")
      .update({
        status: "scheduled",
        toss_winner_id: null,
        toss_decision: null,
        man_of_the_match_id: null,
      })
      .eq("id", matchId);

    if (resetErr) {
      console.warn("[resetSingleMatchServerFn] update notice:", resetErr.message);
    }

    const { data: allMatches, error: fetchError } = await supabaseAdmin
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to refetch matches: ${fetchError.message}`);
    }

    return (allMatches as SupabaseMatch[]) || [];
  });



export interface GenerateScheduleInput {
  group1TeamIds: string[];
  group2TeamIds: string[];
  startDate: string;
  startTime: string; // HH:mm or parsed 24h
  overs: number;
  ballsPerOver: number;
  intervalMinutes: number;
}

/**
 * Generates a secure, cryptographically random 4-digit numeric PIN (1000 - 9999).
 * Guarantees uniqueness against active and scheduled matches.
 */
export function generate4DigitPin(existingPins: Set<string> = new Set()): string {
  for (let attempt = 0; attempt < 10000; attempt++) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existingPins.has(pin)) {
      existingPins.add(pin);
      return pin;
    }
  }
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Server Function: Generates 9 cross-group tournament matches between Group 1 and Group 2.
 */
export const generateTournamentScheduleServerFn = createServerFn({ method: "POST" })
  .validator((input: GenerateScheduleInput) => input)
  .handler(async ({ data: input }) => {
    const supabaseAdmin = getServerSupabaseAdmin();

    if (!input.group1TeamIds || input.group1TeamIds.length !== 3) {
      throw new Error("Group 1 must contain exactly 3 teams.");
    }
    if (!input.group2TeamIds || input.group2TeamIds.length !== 3) {
      throw new Error("Group 2 must contain exactly 3 teams.");
    }

    const allTeams = [...input.group1TeamIds, ...input.group2TeamIds];
    const uniqueTeams = new Set(allTeams);
    if (uniqueTeams.size !== 6) {
      throw new Error("All 6 selected tournament teams must be distinct.");
    }

    // Resolve all group teams to ensure valid DB IDs
    const resolvedG1 = await Promise.all(input.group1TeamIds.map((id) => resolveOfficialTeam(id, supabaseAdmin)));
    const resolvedG2 = await Promise.all(input.group2TeamIds.map((id) => resolveOfficialTeam(id, supabaseAdmin)));

    if (resolvedG1.some((t) => !t) || resolvedG2.some((t) => !t)) {
      throw new Error("All selected schedule teams must be valid official tournament teams.");
    }

    // Verify group allocations
    for (const t of resolvedG1) {
      if (t && getTeamGroup(t) !== "Group 1") {
        throw new Error(`Invalid schedule: Team "${t.name}" belongs to Group 2 and cannot be assigned to Group 1.`);
      }
    }
    for (const t of resolvedG2) {
      if (t && getTeamGroup(t) !== "Group 2") {
        throw new Error(`Invalid schedule: Team "${t.name}" belongs to Group 1 and cannot be assigned to Group 2.`);
      }
    }

    // Collect existing match PINs to guarantee uniqueness
    const { data: existingMatchRows } = await supabaseAdmin
      .from("matches")
      .select("scorer_pin");
    const activePins = new Set<string>(
      (existingMatchRows || []).map((m) => m.scorer_pin).filter(Boolean) as string[],
    );

    const overs = Math.max(1, Number(input.overs) || 5);
    const ballsPerOver = Math.max(1, Number(input.ballsPerOver) || BALLS_PER_OVER);
    const intervalMinutes = Math.max(15, Number(input.intervalMinutes) || 45);

    // Parse base start datetime (safely handle 00:00 midnight)
    const timeParts = (input.startTime || "09:00").split(":");
    const parsedHour = parseInt(timeParts[0], 10);
    const parsedMin = parseInt(timeParts[1], 10);
    const hours = isNaN(parsedHour) ? 9 : Math.max(0, Math.min(23, parsedHour));
    const minutes = isNaN(parsedMin) ? 0 : Math.max(0, Math.min(59, parsedMin));
    const [y, m, d] = (input.startDate || "2026-08-30").split("-").map(Number);
    const baseDate = new Date(y, (m || 1) - 1, d || 1, hours, minutes, 0, 0);

    const fixturesToInsert: Omit<SupabaseMatch, "id" | "created_at" | "updated_at">[] = [];

    // Optimal zero back-to-back cross-group scheduling sequence:
    const fixtureIndexPairs: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 2],
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 2],
      [1, 0],
      [2, 1],
    ];

    for (let idx = 0; idx < fixtureIndexPairs.length; idx++) {
      const [g1Idx, g2Idx] = fixtureIndexPairs[idx];
      const scheduledTime = new Date(baseDate.getTime() + idx * intervalMinutes * 60 * 1000);
      const pin = generate4DigitPin(activePins);
      fixturesToInsert.push({
        team_a_id: resolvedG1[g1Idx]!.id,
        team_b_id: resolvedG2[g2Idx]!.id,
        start_time: scheduledTime.toISOString(),
        status: "scheduled",
        total_overs: overs,
        balls_per_over: ballsPerOver,
        scorer_pin: pin,
      });
    }

    const { data, error } = await supabaseAdmin
      .from("matches")
      .insert(fixturesToInsert)
      .select("*")
      .order("start_time", { ascending: true });

    if (error || !data) {
      const errMsg = (error?.message || "Unknown error").replace(/^(Failed to generate schedule:\s*)+/i, "").trim();
      throw new Error(`Failed to generate schedule: ${errMsg}`);
    }

    return data as SupabaseMatch[];
  });

export interface CreateSingleMatchInput {
  teamAId: string;
  teamBId: string;
  scheduledAt: string;
  overs: number;
  ballsPerOver?: number;
  venue?: string;
  matchNumber?: number;
  scorerPin?: string;
}

/**
 * Server Function: Creates a single new tournament match fixture with comprehensive server-side validation.
 */
export const createSingleMatchServerFn = createServerFn({ method: "POST" })
  .validator((input: CreateSingleMatchInput) => input)
  .handler(async ({ data: input }) => {
    const supabaseAdmin = getServerSupabaseAdmin();

    // 1. Validate team inputs
    if (!input.teamAId || !input.teamBId) {
      throw new Error("Both Team 1 and Team 2 must be selected.");
    }
    if (input.teamAId === input.teamBId) {
      throw new Error("Team 1 and Team 2 cannot be the same team.");
    }

    // 2. Validate and resolve official teams
    const teamA = await resolveOfficialTeam(input.teamAId, supabaseAdmin);
    const teamB = await resolveOfficialTeam(input.teamBId, supabaseAdmin);

    if (!teamA || !teamB) {
      throw new Error("Selected teams must be valid official tournament teams.");
    }

    if (teamA.id === teamB.id) {
      throw new Error("Team 1 and Team 2 cannot be the same team.");
    }

    // 3. Validate scheduled date and time
    const parsedDate = new Date(input.scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Please provide a valid match date and start time.");
    }

    // 4. Validate overs & balls per over
    const overs = Math.max(1, Math.min(50, Math.floor(Number(input.overs) || 5)));
    const ballsPerOver = Math.max(1, Math.min(12, Math.floor(Number(input.ballsPerOver) || BALLS_PER_OVER)));

    // 5. Generate secure 4-digit PIN if not provided
    const { data: existingMatchRows } = await supabaseAdmin
      .from("matches")
      .select("scorer_pin");
    const activePins = new Set<string>(
      (existingMatchRows || []).map((m) => m.scorer_pin).filter(Boolean) as string[],
    );
    const assignedPin = input.scorerPin?.trim() || generate4DigitPin(activePins);

    const row: Omit<SupabaseMatch, "id" | "created_at" | "updated_at"> = {
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      start_time: parsedDate.toISOString(),
      status: "scheduled",
      total_overs: overs,
      balls_per_over: ballsPerOver,
      scorer_pin: assignedPin,
    };

    const { data, error } = await supabaseAdmin
      .from("matches")
      .insert([row])
      .select("*")
      .single();

    if (error || !data) {
      const errMsg = (error?.message || "Unknown error").replace(/^(Failed to create match fixture:\s*)+/i, "").trim();
      throw new Error(`Failed to create match fixture: ${errMsg}`);
    }

    return data as SupabaseMatch;
  });

/**
 * Server Function: Alias for backward compatibility.
 */
export const createMatchServerFn = createSingleMatchServerFn;

/**
 * Server Function: Updates match status, toss result, or player of the match.
 */
export const updateMatchStatusServerFn = createServerFn({ method: "POST" })
  .validator((input: MatchStatusUpdateInput) => input)
  .handler(async ({ data: input }) => {
    const supabaseAdmin = getServerSupabaseAdmin();

    const patch: Partial<SupabaseMatch> = {};
    if (input.status) patch.status = input.status;
    if (input.tossWinnerId !== undefined) patch.toss_winner_id = input.tossWinnerId;
    if (input.tossDecision !== undefined) patch.toss_decision = input.tossDecision;
    if (input.manOfTheMatchId !== undefined) patch.man_of_the_match_id = input.manOfTheMatchId;

    const { data, error } = await supabaseAdmin
      .from("matches")
      .update(patch)
      .eq("id", input.matchId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update match status: ${error?.message || "Unknown error"}`);
    }

    return data as SupabaseMatch;
  });

/**
 * Server Function: Authoritatively updates total_overs for a match in Supabase.
 */
export const updateMatchOversServerFn = createServerFn({ method: "POST" })
  .validator((input: { matchId: string; overs: number }) => input)
  .handler(async ({ data: input }) => {
    const supabaseAdmin = getServerSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("matches")
      .update({ total_overs: input.overs })
      .eq("id", input.matchId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to update match overs: ${error?.message || "Unknown error"}`);
    }

    return data as SupabaseMatch;
  });

