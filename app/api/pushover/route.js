export async function POST(req) {
  const { message, title = "Notification" } = await req.json();

  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;

  try {
    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: new URLSearchParams({
        token,
        user,
        message,
        title,
      }),
    });

    if (!res.ok) {
      return new Response("Failed to send", { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error("Pushover error:", error);
    return new Response("Server error", { status: 500 });
  }
}
