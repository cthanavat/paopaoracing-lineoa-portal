import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { Buffer } from "buffer";

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
  const sheetId = process.env.NEXT_PUBLIC_CONFIG_SHEET_ID;
  const range = process.env.NEXT_PUBLIC_CONFIG_RANGE;

  if (!sheetId || !range) {
    throw new Error("Config sheet is not configured");
  }

  const rows = await getSheetRows(sheetId, range);
  const data = mapRowsToObjects(rows);

  return data.reduce((tables, row) => {
    if (row.tableName) {
      tables[row.tableName] = row;
    }
    return tables;
  }, {});
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

export async function getEmployeeByUserId(userId) {
  const { sheetId, range } = await resolveSheetResource("employees");
  const rows = await getSheetRows(sheetId, range);
  const data = mapRowsToObjects(rows);

  return (
    data.find((employee) => employee.userId === userId && employee.employee_id) ||
    null
  );
}

export function getSheetName(range, fallback = "Sheet1") {
  if (!range.includes("!")) return fallback;
  return range.split("!")[0];
}
