"use client";

import { useState, useCallback } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function getInitialPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PermissionState;
}

export function useNotification() {
  const [permission, setPermission] = useState<PermissionState>(getInitialPermission);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported" as const;
    }
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    return result as PermissionState;
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return null;
      }
      // Only notify when page is not visible (user tabbed away)
      if (document.visibilityState === "visible") {
        return null;
      }
      return new Notification(title, options);
    },
    []
  );

  return { permission, requestPermission, notify };
}
