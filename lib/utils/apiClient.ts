import { shouldUseBrowserAuth } from "@/lib/utils/authMode";
import { getBrowserAuthUser } from "@/lib/utils/browserAuthUser";

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

  const liffModule = await import("@line/liff");
  const idToken = liffModule.default.getIDToken();

  if (!idToken) {
    throw new Error("LINE session expired. Please sign in again.");
  }

  headers.set("Authorization", `Bearer ${idToken}`);

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
  return fetch(input, { ...init, headers });
}
