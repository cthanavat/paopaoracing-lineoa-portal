"use client";

import { useEffect } from "react";

export default function DevServiceWorkerReset() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!isLocalhost || !("serviceWorker" in navigator)) {
      return;
    }

    const clearStaleServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }

        // Refresh once after cleanup so localhost stops using stale PWA artifacts.
        if (registrations.length > 0) {
          window.location.reload();
        }
      } catch (error) {
        console.error("Failed to clear stale service workers:", error);
      }
    };

    clearStaleServiceWorkers();
  }, []);

  return null;
}
