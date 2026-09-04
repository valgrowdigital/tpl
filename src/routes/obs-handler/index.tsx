import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useMatches, useTeams } from "@/hooks/useCricketData";
import { useObsHandlerMaster } from "@/hooks/useObsHandlerMaster";
import { GraphicRenderer } from "@/components/obs/GraphicRenderer";
import { Play, Square, Settings, RefreshCw, Maximize2, Radio, Sparkles, Video, Check, Trash2, ExternalLink } from "lucide-react";
import { TOURNAMENT_NAME } from "@/lib/repositories";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { obsStreamRepository } from "@/lib/obsStreamRepository";

export const Route = createFileRoute("/obs-handler/")({
  component: ObsHandlerIndex,
});

function ObsHandlerIndex() {
  const { data: matches = [], isLoading } = useMatches();
  const { data: teams = [] } = useTeams();
  const [selectedMatchOverride, setSelectedMatchOverride] = useState<string>(() => {
    const stored = obsHandlerService.getActiveMatch();
    return stored === "auto" ? "" : (stored || "");
  });

  // ── Auto-Follow Continuous Match Resolution ───────────────────────────────
  const autoMatch = useMemo(() => {
    return (
      matches.find((m) => m.status === "LIVE") ||
      matches.find((m) => m.status === "READY") ||
      matches.find((m) => m.status === "UPCOMING") ||
      matches[0]
    );
  }, [matches]);

  const activeMatch = useMemo(() => {
    if (selectedMatchOverride && matches.some((m) => m.id === selectedMatchOverride)) {
      return matches.find((m) => m.id === selectedMatchOverride);
    }
    return autoMatch;
  }, [selectedMatchOverride, autoMatch, matches]);

  const activeMatchId = activeMatch?.id || "";

  const [inputStreamUrl, setInputStreamUrl] = useState<string>(() => {
    return obsStreamRepository.getStreamUrl(activeMatchId || undefined) || "";
  });
  const [isStreamSaved, setIsStreamSaved] = useState<boolean>(false);

  const { activeGraphic, isOverlayConnected, setGraphic, clearGraphic } = useObsHandlerMaster(activeMatchId);

  const getTeamName = (id?: string) => (id ? teams.find((t) => t.id === id)?.name || id : "TBD");

  // Keep OBS global stream in sync with active auto-followed match
  useEffect(() => {
    if (activeMatchId) {
      obsHandlerService.setActiveMatch(activeMatchId);
    }
  }, [activeMatchId]);

  useEffect(() => {
    if (activeMatchId) {
      const current = obsStreamRepository.getStreamUrl(activeMatchId) || "";
      setInputStreamUrl(current);
    }
  }, [activeMatchId]);

  const handleApplyStreamUrl = () => {
    if (!inputStreamUrl.trim()) {
      obsStreamRepository.removeStreamUrl(activeMatchId);
      obsHandlerService.setStreamUrl("", activeMatchId);
      setIsStreamSaved(true);
      setTimeout(() => setIsStreamSaved(false), 2000);
      return;
    }
    const formatted = obsStreamRepository.saveStreamUrl(activeMatchId, inputStreamUrl);
    obsHandlerService.setStreamUrl(formatted, activeMatchId);
    setInputStreamUrl(formatted);
    setIsStreamSaved(true);
    setTimeout(() => setIsStreamSaved(false), 2000);
  };

  const handleClearStreamUrl = () => {
    obsStreamRepository.removeStreamUrl(activeMatchId);
    obsHandlerService.setStreamUrl("", activeMatchId);
    setInputStreamUrl("");
    setIsStreamSaved(true);
    setTimeout(() => setIsStreamSaved(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans pb-10">
      {/* Left Column: Controls */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col gap-5 flex-shrink-0">
        {/* Continuous Broadcast Live Card */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D9A928] animate-ping" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
                Continuous Stream Broadcast
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {isOverlayConnected ? (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  OVERLAY CONNECTED
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  OVERLAY WAITING
                </span>
              )}
            </div>
          </div>

          {/* Active Auto-Tracked Match Spotlight Banner */}
          <div className="p-4 rounded-xl bg-black/60 border border-[#D9A928]/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#D9A928] bg-[#D9A928]/15 px-2 py-0.5 rounded-md border border-[#D9A928]/40">
                {!selectedMatchOverride ? "✨ CONTINUOUS AUTOPILOT" : "📌 PINNED MATCH"}
              </span>
              {activeMatch && (
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    activeMatch.status === "LIVE"
                      ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                      : activeMatch.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/10 text-white/70 border-white/20"
                  }`}
                >
                  {activeMatch.status === "LIVE" ? "● LIVE NOW" : activeMatch.status}
                </span>
              )}
            </div>

            {activeMatch ? (
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-sm font-black text-white uppercase tracking-wide truncate">
                  MATCH #{String(activeMatch.matchNumber).padStart(2, "0")}: {getTeamName(activeMatch.teamAId)} vs {getTeamName(activeMatch.teamBId)}
                </p>
                <p className="text-[11px] text-white/50 font-medium">
                  {activeMatch.overs} Overs Match · {activeMatch.venue || "TPL Cricket Ground"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/60 font-bold">
                Waiting for tournament fixtures to load...
              </p>
            )}

            <p className="text-[10px] text-white/40 border-t border-white/10 pt-2 mt-1">
              {!selectedMatchOverride
                ? "Overlay automatically follows whichever match is live or next across all back-to-back matches."
                : "Manual match pin active. Switch back to Auto Continuous to follow all fixtures."}
            </p>
          </div>

          {/* Optional Mode / Match Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/50">
              Broadcast Tracking Mode
            </label>
            <select
              value={selectedMatchOverride}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMatchOverride(val);
                if (!val && autoMatch) {
                  obsHandlerService.setActiveMatch(autoMatch.id);
                } else if (val) {
                  obsHandlerService.setActiveMatch(val);
                }
              }}
              className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#D9A928] transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="text-[#D9A928] font-black bg-[#111111]">
                ✨ AUTO-TRACK TOURNAMENT (CONTINUOUS STREAM — DEFAULT)
              </option>
              {matches.map((m) => (
                <option key={m.id} value={m.id} className="text-white bg-[#111111]">
                  📌 PIN MATCH #{String(m.matchNumber).padStart(2, "0")} · {m.status === "LIVE" ? "● LIVE" : m.status === "COMPLETED" ? "✓ FINISHED" : "○ UPCOMING"} - {getTeamName(m.teamAId)} vs {getTeamName(m.teamBId)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OBS Virtual Camera & Transparent Overlay Mode Guide */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#D9A928]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
                OBS Virtual Camera & Overlay Setup
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% TRANSPARENT ALPHA
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white/60">OBS Browser Source URL:</span>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/obs/live`;
                  navigator.clipboard.writeText(url);
                  setIsStreamSaved(true);
                  setTimeout(() => setIsStreamSaved(false), 2000);
                }}
                className="text-[10px] font-black text-[#D9A928] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isStreamSaved ? "✓ COPIED" : "COPY LIVE URL"}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-[#161616] border border-white/5 font-mono text-[11px] text-[#D9A928] break-all select-all">
              {typeof window !== "undefined" ? `${window.location.origin}/obs/live` : "/obs/live"}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-white/50 text-center">
              <div className="p-1.5 rounded-lg bg-white/5">
                <span className="block font-black text-white">1920 × 1080</span>
                <span>Canvas Size</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <span className="block font-black text-white">60 FPS</span>
                <span>Framerate</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <span className="block font-black text-emerald-400">0ms Latency</span>
                <span>Virtual Cam</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-white/50 leading-relaxed">
            💡 <strong>OBS Virtual Camera Workflow:</strong> Add the URL above as an <strong>OBS Browser Source</strong> over your live camera feed in OBS Studio, then click <strong>"Start Virtual Camera"</strong>. 100% transparent alpha background with continuous real-time score updates.
          </p>
        </div>


        {/* Live Score Control */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888888] mb-4">
            Live Score Control
          </h3>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (activeGraphic?.type === "LIVE_SCORE" || !activeGraphic) {
                  setGraphic({ type: "IDLE" }); // Hide score
                } else {
                  clearGraphic(); // Revert to auto live score
                }
              }}
              className={`tap w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 ${
                !activeGraphic || activeGraphic.type === "LIVE_SCORE"
                  ? "bg-[#D9A928] text-black hover:bg-[#F4C542]"
                  : "bg-[#222222] text-[#888888] hover:bg-[#333333] hover:text-white"
              }`}
            >
              {!activeGraphic || activeGraphic.type === "LIVE_SCORE" ? (
                <>
                  <Square className="w-4 h-4" />
                  HIDE LIVE SCORE
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  SHOW LIVE SCORE
                </>
              )}
            </button>
            <p className="text-[10px] text-[#666666] text-center">
              Note: The live score will automatically appear during a match unless overridden.
            </p>
          </div>
        </div>

        {/* Live Event Popups */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] mb-4">
            Live Event Popups
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              disabled={!activeMatchId}
              onClick={() => setGraphic({ type: "FOUR", duration: 4000 })}
              className={`tap px-3 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                activeGraphic?.type === "FOUR"
                  ? "bg-[#D9A928] text-black border-[#D9A928] shadow-[0_0_15px_rgba(217,169,40,0.5)]"
                  : "bg-[#1A1A1A] border-[#333333] text-[#D9A928] hover:border-[#D9A928]/60"
              } disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-0.5`}
            >
              <span>FOUR</span>
              <span className="text-xs font-mono">4</span>
            </button>
            <button
              disabled={!activeMatchId}
              onClick={() => setGraphic({ type: "SIX", duration: 4000 })}
              className={`tap px-3 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                activeGraphic?.type === "SIX"
                  ? "bg-[#D9A928] text-black border-[#D9A928] shadow-[0_0_20px_rgba(217,169,40,0.6)]"
                  : "bg-[#1A1A1A] border-[#333333] text-[#D9A928] hover:border-[#D9A928]/60"
              } disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-0.5`}
            >
              <span>SIX</span>
              <span className="text-xs font-mono">6</span>
            </button>
            <button
              disabled={!activeMatchId}
              onClick={() => setGraphic({ type: "WICKET", duration: 4000 })}
              className={`tap px-3 py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                activeGraphic?.type === "WICKET"
                  ? "bg-red-600 text-white border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                  : "bg-[#1A1A1A] border-[#333333] text-red-400 hover:border-red-500/60"
              } disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-0.5`}
            >
              <span>WICKET</span>
              <span className="text-xs font-mono">OUT</span>
            </button>
          </div>
        </div>

        {/* Commercial Break & Break Graphics */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
              Break & Commercial Graphics
            </h3>
            <span className="text-[9px] font-black uppercase text-[#888888] bg-[#222222] px-2 py-0.5 rounded">
              ON-AIR OVERLAY
            </span>
          </div>

          <button
            onClick={() => {
              if (activeGraphic?.type === "ADVERTISEMENT") {
                clearGraphic();
              } else {
                setGraphic({
                  type: "ADVERTISEMENT",
                  duration: 0,
                  payload: {
                    title: "POWERED BY VALGROW LABS",
                    subtitle: "Official Technology Partner",
                    mediaUrl: "/valgrow-labs-logo.jpeg",
                  },
                });
              }
            }}
            className={`tap w-full p-4 rounded-xl border flex items-center justify-between transition-all mb-3 ${
              activeGraphic?.type === "ADVERTISEMENT"
                ? "bg-[#D9A928] text-black border-[#D9A928] shadow-[0_0_20px_rgba(217,169,40,0.5)]"
                : "bg-gradient-to-r from-[#1A1A1A] to-[#141414] border-[#D9A928]/40 text-white hover:border-[#D9A928]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#D9A928]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider">
                  {activeGraphic?.type === "ADVERTISEMENT" ? "STOP COMMERCIAL BREAK" : "RUN COMMERCIAL BREAK"}
                </p>
                <p className="text-[9px] text-white/60">ValGrow Labs Sponsor Card</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded bg-black/30 tracking-widest">
              {activeGraphic?.type === "ADVERTISEMENT" ? "ON AIR (CLICK TO STOP)" : "SHOW"}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (activeGraphic?.type === "SQUADS") {
                  clearGraphic();
                } else {
                  setGraphic({ type: "SQUADS", duration: 0 });
                }
              }}
              className={`tap p-3 rounded-xl border text-left transition-all ${
                activeGraphic?.type === "SQUADS"
                  ? "bg-[#D9A928] text-black border-[#D9A928]"
                  : "bg-[#1A1A1A] border-[#333333] text-white hover:border-white/30"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">TEAM SQUADS</p>
              <p className="text-[9px] text-[#777777]">Playing XI Preview</p>
            </button>

            <button
              onClick={() => {
                if (activeGraphic?.type === "UPCOMING") {
                  clearGraphic();
                } else {
                  setGraphic({ type: "UPCOMING", duration: 0 });
                }
              }}
              className={`tap p-3 rounded-xl border text-left transition-all ${
                activeGraphic?.type === "UPCOMING"
                  ? "bg-[#D9A928] text-black border-[#D9A928]"
                  : "bg-[#1A1A1A] border-[#333333] text-white hover:border-white/30"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">UPCOMING FIXTURES</p>
              <p className="text-[9px] text-[#777777]">Tournament Schedule</p>
            </button>

            <button
              onClick={() => {
                if (activeGraphic?.type === "MATCH_RESULT") {
                  clearGraphic();
                } else {
                  setGraphic({ type: "MATCH_RESULT", duration: 0 });
                }
              }}
              className={`tap p-3 rounded-xl border text-left transition-all ${
                activeGraphic?.type === "MATCH_RESULT"
                  ? "bg-[#D9A928] text-black border-[#D9A928]"
                  : "bg-[#1A1A1A] border-[#333333] text-white hover:border-white/30"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">MATCH RESULT</p>
              <p className="text-[9px] text-[#777777]">Post-match card</p>
            </button>

            <button
              onClick={() => setGraphic({ type: "IDLE" })}
              className={`tap p-3 rounded-xl border text-left transition-all ${
                activeGraphic?.type === "IDLE"
                  ? "bg-[#D9A928] text-black border-[#D9A928]"
                  : "bg-[#1A1A1A] border-[#333333] text-white hover:border-white/30"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">CLEAR OVERLAY</p>
              <p className="text-[9px] text-[#777777]">100% Empty Transparent</p>
            </button>
          </div>
        </div>

        {/* Clear Graphic Override */}
        {activeGraphic && activeGraphic.type !== "IDLE" && activeGraphic.type !== "LIVE_SCORE" && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-wider">
                Graphic On Air: {activeGraphic.type}
              </p>
              <p className="text-[10px] text-white/60">Currently overriding normal live score</p>
            </div>
            <button
              onClick={() => clearGraphic()}
              className="tap px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
            >
              REMOVE
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Preview Area */}
      <div className="flex-1 bg-[#111111] border border-[#222222] rounded-2xl flex flex-col overflow-hidden">
        <div className="h-12 border-b border-[#222222] flex items-center justify-between px-4 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
              Output Preview
            </h3>
            {activeMatch && (
              <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest bg-[#222222] text-[#D9A928]">
                MATCH #{String(activeMatch.matchNumber).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/obs/live"
              target="_blank"
              rel="noreferrer"
              className="tap flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D9A928]/20 border border-[#D9A928]/40 text-[#D9A928] hover:bg-[#D9A928]/30 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#D9A928]" />
              OPEN LIVE OVERLAY
            </a>
            <button
              onClick={() => {
                if (activeMatchId) obsHandlerService.setActiveMatch(activeMatchId);
              }}
              title="Refresh Stream"
              className="tap p-2 text-[#888888] hover:text-white hover:bg-[#222222] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="tap p-2 text-[#888888] hover:text-white hover:bg-[#222222] rounded-lg transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Actual Scaled Preview */}
        <div className="flex-1 bg-[url('/grid.svg')] bg-center bg-repeat relative flex items-center justify-center p-8 overflow-hidden">
          {activeMatchId ? (
            <div className="relative w-full aspect-video max-w-[1280px] bg-black/50 border border-[#333333] rounded overflow-hidden shadow-2xl flex items-center justify-center isolate">
              {/* Scale the 1920x1080 renderer down to fit */}
              <div className="absolute inset-0 origin-top-left flex items-center justify-center w-full h-full">
                <div
                  style={{
                    width: "1920px",
                    height: "1080px",
                    transform: "scale(min(100%, 100%))",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transformOrigin: "top left",
                  }}
                  className="preview-scaler"
                >
                  <GraphicRenderer
                    matchId={activeMatchId}
                    backgroundStreamUrl={inputStreamUrl || undefined}
                    isPreview={true}
                  />
                </div>
              </div>
              <style>{`
                .preview-scaler {
                  transform: scale(calc(var(--parent-width, 1920) / 1920));
                }
              `}</style>
              <div
                ref={(el) => {
                  if (el && el.parentElement) {
                    const ob = new ResizeObserver((entries) => {
                      for (let entry of entries) {
                        const width = entry.contentRect.width;
                        entry.target.style.setProperty("--parent-width", width.toString());
                      }
                    });
                    ob.observe(el.parentElement);
                    return () => ob.disconnect();
                  }
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-[#666666] text-xs font-black uppercase tracking-widest">
              NO MATCH SELECTED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
