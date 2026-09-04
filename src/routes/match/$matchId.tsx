import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMatchStore } from "@/lib/scoring/store";
import { lookup } from "@/lib/repositories";
import { useAdminAuth, isMatchScorerAuthorized } from "@/lib/auth";
import { ScorerPinGate } from "@/components/auth/ScorerPinGate";
import { Logo } from "@/components/brand/Logo";
import { PreMatchScreen } from "@/components/match/PreMatchScreen";
import { PlayingXIScreen } from "@/components/match/PlayingXIScreen";
import { OpenersScreen } from "@/components/match/OpenersScreen";
import { BowlerSelectScreen } from "@/components/match/BowlerSelectScreen";
import { LiveScoringScreen } from "@/components/scoring/LiveScoringScreen";
import { InningsBreakScreen } from "@/components/match/InningsBreakScreen";
import { MatchCompleteScreen } from "@/components/match/MatchCompleteScreen";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/match/$matchId")({
  component: MatchPage,
});

function MatchPage() {
  const { matchId } = Route.useParams();
  const { isAdminAuthenticated } = useAdminAuth();
  const store = useMatchStore(matchId);
  const { match, state, doc, hydrated } = store;
  const [authKey, setAuthKey] = useState(0);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-base font-bold text-foreground">Match not found</p>
        <Link
          to="/matches"
          className="tap inline-flex h-11 items-center rounded-full bg-secondary px-5 text-sm font-bold text-foreground"
        >
          Back to Matches
        </Link>
      </div>
    );
  }

  const teamA = lookup.team(match.teamAId);
  const teamB = lookup.team(match.teamBId);
  const isAuthorized = isAdminAuthenticated || isMatchScorerAuthorized(match.id, match.scorerPin);

  // ── Scorer Protection Gate ───────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <ScorerPinGate
        key={authKey}
        matchId={match.id}
        expectedPin={match.scorerPin}
        matchTitle={`Match #${match.matchNumber} (${teamA?.shortName ?? "Team A"} vs ${teamB?.shortName ?? "Team B"})`}
        onSuccess={() => setAuthKey((prev) => prev + 1)}
      />
    );
  }

  // ── Derive sub-screen from phase ─────────────────────────────────────────
  const phase = state?.phase ?? "setup";

  const hasPlayingXI =
    Object.keys(doc.setup.playingXI).length >= 2 &&
    Object.values(doc.setup.playingXI).every((xi) => xi.playerIds.length >= 2 && xi.playerIds.length <= 11);
  const hasOpeners = !!doc.setup.openers;
  const hasBowler = !!(doc.pendingBowlerIds[0] || state?.innings[0]?.currentBowlerId);

  let screen: "pretoss" | "xi" | "openers" | "bowler" | "scoring" | "break" | "innings2openers" | "complete";

  if (phase === "complete") {
    screen = "complete";
  } else if (phase === "break") {
    screen = "break";
  } else if (phase === "innings2") {
    screen = "scoring";
  } else if (doc.deliveries.length > 0) {
    screen = "scoring";
  } else {
    // setup phase — step-by-step
    if (!doc.setup.battingFirstId) {
      screen = "pretoss";
    } else if (!hasPlayingXI) {
      screen = "xi";
    } else if (!hasOpeners) {
      screen = "openers";
    } else if (!hasBowler) {
      screen = "bowler";
    } else {
      screen = "scoring";
    }
  }

  // ── Minimal top bar for non-scoring screens ───────────────────────────────
  const topBar = screen !== "scoring" && (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <Link to="/home" className="tap grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Logo compact />
        <span className="ml-auto shrink-0 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
          Match #{String(match.matchNumber).padStart(2, "0")}
        </span>
      </div>
    </header>
  );

  // ── Scoring top bar ───────────────────────────────────────────────────────
  const scoringTopBar = screen === "scoring" && (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-background/95 backdrop-blur border-b border-border/60 px-4 py-3">
      <Link to="/home" className="tap grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          TPL 2026 · Match #{match.matchNumber}
        </p>
        <p className="text-sm font-extrabold text-foreground truncate">
          {teamA?.shortName} vs {teamB?.shortName}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Scorer Live</span>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-surface">
      {topBar}
      {scoringTopBar}

      {screen === "pretoss" && <PreMatchScreen match={match} store={store} />}
      {screen === "xi" && <PlayingXIScreen match={match} store={store} />}
      {screen === "openers" && <OpenersScreen match={match} store={store} />}
      {screen === "bowler" && <BowlerSelectScreen match={match} store={store} />}
      {screen === "scoring" && state && <LiveScoringScreen store={store} />}
      {screen === "break" && <InningsBreakScreen match={match} store={store} />}
      {screen === "complete" && state && <MatchCompleteScreen state={state} store={store} />}
    </div>
  );
}
