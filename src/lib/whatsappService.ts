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
  }
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
  }
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
