// app/api/gSheet/get/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(request) {
  try {
    const { sheet } = await request.json();

    if (!sheet || !sheet.sheetId || !sheet.range) {
      return NextResponse.json(
        { success: false, error: "Missing sheet information" },
        { status: 400 },
      );
    }

    // Set up auth - using service account
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, "base64").toString(),
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Get the values from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet.sheetId,
      range: sheet.range,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Convert to JSON with header row as keys
    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
