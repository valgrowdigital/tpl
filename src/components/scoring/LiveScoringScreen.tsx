import { useState, useEffect } from "react";
import type { MatchStore } from "@/lib/scoring/store";
import { lookup } from "@/lib/repositories";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { BALLS_PER_OVER } from "@/types/cricket";
import { ScoreHeader } from "@/components/scoring/ScoreHeader";
import { BatterPanel } from "@/components/scoring/BatterPanel";
import { BowlerPanel } from "@/components/scoring/BowlerPanel";
import { ScoringButtons } from "@/components/scoring/ScoringButtons";
import { RecentBalls } from "@/components/scoring/RecentBalls";
import { OverSummary } from "@/components/scoring/OverSummary";
import { PartnershipPanel } from "@/components/scoring/Partnership";
import { FallOfWickets } from "@/components/scoring/FallOfWickets";
import { BroadcastControls } from "@/components/scoring/BroadcastControls";
import { UndoBar } from "@/components/scoring/UndoBar";
import { BowlerModal } from "@/components/scoring/BowlerModal";
import { NewBatterModal } from "@/components/scoring/NewBatterModal";
import { AdjustOversModal } from "@/components/scoring/AdjustOversModal";
import { EditBallModal } from "@/components/scoring/EditBallModal";
import { CloudRain, RotateCcw, Edit3 } from "lucide-react";

interface Props {
  store: MatchStore;
}

export function LiveScoringScreen({ store }: Props) {
  const {
    state,
    innings,
    match,
    doc,
    hydrated,
    activeBowlerId,
    activeStrikerId,
    activeNonStrikerId,
    record,
    undo,
    editDelivery,
    setBowler,
    setBatter,
    updateSetup,
    adjustMatchOvers,
  } = store;

  const [manualBowlerModal, setManualBowlerModal] = useState(false);
  const [manualBatterModal, setManualBatterModal] = useState(false);
  const [selectedBatterRole, setSelectedBatterRole] = useState<"striker" | "non-striker">("striker");
  const [oversModalOpen, setOversModalOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any | null>(null);

  // ── Pre-hydration loading state ──
  if (!hydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Restoring match from database…
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          Reconnecting to authoritative scoring state. This only takes a moment.
        </p>
      </div>
    );
  }

  if (!state || !innings || !match) return null;

  const currentInnings = state.innings[state.currentInningsIndex];
  const isChase = state.currentInningsIndex === 1;

  // Determine teams playing XIs
  const bowlingTeamId = innings.bowlingTeamId;
  const bowlingXI =
    state.setup.playingXI[bowlingTeamId]?.playerIds ?? lookup.playersOf(bowlingTeamId).map((p) => p.id);

  const battingTeamId = innings.battingTeamId;
  const battingXI =
    state.setup.playingXI[battingTeamId]?.playerIds ?? lookup.playersOf(battingTeamId).map((p) => p.id);

  // ── Determine batter readiness & modal ──
  const needsBatter = !innings.isComplete && (!activeStrikerId || !activeNonStrikerId);
  const currentBatterRole: "striker" | "non-striker" = !activeStrikerId
    ? "striker"
    : !activeNonStrikerId
    ? "non-striker"
    : selectedBatterRole;

  const isBatterModalOpen = (needsBatter || manualBatterModal) && !innings.isComplete;

  // ── Determine bowler readiness & modal ──
  // needsBowler: over just completed OR opening and no bowler selected yet
  const needsBowlerModal = innings.needsBowler && !activeBowlerId && !innings.isComplete;
  // If a batter is needed first (e.g. after a wicket), we prioritize batter selection then bowler selection,
  // but allow scorer to open either manually without deadlock.
  const isBowlerModalOpen = (needsBowlerModal && !needsBatter) || manualBowlerModal;
  const isOverStart = innings.legalBalls % BALLS_PER_OVER === 0;
  const canChangeBowler = !innings.isComplete && isOverStart;

  // Derive a precise disabled reason for scoring buttons
  let disabledReason: string | null = null;
  if (innings.isComplete) {
    disabledReason = "innings-complete";
  } else if (!activeStrikerId) {
    disabledReason = "striker";
  } else if (!activeNonStrikerId) {
    disabledReason = "non-striker";
  } else if (!activeBowlerId && innings.needsBowler) {
    disabledReason = "bowler";
  }

  const canScore = !disabledReason;
  const canUndo = doc.deliveries.filter((d) => d.inningsIndex === state.currentInningsIndex).length > 0;

  const handleOpenBatterModal = (role?: "striker" | "non-striker") => {
    setSelectedBatterRole(role ?? (!activeStrikerId ? "striker" : "non-striker"));
    setManualBatterModal(true);
  };

  const handleAdjustOvers = (newOvers: number, reason: string) => {
    adjustMatchOvers(newOvers, reason);
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Sticky score header */}
      <div className="sticky top-0 z-30">
        <ScoreHeader innings={innings} matchOvers={innings.maxOvers || match.overs} />
      </div>

      {/* Desktop layout: 2 columns */}
      <div className="flex-1 mx-auto w-full max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:gap-6 lg:px-4 lg:py-6">

          {/* === LEFT COLUMN: Scoring console === */}
          <div className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-4 lg:px-0 lg:pt-0">

            {/* Innings badge & Weather Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {isChase ? "2nd Innings — Chasing" : "1st Innings"}
                </span>
                {isChase && currentInnings?.target && (
                  <span className="text-xs text-muted-foreground font-bold">
                    Target: {currentInnings.target} {currentInnings.isTargetRevised ? "(ARR)" : ""}
                  </span>
                )}
              </div>

              <button
                onClick={() => setOversModalOpen(true)}
                className="tap flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider"
              >
                <CloudRain className="h-3 w-3" />
                <span>Adjust Overs</span>
              </button>
            </div>

            {/* Batters Panel */}
            <BatterPanel
              strikerId={activeStrikerId}
              nonStrikerId={activeNonStrikerId}
              batters={innings.batters}
              onSelectBatter={handleOpenBatterModal}
            />

            {/* Bowler Panel */}
            <BowlerPanel
              bowlerId={activeBowlerId}
              bowlers={innings.bowlers}
              innings={innings}
              canChangeBowler={canChangeBowler}
              onChangeBowler={() => setManualBowlerModal(true)}
            />

            {/* Recent balls (mobile only — desktop shows in right column) */}
            <div className="lg:hidden">
              <RecentBalls balls={innings.recentBalls} />
            </div>

            {/* Scoring buttons */}
            <div className="mt-2">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
                Score Ball
              </p>
              <ScoringButtons
                innings={innings}
                bowlingXI={bowlingXI}
                onRecord={record}
                disabled={!canScore}
                disabledReason={disabledReason}
                onSelectBatter={() => handleOpenBatterModal()}
                onSelectBowler={() => setManualBowlerModal(true)}
              />
            </div>

            {/* Undo & Correction Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full">
                <UndoBar
                  onUndo={undo}
                  canUndo={canUndo}
                  lastBallSummary={innings.recentBalls[innings.recentBalls.length - 1]}
                />
              </div>

              {canUndo && doc.deliveries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEditingDelivery(doc.deliveries[doc.deliveries.length - 1])}
                  className="tap flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-12 px-4 rounded-2xl border border-[#E5E5E5] bg-white text-xs font-black text-[#5F6368] uppercase tracking-wider hover:border-[#D9A928] hover:text-[#111111] transition-colors shadow-2xs cursor-pointer"
                  title="Correct the last recorded delivery"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#D9A928]" />
                  <span>Correct Last Ball</span>
                </button>
              )}
            </div>
          </div>

          {/* === RIGHT COLUMN: Info panels === */}
          <div className="flex flex-col gap-4 px-4 pb-6 lg:w-80 lg:shrink-0 lg:px-0">
            {/* Recent balls (desktop only) */}
            <div className="hidden lg:block">
              <RecentBalls balls={innings.recentBalls} />
            </div>

            {/* Partnership */}
            <PartnershipPanel partnership={innings.partnership} innings={innings} />

            {/* Broadcast Controls */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm mt-4">
              <BroadcastControls matchId={match.id} />
            </div>

            {/* This over */}
            <OverSummary overGroups={innings.overGroups} currentOverOnly={true} />

            {/* Recent overs */}
            {innings.overGroups.length > 1 && (
              <OverSummary overGroups={innings.overGroups} currentOverOnly={false} />
            )}

            {/* Fall of wickets */}
            <FallOfWickets fow={innings.fallOfWickets} />
          </div>
        </div>
      </div>

      {/* New Batter Selection Modal */}
      {isBatterModalOpen && (
        <NewBatterModal
          innings={innings}
          battingXI={battingXI}
          role={currentBatterRole}
          currentStrikerId={activeStrikerId}
          currentNonStrikerId={activeNonStrikerId}
          onSelect={(id) => {
            setBatter(id, currentBatterRole);
            setManualBatterModal(false);

            // Automatically broadcast new incoming batsman overlay on screen
            const player = lookup.player(id);
            const team = lookup.team(innings.battingTeamId);
            if (player && match?.id) {
              obsHandlerService.broadcastState(
                match.id,
                {
                  type: "NEW_BATTER",
                  duration: 4500,
                  payload: {
                    batterName: player.name,
                    teamName: team?.name || "Batting Team",
                    role: player.role && player.role !== "Unspecified" ? player.role : "Player",
                    avatar: player.avatar,
                  },
                },
                "SCORER",
              );
            }
          }}
          onClose={activeStrikerId && activeNonStrikerId ? () => setManualBatterModal(false) : undefined}
        />
      )}

      {/* Bowler Selection Modal */}
      {isBowlerModalOpen && (
        <BowlerModal
          bowlingXI={bowlingXI}
          bowlers={innings.bowlers}
          innings={innings}
          previousBowlerId={innings.previousBowlerId}
          currentBowlerId={activeBowlerId ?? undefined}
          onSelect={(id) => {
            setBowler(id);
            setManualBowlerModal(false);

            // Automatically broadcast new bowler overlay on screen
            const player = lookup.player(id);
            const team = lookup.team(innings.bowlingTeamId);
            if (player && match?.id) {
              obsHandlerService.broadcastState(
                match.id,
                {
                  type: "NEW_BOWLER",
                  duration: 4000,
                  payload: {
                    bowlerName: player.name,
                    teamName: team?.name || "Bowling Team",
                    role: player.role && player.role !== "Unspecified" ? player.role : "Bowler",
                    avatar: player.avatar,
                  },
                },
                "SCORER",
              );
            }
          }}
          onClose={activeBowlerId ? () => setManualBowlerModal(false) : undefined}
          isOverEnd={innings.overGroups.length > 0}
        />
      )}

      {/* Rain Delay / Weather Adjusted Overs modal */}
      <AdjustOversModal
        isOpen={oversModalOpen}
        onClose={() => setOversModalOpen(false)}
        currentOvers={innings.maxOvers || match.overs}
        originalOvers={match.overs}
        completedLegalBalls={innings.legalBalls}
        oversText={innings.oversText}
        isChase={isChase}
        onApply={handleAdjustOvers}
      />

      {/* Edit / Correct Delivery Modal */}
      {editingDelivery && (
        <EditBallModal
          delivery={editingDelivery}
          bowlingXI={bowlingXI}
          battingXI={battingXI}
          onSave={(delivId, patch, auditNote) => {
            editDelivery(delivId, patch);
            if (auditNote) {
              console.log("[TPL SCORING AUDIT]", auditNote, "Time:", new Date().toLocaleTimeString());
            }
            setEditingDelivery(null);
          }}
          onClose={() => setEditingDelivery(null)}
        />
      )}
    </div>
  );
}
