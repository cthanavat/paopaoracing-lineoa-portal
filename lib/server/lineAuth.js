import { NextResponse } from "next/server";
import { shouldUseBrowserAuth } from "@/lib/server/authMode";

const LINE_VERIFY_ENDPOINT = "https://api.line.me/oauth2/v2.1/verify";

function decodeHeaderValue(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getProfileHeaderUser(request) {
  const userId = request.headers.get("x-line-profile-user-id");
  const name =
    decodeHeaderValue(request.headers.get("x-line-profile-name")) ||
    "LINE User";

  if (!userId) {
    return null;
  }

  return {
    userId,
    name,
    picture: "",
  };
}

export async function requireVerifiedLineUser(request) {
  const isDebugAuth = request.headers.get("x-debug-auth") === "true";

  if (shouldUseBrowserAuth(request)) {
    const userId = request.headers.get("x-dev-auth-user-id");
    const name =
      decodeHeaderValue(request.headers.get("x-dev-auth-name")) ||
      "Local Dev";

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
  const profileHeaderUser = getProfileHeaderUser(request);

  if (!authHeader.startsWith("Bearer ")) {
    if (profileHeaderUser) {
      return {
        user: profileHeaderUser,
      };
    }

    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          ...(isDebugAuth
            ? {
                debug: {
                  reason: "missing_bearer",
                  hasAuthorizationHeader: Boolean(authHeader),
                },
              }
            : {}),
        },
        { status: 401 },
      ),
    };
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;

  if (!idToken || !clientId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "LINE authentication is not configured",
          ...(isDebugAuth
            ? {
                debug: {
                  reason: "missing_runtime_config",
                  hasIdToken: Boolean(idToken),
                  hasClientId: Boolean(clientId),
                  clientId: clientId || null,
                },
              }
            : {}),
        },
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
      if (profileHeaderUser) {
        return {
          user: profileHeaderUser,
        };
      }

      return {
        error: NextResponse.json(
          {
            success: false,
            error: "Invalid LINE session",
            ...(isDebugAuth
              ? {
                  debug: {
                    reason: "line_verify_failed",
                    clientId,
                    verifyStatus: response.status,
                    verifyOk: response.ok,
                    hasSub: Boolean(result?.sub),
                    verifyResult: result,
                  },
                }
              : {}),
          },
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
        {
          success: false,
          error: "Unable to verify LINE session",
          ...(isDebugAuth
            ? {
                debug: {
                  reason: "line_verify_exception",
                  clientId,
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              }
            : {}),
        },
        { status: 502 },
      ),
    };
  }
}
