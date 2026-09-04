import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type GraphicType = 
  | "IDLE"
  | "LIVE_SCORE"
  | "FOUR"
  | "SIX"
  | "NO_BALL"
  | "NEW_BATTER"
  | "WICKET"
  | "SQUADS"
  | "PARTNERSHIP"
  | "UPCOMING"
  | "PLAYER_AWARDS"
  | "MATCH_RESULT"
  | "ADVERTISEMENT"
  | "CUSTOM";

export interface GraphicState {
  type: GraphicType;
  payload?: any;
  duration?: number;
}

export interface ObsCommand {
  commandId: string;
  matchId: string;
  eventType: "SET_GRAPHIC" | "CLEAR_GRAPHIC" | "REQUEST_SYNC" | "SYNC_STATE" | "REPLAY_EVENT" | "SWITCH_MATCH";
  timestamp: number;
  source: "SCORER" | "OBS_HANDLER" | "SYSTEM";
  graphicState?: GraphicState;
  eventIdToReplay?: string;
}

const getChannelName = (matchId: string) => `obs-handler:${matchId}`;
const generateCommandId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Persistent Supabase Realtime channel pool to eliminate WebSocket handshake latency
const persistentRealtimeChannels = new Map<string, any>();

function getOrCreatePersistentChannel(channelName: string) {
  if (!isSupabaseConfigured) return null;
  let ch = persistentRealtimeChannels.get(channelName);
  if (!ch) {
    ch = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    ch.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        persistentRealtimeChannels.delete(channelName);
      }
    });
    persistentRealtimeChannels.set(channelName, ch);
  }
  return ch;
}

function broadcastOverRealtime(channelName: string, event: string, payload: any) {
  const ch = getOrCreatePersistentChannel(channelName);
  if (ch) {
    try {
      ch.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch {}
  }
}

export const obsHandlerService = {
  // Sets global active broadcast match
  setActiveMatch(matchId: string, source: "SCORER" | "OBS_HANDLER" | "SYSTEM" = "OBS_HANDLER") {
    const command: ObsCommand = {
      commandId: generateCommandId(),
      matchId,
      eventType: "SWITCH_MATCH",
      timestamp: Date.now(),
      source,
    };

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("tpl-obs-active-match", matchId);
      } catch {}

      // 1. HTTP Server state sync (Reliable cross-process Chrome <-> OBS Studio)
      fetch("/api/obs-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      }).catch(() => {});

      // 2. BroadcastChannel for same-browser instant notification
      try {
        const bc = new BroadcastChannel("obs-handler-global");
        bc.postMessage(command);
        setTimeout(() => bc.close(), 500);
      } catch {}
    }

    // 3. Zero-delay Supabase Realtime dispatch
    broadcastOverRealtime("obs-handler-global", "switch_match", { matchId });
  },

  getActiveMatch(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem("tpl-obs-active-match");
    } catch {
      return null;
    }
  },
  getGlobalActiveGraphic(): GraphicState | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem("tpl-obs-active-graphic");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Broadcaster (Handler or Scorer) pushes state
  broadcastState(matchId: string, graphicState: GraphicState, source: "SCORER" | "OBS_HANDLER" | "SYSTEM" = "OBS_HANDLER") {
    const command: ObsCommand = {
      commandId: generateCommandId(),
      matchId,
      eventType: "SET_GRAPHIC",
      timestamp: Date.now(),
      source,
      graphicState,
    };
    
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`tpl-obs-graphic:${matchId}`, JSON.stringify(graphicState));
        window.localStorage.setItem("tpl-obs-active-graphic", JSON.stringify(graphicState));
      } catch {}

      // 1. HTTP Server state sync (Delivered straight to OBS Studio CEF without relying on shared browser process)
      fetch("/api/obs-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      }).catch(() => {});
      
      try {
        const bc = new BroadcastChannel(getChannelName(matchId));
        bc.postMessage(command);
        setTimeout(() => bc.close(), 500);

        const bcGlobal = new BroadcastChannel("obs-handler-global");
        bcGlobal.postMessage(command);
        setTimeout(() => bcGlobal.close(), 500);
      } catch {}

      if (graphicState.duration && graphicState.duration > 0) {
        setTimeout(() => {
          this.clearGraphic(matchId, source);
        }, graphicState.duration);
      }
    }

    // 2. Zero-delay Realtime broadcast
    broadcastOverRealtime(getChannelName(matchId), "obs_command", command);
    broadcastOverRealtime("obs-handler-global", "obs_command", command);
  },

  // Broadcaster (Handler or Scorer) clears overriding graphics
  clearGraphic(matchId: string, source: "SCORER" | "OBS_HANDLER" | "SYSTEM" = "OBS_HANDLER") {
    const command: ObsCommand = {
      commandId: generateCommandId(),
      matchId,
      eventType: "CLEAR_GRAPHIC",
      timestamp: Date.now(),
      source,
    };
    
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(`tpl-obs-graphic:${matchId}`);
        window.localStorage.removeItem("tpl-obs-active-graphic");
      } catch {}

      // 1. HTTP Server state sync
      fetch("/api/obs-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      }).catch(() => {});

      try {
        const bc = new BroadcastChannel(getChannelName(matchId));
        bc.postMessage(command);
        setTimeout(() => bc.close(), 500);

        const bcGlobal = new BroadcastChannel("obs-handler-global");
        bcGlobal.postMessage(command);
        setTimeout(() => bcGlobal.close(), 500);
      } catch {}
    }

    // 2. Zero-delay Realtime broadcast
    broadcastOverRealtime(getChannelName(matchId), "obs_command", command);
    broadcastOverRealtime("obs-handler-global", "obs_command", command);
  },

  setStreamUrl(streamUrl: string, matchId?: string) {
    if (typeof window !== "undefined") {
      fetch("/api/obs-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "SET_STREAM_URL",
          streamUrl: streamUrl || null,
          matchId,
        }),
      }).catch(() => {});

      try {
        const bc = new BroadcastChannel("obs-stream-sync");
        bc.postMessage({ streamUrl });
        setTimeout(() => bc.close(), 500);
      } catch {}
    }
  },

  getActiveGraphic(matchId: string): GraphicState | null {
    if (typeof window === "undefined" || !matchId) return null;
    try {
      const stored = window.localStorage.getItem(`tpl-obs-graphic:${matchId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Receiver (Browser Source) requests sync when it opens
  requestSync(matchId: string) {
    const command: ObsCommand = {
      commandId: generateCommandId(),
      matchId,
      eventType: "REQUEST_SYNC",
      timestamp: Date.now(),
      source: "SYSTEM",
    };
    if (typeof window !== "undefined") {
      const bc = new BroadcastChannel(getChannelName(matchId));
      bc.postMessage(command);
      bc.close();
    }
    
    broadcastOverRealtime(getChannelName(matchId), "obs_command", command);
  },

  // Broadcaster responds to sync
  syncState(matchId: string, graphicState: GraphicState | null) {
    const command: ObsCommand = {
      commandId: generateCommandId(),
      matchId,
      eventType: "SYNC_STATE",
      timestamp: Date.now(),
      source: "SYSTEM",
      graphicState: graphicState || undefined,
    };
    if (typeof window !== "undefined") {
      const bc = new BroadcastChannel(getChannelName(matchId));
      bc.postMessage(command);
      bc.close();
    }
    
    broadcastOverRealtime(getChannelName(matchId), "obs_command", command);
  }
};
