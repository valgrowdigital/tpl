import React from "react";
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
} from "lucide-react";

export interface AdvertisementPayload {
  title?: string;
  subtitle?: string;
  tagline?: string;
  sponsorName?: string;
  logoUrl?: string;
  durationSeconds?: number;
}

interface AdvertisementBreakGraphicProps {
  payload?: AdvertisementPayload;
  stream?: ObsMatchStreamResult;
}

export function AdvertisementBreakGraphic({ payload }: AdvertisementBreakGraphicProps) {
  const sponsorName = payload?.sponsorName || "VALGROW AI & TECH LAB";
  const title = payload?.title || "VALGROW AI & TECH LAB";
  const tagline = payload?.tagline || "Official AI & Technology Innovation Partner · TPL 2026";
  const subtitle =
    payload?.subtitle ||
    "Powering TPL 2026 with ultra-low latency predictive AI models, edge computer vision ball-tracking, automated telemetry, and next-generation sports intelligence.";
  const logoUrl = payload?.logoUrl || "/valgrow-labs-logo.jpeg";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none pointer-events-none animate-in fade-in zoom-in-95 duration-300">
      <style>{`
        @keyframes ad-equalizer {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        @keyframes ad-laser-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @keyframes ad-glow-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
      `}</style>

      {/* ── AMBIENT BACKDROP GLOW ────────────────────────────────────────── */}
      <div
        className="absolute w-[450px] h-[300px] bg-[#D9A928]/20 blur-[90px] rounded-full pointer-events-none"
        style={{ animation: "ad-glow-pulse 4s ease-in-out infinite" }}
      />

      {/* ── COMPACT BROADCAST-SIZED OPAQUE CARD ──────────────────────────── */}
      <div className="relative w-full max-w-xl bg-[#090A0D] border-2 border-[#D9A928]/60 rounded-3xl p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_30px_rgba(217,169,40,0.2)] flex flex-col items-center text-center overflow-hidden">
        
        {/* Subtle Sweeping Laser Scan Line */}
        <div
          className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-[#D9A928]/30 to-transparent pointer-events-none"
          style={{ animation: "ad-laser-sweep 3s ease-in-out infinite" }}
        />

        {/* High-Tech Corner Notches */}
        <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#D9A928] rounded-tl" />
        <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#D9A928] rounded-tr" />
        <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#D9A928] rounded-bl" />
        <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#D9A928] rounded-br" />

        {/* ── TOP TELEMETRY STATUS HUD STRIP ──────────────────────────────── */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-black text-emerald-400 tracking-wider">
              AI CORE: ACTIVE
            </span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D9A928]/15 border border-[#D9A928]/40">
            <Radio className="w-2.5 h-2.5 text-[#D9A928] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#D9A928]">
              SPONSOR SPOTLIGHT
            </span>
          </div>

          <div className="flex items-center gap-1 text-cyan-400 font-bold">
            <Activity className="w-3 h-3" />
            <span>0.12ms</span>
          </div>
        </div>

        {/* ── BRAND HERO ROW (Compact Logo + Title) ────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mb-2.5">
          {/* Logo Frame */}
          <div className="relative w-14 h-14 rounded-2xl bg-black border-2 border-[#D9A928] p-1 shadow-lg shrink-0 flex items-center justify-center">
            <img
              src={logoUrl}
              alt={sponsorName}
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          {/* Titles */}
          <div className="text-left flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white drop-shadow-md">
                {sponsorName}
              </h2>
              <Sparkles className="w-3.5 h-3.5 text-[#D9A928] animate-bounce shrink-0" />
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#D9A928] tracking-wide mt-0.5">
              <Cpu className="w-3 h-3 shrink-0" />
              <span>{tagline}</span>
            </div>
          </div>
        </div>

        {/* Subtitle Description */}
        <p className="text-[11px] text-[#E2E8F0] font-medium leading-relaxed max-w-lg mb-3 px-1">
          {subtitle}
        </p>

        {/* ── 2x2 HIGH-CONTRAST TECH PILLAR MATRIX ─────────────────────────── */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3 text-left">
          {/* Tile 1: Neural AI */}
          <div className="p-2.5 rounded-xl bg-[#13151A] border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1 rounded-md bg-[#D9A928]/20 text-[#D9A928]">
                <Brain className="w-3 h-3" />
              </div>
              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 text-[#D9A928] border border-[#D9A928]/30">
                NEURAL AI
              </span>
            </div>
            <p className="text-[11px] font-black text-white uppercase tracking-wide">
              Predictive Models
            </p>
            <p className="text-[9px] text-[#94A3B8] leading-tight">
              Win probability & automated match intelligence.
            </p>
          </div>

          {/* Tile 2: Vision Lab */}
          <div className="p-2.5 rounded-xl bg-[#13151A] border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400">
                <Eye className="w-3 h-3" />
              </div>
              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 text-cyan-400 border border-cyan-400/30">
                VISION LAB
              </span>
            </div>
            <p className="text-[11px] font-black text-white uppercase tracking-wide">
              Computer Vision
            </p>
            <p className="text-[9px] text-[#94A3B8] leading-tight">
              Edge ball tracking & pitch hawkeye analytics.
            </p>
          </div>

          {/* Tile 3: Real-Time Cloud */}
          <div className="p-2.5 rounded-xl bg-[#13151A] border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                <Zap className="w-3 h-3" />
              </div>
              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 text-amber-400 border border-amber-400/30">
                LOW-LATENCY
              </span>
            </div>
            <p className="text-[11px] font-black text-white uppercase tracking-wide">
              Real-Time Cloud
            </p>
            <p className="text-[9px] text-[#94A3B8] leading-tight">
              Sub-millisecond tournament sync & live stream telemetry.
            </p>
          </div>

          {/* Tile 4: Zero-Trust Security */}
          <div className="p-2.5 rounded-xl bg-[#13151A] border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-400/30">
                ZERO TRUST
              </span>
            </div>
            <p className="text-[11px] font-black text-white uppercase tracking-wide">
              Data Integrity
            </p>
            <p className="text-[9px] text-[#94A3B8] leading-tight">
              Tamper-proof live match ledger & stats security.
            </p>
          </div>
        </div>

        {/* ── EQUALIZER FREQUENCY BARS ─────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1 py-1 mb-2.5">
          {[8, 14, 18, 10, 6, 16, 20, 12, 8, 16, 10, 18, 12, 8, 14].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-[#D9A928] via-cyan-400 to-white"
              style={{
                height: `${h}px`,
                animation: `ad-equalizer ${0.5 + (i % 4) * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>

        {/* ── BROADCAST FOOTER (High Contrast) ─────────────────────────────── */}
        <div className="w-full pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-[#E2E8F0]">
            <Tv className="w-3 h-3 text-[#D9A928]" />
            <span className="font-black uppercase tracking-wider">
              TPL 2026 OFFICIAL BROADCAST
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-black uppercase tracking-widest text-[9px]">
              MATCH RESUMES SHORTLY
            </span>
          </div>
        </div>

        {/* Bottom Glowing Accent Line */}
        <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-[#D9A928] to-transparent rounded-full shadow-[0_0_12px_#D9A928]" />
      </div>
    </div>
  );
}
