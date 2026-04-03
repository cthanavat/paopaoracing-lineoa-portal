import { shouldUseBrowserAuth } from "@/lib/utils/authMode";
import {
  getBrowserAuthUser,
  getStoredLineProfile,
} from "@/lib/utils/browserAuthUser";
import { debugLog, isDebugEnabled } from "@/lib/utils/debug";
import {
  ensureFreshLiffSession,
  getLiffSessionSnapshot,
  refreshExpiredLiffSession,
} from "@/lib/utils/liffSession";

function encodeHeaderValue(value?: string) {
  if (!value) return "";
  return encodeURIComponent(value);
}

export async function createAuthenticatedHeaders(
  init?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(init);

  if (shouldUseBrowserAuth()) {
    const browserUser = getBrowserAuthUser();

    headers.set(
      "x-dev-auth-user-id",
      browserUser.userId,
    );
    headers.set(
      "x-dev-auth-name",
      encodeHeaderValue(browserUser.displayName),
    );

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  }

  const storedLineProfile = getStoredLineProfile();

  if (storedLineProfile?.userId) {
    headers.set("x-line-profile-user-id", storedLineProfile.userId);
    headers.set(
      "x-line-profile-name",
      encodeHeaderValue(storedLineProfile.displayName),
    );
  }

  const liffSession = await getLiffSessionSnapshot();

  if (
    liffSession.hasExpiredToken &&
    !liffSession.isInClient &&
    storedLineProfile?.userId
  ) {
    return headers;
  }

  if (!liffSession.idToken || liffSession.hasExpiredToken) {
    const { idToken } = await ensureFreshLiffSession();
    headers.set("Authorization", `Bearer ${idToken}`);
  } else {
    headers.set("Authorization", `Bearer ${liffSession.idToken}`);
  }

  if (isDebugEnabled()) {
    headers.set("x-debug-auth", "true");
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const sendRequest = async () => {
    const headers = await createAuthenticatedHeaders(init?.headers);
    const response = await fetch(input, { ...init, headers });

    return { headers, response };
  };

  const { headers, response } = await sendRequest();

  debugLog("[API] fetch", {
    input: typeof input === "string" ? input : input.toString(),
    method: init?.method || "GET",
    status: response.status,
    hasAuthorization: headers.has("Authorization"),
    isBrowserAuth: shouldUseBrowserAuth(),
  });

  if (response.status === 401) {
    const clonedResponse = response.clone();
    let bodyText = "";

    try {
      bodyText = await clonedResponse.text();
    } catch {
      bodyText = "";
    }

    debugLog("[API] unauthorized", {
      input: typeof input === "string" ? input : input.toString(),
      method: init?.method || "GET",
      body: bodyText,
    });

    if (
      !shouldUseBrowserAuth() &&
      bodyText.includes("IdToken expired.")
    ) {
      await refreshExpiredLiffSession();
    }
  }

  return response;
}
