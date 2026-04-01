function isRuntimeDebugEnabled() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_DEBUG_LOGS === "true";
  }

  const queryEnabled = new URLSearchParams(window.location.search).get(
    "debugAuth",
  );

  if (queryEnabled === "1" || queryEnabled === "true") {
    window.localStorage.setItem("debug-auth", "true");
    return true;
  }

  if (queryEnabled === "0" || queryEnabled === "false") {
    window.localStorage.removeItem("debug-auth");
    return false;
  }

  return (
    process.env.NEXT_PUBLIC_DEBUG_LOGS === "true" ||
    window.localStorage.getItem("debug-auth") === "true"
  );
}

export function debugLog(...args: unknown[]) {
  if (isRuntimeDebugEnabled()) {
    console.log(...args);
  }
}
