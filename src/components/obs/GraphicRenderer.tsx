import { useObsMatchStream } from "@/hooks/useObsMatchStream";
import { useObsMatchEvents } from "@/hooks/useObsMatchEvents";
import { useObsHandlerReceiver } from "@/hooks/useObsHandlerReceiver";
import { ObsLayout } from "@/components/obs/ObsLayout";
import { ScoreboardBar } from "@/components/obs/ScoreboardBar";
import { EventAlertOverlay } from "@/components/obs/EventAlertOverlay";
import { MatchResultOverlay } from "@/components/obs/MatchResultOverlay";
import { TeamSquadsGraphic } from "@/components/obs/graphics/TeamSquadsGraphic";
import { PartnershipGraphic } from "@/components/obs/graphics/PartnershipGraphic";
import { UpcomingMatchesGraphic } from "@/components/obs/graphics/UpcomingMatchesGraphic";
import { PlayerAwardsGraphic } from "@/components/obs/graphics/PlayerAwardsGraphic";
import { AdvertisementBreakGraphic } from "@/components/obs/graphics/AdvertisementBreakGraphic";
import { InningsBreakScorecardGraphic } from "@/components/obs/graphics/InningsBreakScorecardGraphic";

interface GraphicRendererProps {
  matchId: string;
  backgroundStreamUrl?: string;
  isPreview?: boolean;
}

export function GraphicRenderer({ matchId, backgroundStreamUrl, isPreview = false }: GraphicRendererProps) {
  const stream = useObsMatchStream(matchId);
  const events = useObsMatchEvents(stream);
  const { activeGraphic } = useObsHandlerReceiver(matchId);

  // 1. Check Handler Overrides (Between Matches graphics have highest priority)
  if (activeGraphic) {
    switch (activeGraphic.type) {
      case "INNINGS_BREAK":
      case "SCORECARD":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <InningsBreakScorecardGraphic stream={stream} transitionType={activeGraphic.payload?.transition} />
          </ObsLayout>
        );
      case "ADVERTISEMENT":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <AdvertisementBreakGraphic payload={activeGraphic.payload} stream={stream} />
          </ObsLayout>
        );
      case "SQUADS":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <TeamSquadsGraphic matchId={matchId} transitionType={activeGraphic.payload?.transition} />
          </ObsLayout>
        );
      case "PARTNERSHIP":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <PartnershipGraphic stream={stream} transitionType={activeGraphic.payload?.transition} />
          </ObsLayout>
        );
      case "UPCOMING":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <UpcomingMatchesGraphic transitionType={activeGraphic.payload?.transition} />
          </ObsLayout>
        );
      case "PLAYER_AWARDS":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <PlayerAwardsGraphic payload={activeGraphic.payload} transitionType={activeGraphic.payload?.transition} />
          </ObsLayout>
        );
      case "MATCH_RESULT":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <MatchResultOverlay stream={stream} />
          </ObsLayout>
        );
      case "SIX":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-six-active",
                type: "SIX",
                priority: 100,
                durationMs: 4000,
                batterName: activeGraphic.payload?.batterName || stream.striker?.name || "BATTER",
                runs: 6,
                balls: 1,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "FOUR":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-four-active",
                type: "FOUR",
                priority: 100,
                durationMs: 4000,
                batterName: activeGraphic.payload?.batterName || stream.striker?.name || "BATTER",
                runs: 4,
                balls: 1,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "WICKET":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-wicket-active",
                type: "WICKET",
                priority: 100,
                durationMs: 4000,
                batterName: activeGraphic.payload?.batterName || stream.striker?.name || "BATTER",
                dismissalType: "OUT",
                dismissalText: "WICKET",
                bowlerName: stream.currentBowler?.name || "BOWLER",
                runs: 0,
                balls: 1,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "NO_BALL":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-noball-active",
                type: "NO_BALL",
                priority: 100,
                durationMs: 4000,
                bowlerName: activeGraphic.payload?.bowlerName || stream.currentBowler?.name || "BOWLER",
                freeHitNext: true,
                runs: 1,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "NEW_BATTER":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-newbatter-active",
                type: "NEW_BATTER",
                priority: 100,
                durationMs: activeGraphic.duration || 4000,
                batterName: activeGraphic.payload?.batterName || stream.striker?.name || "BATTER",
                teamName: activeGraphic.payload?.teamName || stream.battingTeam?.name,
                role: activeGraphic.payload?.role,
                avatar: activeGraphic.payload?.avatar,
                stats: activeGraphic.payload?.stats,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "NEW_BOWLER":
        return (
          <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
            <EventAlertOverlay
              event={{
                id: activeGraphic.payload?.eventId || "handler-newbowler-active",
                type: "NEW_BOWLER",
                priority: 100,
                durationMs: activeGraphic.duration || 4000,
                bowlerName: activeGraphic.payload?.bowlerName || stream.currentBowler?.name || "BOWLER",
                teamName: activeGraphic.payload?.teamName || stream.bowlingTeam?.name,
                role: activeGraphic.payload?.role,
                avatar: activeGraphic.payload?.avatar,
                figures: activeGraphic.payload?.figures,
              }}
            />
            <ScoreboardBar stream={stream} />
          </ObsLayout>
        );
      case "LIVE_SCORE":
        // Fallthrough to standard live view
        break;
      case "IDLE":
        // Pure transparent slate
        return <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview} />;
      default:
        break;
    }
  }

  // 2. Loading state for live match score - keep transparent on live broadcast
  if (stream.loading && isPreview) {
    return (
      <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
        <div className="bg-[#111111]/90 text-white border-t-2 border-[#D9A928] px-6 py-3 rounded-xl max-w-md mx-auto shadow-2xl backdrop-blur-md text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D9A928] animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-[#D9A928]">
              CONNECTING TO TPL BROADCAST STREAM...
            </span>
          </div>
        </div>
      </ObsLayout>
    );
  }

  // 3. If no match is selected or match is upcoming with 0 balls bowled, stay clean and transparent
  if (!matchId || !stream.match || (stream.match.status === "UPCOMING" && (!stream.currentInnings || stream.currentInnings.legalBalls === 0))) {
    return <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview} />;
  }

  // 4. Check Innings Break (1st Innings Completed Showcase)
  if (stream.matchState?.phase === "break") {
    return (
      <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
        <InningsBreakScorecardGraphic stream={stream} />
      </ObsLayout>
    );
  }

  // 5. Check Auto Match Result
  if (stream.isCompleted) {
    return (
      <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
        <MatchResultOverlay stream={stream} />
      </ObsLayout>
    );
  }

  // 6. Normal Live Mode (Scoreboard + Event Queue)
  return (
    <ObsLayout backgroundStreamUrl={backgroundStreamUrl} isPreview={isPreview}>
      <EventAlertOverlay event={events.currentEvent} />
      <ScoreboardBar stream={stream} />
    </ObsLayout>
  );
}
