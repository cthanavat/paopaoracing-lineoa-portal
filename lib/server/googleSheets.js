import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";
import {
  findActiveEmployeeByUserId,
  findMemberByUserId,
  getMemberRegistrationConflict,
  resolveEmployeeAccess,
} from "@/lib/employeeAccess.mjs";

const CONFIG_CACHE_TTL_MS = 30_000;
let configCache = {
  expiresAt: 0,
  tables: null,
};

function getCredentials() {
  return JSON.parse(
    Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, "base64").toString(),
  );
}

export function createSheetsClient() {
  const auth = new GoogleAuth({
    credentials: getCredentials(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export function mapRowsToObjects(rows = []) {
  if (!rows.length) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });

    return record;
  });
}

export async function getSheetRows(sheetId, range) {
  const sheets = createSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return response.data.values || [];
}

export async function getConfigTables() {
  if (configCache.tables && configCache.expiresAt > Date.now()) {
    return configCache.tables;
  }

  const sheetId = process.env.NEXT_PUBLIC_CONFIG_SHEET_ID;
  const range = process.env.NEXT_PUBLIC_CONFIG_RANGE;

  if (!sheetId || !range) {
    throw new Error("Config sheet is not configured");
  }

  const rows = await getSheetRows(sheetId, range);
  const data = mapRowsToObjects(rows);

  const tables = data.reduce((acc, row) => {
    if (row.tableName) {
      acc[row.tableName] = row;
    }
    return acc;
  }, {});

  configCache = {
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    tables,
  };

  return tables;
}

export async function resolveSheetResource(resource) {
  if (!resource) {
    throw new Error("Missing sheet resource");
  }

  if (resource === "config") {
    const sheetId = process.env.NEXT_PUBLIC_CONFIG_SHEET_ID;
    const range = process.env.NEXT_PUBLIC_CONFIG_RANGE;

    if (!sheetId || !range) {
      throw new Error("Config sheet is not configured");
    }

    return { sheetId, range };
  }

  const config = await getConfigTables();
  const target = config[resource];

  if (!target?.sheetId || !target?.range) {
    throw new Error(`Unknown sheet resource: ${resource}`);
  }

  return {
    sheetId: target.sheetId,
    range: target.range,
  };
}

export async function getMemberByUserId(userId) {
  const { sheetId, range } = await resolveSheetResource("userLine");
  const rows = await getSheetRows(sheetId, range);
  return findMemberByUserId(mapRowsToObjects(rows), userId);
}

export async function getEmployeeByUserId(userId) {
  const { sheetId, range } = await resolveSheetResource("employees");
  const rows = await getSheetRows(sheetId, range);
  return findActiveEmployeeByUserId(mapRowsToObjects(rows), userId);
}

async function getMemberAndEmployeeRows() {
  const [memberRows, employeeRows] = await Promise.all([
    resolveSheetResource("userLine").then(({ sheetId, range }) =>
      getSheetRows(sheetId, range),
    ),
    resolveSheetResource("employees").then(({ sheetId, range }) =>
      getSheetRows(sheetId, range),
    ),
  ]);

  return {
    members: mapRowsToObjects(memberRows),
    employees: mapRowsToObjects(employeeRows),
  };
}

export async function getAuthorizedEmployeeByUserId(userId) {
  const { members, employees } = await getMemberAndEmployeeRows();
  return resolveEmployeeAccess({ members, employees, userId });
}

export async function getMemberSignupConflict({ userId, phone }) {
  const { members, employees } = await getMemberAndEmployeeRows();
  return getMemberRegistrationConflict({ members, employees, userId, phone });
}

export function getSheetName(range, fallback = "Sheet1") {
  if (!range.includes("!")) return fallback;
  return range.split("!")[0];
}
