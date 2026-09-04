import { createFileRoute } from "@tanstack/react-router";
import { GraphicRenderer } from "@/components/obs/GraphicRenderer";
import { obsStreamRepository } from "@/lib/obsStreamRepository";
import { obsHandlerService } from "@/lib/obsHandlerService";
import { useMatches } from "@/hooks/useCricketData";
import { useState, useEffect, useMemo } from "react";

export const Route = createFileRoute("/obs/live")({
  component: ObsLiveMasterPage,
});

function ObsLiveMasterPage() {
  const { data: matches = [] } = useMatches();
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => {
    return obsHandlerService.getActiveMatch() || "";
  });
  const [backgroundStreamUrl, setBackgroundStreamUrl] = useState<string | undefined>(undefined);

  // Single Source of Truth: Auto-resolve active match cleanly
  const activeMatchId = useMemo(() => {
    if (selectedMatchId && matches.some((m) => m.id === selectedMatchId)) {
      return selectedMatchId;
    }
    const live = matches.find((m) => m.status === "LIVE") || matches.find((m) => m.status === "READY") || matches[0];
    return live?.id || selectedMatchId || "";
  }, [selectedMatchId, matches]);

  // Keep obsHandlerService active match in sync
  useEffect(() => {
    if (activeMatchId) {
      obsHandlerService.setActiveMatch(activeMatchId);
    }
  }, [activeMatchId]);

  // Listen for match switching via localStorage and poll /api/obs-state
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "tpl-obs-active-match" && e.newValue && e.newValue !== selectedMatchId) {
        setSelectedMatchId(e.newValue);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    const poll = setInterval(async () => {
      const current = obsHandlerService.getActiveMatch();
      if (current && current !== selectedMatchId) {
        setSelectedMatchId(current);
        return;
      }
      try {
        const res = await fetch(`/api/obs-state?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.activeMatchId && data.activeMatchId !== selectedMatchId) {
            setSelectedMatchId(data.activeMatchId);
          }
          if (data?.streamUrl !== undefined) {
            setBackgroundStreamUrl(data.streamUrl || undefined);
          }
        }
      } catch {}
    }, 500);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      clearInterval(poll);
    };
  }, [selectedMatchId]);

  useEffect(() => {
    if (activeMatchId) {
      const url = obsStreamRepository.getStreamUrl(activeMatchId);
      setBackgroundStreamUrl(url || undefined);
    }
  }, [activeMatchId]);

  return <GraphicRenderer matchId={activeMatchId} backgroundStreamUrl={backgroundStreamUrl} />;
}


