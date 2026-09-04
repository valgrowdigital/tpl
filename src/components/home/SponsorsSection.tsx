import { Shield, Sparkles, Trophy, Handshake, Mail, ArrowRight, Cpu, Eye, Brain } from "lucide-react";

export function SponsorsSection() {
  return (
    <section className="flex flex-col gap-5 pt-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D9A928]" />
          <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-[#111111]">
            OFFICIAL TOURNAMENT PARTNERS & SPONSORS
          </h2>
        </div>
        <span className="text-[10px] font-extrabold text-[#5F6368] uppercase tracking-wider">
          TPL 2026
        </span>
      </div>

      {/* Main Sponsors Showcase Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141518] via-[#0E0F12] to-[#08090B] border border-white/10 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D9A928]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Top Row: 3-Col Partner Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Title Partner Slot */}
            <div className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#D9A928]/40 p-5 flex flex-col justify-between gap-4 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] bg-black/60 px-2.5 py-1 rounded-full border border-[#D9A928]/30">
                  Title Patron
                </span>
                <Trophy className="h-4 w-4 text-[#D9A928]" />
              </div>
              <div>
                <p className="text-base font-black uppercase text-white tracking-wide">
                  Thunduwa Premier League
                </p>
                <p className="text-xs text-white/60 font-medium mt-1">
                  Official Tournament Organizing Committee & Community Patrons
                </p>
              </div>
            </div>

            {/* AI & Technology Lab Partner Slot */}
            <div className="rounded-2xl bg-gradient-to-b from-[#D9A928]/10 to-white/[0.03] border border-[#D9A928]/40 hover:border-[#D9A928] p-5 flex flex-col justify-between gap-4 shadow-lg transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D9A928]/15 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] bg-black/80 px-2.5 py-1 rounded-full border border-[#D9A928]/50 flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-[#D9A928]" />
                  AI & Tech Lab Partner
                </span>
                <Cpu className="h-4 w-4 text-[#D9A928] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src="/valgrow-labs-logo.jpeg"
                    alt="ValGrow AI Lab"
                    className="w-6 h-6 rounded-lg object-contain border border-[#D9A928]/40 bg-black/60"
                  />
                  <p className="text-base font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F4C542] to-white tracking-wide">
                    ValGrow AI & Tech Lab
                  </p>
                </div>
                <p className="text-xs text-white/70 font-medium leading-relaxed">
                  Real-time edge computer vision, automated cricket telemetry & generative predictive models
                </p>
              </div>
            </div>

            {/* Broadcast & Media Partner Slot */}
            <div className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-400/40 p-5 flex flex-col justify-between gap-4 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-black/60 px-2.5 py-1 rounded-full border border-cyan-400/30">
                  Live Broadcast
                </span>
                <Shield className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-base font-black uppercase text-white tracking-wide">
                  TPL Live Match Broadcast
                </p>
                <p className="text-xs text-white/60 font-medium mt-1">
                  Ultra-low latency OBS stream graphics, live overlays & player performance trackers
                </p>
              </div>
            </div>
          </div>

          {/* Partnership & Sponsorship Inquiry CTA */}
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#D9A928]/15 border border-[#D9A928]/30 flex items-center justify-center shrink-0">
                <Handshake className="h-5 w-5 text-[#D9A928]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-white uppercase">
                  Partner with TPL 2026
                </p>
                <p className="text-[10px] text-white/60 font-medium">
                  Connect your brand with thousands of passionate cricket fans, players, and live stream viewers
                </p>
              </div>
            </div>

            <a
              href="mailto:contact@tplcricket.com?subject=TPL%202026%20Sponsorship%20Inquiry"
              className="tap inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D9A928] hover:bg-[#E5B537] text-black text-xs font-black uppercase tracking-wider shadow-md transition-all shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Sponsor Inquiries</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
