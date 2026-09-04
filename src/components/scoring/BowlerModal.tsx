import { useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import { lookup } from "@/lib/repositories";
import { oversText, validateBowlerEligibility } from "@/lib/scoring/engine";
import { BALLS_PER_OVER, TPL_TOURNAMENT_RULES } from "@/types/cricket";
import type { BowlerStat, InningsState } from "@/types/cricket";

interface Props {
  bowlingXI: string[];
  bowlers: BowlerStat[];
  innings?: InningsState;
  previousBowlerId?: string;
  currentBowlerId?: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
  isOverEnd: boolean;
}

export function BowlerModal({
  bowlingXI,
  bowlers,
  innings,
  previousBowlerId,
  currentBowlerId,
  onSelect,
  onClose,
  isOverEnd,
}: Props) {
  const [selected, setSelected] = useState(currentBowlerId ?? "");

  const statOf = (id: string) => bowlers.find((b) => b.playerId === id);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 glass-overlay flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-slide-up rounded-t-3xl bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/60">
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground uppercase tracking-wider">
              {isOverEnd ? "Select Bowler" : "Opening Bowler"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOverEnd ? "Over complete (5 legal balls) — choose next bowler" : "Select opening bowler"}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="tap grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <span>
            <strong>Tournament Rule:</strong> Each bowler is allowed to bowl <strong>at most 1 over (5 legal balls)</strong> per innings.
          </span>
        </div>

        <div className="overflow-y-auto max-h-[55vh] px-6 py-4 flex flex-col gap-2">
          {bowlingXI.map((id) => {
            const player = lookup.player(id);
            const stat = statOf(id);
            const isCurrent = id === currentBowlerId;
            
            // Comprehensive bowler eligibility check
            const eligibility = validateBowlerEligibility(id, innings, isOverEnd ? previousBowlerId : undefined);
            const isLocked = !eligibility.canBowl && !isCurrent;

            const legalBalls = stat?.legalBalls ?? 0;
            const completedOvers = Math.floor(legalBalls / BALLS_PER_OVER);
            const quotaMax = eligibility.maxOversAllowed;

            return (
              <button
                key={id}
                disabled={isLocked}
                onClick={() => setSelected(id)}
                className={`tap flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-colors ${
                  selected === id
                    ? "border-primary bg-primary/5"
                    : isLocked
                      ? "border-border/40 bg-muted/40 opacity-50 cursor-not-allowed"
                      : "border-border bg-background hover:border-primary/30"
                }`}
              >
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${
                  isLocked ? "bg-muted text-muted-foreground" : "bg-secondary text-foreground"
                }`}>
                  {player?.shortName?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold text-foreground">
                    {player?.name ?? id}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    {player?.role && player.role !== "Unspecified" && (
                      <span>{player.role}</span>
                    )}
                    {isLocked && eligibility.reason && (
                      <span className="text-red-500 font-bold">
                        · {eligibility.reason}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground tabular-nums font-bold">
                  <p className={completedOvers >= 1 ? "text-red-500 font-black" : ""}>
                    {oversText(legalBalls)} / {quotaMax} ov
                  </p>
                  {stat && (
                    <p className="text-[10px] text-muted-foreground">
                      {stat.runs}r {stat.wickets}w
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 pb-8 pt-4 border-t border-border/60">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="tap flex min-h-14 w-full items-center justify-center rounded-full bg-foreground text-sm font-extrabold uppercase tracking-widest text-background disabled:opacity-40 shadow-md"
          >
            Confirm Bowler
          </button>
        </div>
      </div>
    </div>
  );
}
