// app/api/attendance/checkout/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(request) {
  try {
    const { userId, date, checkOut, workHours } = await request.json();

    if (!userId || !date || !checkOut || !workHours) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const sheetId = process.env.NEXT_PUBLIC_CONFIG_SHEET_ID;

    // Set up auth - using service account
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, "base64").toString(),
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Get the current rows from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "attendance!A1:H",
    });

    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return NextResponse.json(
        { success: false, error: "No attendance data found" },
        { status: 404 },
      );
    }

    const dataRows = rows.slice(1);

    // Find the row index in dataRows where date and userId match
    const rowIndex = dataRows.findIndex(
      (row) => row[0] === date && row[1] === userId,
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Attendance record not found" },
        { status: 404 },
      );
    }

    // The actual sheet row number (1-based, first data row is 2)
    const sheetRowNumber = 2 + rowIndex;

    // Update the row with checkOut, status, and workHours
    const updatedRow = [...dataRows[rowIndex]];
    updatedRow[4] = checkOut; // E: checkOut
    updatedRow[5] = "completed"; // F: status
    updatedRow[6] = workHours; // G: workHours

    // Update the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `attendance!A${sheetRowNumber}:H${sheetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in checkout:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
