import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { shouldUseBrowserAuth } from "@/lib/utils/authMode";
import { debugLog } from "@/lib/utils/debug";
import { getBrowserAuthUser } from "@/lib/utils/browserAuthUser";
import { ensureFreshLiffSession } from "@/lib/utils/liffSession";

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
        debugLog("[LIFF] init:start", { liffId, useBrowserAuth });
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId,
        });
        const {
          liff,
          isInClient,
          isLoggedIn,
          idToken,
        } = await ensureFreshLiffSession();

        debugLog("[LIFF] init:ready", {
          isInClient,
          isLoggedIn,
          hasIdToken: Boolean(idToken),
          currentUrl: window.location.href,
        });

        setIsLiffReady(true);
        setIsInClient(isInClient);

        if (!isLoggedIn) {
          debugLog("[LIFF] init:login-required");
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const profile = await liff.getProfile();
        const userData = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        };

        debugLog("[LIFF] profile:loaded", {
          userId: profile.userId,
          displayName: profile.displayName,
        });

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
      const {
        liff,
        isInClient,
        isLoggedIn,
        idToken,
      } = await ensureFreshLiffSession();

      debugLog("[LIFF] sendMessages:attempt", {
        text,
        isInClient,
        isLoggedIn,
        hasIdToken: Boolean(idToken),
      });

      if (!isInClient) {
        throw new Error("กรุณาเปิดผ่าน LINE แอป เพื่อส่งข้อความเข้าห้องแชท");
      }

      if (!isLoggedIn) {
        throw new Error("กรุณาเข้าสู่ระบบ LINE ก่อน");
      }

      await liff.sendMessages([{ type: "text", text }]);
      debugLog("[LIFF] sendMessages:success", { text });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      debugLog("[LIFF] sendMessages:error", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("ส่งข้อความไม่สำเร็จ");
    }
  };

  return { error, sendMessage };
}
