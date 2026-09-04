import type { BowlerStat, InningsState } from "@/types/cricket";
import { lookup } from "@/lib/repositories";
import { oversText, validateBowlerEligibility } from "@/lib/scoring/engine";
import { BALLS_PER_OVER, TPL_TOURNAMENT_RULES } from "@/types/cricket";

interface Props {
  bowlerId?: string;
  bowlers: BowlerStat[];
  innings?: InningsState;
  canChangeBowler?: boolean;
  onChangeBowler?: () => void;
}

export function BowlerPanel({ bowlerId, bowlers, innings, canChangeBowler, onChangeBowler }: Props) {
  const stat = bowlers.find((b) => b.playerId === bowlerId);
  const player = lookup.player(bowlerId);

  if (!bowlerId || !player) return null;

  const legalBalls = stat?.legalBalls ?? 0;
  const completedOvers = Math.floor(legalBalls / BALLS_PER_OVER);
  const eligibility = validateBowlerEligibility(bowlerId, innings);
  const quotaMax = eligibility.maxOversAllowed;

  let availabilityBadge = "";
  if (completedOvers >= TPL_TOURNAMENT_RULES.MAX_OVERS_PER_BOWLER) {
    availabilityBadge = "1.0 / 1 OVER · MAXIMUM REACHED";
  } else {
    availabilityBadge = `${oversText(legalBalls)} / 1.0 OVER`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold tracking-widest text-[#5F6368] uppercase flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D9A928]" />
          Current Bowler
        </p>
        {canChangeBowler && onChangeBowler && (
          <button
            onClick={onChangeBowler}
            type="button"
            className="text-[10px] font-black text-[#D9A928] hover:underline uppercase tracking-wider"
          >
            Change Bowler
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-white border border-[#E5E5E5] p-3.5 sm:px-4 sm:py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F7F7F5] border border-[#E5E5E5] text-xs font-black text-[#111111]">
            {player.shortName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-[#111111]">{player.shortName}</p>
            <p className="text-[11px] font-bold text-[#5F6368]">{player.role && player.role !== "Unspecified" ? player.role : "Bowler"}</p>
          </div>
          {stat && (
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
              <div>
                <p className="text-[10px] font-extrabold text-[#5F6368] uppercase">Ov</p>
                <p className="text-sm font-black tabular-nums text-[#111111]">
                  {oversText(stat.legalBalls)} / {quotaMax}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-[#5F6368] uppercase">Runs</p>
                <p className="text-sm font-black tabular-nums text-[#111111]">{stat.runs}</p>
              </div>
              <div>
                <p className="text-[10px] font-extrabold text-[#5F6368] uppercase">Wkts</p>
                <p className="text-sm font-black tabular-nums text-[#9A6A05] bg-[#D9A928]/15 px-2 py-0.5 rounded-md">{stat.wickets}</p>
              </div>
            </div>
          )}
        </div>
        {availabilityBadge && (
          <div className="pt-1.5 border-t border-[#F3F4F6] flex items-center justify-between text-[10px] font-bold">
            <span className={completedOvers >= 2 ? "text-red-600" : "text-[#9A6A05]"}>
              {availabilityBadge}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
