const isDevMode = process.env.NODE_ENV !== "production";
const isDevAuthEnabled =
  isDevMode &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    !process.env.NEXT_PUBLIC_LIFF_ID);

export async function createAuthenticatedHeaders(
  init?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(init);

  if (isDevAuthEnabled) {
    headers.set(
      "x-dev-auth-user-id",
      process.env.NEXT_PUBLIC_DEV_USER_ID || "dev-user",
    );
    headers.set(
      "x-dev-auth-name",
      process.env.NEXT_PUBLIC_DEV_USER_NAME || "Local Dev",
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
