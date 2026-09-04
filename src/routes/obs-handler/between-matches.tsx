import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useObsHandlerMaster } from "@/hooks/useObsHandlerMaster";
import { Users, Calendar, Trophy, Image as ImageIcon, Folder, Play, Square, Radio, RefreshCw, Maximize2 } from "lucide-react";
import { GraphicType, obsHandlerService } from "@/lib/obsHandlerService";
import { useMatches } from "@/hooks/useCricketData";
import { calculateTournamentStats } from "@/lib/scoring/statistics";
import { GraphicRenderer } from "@/components/obs/GraphicRenderer";
import { obsStreamRepository } from "@/lib/obsStreamRepository";

export const Route = createFileRoute("/obs-handler/between-matches")({
  component: ObsBetweenMatches,
});

function ObsBetweenMatches() {
  const { data: matches = [] } = useMatches();
  const activeId = obsHandlerService.getActiveMatch();
  const liveMatch = matches.find((m) => m.id === activeId) || matches.find((m) => m.status === "LIVE") || matches[0];
  const { activeGraphic, setGraphic, clearGraphic } = useObsHandlerMaster(liveMatch?.id);

  const [duration, setDuration] = useState<number>(0); // 0 = until manually stopped
  const [transition, setTransition] = useState<string>("fade");
  const backgroundStreamUrl = obsStreamRepository.getStreamUrl(liveMatch?.id) || undefined;

  const graphics = [
    { id: "SQUADS", label: "TEAM SQUADS", icon: Users, desc: "Playing XI & substitutes" },
    { id: "UPCOMING", label: "UPCOMING MATCHES", icon: Calendar, desc: "Show next fixtures" },
    { id: "PLAYER_AWARDS", label: "PLAYER AWARDS", icon: Trophy, desc: "Awards & leaderboards" },
    { id: "CUSTOM", label: "CUSTOM GRAPHIC", icon: ImageIcon, desc: "Upload custom overlay" },
    { id: "MEDIA", label: "MEDIA LIBRARY", icon: Folder, desc: "Images, videos, assets" },
  ];

  const handleShow = (type: GraphicType) => {
    let extraPayload = {};
    if (type === "PLAYER_AWARDS") {
      const stats = calculateTournamentStats(matches);
      extraPayload = {
        orangeCap: stats.orangeCap[0],
        purpleCap: stats.purpleCap[0],
        mvp: stats.mvpLeaderboard[0],
      };
    }
    setGraphic({
      type,
      duration: duration === 0 ? undefined : duration,
      payload: { transition, ...extraPayload },
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans pb-10">
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col gap-5 flex-shrink-0">
        {/* Graphics Grid */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] mb-4">
            Between Matches Controls
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {graphics.map((g) => (
              <button
                key={g.id}
                onClick={() => handleShow(g.id as GraphicType)}
                className={`tap flex flex-col items-start text-left p-4 rounded-xl border ${
                  activeGraphic?.type === g.id
                    ? "bg-[#D9A928]/10 border-[#D9A928] shadow-[0_0_15px_rgba(217,169,40,0.2)]"
                    : "bg-[#111111] border-[#222222] hover:bg-[#1A1A1A] hover:border-[#333333]"
                } transition-all`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <g.icon
                    className={`w-4 h-4 ${
                      activeGraphic?.type === g.id ? "text-[#D9A928]" : "text-[#888888]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      activeGraphic?.type === g.id ? "text-[#D9A928]" : "text-white"
                    }`}
                  >
                    {g.label}
                  </span>
                </div>
                <span className="text-[10px] text-[#666666] leading-tight">
                  {g.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Overlay Control */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888888] mb-4">
            Active Overlay Status
          </h3>

          <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#333333] p-4 rounded-xl mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#222222] flex items-center justify-center">
                {activeGraphic &&
                activeGraphic.type !== "IDLE" &&
                activeGraphic.type !== "LIVE_SCORE" ? (
                  <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <Square className="w-4 h-4 text-[#666666]" />
                )}
              </div>
              <div>
                <div className="text-xs font-black text-white uppercase tracking-wider">
                  {activeGraphic &&
                  activeGraphic.type !== "IDLE" &&
                  activeGraphic.type !== "LIVE_SCORE"
                    ? activeGraphic.type.replace("_", " ")
                    : "NORMAL LIVE SCORE"}
                </div>
                <div className="text-[10px] text-[#888888]">
                  {activeGraphic &&
                  activeGraphic.type !== "IDLE" &&
                  activeGraphic.type !== "LIVE_SCORE"
                    ? "Currently showing on broadcast"
                    : "Default scoreboard active"}
                </div>
              </div>
            </div>

            {activeGraphic &&
              activeGraphic.type !== "IDLE" &&
              activeGraphic.type !== "LIVE_SCORE" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => clearGraphic()}
                    className="tap px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-md"
                  >
                    STOP
                  </button>
                </div>
              )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-2">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#D9A928] cursor-pointer"
              >
                <option value={0}>Until Stopped</option>
                <option value={2000}>2 Seconds</option>
                <option value={3500}>3.5 Seconds</option>
                <option value={5000}>5 Seconds</option>
                <option value={8000}>8 Seconds</option>
                <option value={10000}>10 Seconds</option>
                <option value={15000}>15 Seconds</option>
                <option value={20000}>20 Seconds</option>
                <option value={30000}>30 Seconds</option>
                <option value={45000}>45 Seconds</option>
                <option value={60000}>60 Seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-2">
                Transition
              </label>
              <select
                value={transition}
                onChange={(e) => setTransition(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#D9A928] cursor-pointer"
              >
                <option value="fade">Fade In / Out</option>
                <option value="cut">Cut</option>
                <option value="slide">Slide</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Output Preview Area */}
      <div className="flex-1 bg-[#111111] border border-[#222222] rounded-2xl flex flex-col overflow-hidden">
        <div className="h-12 border-b border-[#222222] flex items-center justify-between px-4 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888888]">
              Output Preview
            </h3>
            {liveMatch && (
              <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest bg-[#222222] text-[#D9A928]">
                MATCH #{String(liveMatch.matchNumber).padStart(2, "0")}
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
          </div>
        </div>

        <div className="flex-1 bg-[url('/grid.svg')] bg-center bg-repeat relative flex items-center justify-center p-8 overflow-hidden">
          {liveMatch ? (
            <div className="relative w-full aspect-video max-w-[1280px] bg-black/50 border border-[#333333] rounded overflow-hidden shadow-2xl flex items-center justify-center isolate">
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
                    matchId={liveMatch.id}
                    backgroundStreamUrl={backgroundStreamUrl}
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
