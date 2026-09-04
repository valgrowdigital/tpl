import { motion } from "framer-motion";
import { useMatchStore } from "@/lib/scoring/store";
import { usePlayers, useTeams, useMatches } from "@/hooks/useCricketData";
import { TeamLogo } from "@/components/team/TeamLogo";
import { lookup, isPlayerInTeam } from "@/lib/repositories";
import { Logo } from "@/components/brand/Logo";

// Authoritative team logo mappings for all TPL teams
const TEAM_FALLBACK_LOGOS: Record<string, string> = {
  "new-garden-warriors": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "kurunduwatte-legends": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "bary-mawathe-royals": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "thundu-capital": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "riverside-kings": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "dainagoda-united": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",
  "team-ngw": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "team-kl": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "team-bmr": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "team-tc": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "team-rk": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "team-du": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",
  "f36ace20-1b45-43e4-be94-7a0f8a678fd9": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/new-garden-warriors-1787056599415.jpg",
  "c1397164-6f86-4639-93e6-888e0091bb51": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/kurunduwatte-legends-1787056610757.jpg",
  "832b3866-046c-4beb-970a-4d79cc72ba37": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/bary-mawathe-royals-1787119875442.jpg",
  "edcc603d-db13-4191-813c-44abb06c883c": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/thundu-capital-1787056530318.jpg",
  "9d930c5d-c96b-43ef-8be7-fed8c71133df": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/riverside-kings-1787056582474.jpg",
  "53a3ea75-b3cf-4908-a19b-d3f3b693b3fd": "https://emlhfbbkwdpmdodjruje.supabase.co/storage/v1/object/public/team_logos/dainagoda-united-1787056544338.jpg",
};

export function TeamSquadsGraphic({ matchId, transitionType = "fade" }: { matchId: string, transitionType?: string }) {
  const store = useMatchStore(matchId);
  const { data: matches = [] } = useMatches();
  const { data: teams = [] } = useTeams();
  const { data: players = [] } = usePlayers();

  const match = (matchId ? (store.match?.id === matchId ? store.match : undefined) ?? matches.find(m => m.id === matchId) ?? lookup.match(matchId) : undefined)
    ?? matches.find(m => m.status === "LIVE")
    ?? matches[0]
    ?? lookup.allMatches()[0];

  if (!match) {
    return (
      <div className="absolute inset-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col items-center justify-center font-sans text-white">
        <Logo className="h-12 w-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-black uppercase tracking-widest text-[#D9A928]">
          LOADING PLAYING SQUADS...
        </h2>
      </div>
    );
  }

  const teamA = teams.find(t => t.id === match.teamAId || t.slug === match.teamAId) || lookup.team(match.teamAId) || lookup.allTeams()[0];
  const teamB = teams.find(t => t.id === match.teamBId || t.slug === match.teamBId) || lookup.team(match.teamBId) || lookup.allTeams()[1];

  const teamALogo = teamA?.logoUrl || TEAM_FALLBACK_LOGOS[match.teamAId] || TEAM_FALLBACK_LOGOS[teamA?.slug || ""];
  const teamBLogo = teamB?.logoUrl || TEAM_FALLBACK_LOGOS[match.teamBId] || TEAM_FALLBACK_LOGOS[teamB?.slug || ""];

  // Get playing XI from match setup, fallback to squad roster
  const teamAPlayers = match.setup?.teamAPlayers || [];
  const teamBPlayers = match.setup?.teamBPlayers || [];

  const resolvePlayer = (id: string) => lookup.player(id) || players.find(p => p.id === id);

  const teamAFallback = teamA 
    ? (players.filter(p => isPlayerInTeam(p, teamA)).length > 0 
        ? players.filter(p => isPlayerInTeam(p, teamA)) 
        : lookup.players().filter(p => isPlayerInTeam(p, teamA))) 
    : [];

  const teamBFallback = teamB 
    ? (players.filter(p => isPlayerInTeam(p, teamB)).length > 0 
        ? players.filter(p => isPlayerInTeam(p, teamB)) 
        : lookup.players().filter(p => isPlayerInTeam(p, teamB))) 
    : [];

  const teamAFull = (teamAPlayers.length > 0)
    ? (teamAPlayers.map(resolvePlayer).filter(Boolean) as any[])
    : teamAFallback;

  const teamBFull = (teamBPlayers.length > 0)
    ? (teamBPlayers.map(resolvePlayer).filter(Boolean) as any[])
    : teamBFallback;

  const variants = {
    initial: transitionType === "slide" ? { y: "100%" } : { opacity: 0 },
    animate: transitionType === "slide" ? { y: 0 } : { opacity: 1 },
    exit: transitionType === "slide" ? { y: "100%" } : { opacity: 0 },
  };

  return (
    <motion.div
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col justify-between pt-4 pb-4 px-6 sm:px-12 overflow-hidden select-none font-sans"
    >
      <div className="flex-1 max-w-[1500px] w-full mx-auto flex flex-col justify-between h-full py-2">
        {/* Header */}
        <div className="flex flex-col items-center justify-center shrink-0 mb-3">
          <Logo className="h-10 sm:h-12 w-auto mb-1 drop-shadow-xl brightness-125" />
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.2em] text-white leading-tight">
            PLAYING SQUADS
          </h1>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#D9A928]">
            MATCH #{String(match.matchNumber).padStart(2, '0')}
          </h2>
        </div>

        {/* Squads Container */}
        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-6 sm:gap-10 items-stretch min-h-0">
          
          {/* Team A Card */}
          <div className="flex flex-col bg-[#111111]/90 border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl col-start-1 row-start-1">
            <div className="bg-gradient-to-r from-[#1E1E1E] to-[#141414] py-3 px-6 flex items-center justify-center gap-4 border-b border-[#333333] shrink-0">
              <TeamLogo
                logoUrl={teamALogo}
                name={teamA?.name}
                shortName={teamA?.shortName}
                className="w-14 h-14 rounded-xl shadow-lg border border-[#D9A928]/40"
              />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white text-center">
                {teamA?.name || "Team A"}
              </h2>
            </div>
            
            <div className="px-6 py-3 flex-1 flex flex-col justify-evenly gap-1 overflow-hidden">
              {teamAFull.slice(0, 11).map((p, i) => {
                if (!p) return null;
                const isCaptain = match.setup?.captainAId === p.id;
                const isWk = match.setup?.wkAId === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-3 text-white text-sm sm:text-base font-bold">
                    <span className="text-[#666666] font-mono w-5 text-right text-xs sm:text-sm">{i + 1}.</span>
                    <span className="truncate uppercase tracking-wide">{p.name}</span>
                    <div className="flex gap-1.5 ml-auto shrink-0">
                      {isCaptain && <span className="px-2 py-0.5 rounded bg-[#D9A928] text-black text-[9px] font-black tracking-widest">C</span>}
                      {isWk && <span className="px-2 py-0.5 rounded border border-[#666666] text-[#AAAAAA] text-[9px] font-black tracking-widest">WK</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VS Center Badge */}
          <div className="flex items-center justify-center h-full relative px-2">
            <div className="w-px h-full bg-gradient-to-b from-transparent via-[#444444] to-transparent absolute" />
            <div className="bg-[#161616] border-2 border-[#D9A928]/50 rounded-full w-12 h-12 flex items-center justify-center relative z-10 shadow-2xl">
              <span className="font-black text-[#D9A928] text-base italic tracking-wider">VS</span>
            </div>
          </div>

          {/* Team B Card */}
          <div className="flex flex-col bg-[#111111]/90 border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl col-start-3 row-start-1">
            <div className="bg-gradient-to-r from-[#141414] to-[#1E1E1E] py-3 px-6 flex items-center justify-center gap-4 border-b border-[#333333] shrink-0">
              <TeamLogo
                logoUrl={teamBLogo}
                name={teamB?.name}
                shortName={teamB?.shortName}
                className="w-14 h-14 rounded-xl shadow-lg border border-[#D9A928]/40"
              />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white text-center">
                {teamB?.name || "Team B"}
              </h2>
            </div>
            
            <div className="px-6 py-3 flex-1 flex flex-col justify-evenly gap-1 overflow-hidden">
              {teamBFull.slice(0, 11).map((p, i) => {
                if (!p) return null;
                const isCaptain = match.setup?.captainBId === p.id;
                const isWk = match.setup?.wkBId === p.id;
                return (
                  <div key={p.id} className="flex items-center gap-3 text-white text-sm sm:text-base font-bold">
                    <span className="text-[#666666] font-mono w-5 text-right text-xs sm:text-sm">{i + 1}.</span>
                    <span className="truncate uppercase tracking-wide">{p.name}</span>
                    <div className="flex gap-1.5 ml-auto shrink-0">
                      {isCaptain && <span className="px-2 py-0.5 rounded bg-[#D9A928] text-black text-[9px] font-black tracking-widest">C</span>}
                      {isWk && <span className="px-2 py-0.5 rounded border border-[#666666] text-[#AAAAAA] text-[9px] font-black tracking-widest">WK</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Branding */}
        <div className="flex items-center justify-center gap-2 pt-3 shrink-0">
          <img src="/valgrow-labs-logo.jpeg" alt="ValGrow Labs" className="h-4 w-4 rounded object-cover flex-shrink-0 shadow-sm" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#888888]">
            POWERED BY <span className="text-[#D9A928]">VALGROW LABS</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

