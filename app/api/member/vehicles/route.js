import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  createSheetsClient,
  getSheetName,
  getSheetRows,
  mapRowsToObjects,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";
import { shouldUseBrowserAuth } from "@/lib/server/authMode";
import {
  normalizeVehicleInput,
  toMemberVehicle,
  VEHICLE_RESOURCE,
} from "@/lib/memberVehicles";

function jsonError(error, status) {
  return NextResponse.json({ success: false, error }, { status });
}

async function requireStrictLineUser(request) {
  const profileUserId = request.headers.get("x-line-profile-user-id");
  const hasBearer = (request.headers.get("authorization") || "").startsWith(
    "Bearer ",
  );

  if (!shouldUseBrowserAuth(request) && profileUserId && !hasBearer) {
    return {
      error: jsonError("กรุณาเข้าสู่ระบบ LINE ใหม่ก่อนจัดการข้อมูลรถ", 401),
    };
  }

  return requireVerifiedLineUser(request);
}

async function getVehicleSheet() {
  const resource = await resolveSheetResource(VEHICLE_RESOURCE);
  const rows = await getSheetRows(resource.sheetId, resource.range);
  return { ...resource, rows };
}

export async function GET(request) {
  const auth = await requireStrictLineUser(request);
  if (auth.error) return auth.error;

  try {
    const { rows } = await getVehicleSheet();
    const vehicles = mapRowsToObjects(rows)
      .filter((row) => row.userId === auth.user.userId)
      .map(toMemberVehicle)
      .filter(
        (vehicle) => vehicle.active && vehicle.vehicle_id && vehicle.plate,
      );

    return NextResponse.json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Failed to load member vehicles:", error);
    return jsonError("ไม่สามารถโหลดข้อมูลรถได้", 500);
  }
}

export async function POST(request) {
  const auth = await requireStrictLineUser(request);
  if (auth.error) return auth.error;

  try {
    const parsed = normalizeVehicleInput(await request.json());
    if (parsed.error) return jsonError(parsed.error, 400);

    const { sheetId, range, rows } = await getVehicleSheet();
    const existingVehicle = mapRowsToObjects(rows).find(
      (row) =>
        row.userId === auth.user.userId &&
        toMemberVehicle(row).active &&
        toMemberVehicle(row).plate === parsed.data.plate,
    );

    if (existingVehicle) {
      return jsonError("ทะเบียนรถนี้มีอยู่แล้ว", 409);
    }

    const now = new Date().toISOString();
    const vehicleId = randomUUID();
    const values = [
      vehicleId,
      auth.user.userId,
      parsed.data.plate,
      parsed.data.brand,
      parsed.data.model,
      "true",
      now,
      now,
    ];
    const sheets = createSheetsClient();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${getSheetName(range, VEHICLE_RESOURCE)}!A:H`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      resource: { values: [values] },
    });

    return NextResponse.json(
      {
        success: true,
        data: toMemberVehicle({
          vehicle_id: vehicleId,
          plate: parsed.data.plate,
          brand: parsed.data.brand,
          model: parsed.data.model,
          active: "true",
          created_at: now,
          updated_at: now,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add member vehicle:", error);
    return jsonError("ไม่สามารถบันทึกข้อมูลรถได้", 500);
  }
}

export async function PUT(request) {
  const auth = await requireStrictLineUser(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const vehicleId = String(body.vehicle_id || "").trim();
    if (!vehicleId) return jsonError("ไม่พบรถที่ต้องการแก้ไข", 400);

    const parsed = normalizeVehicleInput(body);
    if (parsed.error) return jsonError(parsed.error, 400);

    const { sheetId, range, rows } = await getVehicleSheet();
    const data = mapRowsToObjects(rows);
    const rowIndex = data.findIndex(
      (row) => row.vehicle_id === vehicleId && row.userId === auth.user.userId,
    );
    if (rowIndex < 0) return jsonError("ไม่พบรถที่ต้องการแก้ไข", 404);

    const duplicatePlate = data.some(
      (row, index) =>
        index !== rowIndex &&
        row.userId === auth.user.userId &&
        toMemberVehicle(row).active &&
        toMemberVehicle(row).plate === parsed.data.plate,
    );
    if (duplicatePlate) return jsonError("ทะเบียนรถนี้มีอยู่แล้ว", 409);

    const current = toMemberVehicle(data[rowIndex]);
    const updatedAt = new Date().toISOString();
    const values = [
      vehicleId,
      auth.user.userId,
      parsed.data.plate,
      parsed.data.brand,
      parsed.data.model,
      current.active ? "true" : "false",
      current.created_at,
      updatedAt,
    ];
    const sheets = createSheetsClient();
    const sheetRowNumber = rowIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${getSheetName(range, VEHICLE_RESOURCE)}!A${sheetRowNumber}:H${sheetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      resource: { values: [values] },
    });

    return NextResponse.json({
      success: true,
      data: toMemberVehicle({
        vehicle_id: vehicleId,
        plate: parsed.data.plate,
        brand: parsed.data.brand,
        model: parsed.data.model,
        active: current.active ? "true" : "false",
        created_at: current.created_at,
        updated_at: updatedAt,
      }),
    });
  } catch (error) {
    console.error("Failed to update member vehicle:", error);
    return jsonError("ไม่สามารถแก้ไขข้อมูลรถได้", 500);
  }
}
