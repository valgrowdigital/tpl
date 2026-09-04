import { useState } from "react";
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { useScorerAuth, authorizeMatchScorer } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

interface ScorerPinGateProps {
  matchId?: string;
  expectedPin?: string | null;
  matchTitle?: string;
  onSuccess?: () => void;
}

export function ScorerPinGate({
  matchId,
  expectedPin,
  matchTitle = "Scorer Console",
  onSuccess,
}: ScorerPinGateProps) {
  const { loginWithPin } = useScorerAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) return;

    if (matchId) {
      const authorized = authorizeMatchScorer(matchId, cleanPin, expectedPin);
      if (authorized) {
        setError(false);
        onSuccess?.();
        return;
      }
    }

    // Check master passcodes
    if (loginWithPin(cleanPin, matchId ? { matchId } : undefined)) {
      setError(false);
      onSuccess?.();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col items-center text-center">
        {/* Logo & Lock Badge */}
        <div className="relative mb-6">
          <Logo size="lg" />
          <div className="absolute -bottom-2 -right-2 bg-[#D9A928] text-black p-2 rounded-full shadow-md">
            <Lock className="h-4 w-4" />
          </div>
        </div>

        <h1 className="text-xl font-black text-[#111111] uppercase tracking-wide">
          Authorized Scorer Access
        </h1>
        <p className="text-xs text-[#5F6368] font-medium mt-1 mb-6">
          Enter the official TPL Scorer PIN to access {matchTitle}. Public users should use the Public Match Centre.
        </p>

        {error && (
          <div className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Invalid Scorer PIN. Please check with tournament administration.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label htmlFor="scorer-pin" className="block text-[10px] font-black uppercase tracking-widest text-[#5F6368] text-left mb-1.5">
              Scorer PIN
            </label>
            <input
              id="scorer-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              placeholder="Enter PIN (e.g. 2026)"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F5] text-center text-lg font-black tracking-widest text-[#111111] focus:outline-none focus:border-[#D9A928] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!pin}
            className="tap flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#D9A928] hover:bg-[#F4C542] active:bg-[#9A6A05] text-[#111111] font-black text-sm uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
          >
            <span>Unlock Scorer Console</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="w-full border-t border-[#E5E5E5] mt-6 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#5F6368]">
            <ShieldCheck className="h-4 w-4 text-[#D9A928]" />
            <span>Protected Tournament Workflow</span>
          </div>
          <Link
            to="/matches"
            className="text-xs font-bold text-[#D9A928] hover:underline uppercase tracking-wider"
          >
            Return to Public Match Centre
          </Link>
        </div>
      </div>
    </div>
  );
}
