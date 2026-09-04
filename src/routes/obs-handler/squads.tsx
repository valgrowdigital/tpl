import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useObsHandlerMaster } from "@/hooks/useObsHandlerMaster";
import { useMatches, useTeams, usePlayers } from "@/hooks/useCricketData";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { lookup } from "@/lib/repositories";
import { TeamLogo } from "@/components/team/TeamLogo";
import { Users, Eye, Square, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/obs-handler/squads")({
  component: ObsSquadsPage,
});

function ObsSquadsPage() {
  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => {
    return obsHandlerService.getActiveMatch() || "";
  });

  const activeMatch = matches.find((m) => m.id === selectedMatchId) 
    || matches.find((m) => m.status === "LIVE") 
    || matches[0] 
    || lookup.matches()[0];

  const { activeGraphic, setGraphic, clearGraphic } = useObsHandlerMaster(activeMatch?.id);

  const [duration, setDuration] = useState<number>(0); // 0 = manual

  const teamA = teams.find((t) => t.id === activeMatch?.teamAId) || lookup.team(activeMatch?.teamAId || "");
  const teamB = teams.find((t) => t.id === activeMatch?.teamBId) || lookup.team(activeMatch?.teamBId || "");

  const resolvePlayer = (id: string) => lookup.player(id) || players.find((p) => p.id === id);

  const teamAPlayers = activeMatch?.setup?.teamAPlayers || [];
  const teamBPlayers = activeMatch?.setup?.teamBPlayers || [];

  const teamAFull = teamAPlayers.length > 0
    ? teamAPlayers.map(resolvePlayer).filter(Boolean)
    : players.filter((p) => p.teamId === activeMatch?.teamAId || (teamA?.id && p.teamId === teamA.id));

  const teamBFull = teamBPlayers.length > 0
    ? teamBPlayers.map(resolvePlayer).filter(Boolean)
    : players.filter((p) => p.teamId === activeMatch?.teamBId || (teamB?.id && p.teamId === teamB.id));

  const isSquadsOnAir = activeGraphic?.type === "SQUADS";

  const handleShowSquads = () => {
    if (!activeMatch?.id) return;
    setGraphic({
      type: "SQUADS",
      duration: duration === 0 ? undefined : duration,
      payload: { transition: "fade" },
    });
  };

  const handleHideSquads = () => {
    clearGraphic();
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-6 h-6 text-[#D9A928]" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">
              Team Squads Control
            </h1>
          </div>
          <p className="text-xs text-[#888888]">
            Display full playing XI for both teams on the live broadcast stream
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${
            isSquadsOnAir 
              ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" 
              : "bg-[#1A1A1A] text-[#888888] border-[#333333]"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSquadsOnAir ? "bg-red-500" : "bg-[#555555]"}`} />
            {isSquadsOnAir ? "SQUADS ON AIR" : "OFF AIR"}
          </div>
        </div>
      </div>

      {/* Control Actions Card */}
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-6 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Match selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-2">
              Select Match
            </label>
            <select
              value={activeMatch?.id || ""}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                obsHandlerService.setActiveMatch(e.target.value);
              }}
              className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#D9A928] cursor-pointer"
            >
              {matches.map((m) => {
                const tA = teams.find((t) => t.id === m.teamAId) || lookup.team(m.teamAId);
                const tB = teams.find((t) => t.id === m.teamBId) || lookup.team(m.teamBId);
                return (
                  <option key={m.id} value={m.id}>
                    Match #{m.matchNumber}: {tA?.shortName || "T1"} vs {tB?.shortName || "T2"} ({m.status})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-2">
              Display Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#D9A928] cursor-pointer"
            >
              <option value={0}>Until Manually Stopped (Recommended)</option>
              <option value={10000}>10 Seconds</option>
              <option value={15000}>15 Seconds</option>
              <option value={30000}>30 Seconds</option>
              <option value={60000}>60 Seconds</option>
            </select>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleShowSquads}
              className={`tap w-full py-3.5 px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
                isSquadsOnAir
                  ? "bg-[#D9A928] text-black shadow-[0_0_20px_rgba(217,169,40,0.5)]"
                  : "bg-gradient-to-r from-[#D9A928] to-amber-500 hover:from-amber-400 hover:to-[#D9A928] text-black"
              }`}
            >
              <Eye className="w-4 h-4" />
              {isSquadsOnAir ? "REFRESH SQUAD ON AIR" : "SHOW FULL SQUAD ON AIR"}
            </button>

            {isSquadsOnAir && (
              <button
                onClick={handleHideSquads}
                className="tap w-full py-2.5 px-4 rounded-xl border border-red-800/60 bg-red-950/40 hover:bg-red-900/50 text-red-300 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Square className="w-3.5 h-3.5" />
                CLEAR SQUAD (RETURN TO LIVE SCORE)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Playing Squad Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team A Roster */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-[#1C1C1C] to-[#141414] p-4 flex items-center gap-3 border-b border-[#2A2A2A]">
            <TeamLogo
              logoUrl={teamA?.logoUrl}
              name={teamA?.name}
              shortName={teamA?.shortName}
              className="w-10 h-10 rounded-lg border border-[#D9A928]/40"
            />
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wide">
                {teamA?.name || "Team A"}
              </h3>
              <span className="text-[10px] text-[#D9A928] font-bold uppercase tracking-widest">
                Team A Squad ({teamAFull.length} Players)
              </span>
            </div>
          </div>

          <div className="p-4 space-y-1.5 max-h-[420px] overflow-y-auto">
            {teamAFull.map((p, idx) => {
              if (!p) return null;
              const isCaptain = activeMatch?.setup?.captainAId === p.id;
              const isWk = activeMatch?.setup?.wkAId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#161616] border border-[#222222] text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#666666] w-5 text-right font-bold">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-white uppercase tracking-wide">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isCaptain && (
                      <span className="px-1.5 py-0.5 rounded bg-[#D9A928] text-black text-[9px] font-black tracking-widest">
                        C
                      </span>
                    )}
                    {isWk && (
                      <span className="px-1.5 py-0.5 rounded border border-[#555555] text-[#AAAAAA] text-[9px] font-black tracking-widest">
                        WK
                      </span>
                    )}
                    <span className="text-[10px] text-[#777777] uppercase font-bold">
                      {p.playerRole || "Player"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team B Roster */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-[#1C1C1C] to-[#141414] p-4 flex items-center gap-3 border-b border-[#2A2A2A]">
            <TeamLogo
              logoUrl={teamB?.logoUrl}
              name={teamB?.name}
              shortName={teamB?.shortName}
              className="w-10 h-10 rounded-lg border border-[#D9A928]/40"
            />
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-wide">
                {teamB?.name || "Team B"}
              </h3>
              <span className="text-[10px] text-[#D9A928] font-bold uppercase tracking-widest">
                Team B Squad ({teamBFull.length} Players)
              </span>
            </div>
          </div>

          <div className="p-4 space-y-1.5 max-h-[420px] overflow-y-auto">
            {teamBFull.map((p, idx) => {
              if (!p) return null;
              const isCaptain = activeMatch?.setup?.captainBId === p.id;
              const isWk = activeMatch?.setup?.wkBId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#161616] border border-[#222222] text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#666666] w-5 text-right font-bold">
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-white uppercase tracking-wide">
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isCaptain && (
                      <span className="px-1.5 py-0.5 rounded bg-[#D9A928] text-black text-[9px] font-black tracking-widest">
                        C
                      </span>
                    )}
                    {isWk && (
                      <span className="px-1.5 py-0.5 rounded border border-[#555555] text-[#AAAAAA] text-[9px] font-black tracking-widest">
                        WK
                      </span>
                    )}
                    <span className="text-[10px] text-[#777777] uppercase font-bold">
                      {p.playerRole || "Player"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
