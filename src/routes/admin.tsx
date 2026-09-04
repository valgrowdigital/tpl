import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMatches, useTeams, usePlayers } from "@/hooks/useCricketData";
import { useAdminAuth } from "@/lib/auth";
import { lookup, matchRepository, playerRepository, TOURNAMENT_NAME } from "@/lib/repositories";
import { broadcastTournamentUpdate } from "@/lib/scoring/store";
import { Logo } from "@/components/brand/Logo";
import { TeamLogo } from "@/components/team/TeamLogo";
import { formatMatchTime, parseTime12To24, parse24ToTime12, resizeImageToDataUrl } from "@/lib/utils";
import type { Match, Player, Team, PlayerRole } from "@/types/cricket";
import { BALLS_PER_OVER, getTeamGroup } from "@/types/cricket";
import { parseYoutubeEmbedUrl } from "@/lib/youtube";
import { obsStreamRepository } from "@/lib/obsStreamRepository";
import {
  LayoutDashboard,
  Users,
  Shield,
  Calendar,
  BookOpen,
  Gavel,
  Printer,
  History,
  UserCheck,
  Settings,
  LogOut,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  FileText,
  Download,
  Trash2,
  Edit,
  Clock,
  MapPin,
  Play,
  RotateCcw,
  X,
  ExternalLink,
  ChevronRight,
  Menu,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

import {
  TPL_STATISTICS_METHODOLOGY,
  getAllMethodologiesByCategory,
  METHODOLOGY_VERSION,
  METHODOLOGY_LAST_UPDATED,
  OFFICIAL_RULES_REFERENCE_URL,
  type MetricCategory,
} from "@/lib/scoring/statistics-methodology";

export const Route = createFileRoute("/admin")({
  component: AdminPortalPage,
});

const MATCH_CIRCLES = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
function getMatchNumberSymbol(num: number): string {
  return MATCH_CIRCLES[num] || `Match #${num}`;
}

type AdminSection =
  | "overview"
  | "players"
  | "teams"
  | "tournament"
  | "methodology"
  | "manuals"
  | "auction"
  | "reports"
  | "changelog"
  | "staff"
  | "settings";

const ADMIN_NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "players", label: "Players", icon: Users },
  { id: "teams", label: "Teams", icon: Shield },
  { id: "tournament", label: "Tournament Control", icon: Calendar },
  { id: "methodology", label: "Stats Methodology", icon: BookOpen },
  { id: "manuals", label: "System Manuals", icon: FileText },
  { id: "auction", label: "Auction Manager", icon: Gavel },
  { id: "reports", label: "Print Reports", icon: Printer },
  { id: "changelog", label: "Changelog", icon: History },
  { id: "staff", label: "Staff & Admins", icon: UserCheck },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

function AdminPortalPage() {
  const { authStatus, isAdminAuthenticated, adminEmail, isSubmitting, loginAdmin, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: matches = [], refetch: refetchMatches } = useMatches();
  const { data: teams = [], refetch: refetchTeams } = useTeams();
  const { data: players = [], refetch: refetchPlayers } = usePlayers();


  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Player view state
  const [playerTab, setPlayerTab] = useState<"all" | "assigned" | "unassigned">("all");
  const [playerSearch, setPlayerSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedPlayerForView, setSelectedPlayerForView] = useState<Player | null>(null);

  // Add New Player Modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>("Batter");
  const [newPlayerTeamId, setNewPlayerTeamId] = useState("");
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string | null>(null);
  const [newPlayerAvatarUrl, setNewPlayerAvatarUrl] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const [newPlayerReferenceId, setNewPlayerReferenceId] = useState("");
  const [newPlayerSoldPrice, setNewPlayerSoldPrice] = useState("");
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [createPlayerError, setCreatePlayerError] = useState<string | null>(null);
  const [createPlayerSuccess, setCreatePlayerSuccess] = useState<string | null>(null);
  const newPlayerFileInputRef = useRef<HTMLInputElement>(null);

  // Tournament control modals
  const [showSingleMatchModal, setShowSingleMatchModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [showResetActiveModal, setShowResetActiveModal] = useState(false);
  const [matchToResetSingle, setMatchToResetSingle] = useState<Match | null>(null);
  const [showScheduleGeneratorModal, setShowScheduleGeneratorModal] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Single Match state (12-hour format)
  const [singleMatchTeam1, setSingleMatchTeam1] = useState("");
  const [singleMatchTeam2, setSingleMatchTeam2] = useState("");
  const [singleMatchDate, setSingleMatchDate] = useState("2026-08-30");
  const [singleMatchHour, setSingleMatchHour] = useState("02");
  const [singleMatchMinute, setSingleMatchMinute] = useState("30");
  const [singleMatchAmPm, setSingleMatchAmPm] = useState<"AM" | "PM">("PM");
  const [singleMatchOvers, setSingleMatchOvers] = useState(5);
  const [singleMatchBallsPerOver, setSingleMatchBallsPerOver] = useState(BALLS_PER_OVER);
  const [singleMatchVenue, setSingleMatchVenue] = useState("TPL Cricket Ground");

  // Schedule generator state (12-hour format)
  const [genGroup1Teams, setGenGroup1Teams] = useState<string[]>(["", "", ""]);
  const [genGroup2Teams, setGenGroup2Teams] = useState<string[]>(["", "", ""]);
  const [genStartDate, setGenStartDate] = useState("2026-08-30");
  const [genStartHour, setGenStartHour] = useState("09");
  const [genStartMinute, setGenStartMinute] = useState("00");
  const [genStartAmPm, setGenStartAmPm] = useState<"AM" | "PM">("AM");
  const [genOvers, setGenOvers] = useState(5);
  const [genBallsPerOver, setGenBallsPerOver] = useState(BALLS_PER_OVER);
  const [genIntervalMinutes, setGenIntervalMinutes] = useState(45);

  // Player role edit state
  const [editingPlayerRole, setEditingPlayerRole] = useState<PlayerRole>("Batter");
  const [roleUpdateSuccess, setRoleUpdateSuccess] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Player team assignment state
  const [editingPlayerTeamId, setEditingPlayerTeamId] = useState<string>("");
  const [teamUpdateSuccess, setTeamUpdateSuccess] = useState<string | null>(null);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  // Player photo / avatar edit state
  const [editingPlayerAvatar, setEditingPlayerAvatar] = useState<string | null>(null);
  const [avatarUpdateSuccess, setAvatarUpdateSuccess] = useState<string | null>(null);
  const [avatarUpdateError, setAvatarUpdateError] = useState<string | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState("");
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [knockoutStage, setKnockoutStage] = useState<"Semi-Final 1" | "Semi-Final 2" | "Final">("Semi-Final 1");
  const [knockoutTeamA, setKnockoutTeamA] = useState("");
  const [knockoutTeamB, setKnockoutTeamB] = useState("");
  const [knockoutHour, setKnockoutHour] = useState("04");
  const [knockoutMinute, setKnockoutMinute] = useState("00");
  const [knockoutAmPm, setKnockoutAmPm] = useState<"AM" | "PM">("PM");
  const [knockoutDate, setKnockoutDate] = useState("2026-08-30");

  // Schedule action status state
  const [scheduleActionError, setScheduleActionError] = useState<string | null>(null);
  const [isScheduleActionLoading, setIsScheduleActionLoading] = useState(false);

  // Report modal state
  const [activeReportModal, setActiveReportModal] = useState<string | null>(null);

  // Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffList, setStaffList] = useState([
    { id: "s1", name: "Official Scorer", email: "scorer@tpl.com", role: "Chief Scorer", status: "Active" },
    { id: "s2", name: "Tournament Director", email: "director@tpl.com", role: "Super Admin", status: "Active" },
    { id: "s3", name: "Match Referee", email: "referee@tpl.com", role: "Official Referee", status: "Active" },
  ]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Official Scorer");

  // OBS Embed State
  const [obsMatchId, setObsMatchId] = useState<string>("");
  const [obsStreamUrl, setObsStreamUrl] = useState<string>("");
  const [obsSaveStatus, setObsSaveStatus] = useState<string | null>(null);
  const [obsPreviewUrl, setObsPreviewUrl] = useState<string | null>(null);

  // WhatsApp Configuration State
  const [waServerUrl, setWaServerUrl] = useState("");
  const [waApiKey, setWaApiKey] = useState("");
  const [waSessionId, setWaSessionId] = useState("");
  const [waTargetChatId, setWaTargetChatId] = useState("");
  const [waSaveStatus, setWaSaveStatus] = useState<string | null>(null);
  const [waSendStatus, setWaSendStatus] = useState<Record<string, { loading: boolean; message: string | null; error: boolean }>>({});

  // Fetch initial WhatsApp settings
  useEffect(() => {
    import("@/lib/whatsappService").then((mod) => {
      const saved = mod.whatsappSettingsRepository.getSettings();
      if (saved) {
        setWaServerUrl(saved.serverUrl);
        setWaApiKey(saved.apiKey);
        setWaSessionId(saved.sessionId);
        setWaTargetChatId(saved.targetChatId);
      }
    });
  }, []);

  // Filtered players (Unconditional Hook Call)
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (playerTab === "assigned" && (!p.teamId || !p.teamId.trim())) return false;
      if (playerTab === "unassigned" && Boolean(p.teamId && p.teamId.trim())) return false;
      if (playerSearch.trim()) {
        const q = playerSearch.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesRef = p.referenceId?.toLowerCase().includes(q);
        const matchesTeam = lookup.team(p.teamId)?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesRef && !matchesTeam) return false;
      }
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (teamFilter !== "all") {
        if (teamFilter === "unassigned") {
          if (p.teamId && p.teamId.trim()) return false;
        } else if (p.teamId !== teamFilter) {
          return false;
        }
      }
      return true;
    });
  }, [players, playerTab, playerSearch, roleFilter, teamFilter]);

  // ── Mobile Drawer Body Scroll Lock & ESC Key Listener ──────────────────────
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError("Please provide both email and password.");
      return;
    }
    const res = await loginAdmin(email, password);
    if (!res.success) {
      setAuthError(res.error || "INVALID ADMIN CREDENTIALS");
    }
  };

  // ── AUTO-GENERATE SCHEDULE HANDLER ────────────────────────────────────────
  const handleAutoGenerateSchedule = async () => {
    if (teams.length < 2) return;
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);

    try {
      let group1 = teams.filter((t) => (t.groupName || "").includes("1") || (t.groupName || "").toUpperCase().includes("A"));
      let group2 = teams.filter((t) => (t.groupName || "").includes("2") || (t.groupName || "").toUpperCase().includes("B"));

      if (group1.length === 0 || group2.length === 0) {
        const half = Math.ceil(teams.length / 2);
        group1 = teams.slice(0, half);
        group2 = teams.slice(half);
      }

      const fixtures: Match[] = [];
      const baseTime = new Date();
      baseTime.setHours(9, 0, 0, 0);
      let matchNum = 1;

      for (let i = 0; i < group1.length; i++) {
        for (let j = 0; j < group2.length; j++) {
          const scheduledDate = new Date(baseTime.getTime() + (matchNum - 1) * 45 * 60 * 1000);
          const teamA = group1[(i + j) % group1.length];
          const teamB = group2[j];

          fixtures.push({
            id: `tpl-fixture-${matchNum}`,
            tournament: TOURNAMENT_NAME,
            matchNumber: matchNum,
            teamAId: teamA.id,
            teamBId: teamB.id,
            venue: "TPL Cricket Ground",
            overs: 5,
            scheduledAt: scheduledDate.toISOString(),
            status: "UPCOMING",
            resultText: undefined,
          });
          matchNum++;
        }
      }

      const savedMatches = await matchRepository.saveSchedule(fixtures);
      queryClient.setQueryData(["matches"], savedMatches);
      broadcastTournamentUpdate();
      await refetchMatches();
    } catch (err: any) {
      console.error("[handleAutoGenerateSchedule] Error:", err);
      setScheduleActionError(err?.message || "Unable to save match schedule. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // Auto-populate group 1 & group 2 defaults with unique teams when teams are loaded
  useEffect(() => {
    if (teams.length >= 6) {
      // 1. First attempt to restore saved group selections from localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("tpl-schedule-groups");
          if (raw) {
            const saved = JSON.parse(raw);
            if (
              Array.isArray(saved?.group1) &&
              Array.isArray(saved?.group2) &&
              saved.group1.length === 3 &&
              saved.group2.length === 3
            ) {
              const combined = new Set([...saved.group1, ...saved.group2]);
              const allExist = [...saved.group1, ...saved.group2].every((id) =>
                teams.some((t) => t.id === id)
              );
              if (combined.size === 6 && allExist) {
                setGenGroup1Teams(saved.group1);
                setGenGroup2Teams(saved.group2);
                return;
              }
            }
          }
        } catch {}
      }

      // 2. If no saved selection, check team groupName metadata from database
      if (!genGroup1Teams[0] && !genGroup2Teams[0]) {
        const g1 = teams.filter((t) => (t.groupName || "").includes("1") || (t.groupName || "").toUpperCase().includes("A"));
        const g2 = teams.filter((t) => (t.groupName || "").includes("2") || (t.groupName || "").toUpperCase().includes("B"));
        if (g1.length >= 3 && g2.length >= 3) {
          const g1Ids = [g1[0].id, g1[1].id, g1[2].id];
          const g2Ids = [g2[0].id, g2[1].id, g2[2].id];
          const combined = new Set([...g1Ids, ...g2Ids]);
          if (combined.size === 6) {
            setGenGroup1Teams(g1Ids);
            setGenGroup2Teams(g2Ids);
            return;
          }
        }
        // 3. Fallback to first 6 unique teams
        setGenGroup1Teams([teams[0].id, teams[1].id, teams[2].id]);
        setGenGroup2Teams([teams[3].id, teams[4].id, teams[5].id]);
      }
    }
  }, [teams]);

  // Next available unique match number
  const nextMatchNumber = useMemo(() => {
    if (matches.length === 0) return 1;
    const max = Math.max(...matches.map((m) => m.matchNumber || 0));
    return max + 1;
  }, [matches]);

  // Team 2 available options for Single Match (any other team)
  const availableTeam2Options = useMemo(() => {
    if (!singleMatchTeam1) return teams;
    return teams.filter((t) => t.id !== singleMatchTeam1);
  }, [teams, singleMatchTeam1]);

  const handleTeam1Change = (newTeam1Id: string) => {
    setSingleMatchTeam1(newTeam1Id);
    const oppositeTeams = teams.filter((t) => t.id !== newTeam1Id);
    if (singleMatchTeam2 === newTeam1Id || !singleMatchTeam2) {
      setSingleMatchTeam2(oppositeTeams[0]?.id || "");
    }
  };

  const handleOpenSingleMatchModal = () => {
    setScheduleActionError(null);
    const g1 = teams.filter((t) => getTeamGroup(t) === "Group 1");
    const g2 = teams.filter((t) => getTeamGroup(t) === "Group 2");
    if (g1.length > 0 && g2.length > 0) {
      setSingleMatchTeam1(g1[0].id);
      setSingleMatchTeam2(g2[0].id);
    } else if (teams.length >= 2) {
      setSingleMatchTeam1(teams[0].id);
      setSingleMatchTeam2(teams[1].id);
    } else {
      setSingleMatchTeam1("");
      setSingleMatchTeam2("");
    }
    setSingleMatchOvers(5);
    setSingleMatchBallsPerOver(BALLS_PER_OVER);
    setSingleMatchVenue("TPL Cricket Ground");
    setShowSingleMatchModal(true);
  };

  const handleOpenScheduleGenerator = () => {
    setScheduleActionError(null);
    setResetSuccessMsg(null);
    const g1 = teams.filter((t) => getTeamGroup(t) === "Group 1");
    const g2 = teams.filter((t) => getTeamGroup(t) === "Group 2");
    if (g1.length >= 3) {
      setGenGroup1Teams([g1[0].id, g1[1].id, g1[2].id]);
    } else if (teams.length >= 6) {
      setGenGroup1Teams([teams[0].id, teams[1].id, teams[2].id]);
    }
    if (g2.length >= 3) {
      setGenGroup2Teams([g2[0].id, g2[1].id, g2[2].id]);
    } else if (teams.length >= 6) {
      setGenGroup2Teams([teams[3].id, teams[4].id, teams[5].id]);
    }
    setShowScheduleGeneratorModal(true);
  };

  // Modal body scroll lock and escape key handler
  useEffect(() => {
    const isAnyModalOpen =
      showSingleMatchModal ||
      showScheduleGeneratorModal ||
      showResetAllModal ||
      showResetConfirm ||
      showKnockoutModal ||
      showAddPlayerModal ||
      Boolean(selectedPlayerForView);

    if (!isAnyModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isScheduleActionLoading) {
        setShowSingleMatchModal(false);
        setShowScheduleGeneratorModal(false);
        setShowResetAllModal(false);
        setShowResetConfirm(false);
        setShowKnockoutModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showSingleMatchModal,
    showScheduleGeneratorModal,
    showResetAllModal,
    showResetConfirm,
    showKnockoutModal,
    selectedPlayerForView,
    isScheduleActionLoading,
  ]);

  // Memoized list of all currently selected team IDs across both groups
  const selectedTeamIds = useMemo(() => {
    return [...genGroup1Teams, ...genGroup2Teams].filter(Boolean);
  }, [genGroup1Teams, genGroup2Teams]);

  // Returns all teams that are either the currently selected value for this slot OR not selected anywhere else
  const getAvailableTeamsForSlot = (currentVal: string, _expectedGroup?: "Group 1" | "Group 2") => {
    return teams.filter((t) => {
      return t.id === currentVal || !selectedTeamIds.includes(t.id);
    });
  };

  // Most recent scheduled / played match to detect back-to-back fatigue
  const lastScheduledMatch = useMemo(() => {
    if (matches.length === 0) return null;
    const sorted = [...matches].sort((a, b) => {
      if (a.matchNumber && b.matchNumber) return a.matchNumber - b.matchNumber;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
    return sorted[sorted.length - 1] || null;
  }, [matches]);

  const lastMatchTeamIds = useMemo(() => {
    if (!lastScheduledMatch) return new Set<string>();
    return new Set([lastScheduledMatch.teamAId, lastScheduledMatch.teamBId]);
  }, [lastScheduledMatch]);

  const FIXTURE_INDEX_PAIRS: [number, number][] = [
    [0, 0], // M1: G1[0] vs G2[0]
    [1, 1], // M2: G1[1] vs G2[1]
    [2, 2], // M3: G1[2] vs G2[2]
    [0, 1], // M4: G1[0] vs G2[1]
    [1, 2], // M5: G1[1] vs G2[2]
    [2, 0], // M6: G1[2] vs G2[0]
    [0, 2], // M7: G1[0] vs G2[2]
    [1, 0], // M8: G1[1] vs G2[0]
    [2, 1], // M9: G1[2] vs G2[1]
  ];

  const generatedPreviewFixtures = useMemo(() => {
    if (genGroup1Teams.some((t) => !t) || genGroup2Teams.some((t) => !t)) return [];
    const g1 = genGroup1Teams.map((id) => teams.find((t) => t.id === id));
    const g2 = genGroup2Teams.map((id) => teams.find((t) => t.id === id));
    if (g1.some((t) => !t) || g2.some((t) => !t)) return [];

    const startTime24 = parseTime12To24(genStartHour, genStartMinute, genStartAmPm) || "09:00";
    const [hStr, mStr] = startTime24.split(":");
    const hours = parseInt(hStr, 10) || 9;
    const minutes = parseInt(mStr, 10) || 0;
    const [y, m, d] = (genStartDate || "2026-08-30").split("-").map(Number);
    const baseDate = new Date(y, (m || 1) - 1, d || 1, hours, minutes, 0, 0);

    return FIXTURE_INDEX_PAIRS.map(([i1, i2], idx) => {
      const tA = g1[i1]!;
      const tB = g2[i2]!;
      const matchTime = new Date(baseDate.getTime() + idx * (Number(genIntervalMinutes) || 45) * 60 * 1000);
      const timeStr = matchTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const resting = [...g1, ...g2].filter((t) => t && t.id !== tA.id && t.id !== tB.id) as Team[];

      return {
        matchNum: idx + 1,
        teamA: tA,
        teamB: tB,
        timeStr,
        resting,
      };
    });
  }, [genGroup1Teams, genGroup2Teams, genStartDate, genStartHour, genStartMinute, genStartAmPm, genIntervalMinutes, teams]);

  // ── CREATE SINGLE MATCH HANDLER ──────────────────────────────────────────
  const handleCreateSingleMatchSubmit = async () => {
    if (!singleMatchTeam1 || !singleMatchTeam2) {
      setScheduleActionError("Please select both Team 1 and Team 2.");
      return;
    }
    if (singleMatchTeam1 === singleMatchTeam2) {
      setScheduleActionError("Team 1 and Team 2 cannot be the same team.");
      return;
    }
    const t1 = teams.find((t) => t.id === singleMatchTeam1);
    const t2 = teams.find((t) => t.id === singleMatchTeam2);
    if (t1 && t2 && getTeamGroup(t1) === getTeamGroup(t2)) {
      setScheduleActionError("Invalid fixture: teams must belong to different groups.");
      return;
    }
    if (!singleMatchDate) {
      setScheduleActionError("Please choose a valid match start date.");
      return;
    }
    if (singleMatchOvers < 1) {
      setScheduleActionError("Total overs must be at least 1.");
      return;
    }

    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const startTime24 = parseTime12To24(singleMatchHour, singleMatchMinute, singleMatchAmPm);
      const scheduledIso = `${singleMatchDate}T${startTime24}:00`;

      const created = await matchRepository.createSingleMatch({
        teamAId: singleMatchTeam1,
        teamBId: singleMatchTeam2,
        scheduledAt: scheduledIso,
        overs: Number(singleMatchOvers) || 5,
        ballsPerOver: Number(singleMatchBallsPerOver) || 6,
        venue: singleMatchVenue || "TPL Cricket Ground",
        matchNumber: nextMatchNumber,
      });

      // 1. Immediately update UI state and close modal upon confirmed creation
      queryClient.setQueryData<Match[]>(["matches"], (old = []) => {
        const exists = old.some((m) => m.id === created.id);
        return exists ? old.map((m) => (m.id === created.id ? created : m)) : [...old, created];
      });
      setShowSingleMatchModal(false);
      setScheduleActionError(null);
      setResetSuccessMsg(`Match #${String(created.matchNumber).padStart(2, "0")} created successfully.`);

      // 2. Perform background revalidation safely without failing user creation
      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleCreateSingleMatchSubmit] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleCreateSingleMatchSubmit] Error:", err);
      const cleanMsg = (err?.message || "Failed to create match fixture.").replace(/^(Failed to create (single )?match fixture:\s*)+/i, "").trim();
      setScheduleActionError(cleanMsg);
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── RESET PENDING FIXTURES HANDLER ───────────────────────────────────────
  const handleResetPendingFixtures = async () => {
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const remainingMatches = await matchRepository.resetPendingFixtures();
      queryClient.setQueryData(["matches"], remainingMatches);
      setShowResetConfirm(false);
      setShowResetAllModal(false);
      setScheduleActionError(null);
      setResetSuccessMsg(
        "Pending tournament fixtures have been reset. Completed match records, ball-by-ball data, statistics, points, and NRR are strictly preserved."
      );

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleResetPendingFixtures] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleResetPendingFixtures] Error:", err);
      setScheduleActionError(err?.message || "Unable to reset pending fixtures. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── RESET ALL MATCHES (INCLUDING LIVE & COMPLETED) ────────────────────────
  const handleResetAllMatches = async () => {
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const resetMatches = await matchRepository.resetAllMatches();
      queryClient.setQueryData(["matches"], resetMatches);
      setShowResetAllModal(false);
      setShowResetConfirm(false);
      setScheduleActionError(null);
      setResetSuccessMsg(
        "All tournament matches (including completed and live) have been reset back to UPCOMING with zeroed scores for fresh testing!"
      );

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleResetAllMatches] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleResetAllMatches] Error:", err);
      setScheduleActionError(err?.message || "Unable to reset all matches. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── RESET COMPLETED & LIVE MATCHES HANDLER ──────────────────────────────
  const handleResetCompletedAndLiveMatches = async () => {
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const resetMatches = await matchRepository.resetCompletedAndLiveMatches();
      queryClient.setQueryData(["matches"], resetMatches);
      setShowResetActiveModal(false);
      setShowResetAllModal(false);
      setShowResetConfirm(false);
      setScheduleActionError(null);
      setResetSuccessMsg(
        "All LIVE and COMPLETED match data, innings, and deliveries have been reset back to UPCOMING for fresh testing! Fixture schedule remains preserved."
      );

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleResetCompletedAndLiveMatches] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleResetCompletedAndLiveMatches] Error:", err);
      setScheduleActionError(err?.message || "Unable to reset completed and live matches. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── RESET SINGLE MATCH HANDLER ──────────────────────────────────────────
  const handleResetSingleMatchSubmit = async () => {
    if (!matchToResetSingle) return;
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const targetId = matchToResetSingle.id;
      const matchNum = matchToResetSingle.matchNumber;
      const updated = await matchRepository.resetSingleMatch(targetId);
      queryClient.setQueryData(["matches"], updated);
      setMatchToResetSingle(null);
      setScheduleActionError(null);
      setResetSuccessMsg(`Match #${String(matchNum).padStart(2, "0")} data, innings, and deliveries have been successfully reset back to scheduled state!`);

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleResetSingleMatchSubmit] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleResetSingleMatchSubmit] Error:", err);
      setScheduleActionError(err?.message || "Unable to reset this match. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── GENERATE 9 MATCHES SCHEDULE SUBMIT ───────────────────────────────────
  const handleGenerateScheduleSubmit = async () => {
    if (genGroup1Teams.some((t) => !t) || genGroup2Teams.some((t) => !t)) {
      setScheduleActionError("Please select all 3 teams for Group 1 and all 3 teams for Group 2.");
      return;
    }

    const allSelected = [...genGroup1Teams, ...genGroup2Teams];
    const unique = new Set(allSelected);
    if (unique.size !== 6) {
      setScheduleActionError("Please select 6 different teams. A team cannot appear in both groups.");
      return;
    }

    if (!genStartDate) {
      setScheduleActionError("Please choose a valid match start date.");
      return;
    }

    if (genOvers < 1) {
      setScheduleActionError("Total overs must be at least 1.");
      return;
    }

    setIsScheduleActionLoading(true);
    setScheduleActionError(null);
    setResetSuccessMsg(null);

    try {
      const startTime24 = parseTime12To24(genStartHour, genStartMinute, genStartAmPm);

      const generated = await matchRepository.generateTournamentSchedule({
        group1TeamIds: genGroup1Teams,
        group2TeamIds: genGroup2Teams,
        startDate: genStartDate,
        startTime: startTime24,
        overs: Number(genOvers) || 5,
        ballsPerOver: Number(genBallsPerOver) || 6,
        intervalMinutes: Number(genIntervalMinutes) || 45,
      });

      queryClient.setQueryData(["matches"], generated);
      setShowScheduleGeneratorModal(false);
      setScheduleActionError(null);
      setResetSuccessMsg(`Successfully generated ${generated.length} cross-group tournament matches!`);

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleGenerateScheduleSubmit] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleGenerateScheduleSubmit] Error:", err);
      setScheduleActionError(err?.message || "Failed to generate tournament schedule.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── SCHEDULE KNOCKOUT HANDLER ─────────────────────────────────────────────
  const handleScheduleKnockout = async () => {
    if (!knockoutTeamA || !knockoutTeamB) return;
    setIsScheduleActionLoading(true);
    setScheduleActionError(null);

    try {
      const nextMatchNum = matches.length + 1;
      const startTime24 = parseTime12To24(knockoutHour, knockoutMinute, knockoutAmPm);
      const scheduledDateTime = new Date(`${knockoutDate}T${startTime24}:00`);

      const newMatch: Match = {
        id: `tpl-knockout-${nextMatchNum}`,
        tournament: `${TOURNAMENT_NAME} - ${knockoutStage}`,
        matchNumber: nextMatchNum,
        teamAId: knockoutTeamA,
        teamBId: knockoutTeamB,
        venue: "TPL Cricket Ground",
        overs: 5,
        scheduledAt: scheduledDateTime.toISOString(),
        status: "UPCOMING",
        resultText: undefined,
      };

      const created = await matchRepository.createMatch(newMatch);
      queryClient.setQueryData<Match[]>(["matches"], (old = []) => {
        const exists = old.some((m) => m.id === created.id);
        return exists ? old.map((m) => (m.id === created.id ? created : m)) : [...old, created];
      });
      setShowKnockoutModal(false);
      setScheduleActionError(null);
      setResetSuccessMsg(`Knockout fixture #${String(created.matchNumber).padStart(2, "0")} scheduled successfully.`);

      try {
        broadcastTournamentUpdate();
        await refetchMatches();
      } catch (syncErr) {
        console.warn("[handleScheduleKnockout] Background sync notice:", syncErr);
      }
    } catch (err: any) {
      console.error("[handleScheduleKnockout] Error:", err);
      setScheduleActionError(err?.message || "Unable to schedule knockout match. Please try again.");
    } finally {
      setIsScheduleActionLoading(false);
    }
  };

  // ── State 1: Verification Loading Screen (Clean Light TPL Design) ───────────
  if (authStatus === "LOADING") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="md" className="mb-2" />
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#9A6A05]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>VERIFYING ADMIN ACCESS...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Authenticated but Unauthorized Screen ─────────────────────────
  if (authStatus === "UNAUTHORIZED") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col gap-6 text-center">
          <div className="flex justify-center">
            <Logo size="md" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase text-[#111827]">ACCESS DENIED</h1>
            <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
              Your authenticated account ({adminEmail}) is not authorized with Administrator privileges for the TPL 2026 portal.
            </p>
          </div>
          <button
            onClick={() => logoutAdmin()}
            className="tap w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  // ── State 3: Unauthenticated Admin Login Screen (Clean White TPL Design) ────
  if (authStatus === "UNAUTHENTICATED" || !isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[440px] bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
          {/* Official TPL Brand Header */}
          <div className="flex flex-col items-center text-center">
            <Logo size="lg" className="mb-3" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-[#111827]">TPL 2026</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9A6A05] mt-0.5">ADMIN PORTAL</p>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Sign in with your tournament administrator credentials.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#4B5563]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAuthError(null);
                }}
                placeholder="admin@example.com"
                disabled={isSubmitting}
                className="w-full bg-[#F9FAFB] border border-[#D1D5DB] focus:border-[#D9A928] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#4B5563]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError(null);
                }}
                placeholder="•••••••••"
                disabled={isSubmitting}
                className="w-full bg-[#F9FAFB] border border-[#D1D5DB] focus:border-[#D9A928] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none transition-all disabled:opacity-50"
                required
              />
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="tap mt-1 w-full py-3.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] active:bg-[#C2941E] disabled:opacity-60 text-[#111111] font-black text-xs uppercase tracking-wider shadow-md shadow-[#D9A928]/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#111111]" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280] font-semibold">
            <span>Official TPL 2026 Admin</span>
            <Link to="/home" className="hover:text-[#9A6A05] transition-colors">
              ← PUBLIC SITE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col md:flex-row">
      {/* ── MOBILE HEADER BAR (Sticky to Viewport) ──────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo size="md" className="shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#111827]">ADMIN PORTAL</p>
            <p className="text-[10px] text-[#9A6A05] font-extrabold uppercase tracking-widest">TPL 2026</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="p-2 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] hover:bg-[#E5E7EB] transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── MOBILE VIEWPORT-FIXED NAVIGATION DRAWER & BACKDROP ───────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin Navigation Menu">
          {/* Semi-transparent Backdrop with click-to-close */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel: Fixed to Viewport, full height, independent of page scroll */}
          <div className="relative w-full max-w-[280px] sm:max-w-xs h-full bg-white flex flex-col justify-between p-4 shadow-2xl overflow-y-auto z-10 animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-5">
              {/* Drawer Brand Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <Logo size="md" className="shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#111827]">ADMIN PORTAL</p>
                    <p className="text-[10px] text-[#9A6A05] font-extrabold uppercase tracking-widest">TPL 2026</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-1.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] hover:bg-[#E5E7EB] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id as AdminSection);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-left ${
                        isActive
                          ? "bg-[#D9A928] text-[#111111] font-black shadow-sm"
                          : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-[#111111]" : "text-[#9CA3AF]"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="flex flex-col gap-3 pt-4 border-t border-[#E5E7EB] mt-4">
              <div className="flex flex-col gap-1.5 text-[11px] font-bold text-[#6B7280] px-2">
                <Link
                  to="/scorer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 hover:text-[#9A6A05] transition-colors py-1"
                >
                  <Play className="h-3.5 w-3.5 text-[#9A6A05]" />
                  <span>Scorer Console</span>
                </Link>
                <Link
                  to="/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 hover:text-[#9A6A05] transition-colors py-1"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
                  <span>Public Website</span>
                </Link>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutAdmin();
                }}
                className="tap flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold uppercase tracking-wider transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>

              <div className="px-2 pt-1 text-[9px] text-[#9CA3AF] font-bold uppercase tracking-widest text-center">
                Technology Partner: Valgrow Labs
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR NAVIGATION (Sticky Viewport Height) ──────────── */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-[#E5E7EB] flex-col justify-between p-4 sticky top-0 h-screen z-20 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <Logo size="md" className="shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-[#111827]">ADMIN PORTAL</p>
              <p className="text-[10px] text-[#9A6A05] font-extrabold tracking-widest uppercase">Official Management</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as AdminSection)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-left ${
                    isActive
                      ? "bg-[#D9A928] text-[#111111] font-black shadow-sm"
                      : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#111111]" : "text-[#9CA3AF]"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#E5E7EB] mt-6">
          <div className="flex flex-col gap-1.5 text-[11px] font-bold text-[#6B7280] px-2">
            <Link to="/scorer" className="flex items-center gap-2 hover:text-[#9A6A05] transition-colors py-1">
              <Play className="h-3.5 w-3.5 text-[#9A6A05]" />
              <span>Scorer Console</span>
            </Link>
            <Link to="/home" className="flex items-center gap-2 hover:text-[#9A6A05] transition-colors py-1">
              <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <span>Public Website</span>
            </Link>
          </div>

          <button
            onClick={() => logoutAdmin()}
            className="tap flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>

          <div className="px-2 pt-1 text-[9px] text-[#9CA3AF] font-bold uppercase tracking-widest text-center">
            Technology Partner: Valgrow Labs
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl">
        {/* Top Operational Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-[#111827]">
              {activeSection.replace("-", " ")}
            </h1>
            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
              TPL 2026 Premier League Tournament Management System
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Database Online
            </span>
            <div className="text-right text-xs">
              <p className="font-bold text-[#111827] truncate max-w-[160px]">{adminEmail || "Administrator"}</p>
              <p className="text-[10px] text-[#9A6A05] font-black uppercase">Administrator</p>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: OVERVIEW ────────────────────────────────────────── */}
        {activeSection === "overview" && (
          <div className="flex flex-col gap-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Total Registrations</span>
                <div className="my-2">
                  <p className="text-3xl font-black text-[#111827]">{players.length}</p>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">100% Database verified</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Assigned to Teams</span>
                <div className="my-2">
                  <p className="text-3xl font-black text-[#9A6A05]">{players.filter((p) => p.teamId).length}</p>
                </div>
                <span className="text-[10px] text-[#6B7280] font-bold">Across {teams.length} Official Franchises</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Total Collected (LKR)</span>
                <div className="my-2">
                  <p className="text-3xl font-black text-[#111827]">{(players.length * 1500).toLocaleString()}</p>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Registration Fees</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Matches Scheduled</span>
                <div className="my-2">
                  <p className="text-3xl font-black text-[#111827]">{matches.length}</p>
                </div>
                <span className="text-[10px] text-[#9A6A05] font-bold">
                  {matches.filter((m) => m.status === "LIVE").length} Live • {matches.filter((m) => m.status === "COMPLETED").length} Completed
                </span>
              </div>
            </div>

            {/* Quick Actions & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Franchise Quick Overview */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#111827]">Tournament Franchises ({teams.length})</h3>
                  <button onClick={() => setActiveSection("teams")} className="text-xs font-black text-[#9A6A05] hover:underline uppercase">
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((t) => (
                    <div key={t.id} className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamLogo logoUrl={t.logoUrl} name={t.name} shortName={t.shortName} size="xs" />
                        <div>
                          <p className="text-xs font-bold text-[#111827] uppercase">{t.name}</p>
                          <p className="text-[10px] text-[#6B7280]">{t.groupName || "Group Stage"}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#9A6A05]">
                        {lookup.playersOf(t.id).length} Players
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#111827] border-b border-[#E5E7EB] pb-3">
                  Recent System Activity
                </h3>
                <div className="flex flex-col gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111827]">Scorer Console Synchronized</p>
                      <p className="text-[10px] text-[#6B7280]">Realtime WebSocket broadcast active</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-[#9A6A05] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111827]">9 Group Matches Ready</p>
                      <p className="text-[10px] text-[#6B7280]">Cross-pool schedule prepared</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#111827]">Knockout Stage Configured</p>
                      <p className="text-[10px] text-[#6B7280]">Top 2 qualification active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: PLAYERS ─────────────────────────────────────────── */}
        {activeSection === "players" && (
          <div className="flex flex-col gap-5">
            {/* Player Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
              <div className="flex flex-wrap rounded-xl bg-[#F3F4F6] p-1 border border-[#E5E7EB]">
                <button
                  onClick={() => setPlayerTab("all")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    playerTab === "all" ? "bg-[#D9A928] text-[#111111] shadow-xs" : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  All Players ({players.length})
                </button>
                <button
                  onClick={() => setPlayerTab("assigned")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    playerTab === "assigned" ? "bg-[#D9A928] text-[#111111] shadow-xs" : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Assigned Squads ({players.filter((p) => Boolean(p.teamId && p.teamId.trim())).length})
                </button>
                <button
                  onClick={() => setPlayerTab("unassigned")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    playerTab === "unassigned" ? "bg-[#D9A928] text-[#111111] shadow-xs" : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  Unassigned Pool ({players.filter((p) => !p.teamId || !p.teamId.trim()).length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Search player or ref..."
                    className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D9A928]"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-rounder">All-rounder</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                </select>

                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none"
                >
                  <option value="all">All Teams</option>
                  <option value="unassigned">Unassigned Pool Only</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setNewPlayerName("");
                    setNewPlayerRole("Batter");
                    setNewPlayerTeamId("");
                    setNewPlayerAvatar(null);
                    setNewPlayerAvatarUrl("");
                    setNewPlayerPhone("");
                    setNewPlayerReferenceId(`TPL-${String(players.length + 1).padStart(3, "0")}`);
                    setNewPlayerSoldPrice("");
                    setCreatePlayerError(null);
                    setCreatePlayerSuccess(null);
                    setShowAddPlayerModal(true);
                  }}
                  className="tap flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] font-black text-xs uppercase shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Player</span>
                </button>
              </div>
            </div>

            {/* Players Table */}
            <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F9FAFB] text-[10px] font-black uppercase tracking-wider text-[#4B5563] border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-4 py-3.5">PLAYER</th>
                      <th className="px-4 py-3.5">TEAM / STATUS</th>
                      <th className="px-4 py-3.5">PRIMARY ROLE</th>
                      <th className="px-4 py-3.5">PROFILE STATUS</th>
                      <th className="px-4 py-3.5">ATTENDANCE</th>
                      <th className="px-4 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                          <p className="font-bold text-sm">No players match the selected filters.</p>
                          <p className="text-[10px] mt-1">Try changing your search term or tab filter above.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((p) => {
                        const t = lookup.team(p.teamId);
                        const isUnassigned = !p.teamId || !p.teamId.trim();
                        return (
                          <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs text-[#9A6A05]">
                                  {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : p.name[0]}
                                </div>
                                <div>
                                  <p className="font-black text-[#111827]">{p.name}</p>
                                  <p className="text-[10px] text-[#6B7280]">{p.referenceId || `REF-${p.id.slice(0, 6)}`}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {t ? (
                                <span className="font-bold text-[#9A6A05] flex items-center gap-1.5">
                                  <Shield className="h-3.5 w-3.5 text-[#9A6A05] shrink-0" />
                                  <span>{t.shortName ?? t.name}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black uppercase text-amber-800 tracking-wider">
                                  Unassigned Pool
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] text-[10px] font-bold text-[#374151]">
                                {p.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold text-[#4B5563]">Present</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isUnassigned && (
                                  <button
                                    onClick={() => {
                                      setSelectedPlayerForView(p);
                                      setEditingPlayerRole((p.role as PlayerRole) || "Batter");
                                      setRoleUpdateSuccess(null);
                                      setEditingPlayerTeamId("");
                                      setTeamUpdateSuccess(null);
                                      setEditingPlayerAvatar(p.avatar || null);
                                      setAvatarUpdateSuccess(null);
                                      setAvatarUpdateError(null);
                                      setAvatarInputUrl("");
                                    }}
                                    className="tap inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1E40AF] font-black text-[10px] uppercase tracking-wider border border-blue-200 transition-all"
                                  >
                                    <Shield className="h-3 w-3" />
                                    <span>Assign Team</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedPlayerForView(p);
                                    setEditingPlayerRole((p.role as PlayerRole) || "Batter");
                                    setRoleUpdateSuccess(null);
                                    setEditingPlayerTeamId(p.teamId || "");
                                    setTeamUpdateSuccess(null);
                                    setEditingPlayerAvatar(p.avatar || null);
                                    setAvatarUpdateSuccess(null);
                                    setAvatarUpdateError(null);
                                    setAvatarInputUrl("");
                                  }}
                                  className="tap inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#D9A928] text-[#111827] hover:text-[#111111] font-black text-[10px] uppercase tracking-wider border border-[#E5E7EB] transition-all"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>Profile</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3: TEAMS ───────────────────────────────────────────── */}
        {activeSection === "teams" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((t) => {
              const teamPlayers = lookup.playersOf(t.id);
              return (
                <div key={t.id} className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                      <div className="flex items-center gap-3">
                        <TeamLogo logoUrl={t.logoUrl} name={t.name} shortName={t.shortName} size="md" />
                        <div>
                          <h3 className="text-base font-black text-[#111827] uppercase">{t.name}</h3>
                          <p className="text-xs text-[#9A6A05] font-bold uppercase">{t.groupName || "Group 1"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                        <p className="text-[10px] text-[#6B7280] uppercase font-bold">Owner</p>
                        <p className="font-bold text-[#111827] truncate">{t.ownerName || "Franchise Owner"}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                        <p className="text-[10px] text-[#6B7280] uppercase font-bold">Squad Size</p>
                        <p className="font-bold text-[#9A6A05]">{teamPlayers.length} Players</p>
                      </div>
                    </div>

                    {/* Squad Mini List */}
                    <div className="flex flex-col gap-1.5 mt-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Squad Roster</p>
                      <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                        {teamPlayers.map((tp, idx) => (
                          <div key={tp.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F3F4F6]">
                            <span className="text-[#111827] font-medium">{idx + 1}. {tp.name}</span>
                            <span className="text-[10px] text-[#6B7280]">{tp.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SECTION 4: TOURNAMENT CONTROL (MATCH SCHEDULING & MATCH LIST) ── */}
        {activeSection === "tournament" && (
          <div className="flex flex-col gap-8">
            {/* Feedback Notifications */}
            {resetSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setResetSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 text-[10px] uppercase font-black px-2 py-1 bg-white rounded-lg border border-emerald-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {scheduleActionError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{scheduleActionError}</span>
                </div>
                <button
                  onClick={() => setScheduleActionError(null)}
                  className="text-red-500 hover:text-red-800 text-[10px] uppercase font-black px-2 py-1 bg-white rounded-lg border border-red-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 1. TOURNAMENT FIXTURE CONTROL (MATCHING USER REFERENCE)          */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#111827]">
                  TOURNAMENT FIXTURE CONTROL
                </h2>
                <p className="text-xs text-[#6B7280] font-medium mt-1">
                  Create and manage tournament fixtures.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSingleMatchModal(true)}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Single Match</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenScheduleGenerator}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Generate Schedule (9 Matches)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowKnockoutModal(true)}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#111827] text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Schedule Knockout</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const activeCount = matches.filter((m) => m.status === "LIVE" || m.status === "COMPLETED").length;
                    if (activeCount === 0) {
                      setScheduleActionError(null);
                      setResetSuccessMsg("NO LIVE OR COMPLETED MATCHES TO RESET.");
                      return;
                    }
                    setScheduleActionError(null);
                    setShowResetActiveModal(true);
                  }}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-2xs"
                  title="Resets all completed and live matches back to scheduled/upcoming, clearing test deliveries and innings while keeping fixtures"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reset Completed & Live Matches</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const pendingCount = matches.filter((m) => m.status === "UPCOMING" || m.status === "READY").length;
                    if (pendingCount === 0) {
                      setScheduleActionError(null);
                      setResetSuccessMsg("NO PENDING FIXTURES TO RESET.");
                      return;
                    }
                    setScheduleActionError(null);
                    setShowResetConfirm(true);
                  }}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Pending Fixtures</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScheduleActionError(null);
                    setShowResetAllModal(true);
                  }}
                  disabled={isScheduleActionLoading}
                  className="tap px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Resets every match (including live and completed) back to fresh UPCOMING status with zeroed scores"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Reset All (Fresh Testing)</span>
                </button>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 2. MATCH LIST (3-COLUMN RESPONSIVE GRID MATCHING REFERENCE)       */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-[#111827]">
                  MATCH LIST
                </h2>
                <span className="text-xs font-mono font-bold text-[#6B7280]">
                  {matches.length} {matches.length === 1 ? "Match" : "Matches"}
                </span>
              </div>

              {matches.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white border border-[#E5E7EB] text-center shadow-sm flex flex-col items-center justify-center gap-3">
                  <div className="p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB]">
                    <Calendar className="h-6 w-6 text-[#9CA3AF]" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-wider text-[#111827]">No Matches Scheduled Yet</p>
                    <p className="text-xs text-[#6B7280] font-medium mt-1 max-w-sm mx-auto">
                      Select Team 1 and Team 2 above and click <span className="font-bold text-[#9A6A05]">[ SCHEDULE MATCH ]</span> or <span className="font-bold text-[#111827]">Generate Schedule</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {matches.map((m) => {
                    const teamA = lookup.team(m.teamAId);
                    const teamB = lookup.team(m.teamBId);
                    const time = formatMatchTime(m.scheduledAt);
                    const numSymbol = getMatchNumberSymbol(m.matchNumber);

                    return (
                      <div
                        key={m.id}
                        className="p-5 rounded-2xl bg-white border border-[#E5E7EB] flex flex-col gap-4 shadow-sm"
                      >
                        {/* Header: Match # and Status */}
                        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                          <span className="text-sm font-black text-[#111827] uppercase tracking-wider">MATCH {numSymbol}</span>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-sm ${
                              m.status === "LIVE"
                                ? "bg-[#111111] text-white animate-pulse"
                                : m.status === "COMPLETED"
                                ? "bg-[#111111] text-white"
                                : "bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]"
                            }`}
                          >
                            {m.status === "LIVE" ? "LIVE ●" : m.status === "UPCOMING" ? "UPCOMING" : m.status}
                          </span>
                        </div>

                        {/* Teams */}
                        <div className="flex flex-col gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <TeamLogo logoUrl={teamA?.logoUrl} name={teamA?.name} shortName={teamA?.shortName} size="xs" />
                            <span className="text-sm font-black uppercase tracking-wide text-[#111827] truncate">{teamA?.name || "Team A"}</span>
                          </div>
                          <span className="text-[10px] font-black text-[#9A6A05] tracking-widest pl-9">VS</span>
                          <div className="flex items-center gap-2">
                            <TeamLogo logoUrl={teamB?.logoUrl} name={teamB?.name} shortName={teamB?.shortName} size="xs" />
                            <span className="text-sm font-black uppercase tracking-wide text-[#111827] truncate">{teamB?.name || "Team B"}</span>
                          </div>
                        </div>

                        {/* Time and Overs */}
                        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-4">
                          <span className="text-xs font-bold text-[#6B7280]">{time}</span>
                          <span className="text-xs font-bold text-[#6B7280]">{m.overs} {m.overs === 1 ? 'Over' : 'Overs'} Match</span>
                        </div>

                        {/* Scorer PIN and Actions */}
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">SCORER PIN</p>
                            <p className="text-xl font-black font-mono tracking-widest text-[#111827]">{m.scorerPin || "----"}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <Link
                              to={`/match/${m.id}`}
                              className="tap py-2 rounded-lg bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] font-black text-[10px] uppercase tracking-wider text-center transition-colors"
                            >
                              OPEN SCORER
                            </Link>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(new URL(`/match/${m.id}`, window.location.origin).toString());
                              }}
                              className="tap py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-[#111827] font-black text-[10px] uppercase tracking-wider text-center transition-colors"
                            >
                              COPY SCORER URL
                            </button>
                            <Link
                              to={`/obs/match/${m.id}`}
                              target="_blank"
                              className="tap py-2 rounded-lg bg-[#111111] hover:bg-[#222222] text-white font-black text-[10px] uppercase tracking-wider text-center transition-colors"
                            >
                              OPEN OBS
                            </Link>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(new URL(`/obs/match/${m.id}`, window.location.origin).toString());
                              }}
                              className="tap py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#E5E7EB] text-[#111827] font-black text-[10px] uppercase tracking-wider text-center transition-colors"
                            >
                              COPY OBS URL
                            </button>
                          </div>

                          <div className="mt-1 flex flex-col gap-1">
                            <button
                              onClick={async () => {
                                const waStatus = waSendStatus[m.id];
                                if (waStatus?.loading) return;

                                setWaSendStatus(prev => ({ ...prev, [m.id]: { loading: true, message: "Sending...", error: false } }));

                                try {
                                  const mod = await import("@/lib/whatsappService");
                                  const teamAName = teamA?.name || "Team A";
                                  const teamBName = teamB?.name || "Team B";
                                  const eventId = `match-${m.id}-${m.status}`;
                                  
                                  let potmText = "";
                                  if (m.manOfTheMatchId) {
                                    const potm = players.find(p => p.id === m.manOfTheMatchId);
                                    if (potm) {
                                      potmText = `🌟 Player of the Match: ${potm.name}`;
                                    }
                                  }

                                  const message = mod.buildMatchWhatsAppMessage(m, {
                                    teamAName,
                                    teamBName,
                                    timeFormatted: time,
                                    numSymbol,
                                    winnerLine: m.resultText || "MATCH COMPLETED",
                                    potmText,
                                    origin: window.location.origin,
                                  });

                                  const res = await mod.sendWhatsAppNotification(eventId, message);
                                  const successMsg = res.method === "api" ? "✓ WhatsApp notification sent" : "✓ WhatsApp opened with match details";
                                  
                                  setWaSendStatus(prev => ({ ...prev, [m.id]: { loading: false, message: successMsg, error: false } }));
                                  setTimeout(() => {
                                    setWaSendStatus(prev => {
                                      const copy = { ...prev };
                                      delete copy[m.id];
                                      return copy;
                                    });
                                  }, 4000);
                                } catch (err: any) {
                                  setWaSendStatus(prev => ({ ...prev, [m.id]: { loading: false, message: `WhatsApp notification failed: ${err.message}`, error: true } }));
                                  setTimeout(() => {
                                    setWaSendStatus(prev => {
                                      const copy = { ...prev };
                                      delete copy[m.id];
                                      return copy;
                                    });
                                  }, 5000);
                                }
                              }}
                              disabled={waSendStatus[m.id]?.loading}
                              className="w-full tap py-2 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white font-black text-[10px] uppercase tracking-wider text-center transition-colors shadow-sm disabled:opacity-75"
                            >
                              SEND WHATSAPP
                            </button>
                            {waSendStatus[m.id] && (
                              <div className={`text-[10px] font-bold mt-1 text-center ${waSendStatus[m.id].error ? 'text-red-500' : 'text-[#25D366]'}`}>
                                {waSendStatus[m.id].message}
                              </div>
                            )}
                          </div>

                          {/* Reset Single Match Data Button (Live / Completed test matches) */}
                          {(m.status === "LIVE" || m.status === "COMPLETED") && (
                            <div className="mt-1 pt-2 border-t border-[#F3F4F6]">
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleActionError(null);
                                  setMatchToResetSingle(m);
                                }}
                                disabled={isScheduleActionLoading}
                                className="w-full tap py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-300 text-red-700 font-black text-[10px] uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
                                title="Reset deliveries, innings, and scores for this match back to scheduled state"
                              >
                                <RotateCcw className="h-3 w-3 text-red-600" />
                                <span>RESET MATCH DATA (TESTING)</span>
                              </button>
                            </div>
                          )}
                        </div>


                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 5: SYSTEM MANUALS ──────────────────────────────────── */}
        {activeSection === "manuals" && (
          <div className="flex flex-col gap-6 max-w-4xl">
            <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-5">
              <div className="border-b border-[#E5E7EB] pb-4">
                <h3 className="text-base font-black uppercase text-[#9A6A05]">Official Scorer Terminal Manual</h3>
                <p className="text-xs text-[#6B7280] mt-1">Official step-by-step operating guidelines for scorers and match officials.</p>
              </div>

              <div className="flex flex-col gap-4 text-xs leading-relaxed text-[#374151]">
                <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <p className="font-black text-[#111827] uppercase text-sm">1. Scorer Terminal Access & PIN</p>
                  <p>Admins and Scorers access the console via <code className="text-[#9A6A05] font-bold">/scorer</code> using authorized credentials or the 6-digit tournament PIN.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <p className="font-black text-[#111827] uppercase text-sm">2. Toss & Playing XI Setup</p>
                  <p>Select the toss winner and their decision (BAT or BOWL). Select up to 11 players per team. A flexible squad size (2 to 11 players) is supported.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <p className="font-black text-[#111827] uppercase text-sm">3. Ball-by-Ball Live Scoring</p>
                  <p>Input deliveries with run buttons (0, 1, 2, 3, 4, 6) and extras (WD, NB, Bye, Leg Bye). Scoring engine automatically recalculates CRR, RRR, partnerships, and fall of wickets.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <p className="font-black text-[#111827] uppercase text-sm">4. Rain Delay Adjustments</p>
                  <p>Use the <code className="text-[#9A6A05] font-bold">Adjust Overs</code> tool in the scorer console to apply ARR target recalculations if rain interrupts play.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 6: AUCTION MANAGER ─────────────────────────────────── */}
        {activeSection === "auction" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
                <span className="text-[10px] font-black text-[#6B7280] uppercase">Total Drafted</span>
                <p className="text-2xl font-black text-[#9A6A05] my-1">
                  {players.filter((p) => p.teamId).length} / {players.length}
                </p>
                <span className="text-[10px] text-[#6B7280]">Players Assigned</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
                <span className="text-[10px] font-black text-[#6B7280] uppercase">Franchises Ready</span>
                <p className="text-2xl font-black text-[#111827] my-1">{teams.length}</p>
                <span className="text-[10px] text-emerald-600 font-bold">All 6 Active</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
                <span className="text-[10px] font-black text-[#6B7280] uppercase">Average Purse Left</span>
                <p className="text-2xl font-black text-[#111827] my-1">100,000 LKR</p>
                <span className="text-[10px] text-[#6B7280]">Per Franchise</span>
              </div>
            </div>

            {/* OBS LIVE STREAM EMBED CONFIGURATION */}
            <div className="mt-8 p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm">
              <h3 className="text-sm font-black uppercase text-[#111827] mb-4">OBS Live Stream Embed</h3>
              <p className="text-xs text-[#6B7280] mb-6">
                Configure the background live stream for the OBS overlay. The selected stream will automatically be applied as the background layer for the specified match.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-wider">Select Match</label>
                  <select
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D9A928]/50"
                    value={obsMatchId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      setObsMatchId(mId);
                      setObsSaveStatus(null);
                      setObsPreviewUrl(null);
                      if (mId) {
                        setObsStreamUrl(obsStreamRepository.getStreamUrl(mId) || "");
                      } else {
                        setObsStreamUrl("");
                      }
                    }}
                  >
                    <option value="">-- Select Match --</option>
                    {matches.filter(m => m.status !== "COMPLETED").map(m => (
                      <option key={m.id} value={m.id}>
                        Match #{m.matchNumber}: {lookup.team(m.teamAId)?.name} vs {lookup.team(m.teamBId)?.name}
                      </option>
                    ))}
                  </select>

                  <label className="text-[10px] font-black text-[#111827] uppercase tracking-wider mt-2">Live Stream URL</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#D9A928]/50"
                    value={obsStreamUrl}
                    onChange={(e) => setObsStreamUrl(e.target.value)}
                    disabled={!obsMatchId}
                  />
                  <p className="text-[10px] text-[#6B7280]">
                    Example: https://www.youtube.com/embed/LIVE_ID?autoplay=1&mute=1<br/>
                    (Standard YouTube links will automatically be converted to embed URLs)
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        if (!obsMatchId) return;
                        const parsed = parseYoutubeEmbedUrl(obsStreamUrl);
                        if (parsed) {
                          obsStreamRepository.saveStreamUrl(obsMatchId, parsed);
                          setObsStreamUrl(parsed);
                          setObsSaveStatus("Stream saved successfully!");
                          setTimeout(() => setObsSaveStatus(null), 3000);
                        } else {
                          obsStreamRepository.removeStreamUrl(obsMatchId);
                          setObsStreamUrl("");
                          setObsSaveStatus("Stream removed.");
                          setTimeout(() => setObsSaveStatus(null), 3000);
                        }
                      }}
                      disabled={!obsMatchId}
                      className="tap bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all"
                    >
                      Save URL
                    </button>
                    <button
                      onClick={() => {
                        const parsed = parseYoutubeEmbedUrl(obsStreamUrl);
                        if (parsed) setObsPreviewUrl(parsed);
                      }}
                      disabled={!obsStreamUrl}
                      className="tap bg-[#F9FAFB] hover:bg-[#E5E7EB] text-[#111827] border border-[#E5E7EB] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all"
                    >
                      Preview Stream
                    </button>
                  </div>

                  {obsSaveStatus && (
                    <div className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {obsSaveStatus}
                    </div>
                  )}
                </div>

                {/* Preview Window */}
                <div className="bg-[#111111] rounded-2xl overflow-hidden relative border border-[#E5E7EB] flex items-center justify-center min-h-[250px]">
                  {obsPreviewUrl ? (
                    <iframe
                      src={obsPreviewUrl}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-[#6B7280] text-xs font-black uppercase text-center flex flex-col items-center gap-2">
                      <Play className="h-8 w-8 opacity-20" />
                      <span>No Stream Preview<br/>Enter URL and click preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 7: PRINT REPORTS ───────────────────────────────────── */}
        {activeSection === "reports" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { id: "reg_master", title: "Registration Master List", desc: "Full list of all registered players and contact references." },
              { id: "auction_results", title: "Final Auction Results", desc: "Complete breakdown of drafted squad lists and sold amounts." },
              { id: "team_signoff", title: "Team Sign-Off Sheets", desc: "Official squad sign-off sheets for franchise captains." },
              { id: "available_players", title: "Available Players List", desc: "Unassigned draft pool eligible for selection." },
              { id: "team_contacts", title: "Team Contact Lists", desc: "Private administrative directory of captain & owner contacts." },
              { id: "match_scorecards", title: "Official Match Scorecards", desc: "Printable certified scorecards of completed tournament matches." },
            ].map((r) => (
              <div key={r.id} className="p-6 rounded-3xl bg-white border border-[#E5E7EB] flex flex-col justify-between gap-5 shadow-sm">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-[#D9A928]/10 text-[#9A6A05] flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black uppercase text-[#111827]">{r.title}</h3>
                  <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{r.desc}</p>
                </div>

                <button
                  onClick={() => setActiveReportModal(r.id)}
                  className="tap w-full py-2.5 rounded-xl bg-[#F3F4F6] hover:bg-[#D9A928] text-[#111827] hover:text-[#111111] font-black text-xs uppercase tracking-wider border border-[#E5E7EB] transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Generate Report →</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── SECTION 8: CHANGELOG ───────────────────────────────────────── */}
        {activeSection === "changelog" && (
          <div className="flex flex-col gap-4 max-w-3xl">
            <div className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-black uppercase text-[#9A6A05]">Platform Release History</h3>
              <div className="space-y-4 text-xs text-[#374151]">
                <div className="border-l-2 border-[#D9A928] pl-3 py-1">
                  <p className="font-black text-[#111827]">v2.4.0 — Unified Scorer Match Control & Official Tournament Rules</p>
                  <p className="text-[#6B7280] text-[11px]">Enforced Scorer-only start match, pure HTML empty state, ARR target revision, and Bowled-out NRR formula.</p>
                </div>
                <div className="border-l-2 border-[#E5E7EB] pl-3 py-1">
                  <p className="font-black text-[#111827]">v2.3.0 — Team Logo Size Normalization</p>
                  <p className="text-[#6B7280] text-[11px]">Equalized logo visual footprint generic scaling across all match cards.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 9: STAFF & ADMINS ──────────────────────────────────── */}
        {activeSection === "staff" && (
          <div className="flex flex-col gap-5 max-w-4xl">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
              <h3 className="text-sm font-black uppercase text-[#111827]">Authorized Tournament Staff</h3>
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="tap inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] font-black text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Admin / Staff</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] text-[10px] font-black uppercase text-[#4B5563] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3">NAME</th>
                    <th className="px-4 py-3">EMAIL</th>
                    <th className="px-4 py-3">ROLE</th>
                    <th className="px-4 py-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3 font-bold text-[#111827]">{s.name}</td>
                      <td className="px-4 py-3 text-[#6B7280] font-mono">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#9A6A05] font-bold text-[10px] border border-[#E5E7EB]">
                          {s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SECTION 10: SETTINGS ───────────────────────────────────────── */}
        {activeSection === "settings" && (
          <div className="max-w-2xl p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-5">
            <h3 className="text-sm font-black uppercase text-[#111827] border-b border-[#E5E7EB] pb-3">
              Tournament Configuration
            </h3>

            <div className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">Tournament Name</label>
                <input
                  type="text"
                  defaultValue="TPL 2026"
                  disabled
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">Official Match Venue</label>
                <input
                  type="text"
                  defaultValue="TPL Cricket Ground"
                  disabled
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">Standard Overs</label>
                <input
                  type="text"
                  defaultValue="5 Overs per innings"
                  disabled
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-xl px-4 py-2.5 text-[#111827] font-bold"
                />
              </div>
            </div>

            <h3 className="text-sm font-black uppercase text-[#111827] border-b border-[#E5E7EB] pb-3 pt-4 mt-2">
              WHATSAPP BOT CONFIGURATION
            </h3>
            <p className="text-xs text-[#6B7280] -mt-2">
              These settings control the TPL player attendance WhatsApp bot and match notifications.
            </p>

            <div className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">OpenWA Server URL</label>
                <input
                  type="url"
                  placeholder="http://localhost:3000"
                  value={waServerUrl}
                  onChange={(e) => setWaServerUrl(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-2 focus:ring-[#D9A928]/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">API Key (X-Api-Key)</label>
                <input
                  type="password"
                  placeholder="Enter API Key"
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-2 focus:ring-[#D9A928]/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">Session ID / Name</label>
                <input
                  type="text"
                  placeholder="default"
                  value={waSessionId}
                  onChange={(e) => setWaSessionId(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-2 focus:ring-[#D9A928]/50"
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-[#6B7280] uppercase">Target Chat ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1234567890@c.us or 1234567890@g.us"
                  value={waTargetChatId}
                  onChange={(e) => setWaTargetChatId(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-[#111827] font-bold focus:ring-2 focus:ring-[#D9A928]/50"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={async () => {
                    const mod = await import("@/lib/whatsappService");
                    mod.whatsappSettingsRepository.saveSettings({
                      serverUrl: waServerUrl,
                      apiKey: waApiKey,
                      sessionId: waSessionId,
                      targetChatId: waTargetChatId,
                    });
                    setWaSaveStatus("Settings saved successfully!");
                    setTimeout(() => setWaSaveStatus(null), 3000);
                  }}
                  className="tap bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Save WhatsApp Settings
                </button>
                {waSaveStatus && (
                  <span className="text-emerald-600 font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {waSaveStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION: STATISTICS & AWARDS METHODOLOGY ───────────────────── */}
        {activeSection === "methodology" && (
          <div className="flex flex-col gap-6">
            {/* Header Showcase Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#121316] via-black to-[#1E1B11] border-2 border-[#D9A928] text-white shadow-xl flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#D9A928]/20 flex items-center justify-center text-[#D9A928]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A928] bg-[#D9A928]/10 px-2.5 py-0.5 rounded-full border border-[#D9A928]/20">
                        Methodology Version {METHODOLOGY_VERSION}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        Audited & Deterministic
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-black uppercase tracking-wide text-white mt-1">
                      Official Statistics & Awards Methodology Specification
                    </h2>
                  </div>
                </div>

                <a
                  href={OFFICIAL_RULES_REFERENCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap px-4 py-2 rounded-xl bg-[#D9A928] text-black font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#E5B537] flex items-center gap-1.5"
                >
                  <span>Official Rules Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <p className="text-xs text-white/80 leading-relaxed">
                Every statistic, award, ranking, net run rate (NRR), and points table value in TPL 2026 is evaluated purely from authoritative match deliveries (<code className="text-[#D9A928]">balls</code>) and completed match events. Master player, team, and roster data remain strictly read-only.
              </p>
            </div>

            {/* Methodology Categories */}
            {Object.entries(getAllMethodologiesByCategory()).map(([categoryKey, metrics]) => {
              if (metrics.length === 0) return null;
              return (
                <div key={categoryKey} className="p-6 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">
                      {categoryKey.replace("_", " ")} SPECIFICATION
                    </h3>
                    <span className="text-[10px] font-bold text-[#6B7280]">
                      {metrics.length} Defined Metrics
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metrics.map((m) => (
                      <div key={m.key} className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#E5E7EB] flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase text-[#111827]">{m.name}</h4>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-[#4B5563]">
                              {m.scope}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[#6B7280]">{m.methodologyVersion}</span>
                        </div>

                        <p className="text-xs text-[#4B5563] font-medium leading-relaxed">{m.description}</p>

                        <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-[#9A6A05]">Formula</span>
                          <code className="text-[11px] font-mono text-[#111827] font-bold">{m.formula}</code>
                        </div>

                        <div className="flex flex-col gap-1 text-[11px] text-[#6B7280]">
                          <p><strong className="text-[#111827]">Qualification:</strong> {m.qualification}</p>
                          <p><strong className="text-[#111827]">Tie-Breaker:</strong> {m.tieBreakRule}</p>
                          <p><strong className="text-[#111827]">Edge Cases:</strong> {m.edgeCases}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── RESET ALL MATCHES MODAL ─────────────────────────────────────── */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-white border border-red-300 rounded-3xl p-6 sm:p-7 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-red-100 pb-3">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2.5 rounded-2xl bg-red-100 text-red-600">
                  <AlertCircle className="h-6 w-6 shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-[#111827]">Reset All Tournament Matches</h3>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Permanent Tournament Wipe</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetAllModal(false)}
                disabled={isScheduleActionLoading}
                className="text-[#9CA3AF] hover:text-[#111827] p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 text-xs flex flex-col gap-3">
              <p className="font-extrabold text-red-900 leading-snug">
                This will permanently delete all generated tournament matches and their match scoring data.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white border border-red-200 text-red-800">
                  <span className="font-black text-[10px] uppercase text-red-600">Data Deleted:</span>
                  <span>• {matches.length} Matches & Innings</span>
                  <span>• All Deliveries & Over States</span>
                  <span>• Wagon Wheel & Partnerships</span>
                  <span>• Match-Derived Player Stats</span>
                </div>
                <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800">
                  <span className="font-black text-[10px] uppercase text-emerald-600">Preserved Master Data:</span>
                  <span>✓ {players.length} Registered Players</span>
                  <span>✓ {teams.length} Official Teams</span>
                  <span>✓ Player-Team Rosters</span>
                  <span>✓ Permanent Profile Data</span>
                </div>
              </div>
            </div>

            {scheduleActionError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-800 text-xs font-bold">
                {scheduleActionError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowResetAllModal(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllMatches}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting All...</span>
                  </>
                ) : (
                  <span>Confirm Reset All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── CREATE SINGLE MATCH MODAL ─────────────────────────────────────── */}
      {showSingleMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-3xl flex flex-col shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed/Sticky at Top) */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 sm:px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#D9A928]/15 text-[#9A6A05]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-[#111827]">Create Single Match</h3>
                  <p className="text-xs text-[#6B7280]">Schedule an individual tournament fixture</p>
                </div>
              </div>
              <button
                onClick={() => setShowSingleMatchModal(false)}
                disabled={isScheduleActionLoading}
                className="text-[#9CA3AF] hover:text-[#111827] p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors"
                aria-label="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 overscroll-contain">
              {/* Match Number Pill Banner */}
              <div className="p-3.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#6B7280]">Fixture Number</span>
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-[#D9A928]/20 text-[#9A6A05] border border-[#D9A928]/40">
                    Match #{String(nextMatchNumber).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#6B7280]">Auto-determined</span>
              </div>

              {/* Team 1 & Team 2 Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Team 1 */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-[#9A6A05] tracking-wider">
                    Team 1 (Batting First / Home)
                  </label>
                  <select
                    value={singleMatchTeam1}
                    onChange={(e) => handleTeam1Change(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#D9A928] min-h-[48px]"
                  >
                    <option value="" disabled>-- Select Team 1 --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.shortName}) — [{getTeamGroup(t)}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Team 2 */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase text-[#111827] tracking-wider">
                    Team 2 (Opponent / Away)
                  </label>
                  <select
                    value={singleMatchTeam2}
                    onChange={(e) => setSingleMatchTeam2(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#D9A928] min-h-[48px]"
                  >
                    <option value="" disabled>-- Select Team 2 --</option>
                    {availableTeam2Options.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.shortName}) — [{getTeamGroup(t)}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Back-to-Back Rest Advisory for Single Match */}
              {lastScheduledMatch && (lastMatchTeamIds.has(singleMatchTeam1) || lastMatchTeamIds.has(singleMatchTeam2)) && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-amber-950 uppercase text-[10px] tracking-wider">
                      Consecutive Match Rest Advisory
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      {lastMatchTeamIds.has(singleMatchTeam1) && lastMatchTeamIds.has(singleMatchTeam2)
                        ? `Both selected teams played in previous Match #${lastScheduledMatch.matchNumber}.`
                        : lastMatchTeamIds.has(singleMatchTeam1)
                        ? `Team "${teams.find((t) => t.id === singleMatchTeam1)?.name}" played in previous Match #${lastScheduledMatch.matchNumber}.`
                        : `Team "${teams.find((t) => t.id === singleMatchTeam2)?.name}" played in previous Match #${lastScheduledMatch.matchNumber}.`}
                      {" "}Tournament scheduling rules recommend giving teams at least 1 match rest to avoid back-to-back fatigue.
                    </span>
                  </div>
                </div>
              )}

              {/* Date & 12-Hour AM/PM Time Selector */}
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-3">
                <span className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">
                  Schedule Date & Time
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase">Date</label>
                    <input
                      type="date"
                      value={singleMatchDate}
                      onChange={(e) => setSingleMatchDate(e.target.value)}
                      className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] min-h-[48px]"
                    />
                  </div>

                  {/* 12-Hour AM/PM Time Picker */}
                  <div>
                    <label className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                      <span>Start Time</span>
                      <span className="text-[#9A6A05] font-black font-mono">
                        {parseInt(singleMatchHour, 10)}:{singleMatchMinute} {singleMatchAmPm}
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {/* Hour */}
                      <select
                        value={singleMatchHour}
                        onChange={(e) => setSingleMatchHour(e.target.value)}
                        className="bg-white border border-[#D1D5DB] rounded-xl px-2 py-2 text-xs font-bold text-[#111827] text-center min-h-[48px]"
                      >
                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                          <option key={h} value={h}>{parseInt(h, 10)}</option>
                        ))}
                      </select>

                      {/* Minute */}
                      <select
                        value={singleMatchMinute}
                        onChange={(e) => setSingleMatchMinute(e.target.value)}
                        className="bg-white border border-[#D1D5DB] rounded-xl px-2 py-2 text-xs font-bold text-[#111827] text-center min-h-[48px]"
                      >
                        {["00", "15", "30", "45"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>

                      {/* AM / PM Toggle */}
                      <button
                        type="button"
                        onClick={() => setSingleMatchAmPm((prev) => prev === "AM" ? "PM" : "AM")}
                        className="bg-white border border-[#D1D5DB] rounded-xl px-2 py-2 text-xs font-black text-[#111827] hover:bg-[#D9A928]/15 hover:border-[#D9A928] transition-colors min-h-[48px]"
                      >
                        {singleMatchAmPm}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overs & Balls Controls */}
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">
                    Match Overs
                  </label>
                  <span className="text-xs font-black text-[#9A6A05]">{singleMatchOvers} Overs Per Innings</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSingleMatchOvers((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-xl bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#111827] font-black text-lg flex items-center justify-center transition-colors min-h-[48px] shrink-0"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={singleMatchOvers}
                    onChange={(e) => setSingleMatchOvers(Math.max(1, parseInt(e.target.value, 10) || 5))}
                    className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-center text-sm font-black text-[#111827] min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setSingleMatchOvers((prev) => Math.min(50, prev + 1))}
                    className="w-12 h-12 rounded-xl bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#111827] font-black text-lg flex items-center justify-center transition-colors min-h-[48px] shrink-0"
                  >
                    +
                  </button>
                </div>

                {/* Quick Overs Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#6B7280] mr-1">Presets:</span>
                  {[1, 3, 5, 7, 10, 20].map((ov) => (
                    <button
                      key={ov}
                      type="button"
                      onClick={() => setSingleMatchOvers(ov)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors min-h-[32px] ${
                        singleMatchOvers === ov
                          ? "bg-[#D9A928] text-black shadow-xs"
                          : "bg-white border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6]"
                      }`}
                    >
                      {ov} ov
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue */}
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">
                  Match Venue
                </label>
                <input
                  type="text"
                  value={singleMatchVenue}
                  onChange={(e) => setSingleMatchVenue(e.target.value)}
                  placeholder="e.g. TPL Cricket Ground"
                  className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] min-h-[48px]"
                />
              </div>

              {scheduleActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                  {scheduleActionError}
                </div>
              )}
            </div>

            {/* Modal Footer (Sticky at Bottom) */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-[#E5E7EB] bg-white grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowSingleMatchModal(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 sm:py-3.5 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSingleMatchSubmit}
                disabled={isScheduleActionLoading || !singleMatchTeam1 || !singleMatchTeam2 || singleMatchTeam1 === singleMatchTeam2}
                className="py-3 sm:py-3.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] disabled:opacity-50 text-[#111111] font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-colors min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating Match...</span>
                  </>
                ) : (
                  <span>Create Match</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE GENERATOR MODAL (9 CROSS-GROUP MATCHES) ─────────────── */}
      {showScheduleGeneratorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-3xl flex flex-col shadow-2xl my-auto max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed/Sticky at Top) */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 sm:px-6 py-4 shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase text-[#111827]">Generate Tournament Schedule</h3>
                <p className="text-xs text-[#6B7280]">9 Cross-Group Matches (Group 1 × Group 2)</p>
              </div>
              <button
                onClick={() => setShowScheduleGeneratorModal(false)}
                disabled={isScheduleActionLoading}
                className="text-[#9CA3AF] hover:text-[#111827] p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors"
                aria-label="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 overscroll-contain">
              {/* Group Exclusion & Zero Back-to-Back Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs font-medium flex flex-col gap-1">
                <div className="flex items-center gap-2 font-black text-[#78350F]">
                  <span className="h-2 w-2 rounded-full bg-[#D9A928] shrink-0" />
                  <span>Zero Back-to-Back Match Policy Enforced</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#92400E] pl-4">
                  Select 6 distinct teams. All 9 fixtures are automatically sequenced such that <strong>no team ever plays back-to-back</strong>, guaranteeing each team at least 1 match rest before playing again.
                </p>
              </div>

              {/* Team Selection Groups (2-col Desktop, 1-col Mobile) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Group 1 */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <span className="text-xs font-black uppercase text-[#9A6A05]">Group 1 (3 Teams)</span>
                    <span className="text-[10px] font-bold text-[#6B7280]">Pool A</span>
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const currentVal = genGroup1Teams[idx] || "";
                    const availableTeams = getAvailableTeamsForSlot(currentVal, "Group 1");

                    return (
                      <div key={`g1-${idx}`}>
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase">
                          Team {idx + 1} (Group 1)
                        </label>
                        <select
                          value={currentVal}
                          onChange={(e) => {
                            const updated = [...genGroup1Teams];
                            updated[idx] = e.target.value;
                            setGenGroup1Teams(updated);
                          }}
                          className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 sm:py-3 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#D9A928] min-h-[44px]"
                        >
                          <option value="">-- Select Group 1 Team {idx + 1} --</option>
                          {availableTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.shortName})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Group 2 */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <span className="text-xs font-black uppercase text-[#111827]">Group 2 (3 Teams)</span>
                    <span className="text-[10px] font-bold text-[#6B7280]">Pool B</span>
                  </div>
                  {[0, 1, 2].map((idx) => {
                    const currentVal = genGroup2Teams[idx] || "";
                    const availableTeams = getAvailableTeamsForSlot(currentVal, "Group 2");

                    return (
                      <div key={`g2-${idx}`}>
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase">
                          Team {idx + 4} (Group 2)
                        </label>
                        <select
                          value={currentVal}
                          onChange={(e) => {
                            const updated = [...genGroup2Teams];
                            updated[idx] = e.target.value;
                            setGenGroup2Teams(updated);
                          }}
                          className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 sm:py-3 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#D9A928] min-h-[44px]"
                        >
                          <option value="">-- Select Group 2 Team {idx + 1} --</option>
                          {availableTeams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.shortName})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match Format & Scheduling Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB]">
                {/* Date */}
                <div>
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase">Match 1 Date</label>
                  <input
                    type="date"
                    value={genStartDate}
                    onChange={(e) => setGenStartDate(e.target.value)}
                    className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] min-h-[44px]"
                  />
                </div>

                {/* 12-Hour AM/PM Start Time Picker */}
                <div>
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase flex items-center justify-between">
                    <span>Start Time</span>
                    <span className="text-[#9A6A05] font-black font-mono">
                      {parseInt(genStartHour, 10)}:{genStartMinute} {genStartAmPm}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {/* Hour */}
                    <select
                      value={genStartHour}
                      onChange={(e) => setGenStartHour(e.target.value)}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1.5 py-2 text-xs font-bold text-[#111827] text-center min-h-[44px]"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                        <option key={h} value={h}>{parseInt(h, 10)}</option>
                      ))}
                    </select>

                    {/* Minute */}
                    <select
                      value={genStartMinute}
                      onChange={(e) => setGenStartMinute(e.target.value)}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1.5 py-2 text-xs font-bold text-[#111827] text-center min-h-[44px]"
                    >
                      {["00", "15", "30", "45"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* AM / PM Toggle */}
                    <button
                      type="button"
                      onClick={() => setGenStartAmPm((prev) => prev === "AM" ? "PM" : "AM")}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1 py-2 text-xs font-black text-[#111827] hover:bg-[#D9A928]/15 hover:border-[#D9A928] transition-colors min-h-[44px]"
                    >
                      {genStartAmPm}
                    </button>
                  </div>
                </div>

                {/* Overs */}
                <div>
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase">Total Overs</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={genOvers}
                    onChange={(e) => setGenOvers(Math.max(1, parseInt(e.target.value, 10) || 5))}
                    className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] min-h-[44px]"
                  />
                </div>

                {/* Interval */}
                <div>
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase">Interval (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    max="120"
                    value={genIntervalMinutes}
                    onChange={(e) => setGenIntervalMinutes(Math.max(15, parseInt(e.target.value, 10) || 45))}
                    className="w-full mt-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#111827] min-h-[44px]"
                  />
                </div>
              </div>

              {/* Fixture Preview Hint */}
              <div className="p-3.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-xs flex items-center justify-between">
                <span>
                  Generates <strong>9 cross-group fixtures</strong> scheduled at <strong>{genIntervalMinutes} min</strong> intervals starting at <strong>{parseInt(genStartHour, 10)}:{genStartMinute} {genStartAmPm}</strong>.
                </span>
              </div>

              {/* Live Fixture Sequence Preview with Zero Back-to-Back Guarantee */}
              {generatedPreviewFixtures.length === 9 && (
                <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-[#111827] tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Sequence Preview (No Back-to-Back Matches)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      Rest Protected ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {generatedPreviewFixtures.map((f) => (
                      <div
                        key={f.matchNum}
                        className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col gap-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-black px-1.5 py-0.5 rounded bg-[#D9A928]/20 text-[#9A6A05]">
                            Match #{String(f.matchNum).padStart(2, "0")}
                          </span>
                          <span className="font-mono font-bold text-[#6B7280]">
                            {f.timeStr}
                          </span>
                        </div>
                        <div className="font-black text-[#111827] text-xs truncate">
                          {f.teamA.shortName} <span className="text-[#9CA3AF] font-normal">vs</span> {f.teamB.shortName}
                        </div>
                        <div className="text-[9px] text-[#6B7280] truncate">
                          <span className="font-bold text-[#4B5563]">Resting: </span>
                          {f.resting.map((r) => r.shortName).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scheduleActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                  {scheduleActionError}
                </div>
              )}
            </div>

            {/* Modal Footer (Sticky at Bottom) */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-[#E5E7EB] bg-white grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowScheduleGeneratorModal(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 sm:py-3.5 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateScheduleSubmit}
                disabled={isScheduleActionLoading}
                className="py-3 sm:py-3.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] disabled:opacity-50 text-[#111111] font-black text-xs uppercase shadow-md flex items-center justify-center gap-2 transition-colors min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating 9 Matches...</span>
                  </>
                ) : (
                  <span>Generate 9 Matches</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PENDING FIXTURES CONFIRMATION MODAL ─────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black uppercase text-[#111827]">Reset Pending Fixtures?</h3>
            </div>
            
            <div className="flex flex-col gap-2.5 text-xs text-[#4B5563] leading-relaxed">
              <p>
                Pending and scheduled tournament fixtures will be deleted.
              </p>
              <p className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold">
                ✓ Completed matches, results, statistics, points, and NRR will be strictly preserved.
              </p>
              {matches.some((m) => m.status === "LIVE") && (
                <p className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold">
                  ⚠️ One or more matches are currently LIVE. Live scoring and active matches will also be preserved.
                </p>
              )}
            </div>

            {scheduleActionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {scheduleActionError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowResetConfirm(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPendingFixtures}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset Pending</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET COMPLETED & LIVE MATCHES CONFIRMATION MODAL ─────────────── */}
      {showResetActiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-amber-300 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-700">
              <RefreshCw className="h-6 w-6 shrink-0 text-amber-600" />
              <h3 className="text-base font-black uppercase text-[#111827]">Reset Completed & Live Matches?</h3>
            </div>
            
            <div className="flex flex-col gap-2.5 text-xs text-[#4B5563] leading-relaxed">
              <p>
                All <strong>LIVE and COMPLETED match data</strong> (ball-by-ball deliveries, innings records, toss selections, and match outcomes) will be reset back to <strong>UPCOMING</strong>.
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold flex flex-col gap-1">
                <span>✓ Match schedule and fixtures are preserved.</span>
                <span>✓ Perfect for restarting tournament testing from scratch.</span>
              </div>
            </div>

            {scheduleActionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {scheduleActionError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowResetActiveModal(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetCompletedAndLiveMatches}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-xs uppercase shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset Matches</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET ALL TOURNAMENT MATCHES MODAL ────────────────────────────── */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-red-300 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black uppercase text-[#111827]">Reset All Matches for Fresh Testing?</h3>
            </div>
            
            <div className="flex flex-col gap-2.5 text-xs text-[#4B5563] leading-relaxed">
              <p>
                This will reset <strong>EVERY match in the tournament</strong> (all scheduled, live, and completed matches) back to fresh UPCOMING status with zeroed scores and cleared ball deliveries.
              </p>
              <p className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 font-bold">
                ⚠️ All live deliveries, innings, toss results, and player match statistics will be permanently wiped for fresh testing.
              </p>
            </div>

            {scheduleActionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {scheduleActionError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setShowResetAllModal(false);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllMatches}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting All...</span>
                  </>
                ) : (
                  <span>Reset All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET SINGLE MATCH MODAL ──────────────────────────────────────── */}
      {matchToResetSingle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-red-300 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <RotateCcw className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-base font-black uppercase text-[#111827]">
                  Reset Match #{String(matchToResetSingle.matchNumber).padStart(2, "0")}?
                </h3>
                <p className="text-[11px] text-[#6B7280] font-bold">
                  {lookup.team(matchToResetSingle.teamAId)?.name || "Team A"} vs {lookup.team(matchToResetSingle.teamBId)?.name || "Team B"}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5 text-xs text-[#4B5563] leading-relaxed">
              <p>
                Are you sure you want to reset this match? All ball-by-ball deliveries, innings records, toss selections, and live/completed scores for <strong>Match #{matchToResetSingle.matchNumber}</strong> will be wiped.
              </p>
              <p className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold">
                ✓ The match will return to scheduled UPCOMING state with its original fixture date and time preserved.
              </p>
            </div>

            {scheduleActionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {scheduleActionError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setScheduleActionError(null);
                  setMatchToResetSingle(null);
                }}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] disabled:opacity-50 text-[#111827] font-bold text-xs uppercase transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSingleMatchSubmit}
                disabled={isScheduleActionLoading}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                {isScheduleActionLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Resetting Match...</span>
                  </>
                ) : (
                  <span>Confirm Reset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE KNOCKOUT MODAL ──────────────────────────────────────── */}
      {showKnockoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-black uppercase text-[#111827]">Schedule Knockout Match</h3>
              <button onClick={() => setShowKnockoutModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {scheduleActionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{scheduleActionError}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#4B5563] uppercase">Knockout Stage</label>
                <select
                  value={knockoutStage}
                  onChange={(e) => setKnockoutStage(e.target.value as any)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827]"
                >
                  <option value="Semi-Final 1">Semi-Final 1 (Match 10)</option>
                  <option value="Semi-Final 2">Semi-Final 2 (Match 11)</option>
                  <option value="Final">The Final (Match 12)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#4B5563] uppercase">Team 1</label>
                <select
                  value={knockoutTeamA}
                  onChange={(e) => setKnockoutTeamA(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827]"
                >
                  <option value="">-- Choose Team 1 --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#4B5563] uppercase">Team 2</label>
                <select
                  value={knockoutTeamB}
                  onChange={(e) => setKnockoutTeamB(e.target.value)}
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827]"
                >
                  <option value="">-- Choose Team 2 --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Back-to-Back Rest Advisory for Knockout */}
              {lastScheduledMatch && (lastMatchTeamIds.has(knockoutTeamA) || lastMatchTeamIds.has(knockoutTeamB)) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    {lastMatchTeamIds.has(knockoutTeamA) && lastMatchTeamIds.has(knockoutTeamB)
                      ? `Both teams played in previous Match #${lastScheduledMatch.matchNumber}.`
                      : lastMatchTeamIds.has(knockoutTeamA)
                      ? `Team "${teams.find((t) => t.id === knockoutTeamA)?.name}" played in previous Match #${lastScheduledMatch.matchNumber}.`
                      : `Team "${teams.find((t) => t.id === knockoutTeamB)?.name}" played in previous Match #${lastScheduledMatch.matchNumber}.`}
                    {" "}Ensure adequate rest time is provided before starting this match.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase">Date</label>
                  <input
                    type="date"
                    value={knockoutDate}
                    onChange={(e) => setKnockoutDate(e.target.value)}
                    className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-[#111827] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase flex items-center justify-between">
                    <span>Start Time</span>
                    <span className="text-[#9A6A05] font-black font-mono">
                      {parseInt(knockoutHour, 10)}:{knockoutMinute} {knockoutAmPm}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <select
                      value={knockoutHour}
                      onChange={(e) => setKnockoutHour(e.target.value)}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1.5 py-2 text-xs font-bold text-[#111827] text-center min-h-[44px]"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                        <option key={h} value={h}>{parseInt(h, 10)}</option>
                      ))}
                    </select>
                    <select
                      value={knockoutMinute}
                      onChange={(e) => setKnockoutMinute(e.target.value)}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1.5 py-2 text-xs font-bold text-[#111827] text-center min-h-[44px]"
                    >
                      {["00", "15", "30", "45"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setKnockoutAmPm((prev) => prev === "AM" ? "PM" : "AM")}
                      className="bg-white border border-[#D1D5DB] rounded-xl px-1 py-2 text-xs font-black text-[#111827] hover:bg-[#D9A928]/15 hover:border-[#D9A928] transition-colors min-h-[44px]"
                    >
                      {knockoutAmPm}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setShowKnockoutModal(false)}
                className="py-2.5 rounded-xl bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleKnockout}
                disabled={!knockoutTeamA || !knockoutTeamB}
                className="py-2.5 rounded-xl bg-[#111827] hover:bg-black disabled:opacity-40 text-white font-black text-xs uppercase shadow-sm"
              >
                Schedule Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT PRINT PREVIEW MODAL ──────────────────────────────────── */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white text-[#111827] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl overflow-hidden border border-[#E5E7EB]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <h3 className="text-base font-black uppercase text-[#111827]">
                  {activeReportModal.replace("_", " ").toUpperCase()}
                </h3>
                <p className="text-[10px] text-[#6B7280] uppercase font-bold">Official Tournament Report</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setActiveReportModal(null)} className="text-[#6B7280] hover:text-[#111827]">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto my-4 text-xs border border-[#E5E7EB] rounded-2xl p-4 bg-[#FAFAF8]">
              {activeReportModal === "reg_master" && (
                <div className="flex flex-col gap-2">
                  <p className="font-black uppercase text-sm mb-2 text-[#111827]">Registration Master List ({players.length} Players)</p>
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] font-black text-[#4B5563]">
                        <th className="py-2">#</th>
                        <th className="py-2">Player Name</th>
                        <th className="py-2">Role</th>
                        <th className="py-2">Reference ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {players.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="py-1.5 font-bold text-[#111827]">{idx + 1}</td>
                          <td className="py-1.5 font-bold text-[#111827]">{p.name}</td>
                          <td className="py-1.5 text-[#4B5563]">{p.role}</td>
                          <td className="py-1.5 font-mono text-[#6B7280]">{p.referenceId || `REF-${p.id.slice(0, 6)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportModal === "auction_results" && (
                <div className="flex flex-col gap-4">
                  <p className="font-black uppercase text-sm text-[#111827]">Official Auction Squad Allocation</p>
                  {teams.map((t) => (
                    <div key={t.id} className="border border-[#E5E7EB] p-3 rounded-xl bg-white shadow-sm">
                      <p className="font-black uppercase text-xs text-[#111827]">{t.name} ({lookup.playersOf(t.id).length} Players)</p>
                      <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 text-[#4B5563]">
                        {lookup.playersOf(t.id).map((tp, idx) => (
                          <div key={tp.id}>
                            {idx + 1}. {tp.name} ({tp.role})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeReportModal !== "reg_master" && activeReportModal !== "auction_results" && (
                <div className="py-12 text-center text-[#6B7280] font-bold">
                  Report compiled successfully with {players.length} registered players and {teams.length} franchises.
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] font-black text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYER PROFILE VIEW & EDIT MODAL ────────────────────────────── */}
      {selectedPlayerForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-[#9A6A05]">Admin Player Management</h3>
                <p className="text-[10px] text-[#6B7280] font-bold">Edit player photo, role, and profile details</p>
              </div>
              <button onClick={() => setSelectedPlayerForView(null)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Player Identity Summary */}
            <div className="flex items-center gap-4 bg-[#F9FAFB] p-3 rounded-2xl border border-[#E5E7EB]">
              <div className="h-16 w-16 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center font-black text-xl text-[#9A6A05] overflow-hidden shrink-0 shadow-xs">
                {editingPlayerAvatar ? (
                  <img src={editingPlayerAvatar} alt="" className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  selectedPlayerForView.name[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-[#111827] truncate">{selectedPlayerForView.name}</h4>
                <p className="text-xs text-[#9A6A05] font-bold">{selectedPlayerForView.role}</p>
                <p className="text-[10px] text-[#6B7280]">{selectedPlayerForView.referenceId || `REF-${selectedPlayerForView.id.slice(0, 6)}`}</p>
              </div>
            </div>

            {/* ── ADMIN PHOTO MANAGEMENT SECTION ── */}
            <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#166534] tracking-wider flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-emerald-600" />
                  Player Photo Management
                </span>
                {avatarUpdateSuccess && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {avatarUpdateSuccess}
                  </span>
                )}
              </div>

              {avatarUpdateError && (
                <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {avatarUpdateError}
                </div>
              )}

              {/* Upload or change controls */}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAvatarUpdateError(null);
                    setAvatarUpdateSuccess(null);
                    try {
                      const dataUrl = await resizeImageToDataUrl(file, 400);
                      setEditingPlayerAvatar(dataUrl);
                    } catch (err: any) {
                      setAvatarUpdateError("Failed to process image file. Please try another image.");
                    }
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUpdatingAvatar}
                    className="tap py-2.5 px-3 rounded-xl bg-white border border-[#86EFAC] text-emerald-900 hover:bg-emerald-50 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (editingPlayerAvatar) {
                        setEditingPlayerAvatar(null);
                      } else {
                        setEditingPlayerAvatar(selectedPlayerForView.avatar || null);
                      }
                      setAvatarUpdateSuccess(null);
                      setAvatarUpdateError(null);
                    }}
                    disabled={isUpdatingAvatar}
                    className="tap py-2.5 px-3 rounded-xl bg-white border border-[#D1D5DB] text-[#4B5563] hover:bg-[#F3F4F6] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#6B7280]" />
                    <span>{editingPlayerAvatar ? "Clear Photo" : "Reset"}</span>
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="url"
                    value={avatarInputUrl}
                    onChange={(e) => setAvatarInputUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    disabled={isUpdatingAvatar}
                    className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-1.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (avatarInputUrl.trim()) {
                        setEditingPlayerAvatar(avatarInputUrl.trim());
                        setAvatarInputUrl("");
                        setAvatarUpdateError(null);
                      }
                    }}
                    disabled={!avatarInputUrl.trim() || isUpdatingAvatar}
                    className="tap px-3 py-1.5 bg-[#111827] text-white rounded-xl text-xs font-black uppercase disabled:opacity-40"
                  >
                    Use URL
                  </button>
                </div>

                {/* Save Avatar Action Button */}
                {editingPlayerAvatar !== (selectedPlayerForView.avatar || null) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedPlayerForView) return;
                      setIsUpdatingAvatar(true);
                      setAvatarUpdateError(null);
                      setAvatarUpdateSuccess(null);
                      try {
                        const targetAvatar = editingPlayerAvatar || "";
                        const updated = await playerRepository.updateAvatar(selectedPlayerForView.id, targetAvatar);
                        setSelectedPlayerForView(updated);
                        queryClient.invalidateQueries({ queryKey: ["players"] });
                        await refetchPlayers();
                        broadcastTournamentUpdate();
                        setAvatarUpdateSuccess("Photo saved successfully!");
                      } catch (err: any) {
                        console.error("[handleUpdateAvatar] error:", err);
                        setAvatarUpdateError(err?.message || "Failed to save photo. Please try again.");
                      } finally {
                        setIsUpdatingAvatar(false);
                      }
                    }}
                    disabled={isUpdatingAvatar}
                    className="tap mt-1 w-full py-2.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {isUpdatingAvatar ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Photo...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Save Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <p className="text-[10px] text-[#6B7280] uppercase font-bold">Assigned Team</p>
                <p className="font-bold text-[#111827] mt-0.5 truncate">
                  {lookup.team(selectedPlayerForView.teamId)?.name || "Unassigned"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <p className="text-[10px] text-[#6B7280] uppercase font-bold">Auction Price</p>
                <p className="font-bold text-[#9A6A05] mt-0.5">
                  {selectedPlayerForView.soldPrice ? `${selectedPlayerForView.soldPrice} LKR` : "Standard"}
                </p>
              </div>
            </div>

            {/* Admin Team Assignment Control */}
            <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#1E40AF] tracking-wider flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  Official Team Assignment
                </span>
                {teamUpdateSuccess && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {teamUpdateSuccess}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={editingPlayerTeamId}
                  onChange={(e) => setEditingPlayerTeamId(e.target.value)}
                  disabled={isUpdatingTeam}
                  className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs font-bold text-[#111827] focus:outline-none min-h-[44px]"
                >
                  <option value="">Unassigned / Free Agent</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shortName || t.groupName || "Team"})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedPlayerForView) return;
                    setIsUpdatingTeam(true);
                    try {
                      const updated = await playerRepository.updateTeam(selectedPlayerForView.id, editingPlayerTeamId || null);
                      setSelectedPlayerForView(updated);
                      queryClient.invalidateQueries({ queryKey: ["players"] });
                      await refetchPlayers();
                      broadcastTournamentUpdate();
                      const teamObj = lookup.team(editingPlayerTeamId);
                      setTeamUpdateSuccess(teamObj ? `Assigned to ${teamObj.shortName || teamObj.name}` : "Set as Unassigned");
                    } catch (err: any) {
                      console.error("[handleUpdatePlayerTeam] error:", err);
                    } finally {
                      setIsUpdatingTeam(false);
                    }
                  }}
                  disabled={isUpdatingTeam || editingPlayerTeamId === (selectedPlayerForView.teamId || "")}
                  className="px-4 py-2 bg-[#1E40AF] hover:bg-blue-900 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl shadow-sm transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {isUpdatingTeam ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Team</span>
                  )}
                </button>
              </div>
            </div>

            {/* Admin Role Edit Control */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#92400E] tracking-wider">
                  Admin Primary Role Assignment
                </span>
                {roleUpdateSuccess && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {roleUpdateSuccess}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={editingPlayerRole}
                  onChange={(e) => setEditingPlayerRole(e.target.value as PlayerRole)}
                  disabled={isUpdatingRole}
                  className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs font-bold text-[#111827] focus:outline-none min-h-[44px]"
                >
                  <option value="Batter">Batter</option>
                  <option value="Bowler">Bowler</option>
                  <option value="Wicketkeeper">Wicketkeeper</option>
                  <option value="All-rounder">All-rounder</option>
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedPlayerForView) return;
                    setIsUpdatingRole(true);
                    try {
                      const updated = await playerRepository.updateRole(selectedPlayerForView.id, editingPlayerRole);
                      setSelectedPlayerForView(updated);
                      queryClient.invalidateQueries({ queryKey: ["players"] });
                      await refetchPlayers();
                      broadcastTournamentUpdate();
                      setRoleUpdateSuccess(`Updated to ${editingPlayerRole}`);
                    } catch (err: any) {
                      console.error("[handleUpdatePlayerRole] error:", err);
                    } finally {
                      setIsUpdatingRole(false);
                    }
                  }}
                  disabled={isUpdatingRole || editingPlayerRole === selectedPlayerForView.role}
                  className="px-4 py-2 bg-[#111827] hover:bg-black disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl shadow-sm transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  {isUpdatingRole ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Role</span>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayerForView(null)}
              className="w-full py-3 rounded-xl bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] font-bold text-xs uppercase mt-1"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* ── ADD NEW PLAYER MODAL ────────────────────────────────────────── */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-[#9A6A05] flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add New Tournament Player
                </h3>
                <p className="text-[10px] text-[#6B7280] font-bold">Register new player to tournament directory or assign to squad</p>
              </div>
              <button
                onClick={() => {
                  if (!isCreatingPlayer) setShowAddPlayerModal(false);
                }}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createPlayerSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p>{createPlayerSuccess}</p>
              </div>
            )}

            {createPlayerError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <p>{createPlayerError}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="flex flex-col gap-3 text-xs">
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-[#4B5563] uppercase">
                  Player Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Mohamed Akeel"
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-xs text-[#111827] font-bold focus:outline-none focus:border-[#D9A928] min-h-[44px]"
                />
              </div>

              {/* Role & Team Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase">Primary Playing Role</label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs font-bold text-[#111827] focus:outline-none min-h-[44px]"
                  >
                    <option value="Batter">Batter</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-rounder">All-rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase">Initial Team Assignment</label>
                  <select
                    value={newPlayerTeamId}
                    onChange={(e) => setNewPlayerTeamId(e.target.value)}
                    className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs font-bold text-[#111827] focus:outline-none min-h-[44px]"
                  >
                    <option value="">Unassigned Pool / Free Agent</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.shortName || t.groupName || "Team"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference ID & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase">Reference ID</label>
                  <input
                    type="text"
                    value={newPlayerReferenceId}
                    onChange={(e) => setNewPlayerReferenceId(e.target.value)}
                    placeholder="e.g. TPL-090"
                    className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs font-mono text-[#111827] min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#4B5563] uppercase">Phone / Contact (Optional)</label>
                  <input
                    type="tel"
                    value={newPlayerPhone}
                    onChange={(e) => setNewPlayerPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#111827] min-h-[44px]"
                  />
                </div>
              </div>

              {/* Sold Price */}
              <div>
                <label className="text-[10px] font-bold text-[#4B5563] uppercase">Auction Sold Price (LKR, Optional)</label>
                <input
                  type="number"
                  min="0"
                  value={newPlayerSoldPrice}
                  onChange={(e) => setNewPlayerSoldPrice(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full mt-1 bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-3 py-2 text-xs text-[#111827] min-h-[44px]"
                />
              </div>

              {/* Photo Upload & Preview Section */}
              <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-2.5">
                <span className="text-[10px] font-black uppercase text-[#166534] tracking-wider flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-emerald-600" />
                  Player Profile Photo (Optional)
                </span>

                <input
                  type="file"
                  ref={newPlayerFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await resizeImageToDataUrl(file, 400);
                      setNewPlayerAvatar(dataUrl);
                    } catch {
                      setCreatePlayerError("Failed to process image. Please try another image.");
                    }
                  }}
                />

                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center font-black text-lg text-[#9A6A05] overflow-hidden shrink-0 shadow-xs">
                    {newPlayerAvatar ? (
                      <img src={newPlayerAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-[#9CA3AF]" />
                    )}
                  </div>

                  <div className="flex flex-1 gap-2">
                    <button
                      type="button"
                      onClick={() => newPlayerFileInputRef.current?.click()}
                      className="tap flex-1 py-2 px-3 rounded-xl bg-white border border-[#86EFAC] text-emerald-900 hover:bg-emerald-50 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Upload</span>
                    </button>
                    {newPlayerAvatar && (
                      <button
                        type="button"
                        onClick={() => setNewPlayerAvatar(null)}
                        className="tap py-2 px-3 rounded-xl bg-white border border-[#D1D5DB] text-red-600 hover:bg-red-50 text-xs font-black uppercase"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="url"
                    value={newPlayerAvatarUrl}
                    onChange={(e) => setNewPlayerAvatarUrl(e.target.value)}
                    placeholder="Or paste photo URL..."
                    className="flex-1 bg-white border border-[#D1D5DB] rounded-xl px-3 py-1.5 text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPlayerAvatarUrl.trim()) {
                        setNewPlayerAvatar(newPlayerAvatarUrl.trim());
                        setNewPlayerAvatarUrl("");
                      }
                    }}
                    disabled={!newPlayerAvatarUrl.trim()}
                    className="tap px-3 py-1.5 bg-[#111827] text-white rounded-xl text-xs font-black uppercase disabled:opacity-40"
                  >
                    Set URL
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                disabled={isCreatingPlayer}
                className="py-3 rounded-xl bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB] font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newPlayerName.trim()) {
                    setCreatePlayerError("Player name is required.");
                    return;
                  }
                  setIsCreatingPlayer(true);
                  setCreatePlayerError(null);
                  setCreatePlayerSuccess(null);

                  try {
                    const created = await playerRepository.createPlayer({
                      name: newPlayerName.trim(),
                      role: newPlayerRole,
                      teamId: newPlayerTeamId || null,
                      avatar: newPlayerAvatar || null,
                      phone: newPlayerPhone.trim() || null,
                      referenceId: newPlayerReferenceId.trim() || null,
                      soldPrice: newPlayerSoldPrice ? Number(newPlayerSoldPrice) : null,
                    });

                    queryClient.invalidateQueries({ queryKey: ["players"] });
                    await refetchPlayers();
                    broadcastTournamentUpdate();
                    setCreatePlayerSuccess(`Player "${created.name}" created successfully!`);
                    setTimeout(() => {
                      setShowAddPlayerModal(false);
                    }, 1200);
                  } catch (err: any) {
                    console.error("[handleAddPlayerSubmit] error:", err);
                    setCreatePlayerError(err?.message || "Failed to create player.");
                  } finally {
                    setIsCreatingPlayer(false);
                  }
                }}
                disabled={isCreatingPlayer || !newPlayerName.trim()}
                className="py-3 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] disabled:opacity-50 text-[#111111] font-black text-xs uppercase shadow-sm flex items-center justify-center gap-2"
              >
                {isCreatingPlayer ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Adding Player...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Create Player</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
