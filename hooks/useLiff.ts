import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { shouldUseBrowserAuth } from "@/lib/utils/authMode";
import { debugLog } from "@/lib/utils/debug";
import { getBrowserAuthUser } from "@/lib/utils/browserAuthUser";

let hasInitializedLiff = false;

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
        return;
      }

      if (hasInitializedLiff) {
        return;
      }

      hasInitializedLiff = true;
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      const useBrowserAuth = shouldUseBrowserAuth();

      if (!liffId) {
        if (useBrowserAuth) {
          const mockUser = getBrowserAuthUser();

          debugLog("🧪 Running without LIFF init in local dev mode");
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

      if (useBrowserAuth) {
        const mockUser = getBrowserAuthUser();

        debugLog("🧪 Running in browser auth mode");
        setUser(mockUser);
        setIsLiffReady(true);
        setIsInClient(false);
        setError(null);
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
    if (shouldUseBrowserAuth()) {
      throw new Error("ต้องเปิดผ่าน LIFF บนมือถือก่อน จึงจะส่งข้อความเข้า LINE ได้");
    }

    if (!isLiffReady) {
      throw new Error("LIFF ยังไม่พร้อม");
    }

    try {
      const liffModule = await import("@line/liff");

      if (!liffModule.default.isInClient()) {
        throw new Error("กรุณาเปิดผ่าน LINE แอป เพื่อส่งข้อความเข้าห้องแชท");
      }

      if (!liffModule.default.isLoggedIn()) {
        throw new Error("กรุณาเข้าสู่ระบบ LINE ก่อน");
      }

      await liffModule.default.sendMessages([{ type: "text", text }]);
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("ส่งข้อความไม่สำเร็จ");
    }
  };

  return { error, sendMessage };
}
