// app/api/gSheet/add/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(request) {
  try {
    const { sheetId, range, newRow } = await request.json();
    console.log(sheetId, range, newRow);

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

    const auth = new google.auth.GoogleAuth({
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
