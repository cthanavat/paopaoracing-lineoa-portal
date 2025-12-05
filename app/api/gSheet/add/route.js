// app/api/gSheet/add/route.js
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(request) {
  try {
    const { sheetId, range, newRow, nickname } = await request.json();

    if (!sheetId || !range || !newRow) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Set up auth - using service account
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, "base64").toString(),
    );

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Append data to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: [newRow],
      },
    });

    // Send Pushover Notification
    try {
      // Get base URL from request headers (works in production)
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("host") || "localhost:3000";
      const baseUrl = `${protocol}://${host}`;

      // Check if it's a Check-in (newRow has 9 elements, index 7 is "checked_in")
      // newRow: ["", "", employee_id, date, name, time, "", "checked_in", ""]
      if (newRow[7] === "checked_in") {
        const time = newRow[5];
        await fetch(`${baseUrl}/api/pushover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Check-in: ${nickname || newRow[4]} at ${time}`,
            title: "Employee Check-in",
            token: process.env.PUSHOVER_TOKEN_ADMIN,
          }),
        });
      }
      // Check if it's a Leave Request (newRow has 9 elements, index 8 is "Pending" (status))
      // newRow: ["", created_at, employee_id, date, leave_option, days, reason, detail, "Pending"]
      else if (newRow[8] === "Pending") {
        const leaveOption = newRow[4];
        const days = newRow[5];
        const reason = newRow[6];
        const date = newRow[3];
        await fetch(`${baseUrl}/api/pushover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Leave Request: ${nickname || "Employee"} - ${leaveOption} (${days} days)\nDate: ${date}\nReason: ${reason}`,
            title: "Leave Request",
            token: process.env.PUSHOVER_TOKEN_ADMIN,
          }),
        });
      }
    } catch (e) {
      console.error("Failed to send notification:", e);
    }

    return NextResponse.json({
      success: true,
      updatedRows: response.data.updates.updatedRows,
    });
  } catch (error) {
    console.error("Error adding data to sheet:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
