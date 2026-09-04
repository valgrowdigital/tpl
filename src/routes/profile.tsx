import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useTournamentStats, useMatches } from "@/hooks/useCricketData";
import { useScorerAuth, useAdminAuth, authorizeMatchScorer } from "@/lib/auth";
import {
  User,
  Database,
  ShieldCheck,
  RefreshCw,
  Lock,
  Key,
  ArrowRight,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const stats = useTournamentStats();
  const { data: allMatches = [] } = useMatches();
  const { isAuthenticated, userEmail, loginWithPin, logout, isLoading } = useScorerAuth();
  const { isAdminAuthenticated, adminEmail } = useAdminAuth();
  const navigate = useNavigate();

  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMsg("Please enter your 4-digit Scorer PIN.");
      return;
    }

    // 1. Check master tournament admin passcodes
    const isMaster = ["2026", "tpl2026", "valgrow", "valgrow123", "admin"].includes(
      cleanPin.toLowerCase()
    );

    if (isMaster) {
      loginWithPin(cleanPin);
      navigate({ to: "/scorer" });
      return;
    }

    // 2. Check if the PIN belongs to a specific match
    const matchedMatch = allMatches.find(
      (m) => (m.scorerPin || "").trim() === cleanPin && m.status !== "COMPLETED"
    ) || allMatches.find((m) => (m.scorerPin || "").trim() === cleanPin);

    if (matchedMatch) {
      authorizeMatchScorer(matchedMatch.id, cleanPin, matchedMatch.scorerPin);
      loginWithPin(cleanPin, {
        matchId: matchedMatch.id,
        matchNumber: matchedMatch.matchNumber,
      });
      navigate({
        to: "/match/$matchId",
        params: { matchId: matchedMatch.id },
      });
      return;
    }

    // 3. Reject invalid PIN
    setErrorMsg(`Invalid Scorer PIN "${cleanPin}". Please enter the correct PIN for your match.`);
  };

  return (
    <AppShell title="Scorer Portal">
      <div className="max-w-md mx-auto flex flex-col items-center gap-6 pt-4 pb-16 px-4">
        {/* User / Scorer Avatar */}
        <div className="relative">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#121316] text-[#D9A928] border border-white/10 shadow-lg">
            <User className="h-10 w-10" />
          </div>
          {isAuthenticated && (
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-wide text-[#111111]">
            {isAuthenticated ? "Official Scorer" : "SCORER & OFFICIAL PORTAL"}
          </h1>
          <p className="text-xs text-[#5F6368] font-medium mt-1">
            {isAuthenticated
              ? `Signed in as ${userEmail || "Official Scorer"}`
              : "Enter your match 4-digit PIN or tournament official PIN to unlock live scoring."}
          </p>
        </div>

        {/* ── AUTHENTICATED SCORER VIEW ───────────────────────────────── */}
        {isAuthenticated ? (
          <div className="w-full flex flex-col gap-4">
            {/* Go to Scorer Console CTA */}
            <Link
              to="/scorer"
              className="tap flex items-center justify-between p-5 rounded-2xl bg-[#D9A928] hover:bg-[#F4C542] text-[#111111] font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(217,169,40,0.35)] transition-all group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6" />
                <div className="text-left leading-tight">
                  <p>OPEN SCORER CONSOLE</p>
                  <p className="text-[10px] font-bold text-black/70">Manage & Score Active Matches</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Account Card */}
            <div className="w-full card-surface p-5 flex flex-col gap-4 border border-[#E5E5E5] bg-white rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <span className="text-xs font-bold text-[#5F6368]">Account Status</span>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  PIN Authorized
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5F6368]">Scorer Session</span>
                <span className="text-xs font-mono font-bold text-[#111111]">{userEmail}</span>
              </div>
            </div>

            {/* Database & Sync Status */}
            <div className="w-full card-surface p-5 flex flex-col gap-4 border border-[#E5E5E5] bg-white rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <span className="text-xs font-bold text-[#5F6368] flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#D9A928]" />
                  Tournament Database
                </span>
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded-xl bg-[#F7F7F5] p-3">
                  <p className="text-lg font-black text-[#111111]">
                    {stats.isLoading ? <RefreshCw className="h-4 w-4 mx-auto animate-spin" /> : stats.totalTeams}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#5F6368] mt-0.5">Teams</p>
                </div>
                <div className="rounded-xl bg-[#F7F7F5] p-3">
                  <p className="text-lg font-black text-[#111111]">
                    {stats.isLoading ? <RefreshCw className="h-4 w-4 mx-auto animate-spin" /> : stats.totalPlayers}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#5F6368] mt-0.5">Players</p>
                </div>
                <div className="rounded-xl bg-[#F7F7F5] p-3">
                  <p className="text-lg font-black text-[#111111]">
                    {stats.isLoading ? <RefreshCw className="h-4 w-4 mx-auto animate-spin" /> : stats.totalMatches}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#5F6368] mt-0.5">Matches</p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              className="tap flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-50 transition-all shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out of Scorer Session</span>
            </button>
          </div>
        ) : (
          /* ── PURE SCORER PIN LOGIN FORM ──────────────────────────────── */
          <div className="w-full bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col gap-5">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9A6A05] bg-[#D9A928]/15 px-3 py-1 rounded-full border border-[#D9A928]/30">
                SCORER PIN ENTRY
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PIN Form */}
            <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#5F6368] mb-1.5">
                  Enter 4-Digit Match / Tournament PIN
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5F6368]" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F5] text-center text-lg font-black tracking-widest text-[#111111] focus:outline-none focus:border-[#D9A928] focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!pin || isLoading}
                className="tap mt-1 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] active:bg-[#9A6A05] text-[#111111] font-black text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 min-h-[48px]"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Unlock & Open Scorer Console</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-[#E5E5E5] pt-3 text-center">
              <p className="text-[11px] text-[#5F6368] font-medium">
                Public users can view live scores & scorecards without logging in.
              </p>
            </div>
          </div>
        )}

        {/* ── ADMIN ACCESS ENTRY POINT ─────────────────────────────────── */}
        <div className="w-full card-surface p-5 flex flex-col gap-3.5 border border-[#E5E5E5] bg-white rounded-3xl shadow-md">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-[#121316] text-[#D9A928] flex items-center justify-center shadow-sm">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#111111]">
                  {isAdminAuthenticated ? "TPL Admin Portal" : "Tournament Administration"}
                </p>
                <p className="text-[10px] text-[#5F6368] font-medium">
                  {isAdminAuthenticated ? `Authorized as ${adminEmail}` : "Tournament management, fixtures & reports"}
                </p>
              </div>
            </div>
            {isAdminAuthenticated && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            )}
          </div>

          <Link
            to="/admin"
            className="tap flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[#121316] hover:bg-[#1C1E23] text-white font-black text-xs uppercase tracking-wider transition-all group shadow-sm"
          >
            <span className="text-[#D9A928]">
              {isAdminAuthenticated ? "ADMIN PORTAL →" : "ADMIN LOGIN →"}
            </span>
            <ArrowRight className="h-4 w-4 text-[#D9A928] transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
