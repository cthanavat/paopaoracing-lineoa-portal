import { NextResponse } from "next/server";
import {
  createSheetsClient,
  getEmployeeByUserId,
  getSheetRows,
  getSheetName,
  mapRowsToObjects,
  resolveSheetResource,
} from "@/lib/server/googleSheets";
import { requireVerifiedLineUser } from "@/lib/server/lineAuth";
import {
  canUseEvaluation,
  getWeekContext,
  isEvaluationSubject,
  isTruthy,
  validateScores,
} from "@/lib/server/evaluation";

async function loadResource(name) {
  const { sheetId, range } = await resolveSheetResource(name);
  return {
    sheetId,
    range,
    rows: mapRowsToObjects(await getSheetRows(sheetId, range)),
  };
}

async function getContext(request, permission = "can_evaluate") {
  const auth = await requireVerifiedLineUser(request);
  if (auth.error) return { error: auth.error };

  const [employee, accessData] = await Promise.all([
    getEmployeeByUserId(auth.user.userId),
    loadResource("evaluation_access"),
  ]);
  if (!canUseEvaluation(employee, accessData.rows, permission)) {
    return {
      error: NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์ใช้งานแบบประเมิน" },
        { status: 403 },
      ),
    };
  }
  return { employee };
}

function hasCheckedOut(attendanceRows, employeeId, date) {
  return attendanceRows.some(
    (row) =>
      row.employee_id === employeeId &&
      row.date === date &&
      Boolean(String(row.checkOut || "").trim()),
  );
}

export async function GET(request) {
  try {
    const context = await getContext(request);
    if (context.error) return context.error;

    const [
      employeesData,
      topicsData,
      assignmentsData,
      submissionsData,
      scoresData,
      attendanceData,
    ] = await Promise.all([
      loadResource("employees"),
      loadResource("evaluation_topics"),
      loadResource("evaluation_assignments"),
      loadResource("evaluation_submissions"),
      loadResource("evaluation_scores"),
      loadResource("attendance"),
    ]);

    const week = getWeekContext();
    const employees = employeesData.rows
      .filter(
        (item) =>
          isEvaluationSubject(item) &&
          item.employee_id !== context.employee.employee_id,
      )
      .map((item) => ({
        employeeId: item.employee_id,
        name:
          item.nickname ||
          [item.firstname, item.lastname].filter(Boolean).join(" ") ||
          item.employee_id,
        role: item.role || "",
      }));
    const assignments = assignmentsData.rows.filter((item) =>
      isTruthy(item.active),
    );
    const topics = topicsData.rows
      .filter((item) => isTruthy(item.active))
      .filter(
        (topic) =>
          topic.type !== "individual" ||
          assignments.some(
            (item) =>
              item.employee_id !== context.employee.employee_id &&
              item.topic_id === topic.topic_id,
          ),
      )
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((topic) => ({
        topicId: topic.topic_id,
        title: topic.title,
        description: topic.description || "",
        type: topic.type || "common",
        employeeIds:
          topic.type === "individual"
            ? assignments
                .filter((item) => item.topic_id === topic.topic_id)
                .map((item) => item.employee_id)
            : employees.map((item) => item.employeeId),
      }));

    const submission = submissionsData.rows.find(
      (item) =>
        item.week_key === week.weekKey &&
        item.evaluator_employee_id === context.employee.employee_id,
    );
    const existingScores = submission
      ? scoresData.rows
          .filter((item) => item.submission_id === submission.submission_id)
          .map((item) => ({
            employeeId: item.subject_employee_id,
            topicId: item.topic_id,
            score: item.score ? Number(item.score) : null,
            note: item.note || "",
            answered: true,
          }))
      : [];
    const locked = hasCheckedOut(
      attendanceData.rows,
      context.employee.employee_id,
      week.today,
    );

    return NextResponse.json({
      success: true,
      evaluator: {
        employeeId: context.employee.employee_id,
        name:
          context.employee.nickname ||
          context.employee.firstname ||
          "ผู้ประเมิน",
      },
      week,
      employees,
      topics,
      existingScores,
      status: submission?.status || "draft",
      locked,
    });
  } catch (error) {
    console.error("Evaluation GET failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ยังไม่ได้ตั้งค่า Google Sheets สำหรับระบบประเมิน",
      },
      { status: 503 },
    );
  }
}

export async function POST(request) {
  try {
    const context = await getContext(request);
    if (context.error) return context.error;

    const payload = await request.json();
    const [
      employeesData,
      topicsData,
      assignmentsData,
      submissionsData,
      scoresData,
      attendanceData,
    ] = await Promise.all([
      loadResource("employees"),
      loadResource("evaluation_topics"),
      loadResource("evaluation_assignments"),
      loadResource("evaluation_submissions"),
      loadResource("evaluation_scores"),
      loadResource("attendance"),
    ]);
    const week = getWeekContext();
    if (!week.isFriday) {
      return NextResponse.json(
        { success: false, error: "ส่งแบบประเมินได้เฉพาะวันศุกร์" },
        { status: 409 },
      );
    }
    if (
      hasCheckedOut(
        attendanceData.rows,
        context.employee.employee_id,
        week.today,
      )
    ) {
      return NextResponse.json(
        { success: false, error: "แบบประเมินถูกล็อกหลังเช็กเอาต์แล้ว" },
        { status: 409 },
      );
    }

    const employees = employeesData.rows.filter(
      (item) =>
        isEvaluationSubject(item) &&
        item.employee_id !== context.employee.employee_id,
    );
    const activeTopics = topicsData.rows.filter((item) =>
      isTruthy(item.active),
    );
    const assignments = assignmentsData.rows.filter((item) =>
      isTruthy(item.active),
    );
    const commonTopics = activeTopics.filter(
      (topic) => topic.type !== "individual",
    );
    const individualTopics = activeTopics.filter(
      (topic) => topic.type === "individual",
    );
    const expectedPairs = new Set();
    for (const employee of employees) {
      for (const topic of commonTopics) {
        expectedPairs.add(`${employee.employee_id}:${topic.topic_id}`);
      }
      for (const assignment of assignments.filter(
        (item) => item.employee_id === employee.employee_id,
      )) {
        if (
          individualTopics.some(
            (topic) => topic.topic_id === assignment.topic_id,
          )
        ) {
          expectedPairs.add(`${employee.employee_id}:${assignment.topic_id}`);
        }
      }
    }
    const submittedPairs = new Set(
      Array.isArray(payload.scores)
        ? payload.scores.map((item) => `${item.employeeId}:${item.topicId}`)
        : [],
    );
    if (
      submittedPairs.size !== expectedPairs.size ||
      [...expectedPairs].some((key) => !submittedPairs.has(key))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาให้คะแนนหรือเลือกไม่มีข้อมูลให้ครบทุกหัวข้อ",
        },
        { status: 400 },
      );
    }

    const topics = [
      ...commonTopics,
      ...individualTopics.filter((topic) =>
        assignments.some((item) => item.topic_id === topic.topic_id),
      ),
    ];
    const validationError = validateScores({
      scores: payload.scores,
      employees,
      topics,
      evaluatorEmployeeId: context.employee.employee_id,
    });
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const sheets = createSheetsClient();
    const previous = submissionsData.rows.find(
      (item) =>
        item.week_key === week.weekKey &&
        item.evaluator_employee_id === context.employee.employee_id,
    );
    const submissionId =
      previous?.submission_id ||
      `${week.weekKey}-${context.employee.employee_id}`;
    const submissionValues = [
      submissionId,
      week.weekKey,
      context.employee.employee_id,
      previous?.submitted_at || now,
      now,
      "submitted",
    ];

    if (previous) {
      const rowNumber = submissionsData.rows.indexOf(previous) + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: submissionsData.sheetId,
        range: `${getSheetName(submissionsData.range, "evaluation_submissions")}!A${rowNumber}:F${rowNumber}`,
        valueInputOption: "RAW",
        resource: { values: [submissionValues] },
      });
      const oldScoreIndexes = scoresData.rows
        .map((item, index) =>
          item.submission_id === submissionId ? index + 2 : null,
        )
        .filter(Boolean)
        .reverse();
      for (const rowNumber of oldScoreIndexes) {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: scoresData.sheetId,
          range: `${getSheetName(scoresData.range, "evaluation_scores")}!A${rowNumber}:I${rowNumber}`,
        });
      }
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: submissionsData.sheetId,
        range: submissionsData.range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: { values: [submissionValues] },
      });
    }

    const values = payload.scores.map((item) => [
      submissionId,
      week.weekKey,
      week.monthKey,
      context.employee.employee_id,
      item.employeeId,
      item.topicId,
      item.score ?? "",
      String(item.note || "").trim(),
      now,
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: scoresData.sheetId,
      range: scoresData.range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: { values },
    });

    return NextResponse.json({
      success: true,
      submissionId,
      status: "submitted",
    });
  } catch (error) {
    console.error("Evaluation POST failed:", error);
    return NextResponse.json(
      { success: false, error: "บันทึกแบบประเมินไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
