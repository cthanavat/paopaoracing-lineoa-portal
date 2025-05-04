// pages/index.js (or a component file)
"use client"; // Ensure this is a client component (Next.js 13+ App Router)

import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";

// Dynamically import LIFF to avoid server-side import

export default function Home() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [isLiffReady, setIsLiffReady] = useState(false);

  // Initialize LIFF
  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID,
        });
        console.log("LIFF initialized successfully");
        setIsLiffReady(true);
      } catch (err) {
        console.error("LIFF initialization failed:", err);
        setError(err.message);
      }
    };

    initializeLiff();

    // Cleanup: Close LIFF window when component unmounts
    return () => {
      import("@line/liff").then((liffModule) => {
        if (liffModule.default.isInClient()) {
          liffModule.default.closeWindow();
        }
      });
    };
  }, []); // Empty dependency array to run once on mount

  // Function to send a message
  const sendMessage = async () => {
    if (!message) {
      alert("Please enter a message");
      return;
    }

    try {
      const liffModule = await import("@line/liff");
      await liffModule.default.sendMessages([
        {
          type: "text",
          text: message,
        },
      ]);
      console.log("Message sent successfully");
      setMessage(""); // Clear input after sending
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>LIFF Message Sender</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter your message"
      />
      <button onClick={sendMessage} disabled={!isLiffReady}>
        Send Message
      </button>
    </div>
  );
}
