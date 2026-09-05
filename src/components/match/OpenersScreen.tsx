import { useState, useEffect } from "react";
import type { Match } from "@/types/cricket";
import type { MatchStore } from "@/lib/scoring/store";
import { lookup, playerRepository } from "@/lib/repositories";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { UserPlus, UserCheck, X, ChevronRight, Check } from "lucide-react";

interface Props {
  match: Match;
  store: MatchStore;
  /** Whether this is the 2nd innings openers selection */
  secondInnings?: boolean;
  /** When true, don't render the sticky header / page wrapper */
  embedded?: boolean;
}

export function OpenersScreen({ match, store, secondInnings = false, embedded = false }: Props) {
  const { doc, state, updateSetup, startSecondInnings } = store;
  const setup = doc.setup;

  const firstInnings = state?.innings[0];
  const battingTeamId = secondInnings
    ? (firstInnings ? firstInnings.bowlingTeamId : (setup.battingFirstId === match.teamAId ? match.teamBId : match.teamAId))
    : (setup.battingFirstId ?? match.teamAId);

  const battingTeam = lookup.team(battingTeamId);

  // Preload team roster if lookup cache is empty
  const [rosterPlayers, setRosterPlayers] = useState(() => lookup.playersOf(battingTeamId));

  useEffect(() => {
    if (battingTeamId) {
      playerRepository.listByTeam(battingTeamId).then((players) => {
        if (players && players.length > 0) {
          setRosterPlayers(players);
        }
      });
    }
  }, [battingTeamId]);

  const customXI = setup.playingXI[battingTeamId]?.playerIds;
  const fallbackXI = rosterPlayers.map((p) => p.id);
  const battingXI = (customXI && customXI.length > 0) ? customXI : (fallbackXI.length > 0 ? fallbackXI : lookup.playersOf(battingTeamId).map((p) => p.id));

  const existingOpeners = secondInnings ? doc.secondInningsOpeners : setup.openers;

  const [strikerId, setStrikerId] = useState(existingOpeners?.strikerId ?? "");
  const [nonStrikerId, setNonStrikerId] = useState(existingOpeners?.nonStrikerId ?? "");

  // Modal selector state
  const [activeModalRole, setActiveModalRole] = useState<"striker" | "non-striker" | null>(null);

  const canProceed = Boolean(strikerId && nonStrikerId && strikerId !== nonStrikerId);

  const handleConfirm = () => {
    if (!canProceed) return;
    const openers = { strikerId, nonStrikerId };
    if (secondInnings) {
      startSecondInnings(openers);
    } else {
      updateSetup({ openers });
    }

    // Automatically broadcast opener on screen
    const player = lookup.player(strikerId);
    if (player && match?.id) {
      obsHandlerService.broadcastState(
        match.id,
        {
          type: "NEW_BATTER",
          duration: 4500,
          payload: {
            batterName: player.name,
            teamName: battingTeam?.name || "Batting Team",
            role: player.role && player.role !== "Unspecified" ? player.role : "Player",
            avatar: player.avatar,
          },
        },
        "SCORER",
      );
    }
  };

  const openSelector = (role: "striker" | "non-striker") => {
    setActiveModalRole(role);
  };

  const handleSelectPlayer = (playerId: string) => {
    if (activeModalRole === "striker") {
      setStrikerId(playerId);
      if (nonStrikerId === playerId) {
        setNonStrikerId("");
      }
    } else if (activeModalRole === "non-striker") {
      setNonStrikerId(playerId);
      if (strikerId === playerId) {
        setStrikerId("");
      }
    }
    setActiveModalRole(null);
  };

  const strikerPlayer = strikerId ? lookup.player(strikerId) : undefined;
  const nonStrikerPlayer = nonStrikerId ? lookup.player(nonStrikerId) : undefined;

  // Filter eligible players for modal
  const eligiblePlayersForModal = battingXI
    .filter((id) => {
      if (activeModalRole === "striker") {
        return id !== nonStrikerId;
      }
      if (activeModalRole === "non-striker") {
        return id !== strikerId;
      }
      return true;
    })
    .map((id) => lookup.player(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const content = (
    <div className="flex flex-col gap-5 w-full">
      {!embedded && (
        <div className="rounded-2xl bg-white border border-[#E5E5E5] px-4 py-3 text-center shadow-xs">
          <p className="text-xs font-bold text-[#5F6368]">
            Batting: <span className="font-extrabold text-[#111111]">{battingTeam?.name}</span>
          </p>
        </div>
      )}

      {/* ── STRIKER SELECTION CARD ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D9A928]" />
            Striker (Facing First Ball)
          </span>
          <span className="text-[10px] text-[#9A6A05] font-black uppercase">On Strike *</span>
        </label>

        {strikerPlayer ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#111111] text-white border-2 border-[#D9A928] shadow-md transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[#D9A928] text-[#111111] font-black flex items-center justify-center text-sm shrink-0">
                {strikerPlayer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm text-white truncate flex items-center gap-1">
                  <span>{strikerPlayer.name}</span>
                  <span className="text-[#D9A928] font-bold">*</span>
                </p>
                <p className="text-[11px] text-[#D9A928] font-bold">
                  {strikerPlayer.role || "Batter"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openSelector("striker")}
              className="tap px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openSelector("striker")}
            className="tap min-h-[56px] w-full p-4 rounded-2xl border-2 border-dashed border-[#D9A928] bg-[#D9A928]/5 hover:bg-[#D9A928]/10 text-left transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#D9A928]/20 text-[#9A6A05] flex items-center justify-center font-black">
                <UserPlus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#111111] group-hover:text-[#9A6A05]">
                  + Select Opening Striker
                </p>
                <p className="text-[11px] text-[#5F6368] font-medium">
                  Tap to choose the batsman taking strike
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#9A6A05]" />
          </button>
        )}
      </div>

      {/* ── NON-STRIKER SELECTION CARD ───────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-extrabold text-[#111111] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#5F6368]" />
            Non-Striker (Other End)
          </span>
          <span className="text-[10px] text-[#5F6368] font-bold uppercase">Non-Striker End</span>
        </label>

        {nonStrikerPlayer ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white text-[#111111] border border-[#E5E5E5] shadow-xs transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-[#F7F7F5] border border-[#E5E5E5] text-[#111111] font-black flex items-center justify-center text-sm shrink-0">
                {nonStrikerPlayer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm text-[#111111] truncate">
                  {nonStrikerPlayer.name}
                </p>
                <p className="text-[11px] text-[#5F6368] font-bold">
                  {nonStrikerPlayer.role || "Batter"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openSelector("non-striker")}
              className="tap px-3 py-1.5 rounded-xl bg-[#F7F7F5] hover:bg-[#E5E5E5] text-xs font-bold text-[#111111] border border-[#E5E5E5] transition-colors shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openSelector("non-striker")}
            className="tap min-h-[56px] w-full p-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-[#F7F7F5] hover:border-[#D9A928]/60 text-left transition-all flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-[#E5E5E5] text-[#5F6368] flex items-center justify-center font-black">
                <UserPlus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#111111] group-hover:text-[#9A6A05]">
                  + Select Non-Striker
                </p>
                <p className="text-[11px] text-[#5F6368] font-medium">
                  Tap to choose the non-striking partner
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#5F6368]" />
          </button>
        )}
      </div>

      {/* ── ACTION BUTTON ────────────────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canProceed}
          className={`tap min-h-[52px] h-13 w-full rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
            canProceed
              ? "bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] shadow-[#D9A928]/30 cursor-pointer"
              : "bg-[#F7F7F5] border border-[#E5E5E5] text-[#9CA3AF] cursor-not-allowed opacity-70"
          }`}
        >
          <Check className="h-4 w-4 stroke-[2.5]" />
          <span>
            {canProceed
              ? secondInnings ? "START 2ND INNINGS" : "SELECT OPENING BOWLER"
              : !strikerId && !nonStrikerId
              ? "SELECT BOTH OPENING BATTERS"
              : !strikerId
              ? "SELECT STRIKER TO CONTINUE"
              : "SELECT NON-STRIKER TO CONTINUE"}
          </span>
        </button>
      </div>

      {/* ── MODAL PLAYER SELECTOR ────────────────────────────────────────── */}
      {activeModalRole && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
          onClick={() => setActiveModalRole(null)}
        >
          <div
            className="bg-white border border-[#E5E5E5] rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md max-h-[80vh] flex flex-col gap-3 shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#D9A928]/15 text-[#9A6A05] flex items-center justify-center font-black">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-[#111111]">
                    Select {activeModalRole === "striker" ? "Opening Striker" : "Non-Striker"}
                  </h3>
                  <p className="text-[10px] text-[#5F6368] font-bold">
                    {battingTeam?.name} ({eligiblePlayersForModal.length} Players)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalRole(null)}
                className="h-8 w-8 rounded-full bg-[#F7F7F5] border border-[#E5E5E5] flex items-center justify-center text-[#5F6368] hover:text-[#111111]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-2 py-1 max-h-[55vh]">
              {eligiblePlayersForModal.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5F6368] font-bold">
                  No eligible players found. Please check team roster.
                </div>
              ) : (
                eligiblePlayersForModal.map((p) => {
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlayer(p.id)}
                      className="tap min-h-[48px] w-full flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] hover:border-[#D9A928] bg-white hover:bg-[#F7F7F5] text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-[#F7F7F5] border border-[#E5E5E5] text-[#111111] font-black flex items-center justify-center text-xs shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#111111] truncate">{p.name}</p>
                          <p className="text-[10px] text-[#5F6368] font-medium">{p.role || "Player"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-[#D9A928]/20 text-[#9A6A05]">
                        SELECT
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA]">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E5E5] px-4 py-3">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold tracking-widest text-[#5F6368] uppercase">
            {secondInnings ? "2nd Innings" : "Step 3 of 4"}
          </p>
          <p className="text-base font-extrabold text-[#111111] mt-0.5">
            {secondInnings ? "Select Opening Batters" : "Select Openers"}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 mx-auto w-full max-w-md">
        {content}
      </div>
    </div>
  );
}
