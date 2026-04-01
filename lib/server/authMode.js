const isDevMode = process.env.NODE_ENV !== "production";

function getConfiguredAuthMode() {
  const mode = process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE;

  if (mode === "browser" || mode === "liff") {
    return mode;
  }

  return "auto";
}

export function shouldUseBrowserAuth(request) {
  if (!isDevMode) return false;

  const configuredMode = getConfiguredAuthMode();

  if (configuredMode === "browser") return true;
  if (configuredMode === "liff") return false;

  const host = request.headers.get("host") || "";
  const forwardedProto = request.headers.get("x-forwarded-proto") || "http";

  if (host.includes("localhost") && forwardedProto === "http") {
    return true;
  }

  return (
    process.env.DEV_AUTH_BYPASS === "true" || !process.env.NEXT_PUBLIC_LIFF_ID
  );
}
