import { useCallback, useEffect, useRef } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getSetting, setSetting, NOTIFIED_IDS } from "@/db";
import { decideNotifications, pendingNotifications } from "@/lib/notifications";
import { todayIsoDate } from "@/lib/format";
import type { NotificationSources } from "@/lib/notifications";

// How often to look again while the app stays open. Long on purpose: nothing
// here changes by the minute, and an app that interrupts every few minutes gets
// its notifications switched off.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// macOS shows at most a handful of notifications at once before collapsing
// them, and a first launch against a year of history could produce dozens.
// Beyond this the rest are still recorded as seen, so the user is not buried
// now and not re-buried on the next launch either.
const MAX_PER_CHECK = 5;

interface UseNotificationsOptions {
  enabled: boolean;
  ready: boolean;
  sources: NotificationSources;
}

export function useNotifications({ enabled, ready, sources }: UseNotificationsOptions) {
  // The sources change on every mutation, and a check is not something to redo
  // because a transaction was edited. Held in a ref so the scheduling effect
  // does not restart every time the data does.
  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  const check = useCallback(async () => {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (!granted) return;

    const pending = pendingNotifications(sourcesRef.current, todayIsoDate());

    const storedIds = await getSetting(NOTIFIED_IDS);
    let seen: string[] = [];
    if (storedIds !== null) {
      try {
        const parsed: unknown = JSON.parse(storedIds);
        if (Array.isArray(parsed)) {
          seen = parsed.filter((id): id is string => typeof id === "string");
        }
      } catch {
        // A corrupted value is not worth failing over; treating it as empty
        // costs one repeated notification, which is better than throwing.
      }
    }

    const { toSend, nextSeen } = decideNotifications(pending, seen);

    for (const notification of toSend.slice(0, MAX_PER_CHECK)) {
      sendNotification({ title: notification.title, body: notification.body });
    }

    // Everything pending is recorded, including what was not shown because of
    // the cap: those facts are still visible inside the app, and announcing
    // them on the next launch would just move the flood, not prevent it.
    await setSetting(NOTIFIED_IDS, JSON.stringify(nextSeen));
  }, []);

  useEffect(() => {
    if (!enabled || !ready) return;

    // A short delay so the first notification does not land while the window is
    // still painting its first frame.
    const initial = setTimeout(() => void check(), 3000);
    const interval = setInterval(() => void check(), CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [enabled, ready, check]);
}
