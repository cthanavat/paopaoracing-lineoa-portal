import { NextResponse } from "next/server";
import {
  createSheetsClient,
  getAuthorizedEmployeeByUserId,
  getMemberSignupConflict,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";

const ALLOWED_WRITE_RESOURCES = new Set([
  "userLine",
  "attendance",
  "employee_leaves",
]);

function isPlaceholderUser(user) {
  return !user || user.userId === "dev-user" || user.name === "Local Dev";
}

export async function POST(request) {
  const auth = await requireVerifiedLineUser(request);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { resource, newRow } = await request.json();

    if (!resource || !ALLOWED_WRITE_RESOURCES.has(resource) || !newRow) {
      return NextResponse.json(
        { success: false, error: "Invalid write request" },
        { status: 400 },
      );
    }

    const { sheetId, range } = await resolveSheetResource(resource);
    const sheets = createSheetsClient();
    const safeRow = [...newRow];
    let notificationName = auth.user.name || "Employee";

    if (resource === "userLine") {
      if (isPlaceholderUser(auth.user)) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot create member with placeholder development identity",
          },
          { status: 403 },
        );
      }

      const signupConflict = await getMemberSignupConflict({
        userId: auth.user.userId,
        phone: safeRow[2],
      });
      if (signupConflict) {
        const employeeConflict = signupConflict === "employee_record";
        return NextResponse.json(
          {
            success: false,
            error: employeeConflict
              ? "Employee-linked accounts require administrator approval"
              : "Member account already exists",
            code: signupConflict,
          },
          { status: 409 },
        );
      }

      safeRow[4] = auth.user.userId;
      safeRow[5] = "9";
      safeRow[6] = "member";
      notificationName = safeRow[1] || auth.user.name || "Member";
    }

    if (resource === "attendance" || resource === "employee_leaves") {
      const authorization = await getAuthorizedEmployeeByUserId(
        auth.user.userId,
      );

      if (!authorization) {
        return NextResponse.json(
          { success: false, error: "Active employee membership required" },
          { status: 403 },
        );
      }

      const { employee } = authorization;
      safeRow[2] = employee.employee_id;
      notificationName =
        employee.nickname ||
        [employee.firstname, employee.lastname].filter(Boolean).join(" ") ||
        auth.user.name ||
        "Employee";
    }

    // Append data to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: [safeRow],
      },
    });

    // Send Pushover Notification
    try {
      // Get base URL from request headers (works in production)
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("host") || "localhost:3000";
      const baseUrl = `${protocol}://${host}`;

      if (resource === "attendance" && safeRow[7] === "checked_in") {
        const time = safeRow[5];
        await fetch(`${baseUrl}/api/pushover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Check-in: ${notificationName} at ${time}`,
            title: "Employee Check-in",
            token: process.env.PUSHOVER_TOKEN_ADMIN,
          }),
        });
      } else if (resource === "employee_leaves" && safeRow[8] === "Pending") {
        const leaveOption = safeRow[4];
        const days = safeRow[5];
        const reason = safeRow[6];
        const date = safeRow[3];
        await fetch(`${baseUrl}/api/pushover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Leave Request: ${notificationName} - ${leaveOption} (${days} days)\nDate: ${date}\nReason: ${reason}`,
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
