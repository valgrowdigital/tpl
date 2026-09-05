import type { ObsMatchStreamResult } from "@/hooks/useObsMatchStream";
import { oversText } from "@/lib/scoring/engine";
import { BallByBallStrip } from "./BallByBallStrip";
import { SponsorSlot } from "./SponsorSlot";

interface ScoreboardBarProps {
  stream: ObsMatchStreamResult;
  sponsor?: {
    name?: string;
    logoUrl?: string;
    tagline?: string;
  } | null;
}

export function ScoreboardBar({ stream, sponsor }: ScoreboardBarProps) {
  const {
    match,
    matchState,
    currentInnings,
    battingTeam,
    striker,
    strikerStats,
    nonStriker,
    nonStrikerStats,
    bowler,
    bowlerStats,
    recentBalls,
    connected,
  } = stream;

  if (!match) {
    return (
      <div className="bg-[#111111]/95 text-white border-t-2 border-[#D9A928] px-8 py-4 rounded-xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-black text-sm uppercase tracking-widest text-[#D9A928]">
            TPL 2026 LIVE BROADCAST
          </span>
          <div className="flex items-center gap-2">
            {stream.loading ? (
              <>
                <span className="h-2 w-2 rounded-full bg-[#D9A928] animate-ping" />
                <span className="text-xs font-bold text-[#D9A928] uppercase tracking-wider">
                  LOADING LIVE MATCH...
                </span>
              </>
            ) : (
              <span className="text-xs font-bold text-white/60 uppercase">
                MATCH NOT FOUND
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const runs = currentInnings?.runs ?? 0;
  const wickets = currentInnings?.wickets ?? 0;
  const currentOversText = currentInnings?.oversText ?? "0.0";
  const maxOvers = currentInnings?.maxOvers ?? match.overs ?? 5;
  const crr = currentInnings?.crr ?? 0;
  const target = currentInnings?.target;
  const requiredRunRate = currentInnings?.requiredRunRate;
  const runsNeeded = currentInnings?.runsNeeded;
  const ballsRemaining = currentInnings?.ballsRemaining;

  const battingName = battingTeam?.shortName || battingTeam?.name || "BATTING";

  return (
    <div className="w-full flex flex-col items-center">
      {/* Target & Match Context Pill (if in 2nd Innings chase) */}
      {target && matchState?.currentInningsIndex === 1 && matchState?.phase !== "complete" && (
        <div className="mb-1 px-5 py-1 bg-[#111111]/90 backdrop-blur-md rounded-t-lg border-t border-x border-[#D9A928]/40 text-xs font-black uppercase tracking-wider text-white shadow-lg flex items-center gap-3">
          <span className="text-[#D9A928]">TARGET: {target}</span>
          <span className="text-white/40">•</span>
          <span>
            NEED <strong className="text-[#D9A928]">{runsNeeded ?? (target - runs)}</strong> RUNS FROM <strong className="text-white">{ballsRemaining ?? 0}</strong> BALLS
          </span>
          {typeof requiredRunRate === "number" && requiredRunRate > 0 && (
            <>
              <span className="text-white/40">•</span>
              <span>RRR: <strong className="text-[#D9A928]">{requiredRunRate.toFixed(2)}</strong></span>
            </>
          )}
        </div>
      )}

      {/* Main Broadcast Lower Score Ribbon */}
      <div className="w-full max-w-[1780px] bg-[#111111]/95 text-white border-t-2 border-[#D9A928] rounded-xl shadow-2xl backdrop-blur-md overflow-hidden grid grid-cols-12 items-stretch divide-x divide-white/10">
        
        {/* SECTION 1: Brand, Live Indicator & Optional Sponsor (Col 1-2) */}
        <div className="col-span-2 px-4 py-3 flex flex-col justify-between bg-black/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#D9A928] tracking-widest uppercase font-mono">
                TPL 2026
              </span>
            </div>
            {connected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-[10px] font-black uppercase text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black uppercase text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                RECONNECTING
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/valgrow-labs-logo.jpeg"
                alt="ValGrow Labs"
                className="h-4.5 w-4.5 rounded object-cover flex-shrink-0 shadow-sm"
              />
              <span className="text-[10px] font-black text-white/90 truncate uppercase tracking-wider">
                <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
              </span>
            </div>
            <SponsorSlot sponsor={sponsor} />
          </div>
        </div>

        {/* SECTION 2: Team, Score & Overs (Col 3-4) */}
        <div className="col-span-2 px-3.5 py-3 flex items-center justify-between bg-[#1A1A1A]/80 min-w-0">
          <div className="min-w-0 pr-1">
            <div className="text-xs font-black uppercase tracking-wider text-white truncate max-w-[120px]">
              {battingName}
            </div>
            <div className="text-[10px] font-bold text-white/60">
              CRR: <strong className="text-white font-mono">{crr.toFixed(2)}</strong>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white leading-none">
              <span className="text-[#D9A928]">{runs}</span>
              <span className="text-white/40 mx-0.5">/</span>
              <span>{wickets}</span>
            </div>
            <div className="text-[10px] font-black text-white/80 font-mono tracking-wide mt-1">
              {currentOversText} <span className="text-white/50 text-[9px] uppercase">/ {maxOvers}.0 OV</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Active Batsmen (Col 5-7) */}
        <div className="col-span-3 px-3.5 py-2 flex flex-col justify-center gap-1.5 bg-[#111111]/80 min-w-0">
          {/* Striker */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 min-w-0 pr-1.5">
              <span className="text-[#D9A928] font-black text-sm leading-none">*</span>
              <span className="font-extrabold uppercase text-white truncate max-w-[130px]">
                {striker?.name || "Striker"}
              </span>
            </div>
            <div className="font-mono font-black tabular-nums text-right shrink-0">
              <span className="text-[#D9A928] text-xs font-bold">{strikerStats?.runs ?? 0}</span>
              <span className="text-white/50 text-[10px] font-normal ml-0.5">
                ({strikerStats?.balls ?? 0})
              </span>
            </div>
          </div>

          {/* Non-Striker */}
          <div className="flex items-center justify-between text-xs opacity-75">
            <div className="flex items-center gap-1 min-w-0 pr-1.5">
              <span className="invisible text-sm leading-none">*</span>
              <span className="font-bold uppercase text-white/90 truncate max-w-[130px]">
                {nonStriker?.name || "Non-Striker"}
              </span>
            </div>
            <div className="font-mono font-bold tabular-nums text-right shrink-0">
              <span className="text-white text-xs">{nonStrikerStats?.runs ?? 0}</span>
              <span className="text-white/50 text-[10px] font-normal ml-0.5">
                ({nonStrikerStats?.balls ?? 0})
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Active Bowler (Col 8-9) */}
        <div className="col-span-2 px-3.5 py-3 flex flex-col justify-between bg-[#1A1A1A]/80 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-[#D9A928] tracking-wider">
              BOWLER
            </span>
            <span className="text-[9px] font-mono text-white/50">
              Econ: {bowlerStats ? bowlerStats.economy.toFixed(1) : "0.0"}
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="font-extrabold text-xs uppercase text-white truncate max-w-[95px]">
              {bowler?.name || "Bowler"}
            </span>
            <div className="font-mono font-black text-xs tabular-nums text-right shrink-0">
              <span>{bowlerStats?.wickets ?? 0}</span>
              <span className="text-white/40 mx-0.5">/</span>
              <span className="text-[#D9A928]">{bowlerStats?.runs ?? 0}</span>
              <span className="text-white/50 text-[9px] ml-0.5">
                ({bowlerStats ? oversText(bowlerStats.legalBalls) : "0.0"})
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5: Recent Deliveries Strip (Col 10-12) */}
        <div className="col-span-3 px-3.5 py-3 flex flex-col justify-center bg-[#111111]/90 min-w-0">
          <BallByBallStrip recentBalls={recentBalls} maxDeliveries={8} />
        </div>

      </div>
    </div>
  );
}
