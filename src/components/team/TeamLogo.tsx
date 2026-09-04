import { useState } from "react";
import { Shield } from "lucide-react";
import { lookup } from "@/lib/repositories";

interface TeamLogoProps {
  teamId?: string;
  teamName?: string;
  logoUrl?: string;
  name?: string;
  shortName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isBatting?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[9px]",
  sm: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-[10px]",
  md: "w-12 h-12 md:w-14 md:h-14 rounded-2xl text-xs",
  lg: "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-sm",
  xl: "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl text-lg",
};

// Generates consistent elegant gradient accents for teams
function getTeamGradient(seed: string): string {
  const gradients = [
    "from-amber-600/30 via-[#D9A928]/20 to-black",
    "from-blue-600/30 via-indigo-500/20 to-black",
    "from-emerald-600/30 via-teal-500/20 to-black",
    "from-purple-600/30 via-pink-500/20 to-black",
    "from-rose-600/30 via-red-500/20 to-black",
    "from-cyan-600/30 via-blue-500/20 to-black",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  return gradients[Math.abs(hash) % gradients.length] || gradients[0];
}

function deriveInitials(displayName: string, shortCode?: string): string {
  if (shortCode && shortCode.trim().length > 0) {
    return shortCode.trim().slice(0, 3).toUpperCase();
  }
  const clean = displayName.trim();
  if (!clean) return "TPL";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words.map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 3);
}

export function TeamLogo({
  teamId,
  teamName,
  logoUrl: propLogoUrl,
  name: propName,
  shortName: propShortName,
  size = "md",
  isBatting = false,
  className = "",
}: TeamLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Auto-resolve team metadata from repository if teamId is provided
  const resolvedTeam = teamId ? lookup.team(teamId) : undefined;
  const effectiveLogoUrl = propLogoUrl || resolvedTeam?.logoUrl;
  const effectiveName = propName || teamName || resolvedTeam?.name || "Team";
  const effectiveShortName = propShortName || resolvedTeam?.shortName;
  const initials = deriveInitials(effectiveName, effectiveShortName);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const gradient = getTeamGradient(teamId || effectiveName);

  const showImage = Boolean(effectiveLogoUrl && !imageFailed);

  return (
    <div
      className={`relative ${sizeClass} shrink-0 bg-[#121212] border flex items-center justify-center shadow-lg overflow-hidden transition-all select-none ${
        isBatting
          ? "border-[#D9A928] ring-2 ring-[#D9A928]/50 shadow-[0_0_20px_rgba(217,169,40,0.4)]"
          : "border-white/15 group-hover:border-[#D9A928]/40"
      } ${className}`}
      title={effectiveName}
    >
      {showImage ? (
        <img
          src={effectiveLogoUrl}
          alt={effectiveName}
          className="w-full h-full object-cover rounded-[inherit] transition-transform duration-300 group-hover:scale-105"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-1 relative`}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <Shield className="w-1/3 h-1/3 text-[#D9A928] opacity-80 mb-0.5" />
            <span className="font-black tracking-wider text-[#D9A928] leading-none drop-shadow-sm">
              {initials}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
