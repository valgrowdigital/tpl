import { motion } from "framer-motion";
import type { ObsMatchStreamResult } from "@/hooks/useObsMatchStream";
import { TeamLogo } from "@/components/team/TeamLogo";
import { Logo } from "@/components/brand/Logo";
import { lookup } from "@/lib/repositories";
import { Trophy, Target, Sparkles, Flame, Shield } from "lucide-react";

interface InningsBreakScorecardGraphicProps {
  stream: ObsMatchStreamResult;
  transitionType?: string;
}

export function InningsBreakScorecardGraphic({ stream, transitionType = "fade" }: InningsBreakScorecardGraphicProps) {
  const { match, matchState } = stream;
  if (!matchState || matchState.innings.length === 0) return null;

  const inn1 = matchState.innings[0];
  const inn2 = matchState.innings[1];
  const battingTeam = lookup.team(inn1?.battingTeamId);
  const bowlingTeam = lookup.team(inn1?.bowlingTeamId);
  const target = inn2?.target ?? ((inn1?.runs ?? 0) + 1);
  const totalOvers = match?.overs ?? 5;
  const requiredRunRate = ((target / totalOvers)).toFixed(2);

  const batters = (inn1?.batters || []).filter((b) => b.balls > 0 || b.out);
  const bowlers = (inn1?.bowlers || []).filter((bw) => bw.legalBalls > 0);

  const variants = {
    initial: transitionType === "slide" ? { y: "100%" } : { opacity: 0 },
    animate: transitionType === "slide" ? { y: 0 } : { opacity: 1 },
    exit: transitionType === "slide" ? { y: "100%" } : { opacity: 0 },
  };

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 bg-[#080808]/96 backdrop-blur-2xl flex flex-col justify-between p-8 sm:p-12 text-white font-sans overflow-hidden select-none"
    >
      {/* Background Decorative Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D9A928]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. TOP HEADER BANNER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          <Logo className="h-10 w-auto brightness-125" />
          <div className="h-8 w-px bg-white/20" />
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#D9A928]/20 border border-[#D9A928]/50 text-[10px] font-black uppercase tracking-[0.25em] text-[#D9A928]">
              <Sparkles className="w-3 h-3" />
              <span>1ST INNINGS COMPLETED</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white mt-0.5">
              MATCH #{String(match?.matchNumber ?? 1).padStart(2, "0")} · {battingTeam?.name} vs {bowlingTeam?.name}
            </h1>
          </div>
        </div>

        {/* Target Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-red-600/20 via-amber-500/20 to-[#D9A928]/20 border border-[#D9A928]/60 px-5 py-2.5 rounded-2xl shadow-xl">
          <Target className="w-5 h-5 text-[#D9A928] animate-pulse" />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#D9A928]">
              TARGET FOR {bowlingTeam?.shortName || "CHASERS"}
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-white leading-none">
              {target} <span className="text-xs font-bold text-white/60 font-sans">RUNS (RRR: {requiredRunRate})</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. HERO SCORECARD SUMMARY BANNER ─────────────────────────────── */}
      <div className="my-4 bg-gradient-to-r from-[#141414] via-[#1A1A1A] to-[#141414] border-2 border-[#D9A928]/40 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <TeamLogo teamId={battingTeam?.id} size="lg" className="shadow-2xl" />
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#D9A928]">
              {battingTeam?.name} (1st Innings)
            </span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight">
                {inn1?.runs}/{inn1?.wickets}
              </span>
              <span className="text-lg font-bold font-mono text-white/60">
                ({inn1?.oversText} Overs)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10">
            <p className="text-[10px] font-black uppercase text-white/50">Run Rate</p>
            <p className="text-lg font-black font-mono text-[#D9A928]">{inn1?.crr?.toFixed(2) ?? "0.00"}</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10">
            <p className="text-[10px] font-black uppercase text-white/50">Extras</p>
            <p className="text-lg font-black font-mono text-white">{inn1?.extras?.total ?? 0}</p>
          </div>
        </div>
      </div>

      {/* ── 3. DETAILED BATTING & BOWLING TABLES ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden relative z-10">
        
        {/* Batting Card */}
        <div className="bg-[#121212]/90 border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#D9A928] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#D9A928]" />
                Batting Performance
              </h3>
              <div className="grid grid-cols-4 gap-4 text-[10px] font-black uppercase tracking-wider text-white/50 text-right w-44">
                <span>R</span>
                <span>B</span>
                <span>4s/6s</span>
                <span>SR</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {batters.slice(0, 5).map((b) => (
                <div key={b.playerId} className="flex items-center justify-between py-1 border-b border-white/5 text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-white uppercase">{b.name}</span>
                    <span className="text-[10px] text-white/40 block truncate">{b.dismissalText || (b.out ? "Out" : "Not Out")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs font-mono font-bold text-right shrink-0 w-44">
                    <span className="text-[#D9A928] font-black">{b.runs}</span>
                    <span className="text-white/70">{b.balls}</span>
                    <span className="text-white/90">{b.fours}/{b.sixes}</span>
                    <span className="text-white/60">{b.strikeRate?.toFixed(0) ?? "0"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bowling Card */}
        <div className="bg-[#121212]/90 border border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Bowling Figures
              </h3>
              <div className="grid grid-cols-4 gap-4 text-[10px] font-black uppercase tracking-wider text-white/50 text-right w-44">
                <span>O</span>
                <span>M</span>
                <span>R</span>
                <span>W</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {bowlers.slice(0, 5).map((bw) => (
                <div key={bw.playerId} className="flex items-center justify-between py-1 border-b border-white/5 text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-white uppercase">{bw.name}</span>
                    <span className="text-[10px] text-emerald-400/70 block">Econ: {bw.economy?.toFixed(2) ?? "0.00"}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs font-mono font-bold text-right shrink-0 w-44">
                    <span className="text-white/70">{bw.oversText}</span>
                    <span className="text-white/60">{bw.maidens}</span>
                    <span className="text-white/90">{bw.runs}</span>
                    <span className="text-emerald-400 font-black">{bw.wickets}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. FOOTER BRANDING ────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10 text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
        <span>TPL 2026 OFFICIAL BROADCAST</span>
        <div className="flex items-center gap-2">
          <img src="/valgrow-labs-logo.jpeg" alt="ValGrow Labs" className="h-5 w-5 rounded object-cover shadow-md" />
          <p className="text-white">
            <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
          </p>
        </div>
      </div>
    </motion.div>
  );
}
