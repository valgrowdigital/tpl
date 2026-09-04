import { motion } from "framer-motion";
import { Trophy, Flame, Target, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useMatches } from "@/hooks/useCricketData";
import { calculateTournamentStats } from "@/lib/scoring/statistics";
import { useMemo } from "react";

interface PlayerAwardsGraphicProps {
  payload?: {
    orangeCap?: any;
    purpleCap?: any;
    mvp?: any;
    transition?: string;
  };
  transitionType?: string;
}

export function PlayerAwardsGraphic({ payload, transitionType = "fade" }: PlayerAwardsGraphicProps) {
  const { data: matches = [] } = useMatches();
  const stats = useMemo(() => calculateTournamentStats(matches), [matches]);

  const effectiveTransition = payload?.transition || transitionType;
  const variants = {
    initial: effectiveTransition === "slide" ? { y: "100%" } : { opacity: 0 },
    animate: effectiveTransition === "slide" ? { y: 0 } : { opacity: 1 },
    exit: effectiveTransition === "slide" ? { y: "100%" } : { opacity: 0 },
  };

  // Real tournament leaders
  const orangeLeader = payload?.orangeCap || stats.orangeCap[0];
  const purpleLeader = payload?.purpleCap || stats.purpleCap[0];
  const mvpLeader = payload?.mvp || stats.mvpLeaderboard[0];

  const awards = [
    {
      title: "ORANGE CAP",
      subtitle: orangeLeader && orangeLeader.runs > 0
        ? `${orangeLeader.innings} INN · SR ${Math.round(orangeLeader.strikeRate || 0)}`
        : "MOST RUNS LEADER",
      player: orangeLeader?.playerName || (matches.length > 0 ? "LEADER IN PROGRESS" : "AWAITING MATCHES"),
      team: orangeLeader?.teamShortName || orangeLeader?.teamName || "TPL 2026",
      value: orangeLeader && orangeLeader.runs > 0 ? `${orangeLeader.runs}` : "0",
      unit: "RUNS",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500",
      borderColor: "border-orange-500/40",
      pillBg: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    },
    {
      title: "PURPLE CAP",
      subtitle: purpleLeader && purpleLeader.wickets > 0
        ? `ECON ${(purpleLeader.economy || 0).toFixed(1)} · BB ${purpleLeader.bestBowling || "—"}`
        : "MOST WICKETS LEADER",
      player: purpleLeader?.playerName || (matches.length > 0 ? "LEADER IN PROGRESS" : "AWAITING MATCHES"),
      team: purpleLeader?.teamShortName || purpleLeader?.teamName || "TPL 2026",
      value: purpleLeader && purpleLeader.wickets > 0 ? `${purpleLeader.wickets}` : "0",
      unit: "WKTS",
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-500",
      borderColor: "border-purple-500/40",
      pillBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    },
    {
      title: "TOURNAMENT MVP",
      subtitle: mvpLeader && mvpLeader.mvpPoints > 0
        ? `${mvpLeader.runs || 0}R · ${mvpLeader.wickets || 0}W · ${mvpLeader.catches || 0}C`
        : "MOST VALUABLE PLAYER",
      player: mvpLeader?.playerName || (matches.length > 0 ? "LEADER IN PROGRESS" : "AWAITING MATCHES"),
      team: mvpLeader?.teamShortName || mvpLeader?.teamName || "TPL 2026",
      value: mvpLeader && mvpLeader.mvpPoints > 0 ? `${(mvpLeader.mvpPoints || 0).toFixed(1)}` : "0.0",
      unit: "PTS",
      icon: Trophy,
      color: "text-[#D9A928]",
      bgColor: "bg-[#D9A928]",
      borderColor: "border-[#D9A928]/40",
      pillBg: "bg-[#D9A928]/15 text-[#D9A928] border-[#D9A928]/30",
    },
  ];

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 relative select-none font-sans pointer-events-none"
    >
      {/* Ambient background glow */}
      <div className="absolute w-[600px] h-[350px] bg-[#D9A928]/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Compact Broadcast Card */}
      <div className="relative w-full max-w-3xl bg-[#090A0D] border-2 border-[#D9A928]/60 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_30px_rgba(217,169,40,0.2)] flex flex-col items-center text-center overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-4 text-center">
          <Logo className="h-8 sm:h-9 w-auto mb-1 drop-shadow-md brightness-125" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D9A928]" />
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-[0.2em] text-[#D9A928] drop-shadow-sm">
              TOURNAMENT LEADERS
            </h1>
            <Sparkles className="w-3.5 h-3.5 text-[#D9A928]" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#888888]">
            OFFICIAL TOURNAMENT AWARDS & LEADERBOARD
          </p>
        </div>

        {/* 3-Column Compact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mb-3">
          {awards.map((award, i) => (
            <div
              key={i}
              className={`bg-[#121317] border ${award.borderColor} rounded-2xl p-3.5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden text-center min-h-[200px]`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 w-full h-1 ${award.bgColor}`} />

              {/* Icon & Title */}
              <div className="flex flex-col items-center gap-1 mt-1">
                <div
                  className={`w-9 h-9 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shadow-inner ${award.color}`}
                >
                  <award.icon className="w-4 h-4" />
                </div>
                <h2 className={`text-xs font-black uppercase tracking-wider ${award.color}`}>
                  {award.title}
                </h2>
                <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${award.pillBg}`}>
                  {award.subtitle}
                </span>
              </div>

              {/* Player Name & Team */}
              <div className="w-full my-2">
                <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-white truncate px-1">
                  {award.player}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#777777]">
                  {award.team}
                </p>
              </div>

              {/* Big Stat Number */}
              <div className="flex items-baseline justify-center gap-1.5 pt-1 border-t border-white/5 w-full">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${award.color}`}>
                  {award.value}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#888888]">
                  {award.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Compact Footer */}
        <div className="w-full pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-[#888888]">
          <span className="uppercase tracking-widest font-black text-[#AAAAAA]">
            TPL 2026 PREMIER LEAGUE
          </span>
          <span className="uppercase tracking-wider font-mono">
            POWERED BY <span className="text-[#D9A928] font-black">VALGROW LABS</span>
          </span>
        </div>

        {/* Bottom Accent Glow */}
        <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-[#D9A928] to-transparent rounded-full shadow-[0_0_12px_#D9A928]" />
      </div>
    </motion.div>
  );
}
