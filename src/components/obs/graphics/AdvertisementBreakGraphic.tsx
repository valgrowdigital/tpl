import { motion } from "framer-motion";
import type { ObsMatchStreamResult } from "@/hooks/useObsMatchStream";
import {
  Sparkles,
  Tv,
  Radio,
  Cpu,
  Brain,
  Eye,
  Zap,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";

export interface AdvertisementPayload {
  title?: string;
  subtitle?: string;
  tagline?: string;
  sponsorName?: string;
  logoUrl?: string;
  durationSeconds?: number;
  transition?: string;
}

interface AdvertisementBreakGraphicProps {
  payload?: AdvertisementPayload;
  stream?: ObsMatchStreamResult;
}

export function AdvertisementBreakGraphic({ payload }: AdvertisementBreakGraphicProps) {
  const sponsorName = payload?.sponsorName || "VALGROW AI & TECH LAB";
  const title = payload?.title || "VALGROW AI & TECHNOLOGY LAB";
  const tagline =
    payload?.tagline || "Official AI, Deep Tech & Computer Vision Partner · TPL 2026";
  const subtitle =
    payload?.subtitle ||
    "Powering TPL 2026 with ultra-low latency predictive AI models, edge computer vision ball-tracking, automated telemetry, and next-generation sports intelligence.";
  const logoUrl = payload?.logoUrl || "/valgrow-labs-logo.jpeg";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none pointer-events-none isolate">
      {/* ── AMBIENT LUXURY BACKDROP GLOWS ─────────────────────────────────── */}
      <div className="absolute w-[700px] h-[450px] bg-[#D9A928]/15 blur-[130px] rounded-full pointer-events-none -translate-y-8" />
      <div className="absolute w-[500px] h-[350px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none translate-x-32 translate-y-16" />

      {/* ── BROADCAST OPAQUE OBSIDIAN CARD ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-[#090B10]/95 backdrop-blur-2xl border border-white/10 ring-1 ring-[#D9A928]/35 rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.92),0_0_40px_rgba(217,169,40,0.16)] flex flex-col items-center text-center overflow-hidden"
      >
        {/* Subtle Top Gold Highlight Bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D9A928] to-transparent shadow-[0_0_12px_#D9A928]" />

        {/* ── TOP TELEMETRY STATUS BAR ─────────────────────────────────────── */}
        <div className="w-full flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08] text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] sm:text-xs font-bold text-emerald-400 tracking-wider uppercase">
              AI Core Active
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9A928]/10 border border-[#D9A928]/30">
            <Sparkles className="w-3 h-3 text-[#D9A928]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
              Official Technology Spotlight
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs text-cyan-400 font-bold">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>0.12ms Latency</span>
          </div>
        </div>

        {/* ── HERO BRAND HEADER ────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 sm:gap-5 mb-3.5">
          {/* Brand Logo Container */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/90 border border-[#D9A928]/60 p-2 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(217,169,40,0.2)] shrink-0 flex items-center justify-center">
            <img
              src={logoUrl}
              alt={sponsorName}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          {/* Titles & Partnership Badge */}
          <div className="text-left flex flex-col justify-center">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white drop-shadow-sm">
              {sponsorName}
            </h2>
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#D9A928] tracking-wide mt-1">
              <Cpu className="w-3.5 h-3.5 shrink-0 text-[#D9A928]" />
              <span>{tagline}</span>
            </div>
          </div>
        </div>

        {/* Description Text */}
        <p className="text-xs sm:text-[13px] text-slate-300 font-normal leading-relaxed max-w-xl mb-4 px-2">
          {subtitle}
        </p>

        {/* ── 2x2 CLEAN TECH CAPABILITY MATRIX ─────────────────────────────── */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 text-left">
          {/* Tile 1: Predictive Models */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col gap-1.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-[#D9A928]/15 text-[#D9A928]">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/50 text-[#D9A928] border border-[#D9A928]/30">
                NEURAL AI
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Predictive Models
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Win probability, player metrics & live simulation intelligence.
            </p>
          </div>

          {/* Tile 2: Computer Vision */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col gap-1.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/50 text-cyan-400 border border-cyan-400/30">
                VISION LAB
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Computer Vision
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Edge ball tracking, Hawkeye trajectory & pitch mapping.
            </p>
          </div>

          {/* Tile 3: Real-Time Cloud */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col gap-1.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/50 text-amber-400 border border-amber-400/30">
                LOW-LATENCY
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Real-Time Cloud
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Sub-millisecond tournament sync & live broadcast telemetry.
            </p>
          </div>

          {/* Tile 4: Data Integrity */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex flex-col gap-1.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/50 text-emerald-400 border border-emerald-400/30">
                ZERO TRUST
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
              Data Integrity
            </p>
            <p className="text-[11px] text-slate-400 leading-snug">
              Tamper-proof live match ledger & cryptographic stat security.
            </p>
          </div>
        </div>

        {/* ── BROADCAST FOOTER ─────────────────────────────────────────────── */}
        <div className="w-full pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-300">
            <Tv className="w-3.5 h-3.5 text-[#D9A928]" />
            <span className="font-bold uppercase tracking-wider text-[11px]">
              TPL 2026 Official Broadcast
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full">
              Live Match Action Resumes Shortly
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

