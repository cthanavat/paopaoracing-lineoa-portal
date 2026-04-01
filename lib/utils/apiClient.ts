import { shouldUseBrowserAuth } from "@/lib/utils/authMode";
import { getBrowserAuthUser } from "@/lib/utils/browserAuthUser";
import { debugLog, isDebugEnabled } from "@/lib/utils/debug";
import { ensureFreshLiffSession } from "@/lib/utils/liffSession";

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
      browserUser.displayName,
    );

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  }

  const { idToken } = await ensureFreshLiffSession();

  headers.set("Authorization", `Bearer ${idToken}`);

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
  const headers = await createAuthenticatedHeaders(init?.headers);
  const response = await fetch(input, { ...init, headers });

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
  }

  return response;
}
