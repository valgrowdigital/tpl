import type { Match } from "@/types/cricket";

const WA_SETTINGS_KEY = "tpl_whatsapp_settings";
const WA_SENT_EVENTS_KEY = "tpl_whatsapp_sent_events";

export interface WhatsAppSettings {
  serverUrl: string;
  apiKey: string;
  sessionId: string;
  targetChatId: string;
}

export const whatsappSettingsRepository = {
  getSettings(): WhatsAppSettings | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(WA_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveSettings(settings: WhatsAppSettings): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WA_SETTINGS_KEY, JSON.stringify(settings));
  },
};

export const whatsappCacheRepository = {
  hasSent(eventId: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(WA_SENT_EVENTS_KEY);
      const events = raw ? JSON.parse(raw) : [];
      return events.includes(eventId);
    } catch {
      return false;
    }
  },

  markSent(eventId: string): void {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WA_SENT_EVENTS_KEY);
      const events = raw ? JSON.parse(raw) : [];
      if (!events.includes(eventId)) {
        events.push(eventId);
        window.localStorage.setItem(WA_SENT_EVENTS_KEY, JSON.stringify(events));
      }
    } catch {}
  },
};

/**
 * Opens WhatsApp Web/App with pre-filled message text.
 */
export function openWhatsAppShare(message: string, phone?: string): void {
  if (typeof window === "undefined") return;
  const encoded = encodeURIComponent(message);
  const targetUrl = phone
    ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

/**
 * Constructs clean official WhatsApp broadcast text.
 * Strictly includes Public Home Score Card and OBS Live Stream links ONLY.
 * NEVER exposes internal Scorer console URL or PIN.
 */
export function buildMatchWhatsAppMessage(
  match: Match,
  options?: {
    teamAName?: string;
    teamBName?: string;
    timeFormatted?: string;
    numSymbol?: string;
    winnerLine?: string;
    potmText?: string;
    origin?: string;
  }
): string {
  const origin = options?.origin || (typeof window !== "undefined" ? window.location.origin : "https://tpl.valgrowlabs.com");
  const numSymbol = options?.numSymbol || `#${match.matchNumber}`;
  const teamAName = options?.teamAName || "Team A";
  const teamBName = options?.teamBName || "Team B";
  const time = options?.timeFormatted || "Scheduled Time";
  const venue = match.venue || "TPL Cricket Ground";

  if (match.status === "LIVE") {
    return [
      "🔴 TPL 2026 LIVE NOW",
      "",
      `Match ${numSymbol}`,
      `${teamAName} vs ${teamBName}`,
      "",
      `⚡ ${match.overs} Overs Match`,
      `📍 Venue: ${venue}`,
      "",
      "📊 Live Scorecard:",
      `${origin}/home`,
      "",
      "📺 OBS Live Broadcast:",
      `${origin}/obs/live`,
    ].join("\n");
  }

  if (match.status === "COMPLETED") {
    const winnerLine = options?.winnerLine || match.resultText || "MATCH COMPLETED";
    const potm = options?.potmText ? `${options.potmText}\n` : "";
    return [
      "🏆 TPL 2026 — MATCH RESULT",
      "",
      `Match ${numSymbol}`,
      `${teamAName} vs ${teamBName}`,
      "",
      `🏆 Result: ${winnerLine}`,
      "",
      potm,
      "📊 Full Scorecard:",
      `${origin}/home`,
      "",
      "📺 OBS Broadcast:",
      `${origin}/obs/live`,
    ].join("\n");
  }

  // Scheduled / Upcoming Match
  return [
    "🏏 TPL 2026 — Match Scheduled",
    "",
    `Match ${numSymbol}`,
    `${teamAName} vs ${teamBName}`,
    "",
    `⏰ Time: ${time}`,
    `📍 Venue: ${venue}`,
    `⚡ Overs: ${match.overs}`,
    "",
    "📊 Live Scorecard:",
    `${origin}/home`,
    "",
    "📺 OBS Live Broadcast:",
    `${origin}/obs/live`,
  ].join("\n");
}

/**
 * Sends a WhatsApp notification using the configured OpenWA server if active,
 * or opens WhatsApp Web/App directly with the pre-filled message so it never fails.
 */
export async function sendWhatsAppNotification(
  eventId: string,
  message: string
): Promise<{ success: boolean; method: "api" | "direct" }> {
  const settings = whatsappSettingsRepository.getSettings();

  // Try OpenWA API delivery if configured
  if (
    settings &&
    settings.serverUrl &&
    settings.apiKey &&
    settings.sessionId &&
    settings.targetChatId
  ) {
    if (whatsappCacheRepository.hasSent(eventId)) {
      return { success: true, method: "api" };
    }

    try {
      const serverUrl = settings.serverUrl.replace(/\/$/, "");
      const response = await fetch(`${serverUrl}/api/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": settings.apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify({
          chatId: settings.targetChatId,
          text: message,
          session: settings.sessionId,
        }),
      });

      if (response.ok) {
        whatsappCacheRepository.markSent(eventId);
        return { success: true, method: "api" };
      }
    } catch (error: any) {
      console.warn("[WhatsApp Service] API delivery failed, falling back to direct share:", error);
    }
  }

  // Fallback: Directly open WhatsApp Web / App with the pre-formatted match fixture/result
  openWhatsAppShare(message);
  whatsappCacheRepository.markSent(eventId);
  return { success: true, method: "direct" };
}

/**
 * Automatically triggers WhatsApp match live notification when a match starts.
 */
export async function notifyAutoMatchLive(matchId: string): Promise<void> {
  if (typeof window === "undefined" || !matchId) return;
  const eventId = `match-auto-live-${matchId}`;
  if (whatsappCacheRepository.hasSent(eventId)) return;

  try {
    const { lookup } = await import("@/lib/repositories");
    const m = lookup.match(matchId);
    if (!m) return;

    const teamA = lookup.team(m.teamAId);
    const teamB = lookup.team(m.teamBId);
    const teamAName = teamA?.name || "Team 1";
    const teamBName = teamB?.name || "Team 2";
    const numSymbol = `#${String(m.matchNumber).padStart(2, "0")}`;

    const message = buildMatchWhatsAppMessage(
      { ...m, status: "LIVE" },
      {
        teamAName,
        teamBName,
        numSymbol,
      }
    );

    const settings = whatsappSettingsRepository.getSettings();
    if (settings && settings.serverUrl && settings.apiKey && settings.targetChatId) {
      await sendWhatsAppNotification(eventId, message);
    }
  } catch (err) {
    console.warn("[notifyAutoMatchLive] notice:", err);
  }
}
