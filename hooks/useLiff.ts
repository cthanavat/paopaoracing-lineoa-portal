import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

const isDevMode = process.env.NODE_ENV !== "production";
const isDevAuthEnabled =
  isDevMode &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    !process.env.NEXT_PUBLIC_LIFF_ID);

export function useLiff() {
  const {
    setUser,
    setLoadUser,
    setIsLiffReady,
    setIsLiffLoading,
    isLiffReady,
    setIsInClient,
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      if (typeof window === "undefined") {
        console.log("⏸️ Skipping LIFF init - not in browser");
        return;
      }

      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        if (isDevAuthEnabled) {
          const mockUser = {
            userId: process.env.NEXT_PUBLIC_DEV_USER_ID || "dev-user",
            displayName: process.env.NEXT_PUBLIC_DEV_USER_NAME || "Local Dev",
            pictureUrl: "",
            statusMessage: "LIFF bypass mode",
          };

          console.log("🧪 Running without LIFF init in local dev mode");
          setUser(mockUser);
          setIsLiffReady(true);
          setIsInClient(false);
          setError(null);
          setLoadUser(false);
          setIsLiffLoading(false);
          return;
        }

        setUser(null);
        setError("NEXT_PUBLIC_LIFF_ID is missing");
        setLoadUser(false);
        setIsLiffLoading(false);
        return;
      }

      try {
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId,
        });
        setIsLiffReady(true);
        setIsInClient(liffModule.default.isInClient());

        if (!liffModule.default.isLoggedIn()) {
          liffModule.default.login();
          return;
        }

        const profile = await liffModule.default.getProfile();
        const userData = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        };

        window.localStorage.setItem("line-user", JSON.stringify(userData));
        setUser(userData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("LIFF initialization failed:", err);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("line-user");
        }
        setUser(null);
        setError(err.message || "LIFF initialization failed");
      } finally {
        setLoadUser(false);
        setIsLiffLoading(false);
      }
    };

    initLiff();
  }, [setUser, setLoadUser, setIsLiffReady, setIsLiffLoading, setIsInClient]);

  const sendMessage = async (text: string) => {
    if (isDevAuthEnabled) {
      console.log("🧪 Skipping LIFF sendMessages in dev bypass mode:", text);
      return;
    }

    // Just check state, if not ready, simply don't call anything
    if (!isLiffReady) return;

    try {
      const liffModule = await import("@line/liff");

      // If not in LIFF client (e.g. external browser), just return
      if (!liffModule.default.isInClient()) return;

      // If not logged in, just return
      if (!liffModule.default.isLoggedIn()) return;

      await liffModule.default.sendMessages([{ type: "text", text }]);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return { error, sendMessage };
}
