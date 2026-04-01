type DecodedIdToken = {
  exp?: number;
};

function isExpired(decodedIdToken: DecodedIdToken | null | undefined) {
  if (!decodedIdToken?.exp) {
    return false;
  }

  const expiresAt = decodedIdToken.exp * 1000;
  const refreshBufferMs = 60_000;

  return expiresAt <= Date.now() + refreshBufferMs;
}

export async function ensureFreshLiffSession() {
  const liffModule = await import("@line/liff");
  const liff = liffModule.default;
  const isLoggedIn = liff.isLoggedIn();
  const isInClient = liff.isInClient();
  const idToken = liff.getIDToken();
  const decodedIdToken = liff.getDecodedIDToken?.();
  const hasExpiredToken = isExpired(decodedIdToken);

  if (isLoggedIn && idToken && !hasExpiredToken) {
    return {
      liff,
      isInClient,
      isLoggedIn,
      idToken,
      decodedIdToken,
    };
  }

  if (typeof window !== "undefined") {
    // External browsers can keep a stale LIFF login state with an expired idToken.
    // Force a fresh auth round-trip so subsequent API calls receive a valid token.
    if (isLoggedIn && !isInClient) {
      try {
        liff.logout();
      } catch {
        // Best effort only; login below is the important step.
      }
    }

    liff.login({ redirectUri: window.location.href });
  }

  throw new Error("LINE session expired. Redirecting to sign in again.");
}
