export const VEHICLE_RESOURCE = "customer_vehicles";

export function normalizePlate(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizeVehicleInput(input = {}) {
  const plate = normalizePlate(input.plate);
  const brand = String(input.brand || "")
    .trim()
    .replace(/\s+/g, " ");
  const model = String(input.model || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!plate || plate.length > 24) {
    return { error: "กรุณาระบุทะเบียนรถให้ถูกต้อง" };
  }

  if (!brand || brand.length > 80) {
    return { error: "กรุณาระบุยี่ห้อรถให้ถูกต้อง" };
  }

  if (!model || model.length > 80) {
    return { error: "กรุณาระบุรุ่นรถให้ถูกต้อง" };
  }

  return { data: { plate, brand, model } };
}

export function toMemberVehicle(row = {}) {
  return {
    vehicle_id: String(row.vehicle_id || ""),
    plate: normalizePlate(row.plate),
    brand: String(row.brand || "").trim(),
    model: String(row.model || "").trim(),
    active: String(row.active || "true").toLowerCase() !== "false",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}
