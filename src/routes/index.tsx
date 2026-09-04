import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Radio,
  Trophy,
  User,
  AlignJustify,
  X,
  Wifi,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useMatches, usePlayers, useTeams, useLiveMatchState } from "@/hooks/useCricketData";
import { calculateTournamentStats } from "@/lib/scoring/statistics";
import { lookup, isPlayerInTeam } from "@/lib/repositories";
import { useMatchStore } from "@/lib/scoring/store";
import { TeamLogo } from "@/components/team/TeamLogo";
import type { Match, Team } from "@/types/cricket";

export const Route = createFileRoute("/")({
  component: LandingScreen,
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="h-0.5 w-5 bg-[#D9A928]" />
      <p className="text-[10px] font-black tracking-[0.25em] text-[#D9A928] uppercase">
        {children}
      </p>
    </div>
  );
}

// ─── Happening Now Live Match Card ───────────────────────────────────────────
function HappeningNowCard({ match }: { match: Match }) {
  const { state } = useMatchStore(match.id, match);

  const isDone = match.status === "COMPLETED" || state?.phase === "complete";
  const hasDeliveries =
    (state?.innings[0]?.legalBalls ?? 0) > 0 ||
    (state?.innings[0]?.extras ?? 0) > 0 ||
    (state?.innings[1]?.legalBalls ?? 0) > 0;
  const isLive =
    !isDone &&
    (match.status === "LIVE" ||
      (hasDeliveries &&
        (state?.phase === "innings1" ||
          state?.phase === "innings2" ||
          state?.phase === "break")));

  const effectiveOvers = state?.innings[0]?.maxOvers ?? match.overs ?? 5;

  const inn1 = state?.innings[0];
  const inn2 = state?.innings[1];

  const battingFirstId =
    state?.innings[0]?.battingTeamId ?? state?.setup?.battingFirstId;
  const firstTeamId = battingFirstId || match.teamAId;
  const secondTeamId =
    firstTeamId === match.teamAId ? match.teamBId : match.teamAId;

  const team1 = lookup.team(firstTeamId);
  const team2 = lookup.team(secondTeamId);

  const getScoreDisplay = (
    inn: typeof inn1 | undefined,
    hasBatted: boolean
  ) => {
    if (!inn || !hasBatted) return "-";
    const ov = inn.oversText.endsWith(".0")
      ? inn.oversText.slice(0, -2)
      : inn.oversText;
    return `${inn.runs}/${inn.wickets} (${ov} Ov)`;
  };

  const team1Batted =
    isLive || isDone || (inn1 && (inn1.legalBalls > 0 || inn1.runs > 0));
  const team2Batted =
    isDone ||
    (inn2 && (inn2.legalBalls > 0 || inn2.runs > 0)) ||
    state?.currentInningsIndex === 1;

  const team1Score = getScoreDisplay(inn1, Boolean(team1Batted));
  const team2Score = getScoreDisplay(inn2, Boolean(team2Batted));

  return (
    <Link
      to="/scorecard/$matchId"
      params={{ matchId: match.id }}
      className="group block min-w-[280px] sm:min-w-[320px] max-w-[380px] flex-1 shrink-0 rounded-2xl bg-[#111113] border border-white/[0.08] hover:border-[#D9A928]/50 p-4 sm:p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
    >
      {/* Top row: Status pill + Overs */}
      <div className="flex items-center justify-between mb-3.5">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#E50914] text-white font-black text-[10px] tracking-wider uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        ) : isDone ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 text-emerald-400 border border-emerald-500/30 font-black text-[10px] tracking-wider uppercase">
            COMPLETED
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-white/10 text-white/50 font-black text-[10px] tracking-wider uppercase">
            UPCOMING
          </span>
        )}
        <span className="text-[10px] sm:text-[11px] font-bold text-white/40 tracking-wider uppercase">
          {effectiveOvers} OV MATCH
        </span>
      </div>

      {/* Teams & Scores */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[62%] group-hover:text-[#D9A928] transition-colors">
            {team1?.name || "Team 1"}
          </span>
          <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight shrink-0">
            {team1Score}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-bold text-white/90 tracking-wide truncate max-w-[62%] group-hover:text-[#D9A928] transition-colors">
            {team2?.name || "Team 2"}
          </span>
          <span className="text-xs sm:text-sm font-black text-white/90 font-mono tracking-tight shrink-0">
            {team2Score}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Happening Now Section ───────────────────────────────────────────────────
function HappeningNowSection({ matches }: { matches: Match[] }) {
  const displayMatches = useMemo(() => {
    const live = matches.filter((m) => m.status === "LIVE");
    const upcoming = matches.filter(
      (m) => m.status === "READY" || m.status === "UPCOMING"
    );
    const completed = matches.filter((m) => m.status === "COMPLETED");
    const combined = [...live, ...upcoming, ...completed];
    return combined.slice(0, 6);
  }, [matches]);

  if (displayMatches.length === 0) return null;

  return (
    <section className="relative z-20 bg-[#D9A928] py-6 sm:py-8 shadow-inner border-y border-black/10">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center justify-center text-red-600 font-bold text-sm sm:text-base animate-pulse">
              ((•))
            </span>
            <h2 className="text-xs sm:text-sm font-black tracking-[0.2em] text-[#0A0A0A] uppercase">
              HAPPENING NOW
            </h2>
          </div>
          <Link
            to="/matches"
            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black tracking-wider text-[#0A0A0A] hover:text-black/70 transition-colors uppercase group"
          >
            <span>VIEW ALL</span>
            <span className="text-sm leading-none transition-transform group-hover:translate-x-0.5">
              ›
            </span>
          </Link>
        </div>

        <div className="flex items-stretch gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-black/20 scrollbar-track-transparent">
          {displayMatches.map((m) => (
            <HappeningNowCard key={m.id} match={m} />
          ))}
        </div>
      </div>
    </section>
  );
}






function LandingScreen() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers();
  const { data: teams = [] } = useTeams();
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<Team | null>(null);
  const stats = useMemo(() => calculateTournamentStats(matches), [matches]);

  const liveMatches = matches.filter((m) => m.status === "LIVE");
  const firstLiveId = liveMatches[0]?.id;

  const topScorer = stats.orangeCap[0];
  const topBowler = stats.purpleCap[0];
  const topMvp = stats.mvpLeaderboard[0];

  const scorerPlayer = topScorer ? players.find((p) => p.id === topScorer.playerId) : undefined;
  const bowlerPlayer = topBowler ? players.find((p) => p.id === topBowler.playerId) : undefined;
  const mvpPlayer = topMvp ? players.find((p) => p.id === topMvp.playerId) : undefined;

  const navLinks = [
    { label: "HERITAGE", href: "#heritage" },
    { label: "TEAMS", href: "#franchises" },
    { label: "STARS", href: "#fixtures" },
    { label: "FIXTURES", href: "/matches" },
    { label: "STANDINGS", href: "/pointables" },
  ];
  return (
    <div className="min-h-screen w-full bg-white text-[#0A0A0A] font-sans selection:bg-[#D9A928] selection:text-black overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          1. NAVIGATION
          ══════════════════════════════════════════════════════════════════════ */}
      <header className="absolute top-0 z-50 w-full bg-transparent">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-[68px] flex items-center justify-between">

          <div className="flex items-center gap-2.5 shrink-0">
            <Logo size="md" />
            <div className="hidden sm:block leading-none">
              <span className="block text-[11px] font-black tracking-[0.22em] text-[#D9A928] uppercase">TPL 2026</span>
              <span className="block text-[9px] text-white/40 tracking-wider font-semibold uppercase">Premier League</span>
            </div>
          </div>

        </div>

      </header>

      {/* ── Mobile full-screen nav overlay ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] flex"
          style={{ animation: "mobileNavFadeIn 0.2s ease" }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel — slides in from left */}
          <div
            className="relative mr-auto h-full w-[min(85vw,320px)] bg-[#0A0A0A] flex flex-col shadow-2xl"
            style={{ animation: "mobileNavSlideIn 0.25s cubic-bezier(0.32,0.72,0,1)" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 h-[68px] border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <Logo size="md" />
                <div className="leading-none">
                  <span className="block text-[11px] font-black tracking-[0.22em] text-[#D9A928] uppercase">TPL 2026</span>
                  <span className="block text-[9px] text-white/30 tracking-wider font-semibold uppercase">Premier League</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>

            {/* Gold accent line */}
            <div className="h-[2px] w-10 mx-6 mt-8 mb-1 bg-[#D9A928] rounded-full" />

            {/* Nav links */}
            <nav className="flex flex-col px-4 mt-2">
              {navLinks.map((item, i) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center gap-4 px-2 py-4 border-b border-white/[0.06] last:border-0"
                >
                  <span className="text-[10px] font-black text-[#D9A928]/50 tabular-nums w-4">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-black tracking-[0.2em] text-white/70 group-hover:text-white transition-colors uppercase">
                    {item.label}
                  </span>
                  <ArrowRight className="h-3 w-3 text-[#D9A928] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </nav>

            {/* Footer branding */}
            <div className="mt-auto px-6 py-6 border-t border-white/[0.06]">
              <p className="text-[9px] font-bold tracking-[0.25em] text-white/20 uppercase">TPL 2026 Season</p>
            </div>
          </div>

          <style>{`
            @keyframes mobileNavFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes mobileNavSlideIn {
              from { transform: translateX(-100%); }
              to   { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          2. HERO — full-screen video background
          ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex flex-col md:flex-row md:items-center w-full h-auto min-h-0 md:h-[100dvh] md:min-h-[600px]"
        style={{
          backgroundImage: "url('/hero-cricket-1.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <video
          src="/hero-video.webm"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-cricket-1.jpg"
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(160deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.35) 100%)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(10,10,10,0.6) 0%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-5 lg:px-8 w-full pt-20 pb-16 md:py-28 lg:py-36">
          <div className="max-w-3xl">
            {/* Branding badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-[#D9A928]/40 bg-[#D9A928]/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9A928] animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-[0.28em] text-[#D9A928] uppercase">
                POWERED BY VALGROW LABS
              </span>
            </div>

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-[5.5rem] xl:text-[6.5rem] uppercase leading-[0.85] tracking-[-0.02em] text-white drop-shadow-2xl">
              THUNDUWA<br />
              <span style={{ background: "linear-gradient(135deg, #F4C542 0%, #D9A928 60%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                PREMIER
              </span>
              <br />LEAGUE
            </h1>

            <p className="mt-7 text-sm sm:text-base text-white/70 max-w-lg leading-relaxed">
              The official digital home of TPL 2026. Follow every match, every run,
              every wicket, and every moment of the tournament with live scores,
              ball-by-ball updates, fixtures, results, and tournament standings.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/matches"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-[#D9A928] hover:bg-[#F4C542] text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_32px_rgba(217,169,40,0.55)] active:scale-95"
              >
                <span>EXPLORE MATCH CENTRE</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/live"
                className="inline-flex items-center gap-2.5 text-white/80 hover:text-white font-extrabold text-xs uppercase tracking-wider transition-colors group"
              >
                <span className="h-10 w-10 rounded-full bg-white/10 group-hover:bg-white/20 grid place-items-center transition-all border border-white/20">
                  <Radio className="h-4 w-4" />
                </span>
                <span>VIEW LIVE SCORES</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. HAPPENING NOW — Live & Real-Time Matches Strip
          ══════════════════════════════════════════════════════════════════════ */}
      <HappeningNowSection matches={matches} />


      {/* ══════════════════════════════════════════════════════════════════════
          9. KEY TOURNAMENT PLAYERS & CONTENDERS
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="fixtures" className="relative py-20 bg-[#F7F7F5]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <SectionLabel>KEY CONTENDERS</SectionLabel>
              <h2 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-[#0A0A0A]">
                TOURNAMENT STARS
              </h2>
            </div>
            <Link
              to="/pointables"
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#D9A928] hover:text-black transition-colors"
            >
              VIEW FULL LEADERBOARD <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                rank: "01",
                category: "TOP RUN SCORER",
                name: topScorer?.playerName || scorerPlayer?.name || "LEADER TBA",
                team: topScorer?.teamShortName || topScorer?.teamName || "TPL 2026",
                stat: topScorer && topScorer.runs > 0 ? `${topScorer.runs} RUNS` : "0 RUNS",
                substat:
                  topScorer && topScorer.runs > 0
                    ? `${topScorer.innings} Innings · SR ${Math.round(topScorer.strikeRate || 0)}`
                    : "Awaiting completed matches",
                avatar: scorerPlayer?.avatar,
                playerId: topScorer?.playerId,
                bgImage: "/hero-batsman-top-scorer.png",
              },
              {
                rank: "02",
                category: "TOP WICKET TAKER",
                name: topBowler?.playerName || bowlerPlayer?.name || "LEADER TBA",
                team: topBowler?.teamShortName || topBowler?.teamName || "TPL 2026",
                stat: topBowler && topBowler.wickets > 0 ? `${topBowler.wickets} WICKETS` : "0 WICKETS",
                substat:
                  topBowler && topBowler.wickets > 0
                    ? `Econ ${(topBowler.economy || 0).toFixed(1)} · BB ${topBowler.bestBowling || "—"}`
                    : "Awaiting completed matches",
                avatar: bowlerPlayer?.avatar,
                playerId: topBowler?.playerId,
                bgImage: "/hero-bowler-top-wicket-clean.png",
              },
              {
                rank: "03",
                category: "PLAYER OF TOURNAMENT",
                name: topMvp?.playerName || mvpPlayer?.name || "LEADER TBA",
                team: topMvp?.teamShortName || topMvp?.teamName || "TPL 2026",
                stat: topMvp && topMvp.mvpPoints > 0 ? `${(topMvp.mvpPoints || 0).toFixed(1)} MVP PTS` : "0.0 MVP PTS",
                substat:
                  topMvp && topMvp.mvpPoints > 0
                    ? `${topMvp.runs || 0}R · ${topMvp.wickets || 0}W · ${topMvp.catches || 0}C`
                    : "Awaiting completed matches",
                avatar: mvpPlayer?.avatar,
                playerId: topMvp?.playerId,
                bgImage: "/hero-helmet-player-of-tournament-clean.png",
              },
            ].map((p) => {
              const CardContent = (
                <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] bg-white p-5 sm:p-6 hover:border-[#D9A928]/60 hover:shadow-xl hover:-translate-y-1 transition-all min-h-[175px] sm:min-h-[185px] flex flex-col justify-between group">
                  {/* Background Action Graphic positioned cleanly on the right */}
                  <div
                    className="absolute inset-y-0 right-0 w-[45%] pointer-events-none z-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{
                      backgroundImage: `url('${p.bgImage}')`,
                      backgroundSize: "contain",
                      backgroundPosition: "right center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-white via-white/80 to-transparent" />

                  {/* Header Row: Profile Photo / Empty Symbol + Category + Rank */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.avatar ? (
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden border-2 border-[#D9A928] bg-black/5 shrink-0 shadow-sm">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden border border-[#D9A928]/40 bg-[#F7F7F5] shrink-0 shadow-sm">
                          <img
                            src="/default-player-avatar.png"
                            alt="Player"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-[#9A6A05] uppercase block leading-none">
                          {p.category}
                        </span>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6368] block mt-0.5">
                          {p.team}
                        </span>
                      </div>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-black/15 font-mono tracking-tight">
                      {p.rank}
                    </span>
                  </div>

                  {/* Player Name & Primary Real Stats */}
                  <div className="relative z-10 mt-3 pt-2">
                    <h3 className="font-display font-black text-xl sm:text-2xl uppercase text-[#0A0A0A] leading-tight line-clamp-1 group-hover:text-[#9A6A05] transition-colors max-w-[70%]">
                      {p.name}
                    </h3>
                    
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-black text-[#0A0A0A] font-mono tracking-tight">
                        {p.stat}
                      </span>
                      <span className="text-[11px] font-bold text-[#5F6368] truncate max-w-[55%]">
                        · {p.substat}
                      </span>
                    </div>
                  </div>
                </div>
              );

              return p.playerId ? (
                <Link
                  key={p.rank}
                  to="/player/$playerId"
                  params={{ playerId: p.playerId }}
                  className="block h-full cursor-pointer"
                >
                  {CardContent}
                </Link>
              ) : (
                <Link
                  key={p.rank}
                  to="/pointables"
                  className="block h-full cursor-pointer"
                >
                  {CardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. DIRECTORY — PARTICIPATING FRANCHISES (PREMIUM HERO SHOWCASE)
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="franchises" className="relative py-24 lg:py-32 bg-[#0A0A0A] text-white border-t border-white/5 overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-[#D9A928]/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D9A928]/10 border border-[#D9A928]/30 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D9A928] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D9A928]">
                OFFICIAL DIRECTORY
              </p>
            </div>

            <h2 className="font-display font-black text-4xl sm:text-5xl lg:text-7xl uppercase tracking-tight text-white leading-none">
              PARTICIPATING <span style={{ background: "linear-gradient(135deg, #FFE082 0%, #F4C542 50%, #D9A928 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>FRANCHISES</span>
            </h2>

            <p className="mt-4 text-xs sm:text-sm text-white/60 leading-relaxed max-w-xl mx-auto">
              Explore the 6 elite powerhouses competing for the Thunduwa Premier League 2026 crown. Each franchise brings their own unique strategy, star roster, and heritage to the arena.
            </p>
          </div>

          {/* Franchise Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {teams.map((team) => {
              // Unique theme tokens per franchise
              const nameLower = (team.name || "").toLowerCase();
              const idLower = (team.id || "").toLowerCase();

              let theme = {
                color: "#D9A928",
                glow: "rgba(217, 169, 40, 0.35)",
                gradient: "from-[#D9A928]/20 via-[#9A6A05]/5 to-transparent",
                border: "hover:border-[#D9A928]/80 hover:shadow-[0_20px_50px_rgba(217,169,40,0.22)]",
                pill: "bg-[#D9A928]/15 text-[#F4C542] border-[#D9A928]/40",
                slogan: "Official TPL Contender",
                tag: "PRIDE OF TPL",
              };

              if (idLower.includes("tc") || nameLower.includes("thundu")) {
                theme = {
                  color: "#00D2FF",
                  glow: "rgba(0, 210, 255, 0.35)",
                  gradient: "from-[#00D2FF]/20 via-[#0066FF]/10 to-transparent",
                  border: "hover:border-[#00D2FF]/80 hover:shadow-[0_20px_50px_rgba(0,210,255,0.25)]",
                  pill: "bg-[#00D2FF]/15 text-[#38BDF8] border-[#00D2FF]/40",
                  slogan: "Capital Might · Relentless Force",
                  tag: "POWERHOUSE",
                };
              } else if (idLower.includes("du") || nameLower.includes("dainagoda")) {
                theme = {
                  color: "#10B981",
                  glow: "rgba(16, 185, 129, 0.35)",
                  gradient: "from-[#10B981]/20 via-[#059669]/10 to-transparent",
                  border: "hover:border-[#10B981]/80 hover:shadow-[0_20px_50px_rgba(16,185,129,0.25)]",
                  pill: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40",
                  slogan: "United in Strength · Bound for Glory",
                  tag: "CHALLENGERS",
                };
              } else if (idLower.includes("bmr") || nameLower.includes("bary") || nameLower.includes("mawathe")) {
                theme = {
                  color: "#C084FC",
                  glow: "rgba(192, 132, 252, 0.35)",
                  gradient: "from-[#C084FC]/20 via-[#7E22CE]/10 to-transparent",
                  border: "hover:border-[#C084FC]/80 hover:shadow-[0_20px_50px_rgba(192,132,252,0.25)]",
                  pill: "bg-[#C084FC]/15 text-[#D8B4FE] border-[#C084FC]/40",
                  slogan: "Royals Reign · Pure Cricket Majesty",
                  tag: "REGAL LEGACY",
                };
              } else if (idLower.includes("rk") || nameLower.includes("riverside")) {
                theme = {
                  color: "#4ADE80",
                  glow: "rgba(74, 222, 128, 0.35)",
                  gradient: "from-[#4ADE80]/20 via-[#16A34A]/10 to-transparent",
                  border: "hover:border-[#4ADE80]/80 hover:shadow-[0_20px_50px_rgba(74,222,128,0.25)]",
                  pill: "bg-[#4ADE80]/15 text-[#86EFAC] border-[#4ADE80]/40",
                  slogan: "Kings by the River · Rulers of Pitch",
                  tag: "RIVER KINGS",
                };
              } else if (idLower.includes("ngw") || nameLower.includes("garden") || nameLower.includes("warrior")) {
                theme = {
                  color: "#FBBF24",
                  glow: "rgba(251, 191, 36, 0.35)",
                  gradient: "from-[#FBBF24]/20 via-[#D97706]/10 to-transparent",
                  border: "hover:border-[#FBBF24]/80 hover:shadow-[0_20px_50px_rgba(251,191,36,0.25)]",
                  pill: "bg-[#FBBF24]/15 text-[#FDE047] border-[#FBBF24]/40",
                  slogan: "Warrior Spirit · Unconquerable Fire",
                  tag: "FIERCE SPIRIT",
                };
              } else if (idLower.includes("kl") || nameLower.includes("kurunduwatte") || nameLower.includes("legend")) {
                theme = {
                  color: "#F87171",
                  glow: "rgba(248, 113, 113, 0.35)",
                  gradient: "from-[#F87171]/20 via-[#DC2626]/10 to-transparent",
                  border: "hover:border-[#F87171]/80 hover:shadow-[0_20px_50px_rgba(248,113,113,0.25)]",
                  pill: "bg-[#F87171]/15 text-[#FCA5A5] border-[#F87171]/40",
                  slogan: "Living Legends · Built for Dominance",
                  tag: "TITANS",
                };
              }

              const teamSquad = (() => {
                if (!team) return [];
                const matching = players.filter((p) => isPlayerInTeam(p, team));
                return matching.length > 0 ? matching : lookup.playersOf(team.id);
              })();

              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamForRoster(team)}
                  className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#171717] via-[#121212] to-[#0D0D0D] border border-white/10 ${theme.border} p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 group hover:-translate-y-2 cursor-pointer shadow-xl`}
                >
                  {/* Atmospheric background glow matching team color */}
                  <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br ${theme.gradient} rounded-full blur-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Card Header Row: Group & Tag Pills */}
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${theme.pill}`}>
                      {team.groupName || "GROUP STAGE"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white/40 tracking-wider">
                      {teamSquad.length} {teamSquad.length === 1 ? "PLAYER" : "PLAYERS"}
                    </span>
                  </div>

                  {/* Centerpiece: Floating Team Crest & Info */}
                  <div className="relative z-10 flex flex-col items-center text-center mt-6 mb-5">
                    {/* Glowing Logo Circle */}
                    <div className="relative mb-5 group-hover:scale-105 transition-transform duration-300">
                      <div
                        className="absolute inset-0 rounded-full blur-xl opacity-40 group-hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: theme.color }}
                      />
                      <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full p-1 bg-[#0A0A0A] border-2 border-white/20 group-hover:border-[#D9A928]/80 shadow-2xl flex items-center justify-center overflow-hidden">
                        <TeamLogo
                          teamId={team.id}
                          logoUrl={team.logoUrl}
                          name={team.name}
                          shortName={team.shortName}
                          className="w-full h-full rounded-full border-0 object-cover"
                        />
                      </div>
                    </div>

                    {/* Team Name */}
                    <h3 className="font-display font-black text-2xl sm:text-3xl uppercase text-white tracking-tight leading-tight group-hover:text-white transition-colors">
                      {team.name}
                    </h3>

                    {/* Franchise Slogan */}
                    <p className="text-[11px] font-medium text-white/50 mt-1.5 line-clamp-1 italic">
                      "{theme.slogan}"
                    </p>
                  </div>

                  {/* Squad Preview: Overlapping Player Avatars */}
                  <div className="relative z-10 border-t border-white/10 pt-4 mt-2 flex items-center justify-between">
                    <div className="flex items-center -space-x-2">
                      {teamSquad.slice(0, 4).map((player) => (
                        <div
                          key={player.id}
                          className="h-7 w-7 rounded-full overflow-hidden border-2 border-[#121212] bg-[#1A1A1A] shrink-0 shadow-xs"
                          title={player.name}
                        >
                          <img
                            src={player.avatar || "/default-player-avatar.png"}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {teamSquad.length > 4 && (
                        <div className="h-7 px-1.5 rounded-full bg-white/10 border-2 border-[#121212] flex items-center justify-center text-[9px] font-black text-white/80">
                          +{teamSquad.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Interactive CTA Link */}
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/60 group-hover:text-white transition-colors">
                      <span style={{ color: theme.color }}>VIEW SQUAD</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" style={{ color: theme.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Team Roster Interactive Modal ─────────────────────────────────── */}
      {selectedTeamForRoster && (() => {
        const rosterPlayers = (() => {
          if (!selectedTeamForRoster) return [];
          const matching = players.filter((p) => isPlayerInTeam(p, selectedTeamForRoster));
          return matching.length > 0 ? matching : lookup.playersOf(selectedTeamForRoster.id);
        })();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#141414] border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl overflow-hidden max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-[#D9A928]/40 bg-black/50 shrink-0 p-0.5 flex items-center justify-center">
                    <TeamLogo
                      teamId={selectedTeamForRoster.id}
                      logoUrl={selectedTeamForRoster.logoUrl}
                      name={selectedTeamForRoster.name}
                      className="w-full h-full rounded-xl border-0"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] bg-[#D9A928]/10 px-2 py-0.5 rounded-md border border-[#D9A928]/30">
                        {selectedTeamForRoster.groupName || "OFFICIAL FRANCHISE"}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white mt-1">
                      {selectedTeamForRoster.name}
                    </h3>
                    {selectedTeamForRoster.ownerName && (
                      <p className="text-xs text-white/60 font-medium">Franchise Owner: {selectedTeamForRoster.ownerName}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTeamForRoster(null)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Squad Player List */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/60">
                    Official Squad Players ({rosterPlayers.length})
                  </h4>
                  <span className="text-[10px] text-[#D9A928] font-bold">Tap player to view profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rosterPlayers.map((player) => (
                    <Link
                      key={player.id}
                      to="/player/$playerId"
                      params={{ playerId: player.id }}
                      onClick={() => setSelectedTeamForRoster(null)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D9A928]/60 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden border border-white/15 bg-black/40 shrink-0">
                          <img
                            src={player.avatar || "/default-player-avatar.png"}
                            alt={player.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase group-hover:text-[#D9A928] transition-colors line-clamp-1">
                            {player.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/50 uppercase font-bold">
                              {player.role || "Player"}
                            </span>
                            {player.referenceId && (
                              <span className="text-[9px] font-mono text-[#D9A928]">
                                #{player.referenceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-[#D9A928] transition-colors" />
                    </Link>
                  ))}
                </div>

                {rosterPlayers.length === 0 && (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 text-xs font-bold text-white/50">
                    No squad players registered yet for this franchise.
                  </div>
                )}
              </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <Link
                to="/pointables"
                onClick={() => setSelectedTeamForRoster(null)}
                className="text-xs font-black text-[#D9A928] hover:underline uppercase tracking-wider flex items-center gap-1.5"
              >
                <span>Tournament Standings</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => setSelectedTeamForRoster(null)}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    })()}


      {/* ══════════════════════════════════════════════════════════════════════
          10. COMMUNITY HERITAGE - THE HEART OF THUNDUWA
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="heritage" className="relative py-20 lg:py-32 bg-[#0A0A0A] overflow-hidden text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Text & Pillars */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-0.5 w-8 bg-[#D9A928]" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#D9A928]">
                  COMMUNITY HERITAGE
                </span>
              </div>

              <h2 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl uppercase leading-[0.95] tracking-tight text-white mb-7">
                The Heart of<br />
                <span className="text-[#D9A928]">Thunduwa</span>
              </h2>

              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-5">
                The Thunduwa Premier League is more than just a cricket tournament; it is a celebration of our community's enduring spirit, unity, and shared heritage.
              </p>

              <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-10">
                Rooted deeply in the values taught within the walls of our local school and echoed through the call to prayer at our central mosque, TPL brings generations together on the pitch. We play to honor our past and inspire our future.
              </p>

              {/* Unity & Legacy Pillars */}
              <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                <div>
                  <h3 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
                    Unity
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-black tracking-[0.2em] text-white/50 uppercase mt-1">
                    ONE COMMUNITY
                  </p>
                </div>

                <div>
                  <h3 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
                    Legacy
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-black tracking-[0.2em] text-white/50 uppercase mt-1">
                    GENERATIONS STRONG
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Overlapping Photos (Mosque & School) */}
            <div className="lg:col-span-6 relative flex items-center justify-center pt-4 pb-8 sm:pb-12">
              <div className="relative w-full max-w-[540px]">
                
                {/* Top/Back Photo: Central Mosque */}
                <div className="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl ml-auto w-[82%] aspect-[4/3] bg-transparent">
                  <img
                    src="/image-copy.png"
                    alt="Central Mosque of Thunduwa"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Bottom/Front Overlapping Photo: School */}
                <div className="absolute -bottom-6 -left-2 sm:-bottom-8 sm:-left-4 w-[66%] aspect-[4/3] rounded-3xl sm:rounded-[2.2rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.7)] z-20 bg-transparent">
                  <img
                    src="/image.png"
                    alt="Thunduwa Muslim Maha Vidyalaya"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Subtle gold decorative accent ring */}
                <div className="absolute -top-4 -right-4 w-28 h-28 bg-[#D9A928]/10 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════════════
          12. FINAL CTA
          ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 lg:py-28 bg-white border-t border-black/[0.06]">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 text-center">
          <h2 className="font-display font-black text-5xl sm:text-6xl lg:text-8xl uppercase leading-[0.88] tracking-[-0.02em] text-[#0A0A0A]">
            READY FOR THE<br />NEXT BALL?
          </h2>
          <p className="mt-6 text-sm text-black/50 max-w-md mx-auto leading-relaxed">
            Follow TPL 2026 from the first delivery to the final celebration.
          </p>
          <p className="mt-4 text-[10px] font-black tracking-[0.28em] text-[#D9A928] uppercase">
            LIVE SCORES · FIXTURES · RESULTS · STANDINGS
          </p>
          <Link
            to="/live"
            className="mt-10 inline-flex items-center gap-2.5 px-9 py-5 rounded-full bg-[#0A0A0A] hover:bg-[#D9A928] text-white hover:text-black font-black text-sm uppercase tracking-widest transition-all duration-200 shadow-xl active:scale-95"
          >
            EXPLORE TPL 2026
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          13. FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <footer className="py-12 bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div>
                <p className="font-extrabold text-sm uppercase tracking-wider text-white">THUNDUWA PREMIER LEAGUE · TPL 2026</p>
                <p className="text-[11px] text-white/35 uppercase">Official Tournament Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/50">
              <Link to="/home" className="hover:text-white transition-colors">DASHBOARD</Link>
              <Link to="/matches" className="hover:text-white transition-colors">FIXTURES</Link>
              <Link to="/pointables" className="hover:text-white transition-colors">STANDINGS</Link>
              <Link to="/scorecards" className="hover:text-white transition-colors">RESULTS</Link>
            </div>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40">
            <p>© 2026 Thunduwa Premier League. All rights reserved.</p>
            <p className="text-[#D9A928] font-semibold">TPL 2026 OFFICIAL LIVE SCORING</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
