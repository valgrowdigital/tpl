import type { BallSummary } from "@/types/cricket";

interface BallByBallStripProps {
  recentBalls: BallSummary[];
  maxDeliveries?: number;
}

export function BallByBallStrip({ recentBalls, maxDeliveries = 8 }: BallByBallStripProps) {
  const displayBalls = recentBalls.slice(-maxDeliveries);

  if (displayBalls.length === 0) {
    return (
      <div className="flex items-center gap-1.5 opacity-60 min-w-0">
        <span className="text-[10px] font-black text-[#D9A928] uppercase tracking-wider shrink-0">
          THIS OVER:
        </span>
        <span className="text-[10px] font-bold text-white/40 italic truncate">Waiting for ball...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <span className="text-[10px] font-black uppercase tracking-wider text-[#D9A928] shrink-0">
        THIS OVER
      </span>
      <div className="flex items-center gap-1 shrink-0 overflow-visible">
        {displayBalls.map((b, idx) => {
          let badgeBg = "bg-white/10 text-white border-white/20";
          const label = b.label.trim();

          if (b.kind === "wicket" || label.toUpperCase().includes("W")) {
            badgeBg = "bg-rose-600 text-white border-rose-400 font-black shadow-sm shadow-rose-900/50";
          } else if (label === "6") {
            badgeBg = "bg-[#D9A928] text-black border-[#F4C542] font-black shadow-sm shadow-amber-900/50";
          } else if (label === "4") {
            badgeBg = "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm shadow-emerald-900/50";
          } else if (label === "0" || label === "•") {
            badgeBg = "bg-white/5 text-white/50 border-white/10";
          } else if (b.kind === "extra") {
            badgeBg = "bg-sky-600 text-white border-sky-400 font-bold";
          }

          return (
            <span
              key={`${b.delivery?.id ?? idx}-${idx}`}
              className={`inline-flex items-center justify-center min-w-[22px] h-5.5 px-1 rounded-md border text-[11px] font-mono font-black tracking-tight shrink-0 ${badgeBg}`}
            >
              {label === "0" ? "•" : label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
