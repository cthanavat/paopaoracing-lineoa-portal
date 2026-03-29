import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

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

      try {
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "",
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
