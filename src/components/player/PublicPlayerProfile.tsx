import { useState, useMemo } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Flame,
  Shield,
  Trophy,
  Activity,
  Target,
  User,
  Radio,
  ArrowRight,
  Compass,
  Scale,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import type { Player, Team, Match } from "@/types/cricket";
import { lookup } from "@/lib/repositories";
import { useMatchStore, loadMatchDoc } from "@/lib/scoring/store";
import { calculatePlayerPerformance } from "@/lib/scoring/playerPerformance";
import { calculateBatterWagonWheel } from "@/lib/scoring/wagon-wheel";
import { WagonWheel } from "@/components/scoring/WagonWheel";
import { formatMatchDate } from "@/lib/utils";

interface PublicPlayerProfileProps {
  player: Player;
  team?: Team;
  allMatches: Match[];
}

export function PublicPlayerProfile({ player, team, allMatches }: PublicPlayerProfileProps) {
  const router = useRouter();


  // Find if there is an active live match involving this player's team
  const liveMatch = allMatches.find(
    (m) =>
      m.status === "LIVE" && (m.teamAId === player.teamId || m.teamBId === player.teamId),
  );

  // Live match store connection (reactively subscribes to realtime deliveries)
  const liveStore = useMatchStore(liveMatch?.id ?? "");

  // Calculate real aggregated performance
  const stats = calculatePlayerPerformance(
    player.id,
    allMatches,
    liveStore.state,
    liveMatch?.id,
  );
  const teamData = team ?? lookup.team(player.teamId);

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null);
  const allTournamentPlayers = useMemo(
    () => lookup.players().filter((p) => p.id !== player.id),
    [player.id],
  );
  const comparePlayer = comparePlayerId ? lookup.player(comparePlayerId) : null;
  const compareStats = useMemo(
    () =>
      comparePlayer
        ? calculatePlayerPerformance(comparePlayer.id, allMatches, liveStore.state, liveMatch?.id)
        : null,
    [comparePlayer, allMatches, liveStore.state, liveMatch?.id],
  );

  // Collect all deliveries where this player was striker across all tournament matches
  const playerDeliveries = useMemo(() => {
    const list: {
      strikerId: string;
      runsOffBat: number;
      shotZone: string | null;
      overNumber: number;
      ballNumber: number;
    }[] = [];

    // 1. Gather deliveries from all stored match documents
    allMatches.forEach((m) => {
      const doc = loadMatchDoc(m.id);
      doc.deliveries.forEach((d) => {
        if (d.strikerId === player.id) {
          list.push({
            strikerId: d.strikerId,
            runsOffBat:
              d.batterRuns ??
              (d as any).runsOffBat ??
              (d as any).runs_off_bat ??
              0,
            shotZone: d.shotZone ?? (d as any).shot_zone ?? null,
            overNumber: 0,
            ballNumber: 0,
          });
        }
      });
    });

    // 2. Also incorporate active live match deliveries from liveStore
    if (liveStore.doc.deliveries.length > 0) {
      liveStore.doc.deliveries.forEach((d) => {
        if (
          d.strikerId === player.id &&
          !list.some((existing) => (existing as any).id === d.id)
        ) {
          list.push({
            strikerId: d.strikerId,
            runsOffBat:
              d.batterRuns ??
              (d as any).runsOffBat ??
              (d as any).runs_off_bat ??
              0,
            shotZone: d.shotZone ?? (d as any).shot_zone ?? null,
            overNumber: 0,
            ballNumber: 0,
          });
        }
      });
    }

    return list;
  }, [allMatches, liveStore.doc.deliveries, player.id]);

  const wagonSummary = useMemo(() => {
    return calculateBatterWagonWheel(player.id, player.name, playerDeliveries);
  }, [player.id, player.name, playerDeliveries]);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 pb-20 flex flex-col gap-6">
      {/* ── TOP NAVIGATION BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.history.back();
              } else {
                router.navigate({ to: "/home" });
              }
            }}
            className="tap inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-xs font-black uppercase tracking-wider text-[#111111] hover:bg-[#F7F7F5] shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <button
            onClick={() => setCompareModalOpen(true)}
            className="tap inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F7F5] hover:bg-[#E5E5E5] border border-[#E5E5E5] text-xs font-black uppercase tracking-wider text-[#111111] transition-all cursor-pointer"
          >
            <Scale className="h-3.5 w-3.5 text-[#D9A928]" />
            <span>Compare</span>
          </button>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-[#5F6368] bg-[#F3F4F6] border border-[#E5E5E5] px-3 py-1 rounded-full shadow-xs">
          TPL 2026 PLAYER PROFILE
        </span>
      </div>

      {/* ── 1. PLAYER HEADER ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-7 text-[#111111] shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6">
          {/* Avatar / Photo */}
          <div className="relative shrink-0">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-2xl bg-[#F7F7F5] border border-[#E5E5E5] p-1 flex items-center justify-center shadow-xs overflow-hidden">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="h-full w-full object-cover rounded-xl"
                />
              ) : (
                <User className="h-14 w-14 text-[#94A3B8]" />
              )}
              {teamData?.logoUrl && (
                <div className="absolute bottom-1 left-1 h-7 w-7 rounded-lg bg-white border border-[#E5E5E5] p-0.5 shadow-xs">
                  <img src={teamData.logoUrl} alt="" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Player Identity */}
          <div className="flex-1 text-center md:text-left flex flex-col justify-center">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-[#D9A928] border border-[#D9A928]/40 text-[10px] font-black uppercase tracking-widest">
                {player.role}
              </span>
              {player.referenceId && (
                <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] border border-[#E5E5E5] text-[#5F6368] text-[10px] font-mono font-bold">
                  #{player.referenceId}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111111] leading-tight">
              {player.name}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-1.5">
              <p className="text-xs sm:text-sm font-bold text-[#5F6368] uppercase tracking-wider">
                {teamData?.name ?? "Team TPL"}
              </p>
            </div>
          </div>


          {/* Career / Tournament Summary Bar */}
          <div className="flex items-center gap-3 sm:gap-4 bg-[#F7F7F5] border border-[#E5E5E5] px-4 py-3 rounded-2xl shrink-0">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-black text-[#111111] tabular-nums">
                {stats.matchesPlayed}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-widest">Matches</p>
            </div>
            <div className="h-8 w-px bg-[#E5E5E5]" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-black text-[#111111] tabular-nums">
                {stats.batting.runs}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-widest">Runs</p>
            </div>
            <div className="h-8 w-px bg-[#E5E5E5]" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-black text-[#111111] tabular-nums">
                {stats.bowling.wickets}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-widest">Wickets</p>
            </div>
            <div className="h-8 w-px bg-[#E5E5E5]" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-black text-[#D9A928] tabular-nums">
                {stats.batting.strikeRate > 0 ? stats.batting.strikeRate.toFixed(2) : "0.00"}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-widest">SR</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE MATCH PERFORMANCE STRIP (IF ACTIVELY LIVE) ───────────── */}
      {stats.currentLiveMatch && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121316] text-white border border-[#E5E5E5] shadow-md">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-red-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-red-400">
                LIVE IN MATCH #{stats.currentLiveMatch.match.matchNumber}
              </span>
            </div>
            <Link
              to="/scorecard/$matchId"
              params={{ matchId: stats.currentLiveMatch.match.id }}
              className="text-[10px] font-black text-[#D9A928] uppercase hover:underline flex items-center gap-1"
            >
              Open Match Centre <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.currentLiveMatch.liveBatterStat && (
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-white/60 uppercase">Current Batting</p>
                <p className="text-lg font-black text-white mt-0.5">
                  {stats.currentLiveMatch.liveBatterStat.runs}
                  {!stats.currentLiveMatch.liveBatterStat.out && "*"}
                  <span className="text-xs font-bold text-white/60 ml-1">
                    ({stats.currentLiveMatch.liveBatterStat.balls}b)
                  </span>
                </p>
                <p className="text-[10px] text-white/60 font-medium mt-1">
                  4s: {stats.currentLiveMatch.liveBatterStat.fours} • 6s: {stats.currentLiveMatch.liveBatterStat.sixes} • SR: {stats.currentLiveMatch.liveBatterStat.strikeRate.toFixed(1)}
                </p>
              </div>
            )}

            {stats.currentLiveMatch.liveBowlerStat && (
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-white/60 uppercase">Current Bowling</p>
                <p className="text-lg font-black text-[#D9A928] mt-0.5">
                  {stats.currentLiveMatch.liveBowlerStat.wickets}/{stats.currentLiveMatch.liveBowlerStat.runs}
                  <span className="text-xs font-bold text-white/60 ml-1">
                    ({stats.currentLiveMatch.liveBowlerStat.oversText} ov)
                  </span>
                </p>
                <p className="text-[10px] text-white/60 font-medium mt-1">
                  Econ: {stats.currentLiveMatch.liveBowlerStat.economy.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. BATTING PERFORMANCE ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#D9A928]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              BATTING
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#5F6368] uppercase">TPL 2026</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#111111] tabular-nums">{stats.batting.runs}</p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Runs</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#111111] tabular-nums">{stats.batting.balls}</p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Balls</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#D9A928] tabular-nums">{stats.batting.fours}</p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">4s</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#EF4444] tabular-nums">{stats.batting.sixes}</p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">6s</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#111111] tabular-nums">
              {stats.batting.average > 0
                ? stats.batting.average.toFixed(2)
                : stats.batting.runs > 0
                ? `${stats.batting.runs.toFixed(2)}*`
                : "0.00"}
            </p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Average</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
            <p className="text-xl font-black text-[#111111] tabular-nums">
              {stats.batting.strikeRate > 0 ? stats.batting.strikeRate.toFixed(2) : "0.00"}
            </p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Strike Rate</p>
          </div>
          <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center col-span-2 sm:col-span-1">
            <p className="text-xl font-black text-[#111111] tabular-nums">
              {stats.batting.highestScore.runs}
              {stats.batting.highestScore.isNotOut && "*"}
            </p>
            <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">High Score</p>
          </div>
        </div>
      </div>

      {/* ── 3. BOWLING PERFORMANCE ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#D9A928]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              BOWLING
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#5F6368] uppercase">TPL 2026</span>
        </div>

        {stats.bowling.hasBowled ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">{stats.bowling.oversText}</p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Overs</p>
            </div>
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">{stats.bowling.wickets}</p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Wickets</p>
            </div>
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">
                {stats.bowling.economy > 0 ? stats.bowling.economy.toFixed(2) : "0.00"}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Economy</p>
            </div>
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">
                {stats.bowling.average > 0 ? stats.bowling.average.toFixed(2) : "0.00"}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Average</p>
            </div>
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">
                {stats.bowling.bestBowling.wickets > 0
                  ? `${stats.bowling.bestBowling.wickets}/${stats.bowling.bestBowling.runs}`
                  : "-"}
              </p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Best Figures</p>
            </div>
            <div className="bg-[#F7F7F5] p-3 rounded-2xl text-center">
              <p className="text-xl font-black text-[#111111] tabular-nums">{stats.bowling.runsConceded}</p>
              <p className="text-[9px] font-bold text-[#5F6368] uppercase tracking-wider">Runs Conceded</p>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center flex flex-col items-center justify-center gap-1.5 text-[#5F6368]">
            <p className="text-xs font-bold">No bowling performance recorded in tournament.</p>
          </div>
        )}
      </div>

      {/* ── 4. FIELDING PERFORMANCE ────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3 mb-4">
          <Shield className="h-4 w-4 text-[#D9A928]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
            FIELDING
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#F7F7F5] p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-[#111111] tabular-nums">{stats.fielding.catches}</p>
            <p className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mt-0.5">Catches</p>
          </div>
          <div className="bg-[#F7F7F5] p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-[#111111] tabular-nums">{stats.fielding.runOuts}</p>
            <p className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mt-0.5">Run Outs</p>
          </div>
          <div className="bg-[#F7F7F5] p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-[#111111] tabular-nums">{stats.fielding.stumpings}</p>
            <p className="text-[10px] font-bold text-[#5F6368] uppercase tracking-wider mt-0.5">Stumpings</p>
          </div>
        </div>
      </div>

      {/* ── 5. WAGON WHEEL (PLAYER-SPECIFIC TOURNAMENT SHOT MAP) ────────── */}
      <WagonWheel
        summary={wagonSummary}
        batterStat={{
          runs: stats.batting.runs,
          balls: stats.batting.balls,
          fours: stats.batting.fours,
          sixes: stats.batting.sixes,
          strikeRate: stats.batting.strikeRate,
        }}
      />

      {/* ── 6. MATCH HISTORY ───────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#D9A928]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-[#111111]">
              MATCH HISTORY
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#5F6368] uppercase">TPL 2026</span>
        </div>

        {stats.matchHistory.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#E5E5E5]">
            {stats.matchHistory.map((m) => (
              <div
                key={m.matchId}
                className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#F7F7F5] border border-[#E5E5E5] p-1 flex items-center justify-center">
                    {m.opponentTeamLogo ? (
                      <img src={m.opponentTeamLogo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-black text-[#D9A928]">VS</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#111111] uppercase tracking-wide">
                      Match #{m.matchNumber} vs {m.opponentTeamName}
                    </p>
                    <p className="text-[10px] text-[#5F6368] font-medium">
                      {formatMatchDate(m.matchDate)} {m.resultText ? `• ${m.resultText}` : ""}
                    </p>
                  </div>
                </div>

                {/* Match Figures */}
                <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
                  {m.batting && (
                    <div className="text-right">
                      <p className="font-black text-[#111111] tabular-nums">
                        {m.batting.runs}
                        {m.batting.isNotOut && "*"} <span className="text-[11px] text-[#5F6368] font-bold">({m.batting.balls}b)</span>
                      </p>
                      <p className="text-[9px] text-[#5F6368] font-bold">
                        {m.batting.fours}x4 • {m.batting.sixes}x6 • SR {m.batting.strikeRate.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {m.bowling && (
                    <div className="text-right">
                      <p className="font-black text-[#9A6A05] tabular-nums">
                        {m.bowling.wickets}/{m.bowling.runs} <span className="text-[11px] text-[#5F6368] font-bold">({m.bowling.oversText} ov)</span>
                      </p>
                      <p className="text-[9px] text-[#5F6368] font-bold">
                        Econ {m.bowling.economy.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {m.fielding && (m.fielding.catches > 0 || m.fielding.runOuts > 0 || m.fielding.stumpings > 0) && (
                    <div className="text-right">
                      <p className="font-bold text-[#111111] text-[11px]">
                        {[
                          m.fielding.catches > 0 ? `${m.fielding.catches}c` : null,
                          m.fielding.runOuts > 0 ? `${m.fielding.runOuts}ro` : null,
                          m.fielding.stumpings > 0 ? `${m.fielding.stumpings}st` : null,
                        ].filter(Boolean).join(" • ")}
                      </p>
                      <p className="text-[9px] text-[#5F6368] font-bold">Fielding</p>
                    </div>
                  )}

                  <Link
                    to="/scorecard/$matchId"
                    params={{ matchId: m.matchId }}
                    className="tap shrink-0 px-3 py-1.5 rounded-xl bg-[#F7F7F5] hover:bg-[#D9A928] hover:text-black border border-[#E5E5E5] text-[10px] font-black uppercase tracking-wider text-[#111111] transition-all"
                  >
                    Match Centre →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-1.5 text-[#5F6368]">
            <Activity className="h-6 w-6 text-[#5F6368]/40" />
            <p className="text-xs font-bold">No match performance recorded yet.</p>
          </div>
        )}
      </div>

      {/* ── 7. PLAYER COMPARISON MODAL (SECTION 26) ─────────────────────────── */}
      {compareModalOpen && (
        <div
          className="fixed inset-0 z-50 glass-overlay flex items-center justify-center p-4"
          onClick={() => setCompareModalOpen(false)}
        >
          <div
            className="w-full max-w-xl animate-scale-up rounded-3xl bg-white border border-[#E5E5E5] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#D9A928]/15 text-[#9A6A05] flex items-center justify-center border border-[#D9A928]/30">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#111111]">
                    HEAD-TO-HEAD PLAYER COMPARISON
                  </h3>
                  <p className="text-[10px] text-[#5F6368] font-bold uppercase">
                    Compare with any TPL 2026 player
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="tap h-8 w-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#5F6368] hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Player Selection Dropdown */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#5F6368] mb-1.5">
                Select Opposing Player
              </label>
              <select
                value={comparePlayerId ?? ""}
                onChange={(e) => setComparePlayerId(e.target.value || null)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F7F7F5] border border-[#E5E5E5] text-xs font-bold text-[#111111] focus:ring-2 focus:ring-[#D9A928]"
              >
                <option value="">-- Choose a player to compare --</option>
                {allTournamentPlayers.map((p) => {
                  const t = lookup.team(p.teamId);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t?.shortName ?? "TPL"}) — {p.role}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Comparison Table */}
            {comparePlayer && compareStats ? (
              <div className="flex flex-col gap-3">
                {/* Headers */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#111111] text-white text-center">
                  <div className="text-left">
                    <p className="text-xs font-black uppercase text-[#D9A928] truncate">{player.name}</p>
                    <p className="text-[9px] text-white/60 uppercase">{teamData?.shortName ?? "TPL"}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">VS</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-purple-400 truncate">{comparePlayer.name}</p>
                    <p className="text-[9px] text-white/60 uppercase">{lookup.team(comparePlayer.teamId)?.shortName ?? "TPL"}</p>
                  </div>
                </div>

                {/* Metrics Matrix */}
                <div className="flex flex-col divide-y divide-[#E5E5E5] text-xs">
                  {[
                    { label: "Matches", valA: stats.matchesPlayed, valB: compareStats.matchesPlayed },
                    { label: "Runs Scored", valA: stats.batting.runs, valB: compareStats.batting.runs, highlight: true },
                    { label: "Strike Rate", valA: stats.batting.strikeRate > 0 ? stats.batting.strikeRate.toFixed(1) : "-", valB: compareStats.batting.strikeRate > 0 ? compareStats.batting.strikeRate.toFixed(1) : "-" },
                    { label: "Batting Average", valA: stats.batting.average > 0 ? stats.batting.average.toFixed(1) : "-", valB: compareStats.batting.average > 0 ? compareStats.batting.average.toFixed(1) : "-" },
                    { label: "Boundaries (4s / 6s)", valA: `${stats.batting.fours} / ${stats.batting.sixes}`, valB: `${compareStats.batting.fours} / ${compareStats.batting.sixes}` },
                    { label: "Highest Score", valA: `${stats.batting.highestScore.runs}${stats.batting.highestScore.isNotOut ? "*" : ""}`, valB: `${compareStats.batting.highestScore.runs}${compareStats.batting.highestScore.isNotOut ? "*" : ""}` },
                    { label: "Wickets Taken", valA: stats.bowling.wickets, valB: compareStats.bowling.wickets, highlight: true },
                    { label: "Bowling Economy", valA: stats.bowling.economy > 0 ? stats.bowling.economy.toFixed(2) : "-", valB: compareStats.bowling.economy > 0 ? compareStats.bowling.economy.toFixed(2) : "-" },
                    { label: "Best Bowling", valA: stats.bowling.bestBowling.wickets > 0 ? `${stats.bowling.bestBowling.wickets}/${stats.bowling.bestBowling.runs}` : "-", valB: compareStats.bowling.bestBowling.wickets > 0 ? `${compareStats.bowling.bestBowling.wickets}/${compareStats.bowling.bestBowling.runs}` : "-" },
                    { label: "Fielding Dismissals", valA: stats.fielding.catches + stats.fielding.runOuts + stats.fielding.stumpings, valB: compareStats.fielding.catches + compareStats.fielding.runOuts + compareStats.fielding.stumpings },
                  ].map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 py-2 items-center text-center">
                      <span className="font-black text-[#111111] tabular-nums text-left">{row.valA}</span>
                      <span className="text-[10px] font-bold text-[#5F6368] uppercase">{row.label}</span>
                      <span className="font-black text-[#111111] tabular-nums text-right">{row.valB}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#5F6368] text-xs font-bold">
                Select a player above to see instant side-by-side performance metrics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

