import { NextResponse } from "next/server";
import {
  getSheetRows,
  mapRowsToObjects,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";

const ALLOWED_READ_RESOURCES = new Set([
  "config",
  "userLine",
  "bill_names",
  "bill_payments",
  "history",
  "employees",
  "attendance",
  "employee_leaves",
]);

const OPTIONAL_READ_RESOURCES = new Set([
  "history",
  "bill_payments",
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

    const { sheetId, range } = await resolveSheetResource(resource);
    const rows = await getSheetRows(sheetId, range);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const data = mapRowsToObjects(rows);

    return NextResponse.json({ success: true, data });
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
