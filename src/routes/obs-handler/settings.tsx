import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { obsStreamRepository } from "@/lib/obsStreamRepository";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { useMatches } from "@/hooks/useCricketData";
import { Video, Check, Trash2, Settings, ShieldCheck, Radio, Sparkles, Clock, Sliders, RotateCw } from "lucide-react";

export const Route = createFileRoute("/obs-handler/settings")({
  component: ObsHandlerSettingsPage,
});

export function ObsHandlerSettingsPage() {
  const { data: matches = [] } = useMatches();
  const [activeMatchId, setActiveMatchId] = useState<string>(() => {
    return obsHandlerService.getActiveMatch() || "";
  });
  const [streamUrl, setStreamUrl] = useState<string>(() => {
    return obsStreamRepository.getStreamUrl(obsHandlerService.getActiveMatch() || undefined) || "";
  });

  // ── Customizable Alert & Graphic Intervals ────────────────────────────────
  const [eventDurationSec, setEventDurationSec] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("tpl_obs_event_duration_ms");
      if (stored) return Math.round(Number(stored) / 1000);
    }
    return 4; // Default 4 seconds
  });

  const [rotationDurationSec, setRotationDurationSec] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("tpl_obs_rotation_duration_s");
      if (stored) return Number(stored);
    }
    return 10; // Default 10 seconds
  });

  const [savedMessage, setSavedMessage] = useState<string>("");

  useEffect(() => {
    if (activeMatchId) {
      setStreamUrl(obsStreamRepository.getStreamUrl(activeMatchId) || "");
    }
  }, [activeMatchId]);

  const handleSaveStream = () => {
    if (!streamUrl.trim()) {
      obsStreamRepository.removeStreamUrl(activeMatchId);
      obsHandlerService.setStreamUrl("", activeMatchId);
      setSavedMessage("Stream URL removed (Transparent overlay mode active)");
    } else {
      const formatted = obsStreamRepository.saveStreamUrl(activeMatchId, streamUrl);
      obsHandlerService.setStreamUrl(formatted, activeMatchId);
      setStreamUrl(formatted);
      setSavedMessage("Stream URL configured successfully!");
    }
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const handleClearStream = () => {
    obsStreamRepository.removeStreamUrl(activeMatchId);
    obsHandlerService.setStreamUrl("", activeMatchId);
    setStreamUrl("");
    setSavedMessage("Stream URL cleared.");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const handleSaveIntervals = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tpl_obs_event_duration_ms", String(eventDurationSec * 1000));
      window.localStorage.setItem("tpl_obs_rotation_duration_s", String(rotationDurationSec));
    }
    setSavedMessage("Overlay timings & intervals saved successfully!");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const handleResetIntervals = () => {
    setEventDurationSec(4);
    setRotationDurationSec(10);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tpl_obs_event_duration_ms", "4000");
      window.localStorage.setItem("tpl_obs_rotation_duration_s", "10");
    }
    setSavedMessage("Timings reset to broadcast defaults (4s alerts / 10s rotation).");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-6 px-4 font-sans text-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#222222] pb-5">
        <div className="w-12 h-12 rounded-2xl bg-[#D9A928]/15 border border-[#D9A928]/30 flex items-center justify-center">
          <Settings className="w-6 h-6 text-[#D9A928]" />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            Broadcast & Stream Settings
          </h1>
          <p className="text-xs text-[#888888]">
            Configure live video feed, overlay popup intervals, and broadcast canvas
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          {savedMessage}
        </div>
      )}

      {/* ── 1. CUSTOM OVERLAY DISPLAY INTERVALS & TIMINGS ─────────────────── */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#D9A928]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#D9A928]">
              Overlay Display Intervals & Timings
            </h2>
          </div>
          <span className="text-[10px] font-bold text-[#888888] uppercase bg-[#1A1A1A] px-2.5 py-1 rounded-md border border-[#333333]">
            CUSTOMIZABLE
          </span>
        </div>

        <p className="text-xs text-[#888888] leading-relaxed">
          Set how long popups and banners remain visible on the live broadcast before automatically returning to the standard scoreboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Event Popups Duration */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-white">
                Event Alert Duration
              </label>
              <span className="text-sm font-black font-mono text-[#D9A928] bg-black/60 px-2.5 py-0.5 rounded border border-[#D9A928]/40">
                {eventDurationSec}s
              </span>
            </div>
            <p className="text-[11px] text-[#777777]">
              Duration for 4s, 6s, Wickets, No-Ball alerts, and New Batter crease entries.
            </p>

            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={eventDurationSec}
              onChange={(e) => setEventDurationSec(Number(e.target.value))}
              className="w-full accent-[#D9A928] cursor-pointer"
            />

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[2, 3.5, 4, 6, 8, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setEventDurationSec(sec)}
                  className={`tap px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    eventDurationSec === sec
                      ? "bg-[#D9A928] text-black font-black"
                      : "bg-[#222222] text-[#888888] hover:text-white"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Graphic Rotation Duration */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#2A2A2A] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-white">
                Graphic Autopilot Interval
              </label>
              <span className="text-sm font-black font-mono text-[#D9A928] bg-black/60 px-2.5 py-0.5 rounded border border-[#D9A928]/40">
                {rotationDurationSec}s
              </span>
            </div>
            <p className="text-[11px] text-[#777777]">
              Rotation interval between full-screen graphics (Squads, Points Table, Awards).
            </p>

            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={rotationDurationSec}
              onChange={(e) => setRotationDurationSec(Number(e.target.value))}
              className="w-full accent-[#D9A928] cursor-pointer"
            />

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[5, 10, 15, 20, 30, 45].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setRotationDurationSec(sec)}
                  className={`tap px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    rotationDurationSec === sec
                      ? "bg-[#D9A928] text-black font-black"
                      : "bg-[#222222] text-[#888888] hover:text-white"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSaveIntervals}
            className="tap px-6 py-3 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
          >
            <Check className="w-4 h-4" />
            Apply Timing Changes
          </button>

          <button
            onClick={handleResetIntervals}
            className="tap px-4 py-3 rounded-xl bg-[#222222] hover:bg-[#333333] text-[#888888] hover:text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* ── 2. LIVE STREAM URL CONFIGURATION ──────────────────────────────── */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-[#D9A928]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#D9A928]">
            Live Stream Feed Integration
          </h2>
        </div>

        <p className="text-xs text-[#888888] leading-relaxed">
          Provide a YouTube Live, Twitch, or external stream URL to embed video behind the cricket overlay graphics. If left blank, the overlay renders transparently over your OBS camera source.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
            Stream URL (e.g. https://www.youtube.com/live/...)
          </label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://www.youtube.com/live/..."
            className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#D9A928] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSaveStream}
            className="tap px-6 py-3 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-black text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
          >
            <Check className="w-4 h-4" />
            Save Stream URL
          </button>

          {streamUrl && (
            <button
              onClick={handleClearStream}
              className="tap px-4 py-3 rounded-xl bg-[#222222] hover:bg-red-950/40 hover:text-red-400 border border-[#333333] text-[#888888] text-xs font-bold transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear URL
            </button>
          )}
        </div>
      </div>

      {/* ── 3. OBS STUDIO INTEGRATION ──────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#D9A928]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Default Master OBS URL
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#333333] flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#D9A928] uppercase tracking-wider">
                Live Master Overlay
              </p>
              <p className="text-[11px] text-[#777777]">
                Always syncs to the active match and broadcast graphics
              </p>
            </div>
            <code className="text-[11px] bg-black/60 p-2 rounded text-emerald-400 font-mono select-all break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/obs/live` : "https://tpl.valgrowlabs.com/obs/live"}
            </code>
          </div>

          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#333333] flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#D9A928] uppercase tracking-wider">
                Recommended Canvas Settings
              </p>
              <p className="text-[11px] text-[#777777]">
                Set OBS Browser Source resolution to 1920 x 1080 (60 FPS)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#888888]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Hardware acceleration enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
