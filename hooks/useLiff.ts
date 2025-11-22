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
      const stored = localStorage.getItem("line-user");
      if (stored) {
        setUser(JSON.parse(stored));
        setLoadUser(false);
        setIsLiffLoading(false);
        // Do not return here, let LIFF init proceed
      }

      try {
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "",
        });
        setIsLiffReady(true);
        setIsInClient(liffModule.default.isInClient());

        const storedAgain = localStorage.getItem("line-user");
        if (storedAgain) {
          if (stored !== storedAgain) {
            setUser(JSON.parse(storedAgain));
          }
        } else {
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
          localStorage.setItem("line-user", JSON.stringify(userData));
          setUser(userData);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("LIFF initialization failed:", err);
        setError(err.message || "LIFF initialization failed");
      } finally {
        setLoadUser(false);
        setIsLiffLoading(false);
      }
    };

    initLiff();
  }, [setUser, setLoadUser, setIsLiffReady, setIsLiffLoading, setIsInClient]);

  const sendMessage = async (text: string) => {
    if (!isLiffReady) {
      throw new Error("LIFF is not initialized");
    }
    try {
      const liffModule = await import("@line/liff");
      await liffModule.default.sendMessages([{ type: "text", text }]);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return { error, sendMessage };
}
