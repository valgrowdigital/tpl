import { useState } from "react";
import { X, UserPlus, ShieldAlert, Check } from "lucide-react";
import { lookup } from "@/lib/repositories";
import type { InningsState } from "@/types/cricket";

interface Props {
  innings: InningsState;
  battingXI: string[];
  role?: "striker" | "non-striker";
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  onSelect: (playerId: string) => void;
  onClose?: () => void;
}

export function NewBatterModal({
  innings,
  battingXI,
  role = "striker",
  currentStrikerId,
  currentNonStrikerId,
  onSelect,
  onClose,
}: Props) {
  // Determine partner on crease
  const partnerId = role === "striker" ? currentNonStrikerId : currentStrikerId;
  const partnerPlayer = partnerId ? lookup.player(partnerId) : undefined;

  // Build eligible batters list:
  // 1. Must belong to battingXI (or batting team roster)
  // 2. Must NOT be the partner currently on the crease
  // 3. Must NOT be already out
  const battingTeam = lookup.team(innings.battingTeamId);
  const basePlayerIds =
    battingXI.length > 0
      ? battingXI
      : lookup.playersOf(innings.battingTeamId).map((p) => p.id);

  const dismissedIds = new Set(
    innings.batters.filter((b) => b.out).map((b) => b.playerId),
  );

  const eligiblePlayerIds = basePlayerIds.filter((id) => {
    if (id === partnerId) return false;
    if (id === currentStrikerId || id === currentNonStrikerId) return false;
    if (dismissedIds.has(id)) return false;
    return true;
  });

  const [selectedId, setSelectedId] = useState("");

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
      onClose?.();
    }
  };

  const handleQuickSelect = (id: string) => {
    setSelectedId(id);
    onSelect(id);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 glass-overlay flex items-end justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-slide-up rounded-t-3xl bg-background border-t border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#D9A928]/15 text-[#9A6A05] border border-[#D9A928]/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground uppercase tracking-wider">
                Select New Batter
              </h2>
              <p className="text-[11px] font-bold text-muted-foreground">
                {battingTeam?.name ?? "Batting Team"} ·{" "}
                <span className="text-[#9A6A05] font-extrabold uppercase">
                  {role === "striker" ? "Taking Strike (*)" : "Non-Striker End"}
                </span>
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="tap grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Partner banner */}
        {partnerPlayer && (
          <div className="mx-6 mt-4 px-3.5 py-2.5 rounded-2xl bg-[#F7F7F5] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5F6368]">
                Partner on Crease:
              </span>
              <span className="text-xs font-black text-[#111111]">
                {partnerPlayer.name}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#5F6368] bg-white px-2 py-0.5 rounded-md border border-[#E5E5E5]">
              {role === "striker" ? "Non-Striker" : "Striker *"}
            </span>
          </div>
        )}

        {/* Batters List */}
        <div className="overflow-y-auto max-h-[55vh] px-6 py-4 flex flex-col gap-2">
          {eligiblePlayerIds.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-bold text-muted-foreground">
                No eligible batters remaining
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                All players from the batting XI have been dismissed or are on the crease.
              </p>
            </div>
          ) : (
            eligiblePlayerIds.map((id) => {
              const player = lookup.player(id);
              const isSelected = selectedId === id;

              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  onDoubleClick={() => handleQuickSelect(id)}
                  className={`tap min-h-[56px] w-full flex items-center gap-3.5 rounded-2xl px-4 py-3 border-2 text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-[#D9A928] bg-[#D9A928]/10 shadow-sm"
                      : "border-[#E5E5E5] bg-white hover:border-[#D9A928]/40 hover:bg-[#F7F7F5]"
                  }`}
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black transition-colors ${
                      isSelected
                        ? "bg-[#D9A928] text-[#111111]"
                        : "bg-[#F7F7F5] border border-[#E5E5E5] text-[#111111]"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : (
                      player?.shortName?.charAt(0) ?? "?"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#111111]">
                      {player?.name ?? id}
                    </p>
                    <p className="text-[11px] font-bold text-[#5F6368]">
                      {player?.role && player.role !== "Unspecified" ? player.role : "Player"}
                      {player?.battingStyle ? ` · ${player.battingStyle}` : ""}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                      isSelected
                        ? "bg-[#111111] text-[#D9A928]"
                        : "bg-[#F3F4F6] text-[#5F6368]"
                    }`}
                  >
                    {isSelected ? "Selected" : "Tap to Select"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-8 pt-4 border-t border-border/60 bg-background">
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="tap flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] text-base font-black uppercase tracking-wider shadow-lg shadow-[#D9A928]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Confirm {role === "striker" ? "Striker" : "Batter"} Selection
          </button>
        </div>
      </div>
    </div>
  );
}
