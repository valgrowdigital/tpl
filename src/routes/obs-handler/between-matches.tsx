import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useObsHandlerMaster } from "@/hooks/useObsHandlerMaster";
import { useObsMatchStream } from "@/hooks/useObsMatchStream";
import { Users, Calendar, Trophy, Image as ImageIcon, Folder, Play, Square, Radio, RefreshCw, Maximize2, Target, Handshake, Sparkles, EyeOff, User, Search, Check, ChevronRight, Flame } from "lucide-react";
import { GraphicType, obsHandlerService } from "@/lib/obsHandlerService";
import { useMatches, useTeams, usePlayers } from "@/hooks/useCricketData";
import { calculateTournamentStats } from "@/lib/scoring/statistics";
import { GraphicRenderer } from "@/components/obs/GraphicRenderer";
import { obsStreamRepository } from "@/lib/obsStreamRepository";
import { lookup, isPlayerInTeam } from "@/lib/repositories";

export const Route = createFileRoute("/obs-handler/between-matches")({
  component: ObsBetweenMatches,
});

function ObsBetweenMatches() {
  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

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

  const liveMatch = useMemo(() => {
    if (selectedMatchOverride && matches.some((m) => m.id === selectedMatchOverride)) {
      return matches.find((m) => m.id === selectedMatchOverride);
    }
    return autoMatch;
  }, [selectedMatchOverride, autoMatch, matches]);

  const activeMatchId = liveMatch?.id || "";
  const stream = useObsMatchStream(activeMatchId);
  const { activeGraphic, setGraphic, clearGraphic } = useObsHandlerMaster(activeMatchId);

  const [duration, setDuration] = useState<number>(5000); // Default 5s
  const [transition, setTransition] = useState<string>("fade");
  const backgroundStreamUrl = obsStreamRepository.getStreamUrl(activeMatchId) || undefined;

  // ── Auto-Follow Batting Team in Active Match ───────────────────────────────
  const activeBattingTeamId = stream.battingTeam?.id || liveMatch?.teamAId || "";
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Whenever match or batting team changes, auto-switch to active batting team
  useEffect(() => {
    if (activeBattingTeamId) {
      setSelectedTeamId(activeBattingTeamId);
    } else if (liveMatch?.teamAId) {
      setSelectedTeamId(liveMatch.teamAId);
    }
  }, [activeBattingTeamId, liveMatch?.id]);

  const teamAObj = useMemo(() => {
    if (!liveMatch?.teamAId) return undefined;
    return teams.find((t) => t.id === liveMatch.teamAId) || lookup.team(liveMatch.teamAId);
  }, [liveMatch?.teamAId, teams]);

  const teamBObj = useMemo(() => {
    if (!liveMatch?.teamBId) return undefined;
    return teams.find((t) => t.id === liveMatch.teamBId) || lookup.team(liveMatch.teamBId);
  }, [liveMatch?.teamBId, teams]);

  const currentSelectedTeamObj = useMemo(() => {
    if (!selectedTeamId) return teamAObj;
    return teams.find((t) => t.id === selectedTeamId) || lookup.team(selectedTeamId) || teamAObj;
  }, [selectedTeamId, teams, teamAObj]);

  // Robust Squad Resolution for Selected Team
  const teamPlayersList = useMemo(() => {
    if (!selectedTeamId && !currentSelectedTeamObj) return [];
    const targetTeam = currentSelectedTeamObj || selectedTeamId;

    // 1. Check match setup playing XI if applicable
    if (liveMatch?.setup?.teamAPlayers && liveMatch.teamAId === selectedTeamId) {
      const list = liveMatch.setup.teamAPlayers
        .map((id) => lookup.player(id) || players.find((p) => p.id === id))
        .filter(Boolean);
      if (list.length > 0) return list;
    }
    if (liveMatch?.setup?.teamBPlayers && liveMatch.teamBId === selectedTeamId) {
      const list = liveMatch.setup.teamBPlayers
        .map((id) => lookup.player(id) || players.find((p) => p.id === id))
        .filter(Boolean);
      if (list.length > 0) return list;
    }

    // 2. Resolve using isPlayerInTeam over all players
    const matchedHook = players.filter((p) => isPlayerInTeam(p, targetTeam));
    if (matchedHook.length > 0) return matchedHook;

    // 3. Resolve using lookup cache
    const matchedLookup = lookup.players().filter((p) => isPlayerInTeam(p, targetTeam));
    if (matchedLookup.length > 0) return matchedLookup;

    // 4. Fallback direct teamId match
    return players.filter((p) => p.teamId === selectedTeamId);
  }, [selectedTeamId, currentSelectedTeamObj, liveMatch, players]);

  // Track In-Match Batting Status (Striker, Non-Striker, Out, Upcoming)
  const categorizedPlayersList = useMemo(() => {
    const isThisTeamBattingNow = stream.battingTeam?.id && (selectedTeamId === stream.battingTeam.id || isPlayerInTeam({ teamId: selectedTeamId }, stream.battingTeam));
    const currentInnings = isThisTeamBattingNow ? stream.currentInnings : undefined;
    const strikerId = currentInnings?.strikerId;
    const nonStrikerId = currentInnings?.nonStrikerId;
    const dismissedIds = new Set(
      (currentInnings?.batters || [])
        .filter((b) => b.isOut || (b.balls > 0 && b.playerId !== strikerId && b.playerId !== nonStrikerId))
        .map((b) => b.playerId)
    );

    return teamPlayersList.map((p) => {
      const isCurrentStriker = p.id === strikerId;
      const isCurrentNonStriker = p.id === nonStrikerId;
      const isOut = dismissedIds.has(p.id);
      return {
        ...p,
        isCurrentStriker,
        isCurrentNonStriker,
        isOut,
      };
    });
  }, [teamPlayersList, stream.battingTeam, stream.currentInnings, selectedTeamId]);

  const [selectedBatterId, setSelectedBatterId] = useState<string>("");
  const [searchBatterQuery, setSearchBatterQuery] = useState<string>("");

  const filteredTeamPlayers = useMemo(() => {
    if (!searchBatterQuery.trim()) return categorizedPlayersList;
    const q = searchBatterQuery.toLowerCase();
    return categorizedPlayersList.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.role && p.role.toLowerCase().includes(q))
    );
  }, [categorizedPlayersList, searchBatterQuery]);

  // Automatically select the next unbatted batter
  useEffect(() => {
    if (categorizedPlayersList.length > 0 && (!selectedBatterId || !categorizedPlayersList.some((p) => p.id === selectedBatterId))) {
      const nextUpcoming = categorizedPlayersList.find((p) => !p.isCurrentStriker && !p.isCurrentNonStriker && !p.isOut) || categorizedPlayersList[0];
      if (nextUpcoming) {
        setSelectedBatterId(nextUpcoming.id);
      }
    }
  }, [categorizedPlayersList, selectedBatterId]);

  const selectedBatterObj = useMemo(() => {
    if (selectedBatterId) {
      return categorizedPlayersList.find((p) => p.id === selectedBatterId);
    }
    return categorizedPlayersList[0];
  }, [selectedBatterId, categorizedPlayersList]);

  const isTeamABatting = Boolean(stream.battingTeam?.id && (stream.battingTeam.id === liveMatch?.teamAId || isPlayerInTeam({ teamId: liveMatch?.teamAId }, stream.battingTeam)));
  const isTeamBBatting = Boolean(stream.battingTeam?.id && (stream.battingTeam.id === liveMatch?.teamBId || isPlayerInTeam({ teamId: liveMatch?.teamBId }, stream.battingTeam)));

  const graphics = [
    { id: "NEW_BATTER", label: "NEXT BATSMAN ENTRY", icon: User, desc: "Pick & showcase incoming batsman" },
    { id: "ADVERTISEMENT", label: "AI & TECH LAB AD", icon: Sparkles, desc: "Show ValGrow AI & Tech Lab Card" },
    { id: "UPCOMING", label: "UPCOMING MATCHES", icon: Calendar, desc: "Show tournament next fixtures" },
    { id: "SQUADS", label: "TEAM SQUADS", icon: Users, desc: "Playing XI & substitutes preview" },
    { id: "INNINGS_BREAK", label: "1ST INN SCORECARD", icon: Target, desc: "Show 1st innings stats & target" },
    { id: "PARTNERSHIP", label: "PARTNERSHIP", icon: Handshake, desc: "Current batting partnership" },
    { id: "PLAYER_AWARDS", label: "PLAYER AWARDS", icon: Trophy, desc: "Awards & leaderboards" },
    { id: "IDLE", label: "EMPTY / TRANSPARENT", icon: EyeOff, desc: "Clear all graphics (alpha transparent)" },
  ];

  const handleShow = (type: GraphicType) => {
    if (type === "IDLE") {
      setGraphic({ type: "IDLE" });
      return;
    }
    if (type === "NEW_BATTER") {
      if (selectedBatterObj) {
        setGraphic({
          type: "NEW_BATTER",
          duration: duration === 0 ? undefined : duration,
          payload: {
            transition,
            batterName: selectedBatterObj.name,
            teamName: currentSelectedTeamObj?.name || "Batting Team",
            role: selectedBatterObj.role || "Batsman",
            avatar: selectedBatterObj.avatarUrl,
            stats: selectedBatterObj.battingStyle ? `Batting: ${selectedBatterObj.battingStyle}` : undefined,
          },
        });
      }
      return;
    }

    let extraPayload: any = {};
    if (type === "PLAYER_AWARDS") {
      const stats = calculateTournamentStats(matches);
      extraPayload = {
        orangeCap: stats.orangeCap[0],
        purpleCap: stats.purpleCap[0],
        mvp: stats.mvpLeaderboard[0],
      };
    } else if (type === "ADVERTISEMENT") {
      extraPayload = {
        sponsorName: "VALGROW AI & TECHNOLOGY LAB",
        title: "VALGROW AI & TECHNOLOGY LAB",
        tagline: "Official AI, Deep Tech & Real-Time Computer Vision Partner · TPL 2026",
        subtitle: "Powering TPL 2026 with ultra-low latency predictive AI models, edge computer vision ball-tracking, automated telemetry, and next-generation sports intelligence platforms.",
        mediaUrl: "/valgrow-labs-logo.jpeg",
      };
    }

    setGraphic({
      type,
      duration: duration === 0 ? undefined : duration,
      payload: { transition, ...extraPayload },
    });
  };

  const handleBroadcastSelectedBatter = () => {
    if (!selectedBatterObj) return;
    setGraphic({
      type: "NEW_BATTER",
      duration: duration === 0 ? undefined : duration,
      payload: {
        transition,
        batterName: selectedBatterObj.name,
        teamName: currentSelectedTeamObj?.name || "Batting Team",
        role: selectedBatterObj.role || "Batsman",
        avatar: selectedBatterObj.avatarUrl,
        stats: selectedBatterObj.battingStyle ? `Batting: ${selectedBatterObj.battingStyle}` : undefined,
      },
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full font-sans pb-10">
      <div className="w-full lg:w-[440px] xl:w-[480px] flex flex-col gap-5 flex-shrink-0">
        
        {/* ── Match Status Card ── */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 shadow-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D9A928] bg-[#D9A928]/15 px-2 py-0.5 rounded-md border border-[#D9A928]/40">
              {!selectedMatchOverride ? "✨ AUTO-TRACKING TOURNAMENT" : "📌 PINNED MATCH"}
            </span>
            {liveMatch && (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                liveMatch.status === "LIVE" ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" : "bg-white/10 text-white/70 border-white/20"
              }`}>
                {liveMatch.status === "LIVE" ? "● LIVE NOW" : liveMatch.status}
              </span>
            )}
          </div>
          {liveMatch && (
            <p className="text-xs font-black text-white uppercase tracking-wide truncate">
              MATCH #{String(liveMatch.matchNumber).padStart(2, "0")}: {teamAObj?.name || "Team A"} vs {teamBObj?.name || "Team B"}
            </p>
          )}
        </div>

        {/* ── Upcoming Batsman Picker Section ── */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D9A928] animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928]">
                Select Upcoming Batsman
              </h3>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-[#D9A928]/15 text-[#D9A928] border-[#D9A928]/30">
              NEXT BATTER
            </span>
          </div>

          <p className="text-[11px] text-white/60 leading-relaxed">
            Pick the batsman from the batting team's roster to broadcast live on screen.
          </p>

          {/* Team Switcher Tabs (Highlights who is batting right now) */}
          <div className="flex flex-col gap-2.5">
            {liveMatch && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (liveMatch.teamAId) setSelectedTeamId(liveMatch.teamAId);
                  }}
                  className={`tap p-3 rounded-xl border text-left transition-all ${
                    selectedTeamId === liveMatch.teamAId
                      ? "bg-[#D9A928] text-black border-[#D9A928] font-black shadow-[0_0_15px_rgba(217,169,40,0.4)]"
                      : "bg-[#1A1A1A] border-[#333333] text-white/80 font-bold hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase truncate">
                      {teamAObj?.name || "Team A"}
                    </p>
                    {isTeamABatting && (
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        selectedTeamId === liveMatch.teamAId ? "bg-black text-[#D9A928]" : "bg-[#D9A928]/20 text-[#D9A928]"
                      }`}>
                        🏏 BATTING
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] opacity-75">Team A Roster</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (liveMatch.teamBId) setSelectedTeamId(liveMatch.teamBId);
                  }}
                  className={`tap p-3 rounded-xl border text-left transition-all ${
                    selectedTeamId === liveMatch.teamBId
                      ? "bg-[#D9A928] text-black border-[#D9A928] font-black shadow-[0_0_15px_rgba(217,169,40,0.4)]"
                      : "bg-[#1A1A1A] border-[#333333] text-white/80 font-bold hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase truncate">
                      {teamBObj?.name || "Team B"}
                    </p>
                    {isTeamBBatting && (
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        selectedTeamId === liveMatch.teamBId ? "bg-black text-[#D9A928]" : "bg-[#D9A928]/20 text-[#D9A928]"
                      }`}>
                        🏏 BATTING
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] opacity-75">Team B Roster</span>
                </button>
              </div>
            )}

            {/* Player Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3" />
              <input
                type="text"
                value={searchBatterQuery}
                onChange={(e) => setSearchBatterQuery(e.target.value)}
                placeholder="Search player name or role..."
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#D9A928]"
              />
            </div>

            {/* Scrollable Player Picker List with Batting Status Badges */}
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-white/5 rounded-xl p-1 bg-black/40">
              {filteredTeamPlayers.length === 0 ? (
                <div className="p-4 text-center text-xs text-white/40">
                  No batsmen found for this team ({teamPlayersList.length} total squad).
                </div>
              ) : (
                filteredTeamPlayers.map((p) => {
                  const isSelected = selectedBatterId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedBatterId(p.id);
                      }}
                      className={`tap w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-[#D9A928]/20 border-[#D9A928] text-white shadow-sm"
                          : "bg-[#161616] border-[#262626] text-white/80 hover:bg-[#1E1E1E]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full border border-[#D9A928]/50 overflow-hidden bg-black flex items-center justify-center flex-shrink-0">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-black text-[#D9A928]">
                              {p.name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black uppercase truncate">{p.name}</p>
                          <p className="text-[9px] text-white/50">{p.role || "Player"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isCurrentStriker ? (
                          <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            STRIKER
                          </span>
                        ) : p.isCurrentNonStriker ? (
                          <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">
                            NON-STRIKER
                          </span>
                        ) : p.isOut ? (
                          <span className="text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                            OUT
                          </span>
                        ) : (
                          <span className="text-[8px] font-black bg-[#D9A928]/20 text-[#D9A928] border border-[#D9A928]/40 px-1.5 py-0.5 rounded">
                            UPCOMING
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-[9px] font-black text-[#D9A928] bg-[#D9A928]/20 px-2 py-0.5 rounded-full border border-[#D9A928]/40">
                            ✓ PICKED
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected Batter Live Trigger Button */}
            <button
              disabled={!selectedBatterObj}
              onClick={handleBroadcastSelectedBatter}
              className={`tap w-full py-3.5 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                activeGraphic?.type === "NEW_BATTER" && activeGraphic.payload?.batterName === selectedBatterObj?.name
                  ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                  : "bg-gradient-to-r from-[#D9A928] to-amber-500 hover:from-amber-400 hover:to-[#D9A928] text-black shadow-[0_0_20px_rgba(217,169,40,0.4)]"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {activeGraphic?.type === "NEW_BATTER" && activeGraphic.payload?.batterName === selectedBatterObj?.name ? (
                <>
                  <Square className="w-4 h-4" />
                  HIDE NEXT BATTER FROM AIR
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  SHOW {selectedBatterObj?.name || "BATSMAN"} (ON AIR)
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── All Broadcast Overlay Controls ── */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] mb-3">
            All Showcase Graphic Modules
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {graphics.map((g) => (
              <button
                key={g.id}
                onClick={() => handleShow(g.id as GraphicType)}
                className={`tap flex flex-col items-start text-left p-3.5 rounded-xl border ${
                  activeGraphic?.type === g.id
                    ? "bg-[#D9A928]/15 border-[#D9A928] shadow-[0_0_15px_rgba(217,169,40,0.3)] text-white"
                    : "bg-[#111111] border-[#222222] hover:bg-[#1A1A1A] hover:border-[#333333] text-white/80"
                } transition-all`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <g.icon
                    className={`w-3.5 h-3.5 ${
                      activeGraphic?.type === g.id ? "text-[#D9A928]" : "text-[#888888]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      activeGraphic?.type === g.id ? "text-[#D9A928]" : "text-white"
                    }`}
                  >
                    {g.label}
                  </span>
                </div>
                <span className="text-[9px] text-[#666666] leading-tight">
                  {g.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Overlay Control & Settings */}
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888888] mb-4">
            Active Overlay Status & Timing
          </h3>

          <div className="flex items-center justify-between bg-[#1A1A1A] border border-[#333333] p-3.5 rounded-xl mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#222222] flex items-center justify-center shrink-0">
                {activeGraphic &&
                activeGraphic.type !== "IDLE" &&
                activeGraphic.type !== "LIVE_SCORE" ? (
                  <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <Square className="w-4 h-4 text-[#666666]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white uppercase tracking-wider truncate">
                  {activeGraphic &&
                  activeGraphic.type !== "IDLE" &&
                  activeGraphic.type !== "LIVE_SCORE"
                    ? activeGraphic.type.replace("_", " ")
                    : "NORMAL LIVE SCORE"}
                </div>
                <div className="text-[10px] text-[#888888] truncate">
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
                <button
                  onClick={() => clearGraphic()}
                  className="tap px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-md shrink-0"
                >
                  STOP
                </button>
              )}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-1.5">
                Display Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-[#1A1A1A] border border-[#333333] text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#D9A928] cursor-pointer"
              >
                <option value={3500}>3.5 Seconds</option>
                <option value={5000}>5 Seconds (Default)</option>
                <option value={8000}>8 Seconds</option>
                <option value={10000}>10 Seconds</option>
                <option value={15000}>15 Seconds</option>
                <option value={30000}>30 Seconds</option>
                <option value={0}>Until Stopped (Hold)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#888888] mb-1.5">
                Animation Transition
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
