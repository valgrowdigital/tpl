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
  Server,
  Activity,
  Binary,
  Wifi,
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
  const sponsorName = payload?.sponsorName || "VALGROW AI & TECHNOLOGY LAB";
  const title = payload?.title || "VALGROW AI & TECHNOLOGY LAB";
  const tagline = payload?.tagline || "Official AI, Deep Tech & Real-Time Computer Vision Partner · TPL 2026";
  const subtitle =
    payload?.subtitle ||
    "Powering TPL 2026 with ultra-low latency predictive AI models, edge computer vision ball-tracking, automated telemetry, and next-generation sports intelligence platforms.";
  const logoUrl = payload?.logoUrl || "/valgrow-labs-logo.jpeg";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans select-none pointer-events-none animate-in fade-in zoom-in-95 duration-500">
      <style>{`
        @keyframes ad-cyber-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          40% { opacity: 0.8; }
          60% { opacity: 0.8; }
          100% { transform: translateY(800%); opacity: 0; }
        }
        @keyframes ad-orbital-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ad-orbital-spin-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes ad-equalizer {
          0%, 100% { height: 4px; }
          50% { height: 22px; }
        }
        @keyframes ad-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ad-pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .ad-grid-pattern {
          background-size: 28px 28px;
          background-image: 
            linear-gradient(to right, rgba(217, 169, 40, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(217, 169, 40, 0.07) 1px, transparent 1px);
        }
      `}</style>

      {/* ── AMBIENT NEURAL GLOW BACKDROPS ─────────────────────────────────── */}
      <div
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#D9A928]/15 blur-[120px] rounded-full pointer-events-none"
        style={{ animation: "ad-pulse-glow 6s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[650px] h-[450px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none"
        style={{ animation: "ad-pulse-glow 8s ease-in-out infinite reverse" }}
      />

      {/* ── MAIN HIGH-TECH GLASSMORPHIC CONTAINER ─────────────────────────── */}
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-[#141518]/98 via-[#0D0E11]/98 to-[#060709]/99 border border-[#D9A928]/40 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_0_90px_rgba(0,0,0,0.95),0_0_50px_rgba(217,169,40,0.25)] backdrop-blur-2xl flex flex-col items-center text-center overflow-hidden ad-grid-pattern">
        
        {/* Animated Laser Scanning Line */}
        <div
          className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[#D9A928]/25 to-transparent pointer-events-none"
          style={{ animation: "ad-cyber-scan 4s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />

        {/* Futuristic Corner Tech Accents */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#D9A928] rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#D9A928] rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#D9A928] rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#D9A928] rounded-br-lg" />

        {/* ── TOP TELEMETRY STATUS HUD STRIP ──────────────────────────────── */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-white/10 pb-4 mb-6 text-[10px] sm:text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-mono font-black tracking-widest text-emerald-400 uppercase">
              AI CORE: ONLINE
            </span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-white/60 font-mono tracking-wider hidden sm:inline">
              SYS // NEURAL_ENGINE_v4.8
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D9A928]/15 border border-[#D9A928]/40 shadow-inner">
            <Radio className="w-3 h-3 text-[#D9A928] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
              OFFICIAL TECHNOLOGY SPOTLIGHT
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-white/60">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-bold hidden sm:inline">LATENCY: 0.14ms</span>
            <span className="text-white/30 hidden sm:inline">|</span>
            <span className="text-[#D9A928] font-bold">120 FPS</span>
          </div>
        </div>

        {/* ── HOLOGRAPHIC LOGO & ORBITAL MATRIX ────────────────────────────── */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Outer Orbital Rotating Ring */}
          <div
            className="absolute -inset-6 sm:-inset-8 border border-dashed border-[#D9A928]/40 rounded-full pointer-events-none"
            style={{ animation: "ad-orbital-spin-cw 20s linear infinite" }}
          />
          {/* Inner Orbital Rotating Ring */}
          <div
            className="absolute -inset-3 sm:-inset-4 border border-dotted border-cyan-400/40 rounded-full pointer-events-none"
            style={{ animation: "ad-orbital-spin-ccw 14s linear infinite" }}
          />

          {/* Logo Center Card */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#D9A928]/60 via-cyan-400/40 to-[#D9A928]/60 rounded-3xl blur-xl opacity-80 animate-pulse" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black/90 border-2 border-[#D9A928] p-2 flex items-center justify-center shadow-2xl overflow-hidden backdrop-blur-xl">
              <img
                src={logoUrl}
                alt={sponsorName}
                className="w-full h-full object-contain rounded-xl drop-shadow-[0_0_10px_rgba(217,169,40,0.5)]"
              />
            </div>
          </div>
        </div>

        {/* ── BRAND NAME & TYPOGRAPHY ──────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <Sparkles className="w-5 h-5 text-[#D9A928] animate-bounce" />
          <h2
            className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F4C542] via-white to-[#F4C542] drop-shadow-md"
            style={{
              backgroundSize: "200% auto",
              animation: "ad-shimmer 4s linear infinite",
            }}
          >
            {sponsorName}
          </h2>
          <Sparkles className="w-5 h-5 text-[#D9A928] animate-bounce" />
        </div>

        {/* Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-white/15 mb-3">
          <Cpu className="w-3.5 h-3.5 text-[#D9A928]" />
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#D9A928]">
            {tagline}
          </p>
        </div>

        {/* Subtitle Description */}
        <p className="text-xs sm:text-sm text-white/80 max-w-2xl font-medium leading-relaxed mb-6">
          {subtitle}
        </p>

        {/* ── 4-PILLAR AI & TECHNOLOGY INNOVATION MATRIX ───────────────────── */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-left">
          {/* Card 1: Autonomous Neural AI */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#D9A928]/60 transition-all shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-[#D9A928]/15 text-[#D9A928] border border-[#D9A928]/30">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-black/50 text-[#D9A928] border border-[#D9A928]/30">
                NEURAL AI
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Autonomous AI Models
              </h4>
              <p className="text-[10px] text-white/60 leading-normal mt-0.5">
                Generative analytics, win probability & automated commentary intelligence.
              </p>
            </div>
          </div>

          {/* Card 2: Computer Vision & Ball Tracking */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/60 transition-all shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-black/50 text-cyan-400 border border-cyan-400/30">
                VISION LAB
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Edge Computer Vision
              </h4>
              <p className="text-[10px] text-white/60 leading-normal mt-0.5">
                Real-time ball tracking, Hawkeye pitch mapping & edge video processing.
              </p>
            </div>
          </div>

          {/* Card 3: Real-Time Cloud Engine */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-amber-400/60 transition-all shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-black/50 text-amber-400 border border-amber-400/30">
                LOW-LATENCY
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Real-Time Cloud
              </h4>
              <p className="text-[10px] text-white/60 leading-normal mt-0.5">
                Sub-millisecond tournament sync, distributed scoring & live broadcast telemetry.
              </p>
            </div>
          </div>

          {/* Card 4: Quantum Security & Ledger */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-emerald-400/60 transition-all shadow-sm flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-black/50 text-emerald-400 border border-emerald-400/30">
                ZERO TRUST
              </span>
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Cryptographic Integrity
              </h4>
              <p className="text-[10px] text-white/60 leading-normal mt-0.5">
                Tamper-proof live match scoring ledger & enterprise security protocols.
              </p>
            </div>
          </div>
        </div>

        {/* ── REAL-TIME AI TELEMETRY AUDIO / DATA EQUALIZER ─────────────────── */}
        <div className="w-full flex items-center justify-center gap-1.5 py-2 mb-4">
          {[12, 18, 24, 14, 8, 20, 26, 16, 10, 22, 14, 28, 18, 12, 20, 16].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-[#D9A928] via-cyan-400 to-white"
              style={{
                height: `${h}px`,
                animation: `ad-equalizer ${0.6 + (i % 5) * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>

        {/* ── BROADCAST FOOTER & LIVE RETURN STRIP ─────────────────────────── */}
        <div className="w-full pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-white/70">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#D9A928]" />
            <span className="text-white uppercase font-black text-[11px] tracking-wider">
              TPL 2026 PREMIER LEAGUE · LIVE OBS BROADCAST
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-white font-black uppercase text-[10px] tracking-widest bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-full">
              LIVE MATCH ACTION RESUMES SHORTLY
            </span>
          </div>
        </div>

        {/* Bottom Glowing Accent Bar */}
        <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-[#D9A928] to-transparent rounded-full shadow-[0_0_20px_#D9A928]" />
      </div>
    </div>
  );
}
