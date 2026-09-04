import { AnimatePresence, motion } from "framer-motion";
import type { ObsBroadcastEvent } from "@/hooks/useObsMatchEvents";
import { Sparkles, AlertTriangle, Zap, User, Flame, Trophy } from "lucide-react";

interface EventAlertOverlayProps {
  event: ObsBroadcastEvent | null;
}

export function EventAlertOverlay({ event }: EventAlertOverlayProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden select-none">
      <AnimatePresence mode="wait">
        {event && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.25, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.15, filter: "blur(8px)" }}
            transition={{ type: "spring", damping: 15, stiffness: 280 }}
            className="relative flex flex-col items-center justify-center"
          >
            {/* ── 1. FOUR EVENT (Center TV Pop + Tournament 4s Counter) ──────── */}
            {event.type === "FOUR" && (
              <div className="relative flex flex-col items-center justify-center">
                {/* Radial Golden Burst Glow */}
                <div className="absolute -inset-16 bg-gradient-to-r from-[#D9A928]/35 via-amber-400/25 to-[#D9A928]/35 blur-3xl rounded-full pointer-events-none animate-pulse" />

                {/* Main TV Pop Card */}
                <div className="relative bg-gradient-to-b from-[#181818]/98 via-[#0F0F0F]/98 to-black/98 border-2 border-[#D9A928] rounded-3xl p-8 sm:p-10 shadow-[0_0_80px_rgba(217,169,40,0.5),0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center min-w-[340px] max-w-[460px]">
                  
                  {/* Shimmer light sweep */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
                  </div>

                  {/* Top Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#D9A928]/20 border border-[#D9A928]/60 mb-2 shadow-inner">
                    <span className="h-2 w-2 rounded-full bg-[#D9A928] animate-ping" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-[#D9A928]">
                      BOUNDARY
                    </span>
                  </div>

                  {/* Giant 3D Center 4 */}
                  <div className="relative my-0 select-none">
                    <span className="text-[140px] sm:text-[160px] font-black leading-none font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] via-[#D9A928] to-[#8C6205] drop-shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
                      4
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[140px] sm:text-[160px] font-black leading-none font-mono tracking-tighter text-[#D9A928]/25 blur-md">
                        4
                      </span>
                    </div>
                  </div>

                  {/* Wordmark */}
                  <div className="text-2xl sm:text-3xl font-black uppercase tracking-[0.35em] text-white -mt-5 mb-2 drop-shadow-md">
                    FOUR
                  </div>

                  {/* Batter Name Pill */}
                  {event.batterName && (
                    <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/90 bg-white/10 px-4 py-1 rounded-full border border-white/15 mb-3 truncate max-w-[280px]">
                      {event.batterName}
                    </div>
                  )}

                  {/* Tournament Fours Tracker Pill */}
                  {typeof event.tournamentTotalFours === "number" && event.tournamentTotalFours > 0 && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-4 shadow-sm">
                      <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>TOURNAMENT 4s: {event.tournamentTotalFours}</span>
                    </div>
                  )}

                  {/* Below the 4: POWERED BY VALGROW LABS */}
                  <div className="w-full pt-4 border-t border-[#D9A928]/40 flex items-center justify-center gap-2.5">
                    <img
                      src="/valgrow-labs-logo.jpeg"
                      alt="ValGrow Labs"
                      className="h-5 w-5 rounded object-cover shadow-md"
                    />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. SIX EVENT (Center TV Pop + Tournament 6s Counter) ───────── */}
            {event.type === "SIX" && (
              <div className="relative flex flex-col items-center justify-center">
                {/* Radial Golden Flare Burst Glow */}
                <div className="absolute -inset-20 bg-gradient-to-r from-[#D9A928]/45 via-amber-300/30 to-[#D9A928]/45 blur-3xl rounded-full pointer-events-none animate-pulse" />

                {/* Main TV Pop Card */}
                <div className="relative bg-gradient-to-b from-[#181818]/98 via-[#0F0F0F]/98 to-black/98 border-2 border-[#D9A928] rounded-3xl p-8 sm:p-10 shadow-[0_0_90px_rgba(217,169,40,0.65),0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center min-w-[340px] max-w-[460px]">
                  
                  {/* Shimmer light sweep */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D9A928]/25 to-transparent -translate-x-full animate-[shimmer_1.3s_infinite]" />
                  </div>

                  {/* Top Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#D9A928]/20 border border-[#D9A928]/60 mb-2 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-[#D9A928] animate-spin" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-[#D9A928]">
                      MAXIMUM
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#D9A928] animate-spin" />
                  </div>

                  {/* Giant 3D Center 6 */}
                  <div className="relative my-0 select-none">
                    <span className="text-[140px] sm:text-[160px] font-black leading-none font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] via-[#D9A928] to-[#8C6205] drop-shadow-[0_12px_30px_rgba(0,0,0,0.9)]">
                      6
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[140px] sm:text-[160px] font-black leading-none font-mono tracking-tighter text-[#D9A928]/30 blur-md">
                        6
                      </span>
                    </div>
                  </div>

                  {/* Wordmark */}
                  <div className="text-2xl sm:text-3xl font-black uppercase tracking-[0.35em] text-white -mt-5 mb-2 drop-shadow-md">
                    SIX
                  </div>

                  {/* Batter Name Pill */}
                  {event.batterName && (
                    <div className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/90 bg-white/10 px-4 py-1 rounded-full border border-white/15 mb-3 truncate max-w-[280px]">
                      {event.batterName}
                    </div>
                  )}

                  {/* Tournament Sixes Tracker Pill */}
                  {typeof event.tournamentTotalSixes === "number" && event.tournamentTotalSixes > 0 && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D9A928]/25 border border-[#D9A928]/60 text-[10px] font-black uppercase tracking-widest text-[#FFF0B3] mb-4 shadow-[0_0_15px_rgba(217,169,40,0.3)]">
                      <Zap className="w-3.5 h-3.5 text-[#D9A928] animate-bounce" />
                      <span>TOURNAMENT 6s: {event.tournamentTotalSixes}</span>
                    </div>
                  )}

                  {/* Below the 6: POWERED BY VALGROW LABS */}
                  <div className="w-full pt-4 border-t border-[#D9A928]/40 flex items-center justify-center gap-2.5">
                    <img
                      src="/valgrow-labs-logo.jpeg"
                      alt="ValGrow Labs"
                      className="h-5 w-5 rounded object-cover shadow-md"
                    />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. NO BALL POPUP ALERT ────────────────────────────────────── */}
            {event.type === "NO_BALL" && (
              <div className="relative flex flex-col items-center justify-center">
                {/* Red/Orange Warning Glow */}
                <div className="absolute -inset-16 bg-gradient-to-r from-red-600/40 via-amber-500/30 to-red-600/40 blur-3xl rounded-full pointer-events-none animate-pulse" />

                {/* Main TV Alert Box */}
                <div className="relative bg-gradient-to-b from-[#220707]/98 via-[#140505]/98 to-black/98 border-2 border-red-500 rounded-3xl p-8 sm:p-10 shadow-[0_0_80px_rgba(239,68,68,0.55),0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center min-w-[340px] max-w-[460px]">
                  
                  {/* Top Alert Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/25 border border-red-500/70 mb-3 shadow-inner">
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                      EXTRA
                    </span>
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                  </div>

                  {/* NO BALL Giant Title */}
                  <div className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-red-200 to-red-500 drop-shadow-[0_8px_20px_rgba(239,68,68,0.5)] my-2">
                    NO BALL
                  </div>

                  {/* FREE HIT NEXT Animated Banner */}
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#D9A928]/25 via-amber-400/35 to-[#D9A928]/25 border-2 border-[#D9A928] text-xs sm:text-sm font-black uppercase tracking-widest text-[#FFF0B3] my-2 shadow-[0_0_20px_rgba(217,169,40,0.4)] animate-pulse">
                    <Zap className="w-4 h-4 text-[#D9A928]" />
                    <span>FREE HIT NEXT DELIVERY</span>
                    <Zap className="w-4 h-4 text-[#D9A928]" />
                  </div>

                  {/* Bowler Details */}
                  {event.bowlerName && (
                    <p className="text-xs font-bold text-white/70 uppercase tracking-wider mt-2 mb-4">
                      Bowler: <span className="text-white font-black">{event.bowlerName}</span>
                    </p>
                  )}

                  {/* Footer Branding */}
                  <div className="w-full pt-4 border-t border-red-500/40 flex items-center justify-center gap-2.5">
                    <img
                      src="/valgrow-labs-logo.jpeg"
                      alt="ValGrow Labs"
                      className="h-5 w-5 rounded object-cover shadow-md"
                    />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. NEW BATTER AT THE CREASE BANNER ─────────────────────────── */}
            {event.type === "NEW_BATTER" && (
              <div className="relative flex flex-col items-center justify-center">
                <div className="absolute -inset-14 bg-gradient-to-r from-[#D9A928]/30 via-indigo-600/20 to-[#D9A928]/30 blur-3xl rounded-full pointer-events-none animate-pulse" />

                <div className="relative bg-gradient-to-b from-[#161616]/98 via-[#0F0F0F]/98 to-black/98 border-2 border-[#D9A928] rounded-3xl p-7 sm:p-8 shadow-[0_0_70px_rgba(217,169,40,0.45),0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center min-w-[340px] max-w-[440px]">
                  
                  {/* Top Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#D9A928]/20 border border-[#D9A928]/60 mb-3 shadow-inner">
                    <User className="w-3.5 h-3.5 text-[#D9A928]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D9A928]">
                      NEW BATTER AT THE CREASE
                    </span>
                  </div>

                  {/* Batter Name */}
                  <div className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white drop-shadow-md my-1">
                    {event.batterName}
                  </div>

                  {/* Team & Role Pill */}
                  <div className="flex flex-wrap items-center justify-center gap-2 my-2">
                    {event.teamName && (
                      <span className="px-3 py-0.5 rounded-md bg-white/10 border border-white/20 text-xs font-bold uppercase text-white/90">
                        {event.teamName}
                      </span>
                    )}
                    {event.role && (
                      <span className="px-3 py-0.5 rounded-md bg-[#D9A928]/15 border border-[#D9A928]/40 text-xs font-extrabold uppercase text-[#D9A928]">
                        {event.role}
                      </span>
                    )}
                  </div>

                  {/* Footer Branding */}
                  <div className="w-full pt-4 border-t border-[#D9A928]/40 flex items-center justify-center gap-2.5 mt-2">
                    <img
                      src="/valgrow-labs-logo.jpeg"
                      alt="ValGrow Labs"
                      className="h-5 w-5 rounded object-cover shadow-md"
                    />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 5. WICKET EVENT (Center TV Pop) ──────────────────────────── */}
            {event.type === "WICKET" && (
              <div className="relative flex flex-col items-center justify-center">
                <div className="absolute -inset-16 bg-gradient-to-r from-red-600/35 via-rose-600/20 to-red-600/35 blur-3xl rounded-full pointer-events-none animate-pulse" />

                <div className="relative bg-gradient-to-b from-[#1C0606]/98 via-[#0F0404]/98 to-black/98 border-2 border-red-600 rounded-3xl p-8 sm:p-10 shadow-[0_0_80px_rgba(220,38,38,0.5),0_0_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col items-center text-center min-w-[340px] max-w-[460px]">
                  
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-600/20 border border-red-600/60 mb-2 shadow-inner">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                      WICKET
                    </span>
                  </div>

                  <div className="my-2 select-none">
                    <span className="text-7xl sm:text-8xl font-black leading-none tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-red-200 to-red-500 drop-shadow-[0_10px_25px_rgba(0,0,0,0.9)]">
                      OUT
                    </span>
                  </div>

                  <div className="text-lg sm:text-xl font-black uppercase tracking-wider text-white mb-1 truncate max-w-[300px]">
                    {event.batterName}
                  </div>

                  {event.dismissalText && (
                    <div className="text-xs font-bold uppercase tracking-wider text-red-400 mb-4">
                      {event.dismissalText}
                    </div>
                  )}

                  <div className="w-full pt-4 border-t border-red-600/40 flex items-center justify-center gap-2.5">
                    <img
                      src="/valgrow-labs-logo.jpeg"
                      alt="ValGrow Labs"
                      className="h-5 w-5 rounded object-cover shadow-md"
                    />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                      <span className="text-[#D9A928]">POWERED BY</span> VALGROW LABS
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 6. FIFTY EVENT ───────────────────────────────────────────── */}
            {event.type === "FIFTY" && (
              <div className="relative bg-[#111111]/95 text-white border-2 border-[#D9A928] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-2 backdrop-blur-xl">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#D9A928]">
                  HALF CENTURY
                </div>
                <div className="text-2xl font-black uppercase text-white">
                  {event.batterName}
                </div>
                <div className="text-5xl font-black text-[#D9A928] font-mono">
                  {event.runs}
                </div>
              </div>
            )}

            {/* ── 7. CENTURY EVENT ─────────────────────────────────────────── */}
            {event.type === "CENTURY" && (
              <div className="relative bg-[#111111]/95 text-white border-2 border-[#D9A928] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-2 backdrop-blur-xl">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#D9A928]">
                  MAGNIFICENT CENTURY
                </div>
                <div className="text-2xl font-black uppercase text-white">
                  {event.batterName}
                </div>
                <div className="text-6xl font-black text-[#D9A928] font-mono">
                  {event.runs}
                </div>
              </div>
            )}

            <style>{`
              @keyframes shimmer {
                100% {
                  transform: translateX(100%);
                }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
