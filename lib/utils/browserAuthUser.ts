import type { User } from "@/store/useAppStore";

function getFallbackUser(): User {
  return {
    userId: process.env.NEXT_PUBLIC_DEV_USER_ID || "dev-user",
    displayName: process.env.NEXT_PUBLIC_DEV_USER_NAME || "Local Dev",
    pictureUrl: "",
    statusMessage: "Browser auth mode",
  };
}

export function getBrowserAuthUser(): User {
  if (typeof window === "undefined") {
    return getFallbackUser();
  }

  const storedUser = window.localStorage.getItem("line-user");

  if (!storedUser) {
    return getFallbackUser();
  }

  try {
    const parsedUser = JSON.parse(storedUser) as Partial<User>;

    if (parsedUser.userId && parsedUser.displayName) {
      return {
        userId: parsedUser.userId,
        displayName: parsedUser.displayName,
        pictureUrl: parsedUser.pictureUrl || "",
        statusMessage: parsedUser.statusMessage || "Browser auth mode",
      };
    }
  } catch {
    window.localStorage.removeItem("line-user");
  }

  return getFallbackUser();
}
