import { useState, useEffect } from "react";
import { type GraphicState, type ObsCommand, obsHandlerService } from "@/lib/obsHandlerService";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function useObsHandlerReceiver(matchId: string) {
  const [activeGraphic, setActiveGraphic] = useState<GraphicState | null>(() => {
    return obsHandlerService.getActiveGraphic(matchId) || obsHandlerService.getGlobalActiveGraphic();
  });

  useEffect(() => {
    // Immediately load from localStorage
    setActiveGraphic(obsHandlerService.getActiveGraphic(matchId) || obsHandlerService.getGlobalActiveGraphic());

    const channelName = `obs-handler:${matchId}`;

    const handleCommand = (command: ObsCommand) => {
      // Accept commands scoped to this match OR broadcasted globally from OBS Handler
      if (command.matchId && command.matchId !== matchId && command.source !== "OBS_HANDLER") {
        return;
      }
      
      switch (command.eventType) {
        case "SET_GRAPHIC":
        case "SYNC_STATE":
          setActiveGraphic(command.graphicState || null);
          break;
        case "CLEAR_GRAPHIC":
          setActiveGraphic(null);
          break;
      }
    };

    // Cross-tab storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `tpl-obs-graphic:${matchId}` || e.key === "tpl-obs-active-graphic") {
        try {
          setActiveGraphic(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setActiveGraphic(null);
        }
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    // 1. Match-specific BroadcastChannel
    let bc: BroadcastChannel | null = null;
    let bcGlobal: BroadcastChannel | null = null;
    if (typeof window !== "undefined") {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = (event) => {
        handleCommand(event.data);
      };

      bcGlobal = new BroadcastChannel("obs-handler-global");
      bcGlobal.onmessage = (event) => {
        handleCommand(event.data);
      };
    }

    // 2. Supabase Fallback
    let sub: any = null;
    let subGlobal: any = null;
    if (isSupabaseConfigured) {
      sub = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      sub.on("broadcast", { event: "obs_command" }, ({ payload }) => {
        handleCommand(payload);
      }).subscribe();

      subGlobal = supabase.channel("obs-handler-global", {
        config: { broadcast: { self: false } },
      });
      subGlobal.on("broadcast", { event: "obs_command" }, ({ payload }) => {
        handleCommand(payload);
      }).subscribe();
    }

    // 3. Local HTTP Server State Poll (Directly connects OBS Studio CEF <-> Chrome across process boundaries)
    let lastVersion = -1;
    const pollServer = async () => {
      try {
        const res = await fetch(`/api/obs-state?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.version === "number" && data.version !== lastVersion) {
            lastVersion = data.version;
            setActiveGraphic(data.activeGraphic || null);
          }
        }
      } catch {}
    };
    pollServer();
    const pollInterval = setInterval(pollServer, 200);

    // Request initial state on mount
    obsHandlerService.requestSync(matchId);

    // Send periodic heartbeat to notify OBS Handler of active connection
    const sendPulse = () => {
      const pulse: any = {
        commandId: "heartbeat",
        eventType: "OVERLAY_HEARTBEAT",
        matchId,
        timestamp: Date.now(),
        source: "OVERLAY",
      };
      if (bcGlobal) {
        try { bcGlobal.postMessage(pulse); } catch (e) {}
      }
    };
    sendPulse();
    const heartbeatInterval = setInterval(sendPulse, 2000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (bc) bc.close();
      if (bcGlobal) bcGlobal.close();
      if (sub) supabase.removeChannel(sub);
      if (subGlobal) supabase.removeChannel(subGlobal);
    };
  }, [matchId]);

  return { activeGraphic };
}
