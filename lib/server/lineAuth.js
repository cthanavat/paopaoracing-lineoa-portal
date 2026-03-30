import { NextResponse } from "next/server";

const LINE_VERIFY_ENDPOINT = "https://api.line.me/oauth2/v2.1/verify";
const isDevMode = process.env.NODE_ENV !== "production";
const isDevAuthEnabled =
  isDevMode &&
  (process.env.DEV_AUTH_BYPASS === "true" || !process.env.NEXT_PUBLIC_LIFF_ID);

export async function requireVerifiedLineUser(request) {
  if (isDevAuthEnabled) {
    const userId = request.headers.get("x-dev-auth-user-id");
    const name = request.headers.get("x-dev-auth-name") || "Local Dev";

    if (userId) {
      return {
        user: {
          userId,
          name,
          picture: "",
        },
      };
    }
  }

  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;

  if (!idToken || !clientId) {
    return {
      error: NextResponse.json(
        { success: false, error: "LINE authentication is not configured" },
        { status: 500 },
      ),
    };
  }

  const body = new URLSearchParams({
    id_token: idToken,
    client_id: clientId,
  });

  try {
    const response = await fetch(LINE_VERIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.sub) {
      return {
        error: NextResponse.json(
          { success: false, error: "Invalid LINE session" },
          { status: 401 },
        ),
      };
    }

    return {
      user: {
        userId: result.sub,
        name: result.name || "",
        picture: result.picture || "",
      },
    };
  } catch (error) {
    console.error("Failed to verify LINE token:", error);
    return {
      error: NextResponse.json(
        { success: false, error: "Unable to verify LINE session" },
        { status: 502 },
      ),
    };
  }
}
