import { NextResponse } from "next/server";
import {
  getEmployeeByUserId,
  getSheetRows,
  mapRowsToObjects,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";
import {
  aggregateMonthlyScores,
  canUseEvaluation,
  isEvaluationSubject,
} from "@/lib/server/evaluation";

async function rowsFor(resource) {
  const { sheetId, range } = await resolveSheetResource(resource);
  return mapRowsToObjects(await getSheetRows(sheetId, range));
}

export async function GET(request) {
  const auth = await requireVerifiedLineUser(request);
  if (auth.error) return auth.error;

  try {
    const [viewer, accessRows] = await Promise.all([
      getEmployeeByUserId(auth.user.userId),
      rowsFor("evaluation_access"),
    ]);
    if (!canUseEvaluation(viewer, accessRows, "can_view_reports")) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์ดูรายงาน" },
        { status: 403 },
      );
    }

    const month =
      new URL(request.url).searchParams.get("month") ||
      new Date()
        .toLocaleDateString("en-CA", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
        })
        .slice(0, 7);
    const [scoreRows, topics, employees] = await Promise.all([
      rowsFor("evaluation_scores"),
      rowsFor("evaluation_topics"),
      rowsFor("employees"),
    ]);
    const activeEmployees = employees.filter(isEvaluationSubject);
    const staffEmployeeIds = new Set(
      activeEmployees.map((item) => item.employee_id),
    );
    const reports = aggregateMonthlyScores(
      scoreRows.filter(
        (row) =>
          row.month_key === month &&
          staffEmployeeIds.has(row.subject_employee_id),
      ),
      topics,
    ).map((report) => ({
      ...report,
      name:
        activeEmployees.find((item) => item.employee_id === report.employeeId)
          ?.nickname || report.employeeId,
    }));

    return NextResponse.json({ success: true, month, reports });
  } catch (error) {
    console.error("Evaluation report failed:", error);
    return NextResponse.json(
      { success: false, error: "โหลดรายงานไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
