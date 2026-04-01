type DecodedIdToken = {
  exp?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
    "=",
  );

  if (typeof window !== "undefined") {
    return window.atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeIdToken(idToken: string | null) {
  if (!idToken) {
    return null;
  }

  const parts = idToken.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(parts[1])) as DecodedIdToken;
  } catch {
    return null;
  }
}

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
  const decodedIdToken = liff.getDecodedIDToken?.() || decodeIdToken(idToken);
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

export async function refreshExpiredLiffSession() {
  const liffModule = await import("@line/liff");
  const liff = liffModule.default;

  if (typeof window !== "undefined") {
    try {
      if (liff.isLoggedIn() && !liff.isInClient()) {
        liff.logout();
      }
    } catch {
      // Best effort only.
    }

    liff.login({ redirectUri: window.location.href });
  }

  throw new Error("LINE session expired. Redirecting to sign in again.");
}
