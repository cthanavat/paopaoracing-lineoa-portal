// app/api/attendance/checkout/route.js

import { google } from "googleapis";
import { NextResponse } from "next/server";
import { Buffer } from "buffer";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userId,
      date,
      checkOut,
      workHours,
      sheetId,
      range = "attendance!A:J",
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userId || !date || !checkOut || !workHours || !sheetId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Auth Google Sheets
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, "base64").toString(),
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ดึงข้อมูลทั้งหมด
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json(
        { success: false, error: "No data in attendance sheet" },
        { status: 404 },
      );
    }

    const dataRows = rows.slice(1); // ข้าม header

    // หาแถวที่ตรงกับ date + userId
    const rowIndex = dataRows.findIndex(
      (row) => row[3] === date && row[4] === userId, // D=date, E=userId
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลเช็คอินของวันนี้" },
        { status: 404 },
      );
    }

    // สร้างแถวใหม่ที่จะอัปเดต (H, I, J)
    const updatedRow = [...dataRows[rowIndex]];
    updatedRow[7] = checkOut; // H → checkOut
    updatedRow[8] = "completed"; // I → status
    updatedRow[9] = workHours; // J → workHours

    // อัปเดตแถวนั้นใน Google Sheet
    const sheetRowNumber = rowIndex + 2; // +2 เพราะมี header และเริ่มนับจากแถว 2

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `attendance!A${sheetRowNumber}:J${sheetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [updatedRow],
      },
    });

    return NextResponse.json({ success: true, message: "เช็คเอาท์สำเร็จ" });
  } catch (error) {
    console.error("Checkout API Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
