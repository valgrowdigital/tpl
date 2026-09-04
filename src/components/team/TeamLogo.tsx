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

// Authoritative team logo mappings for all TPL teams
const TEAM_AUTH_LOGOS: Record<string, string> = {
  // UUIDs
  "832b3866-046c-4beb-970a-4d79cc72ba37": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "edcc603d-db13-4191-813c-44abb06c883c": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "c1397164-6f86-4639-93e6-888e0091bb51": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "9d930c5d-c96b-43ef-8be7-fed8c71133df": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "f36ace20-1b45-43e4-be94-7a0f8a678fd9": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "53a3ea75-b3cf-4908-a19b-d3f3b693b3fd": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",

  // Slugs
  "bary-mawathe-royals": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "thundu-capital": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "kurunduwatte-legends": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "riverside-kings": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "new-garden-warriors": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "dainagoda-united": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",

  // Aliases
  "team-bmr": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "team-tc": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "team-kl": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "team-rk": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "team-ngw": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "team-du": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",

  // Short Codes
  "bmr": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "tc": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "kl": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "rk": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "ngw": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "du": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",
};

export function getAuthoritativeLogo(identifier?: string): string | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toLowerCase().trim();
  if (TEAM_AUTH_LOGOS[clean]) return TEAM_AUTH_LOGOS[clean];
  const slugified = clean.replace(/[^a-z0-9]+/g, "-");
  if (TEAM_AUTH_LOGOS[slugified]) return TEAM_AUTH_LOGOS[slugified];
  return undefined;
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
  const effectiveName = propName || teamName || resolvedTeam?.name || "Team";
  const effectiveShortName = propShortName || resolvedTeam?.shortName;

  const fallbackLogo =
    getAuthoritativeLogo(teamId) ||
    getAuthoritativeLogo(resolvedTeam?.slug) ||
    getAuthoritativeLogo(resolvedTeam?.id) ||
    getAuthoritativeLogo(effectiveName) ||
    getAuthoritativeLogo(effectiveShortName);

  const effectiveLogoUrl = propLogoUrl || resolvedTeam?.logoUrl || fallbackLogo;
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
