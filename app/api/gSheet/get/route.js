import { NextResponse } from "next/server";
import {
  getAuthorizedEmployeeByUserId,
  getSheetRows,
  mapRowsToObjects,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";

const ALLOWED_READ_RESOURCES = new Set([
  "config",
  "userLine",
  "history",
  "employees",
  "attendance",
  "employee_leaves",
]);

const OPTIONAL_READ_RESOURCES = new Set(["history", "employee_leaves"]);

const EMPLOYEE_ONLY_RESOURCES = new Set([
  "employees",
  "attendance",
  "employee_leaves",
]);

export async function POST(request) {
  const auth = await requireVerifiedLineUser(request);
  if (auth.error) {
    return auth.error;
  }

  let resource;

  try {
    ({ resource } = await request.json());

    if (!resource || !ALLOWED_READ_RESOURCES.has(resource)) {
      return NextResponse.json(
        { success: false, error: "Invalid sheet resource" },
        { status: 400 },
      );
    }

    let employeeAuthorization = null;
    if (EMPLOYEE_ONLY_RESOURCES.has(resource)) {
      employeeAuthorization = await getAuthorizedEmployeeByUserId(
        auth.user.userId,
      );
      if (!employeeAuthorization) {
        return NextResponse.json(
          { success: false, error: "Active employee membership required" },
          { status: 403 },
        );
      }
    }

    const { sheetId, range } = await resolveSheetResource(resource);
    const rows = await getSheetRows(sheetId, range);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    let data = mapRowsToObjects(rows);

    if (resource === "config") {
      data = data
        .filter((row) => row.tableName)
        .map((row) => ({ tableName: row.tableName }));
    } else if (resource === "userLine" || resource === "history") {
      data = data.filter((row) => row.userId === auth.user.userId);
    } else if (resource === "employees") {
      data = data
        .filter(
          (row) =>
            row.userId === auth.user.userId ||
            String(row.active || "")
              .trim()
              .toLowerCase() === "true",
        )
        .map((row) => {
          if (row.userId === auth.user.userId) return row;
          return {
            employee_id: row.employee_id,
            nickname: row.nickname || row.name || "",
          };
        });
    } else if (resource === "attendance") {
      data = data.filter(
        (row) =>
          row.employee_id === employeeAuthorization?.employee.employee_id,
      );
    } else if (resource === "employee_leaves") {
      data = data.filter(
        (row) =>
          row.employee_id === employeeAuthorization?.employee.employee_id ||
          row.status === "Approved",
      );
    }

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const isMissingResourceError =
      typeof error?.message === "string" &&
      (error.message.includes("Unknown sheet resource:") ||
        error.message.includes("Config sheet is not configured"));

    if (OPTIONAL_READ_RESOURCES.has(resource) && isMissingResourceError) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: error.message,
      });
    }

    console.error("Error fetching sheet data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
