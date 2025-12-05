export async function POST(req) {
  const { message, title = "Notification", token } = await req.json();

  // Use provided token or default to CUSTOMER token
  const pushoverToken = token || process.env.PUSHOVER_TOKEN_CUSTOMER;
  const user = process.env.PUSHOVER_USER;

  if (!pushoverToken) {
    console.warn("PUSHOVER_TOKEN is not set. Skipping notification.");
    return Response.json(
      { success: false, error: "No token provided" },
      { status: 400 },
    );
  }

  if (!user) {
    console.warn("PUSHOVER_USER is not set. Skipping notification.");
    return Response.json(
      { success: false, error: "No user configured" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: new URLSearchParams({
        token: pushoverToken,
        user,
        message,
        title,
      }),
    });

    if (!res.ok) {
      console.error(
        "Failed to send Pushover notification:",
        res.status,
        res.statusText,
      );
      return Response.json(
        { success: false, error: "Failed to send notification" },
        { status: 500 },
      );
    } else {
      console.log("Pushover notification sent successfully.");
      return Response.json({ success: true });
    }
  } catch (error) {
    console.error("Error sending Pushover notification:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
