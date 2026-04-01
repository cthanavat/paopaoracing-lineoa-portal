const isDevMode = process.env.NODE_ENV !== "production";

type AuthMode = "auto" | "browser" | "liff";

function getConfiguredAuthMode(): AuthMode {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE;

  if (mode === "browser" || mode === "liff") {
    return mode;
  }

  return "auto";
}

export function shouldUseBrowserAuth() {
  if (!isDevMode) return false;

  const configuredMode = getConfiguredAuthMode();

  if (configuredMode === "browser") return true;
  if (configuredMode === "liff") return false;

  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    window.location.protocol === "http:"
  ) {
    return true;
  }

  return (
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    !process.env.NEXT_PUBLIC_LIFF_ID
  );
}
