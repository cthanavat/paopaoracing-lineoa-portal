import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateMonthlyScores,
  canUseEvaluation,
  getWeekContext,
  isEvaluationSubject,
  validateScores,
} from "./evaluation.js";

const activeAdmin = {
  employee_id: "EMP-1",
  active: "TRUE",
  role: "admin",
};

const accessRows = [
  {
    employee_id: "EMP-1",
    can_evaluate: "TRUE",
    can_view_reports: "TRUE",
    active: "TRUE",
  },
];

test("evaluation access requires both an eligible role and an active permission row", () => {
  assert.equal(canUseEvaluation(activeAdmin, accessRows, "can_evaluate"), true);
  assert.equal(
    canUseEvaluation(
      { ...activeAdmin, role: "employee" },
      accessRows,
      "can_evaluate",
    ),
    false,
  );
  assert.equal(canUseEvaluation(activeAdmin, [], "can_evaluate"), false);
  assert.equal(
    canUseEvaluation(
      activeAdmin,
      [{ ...accessRows[0], active: "FALSE" }],
      "can_evaluate",
    ),
    false,
  );
});

test("report access is checked separately from evaluation access", () => {
  const rows = [{ ...accessRows[0], can_view_reports: "FALSE" }];
  assert.equal(canUseEvaluation(activeAdmin, rows, "can_evaluate"), true);
  assert.equal(canUseEvaluation(activeAdmin, rows, "can_view_reports"), false);
});

test("only active staff are evaluation subjects", () => {
  assert.equal(isEvaluationSubject({ active: "TRUE", role: "staff" }), true);
  assert.equal(isEvaluationSubject({ active: "TRUE", role: "STAFF" }), true);
  assert.equal(isEvaluationSubject({ active: "TRUE", role: "admin" }), false);
  assert.equal(
    isEvaluationSubject({ active: "TRUE", userRole: "supervisor" }),
    false,
  );
  assert.equal(isEvaluationSubject({ active: "FALSE", role: "staff" }), false);
});

test("Bangkok week context starts Monday and marks Friday", () => {
  const context = getWeekContext(new Date("2026-10-16T10:00:00Z"));
  assert.equal(context.weekKey, "2026-10-12");
  assert.equal(context.monthKey, "2026-10");
  assert.equal(context.isFriday, true);
  assert.equal(context.today, "2026-10-16");
});

test("score validation rejects low scores without a reason and accepts N/A", () => {
  const input = {
    employees: [{ employee_id: "EMP-2" }],
    topics: [{ topic_id: "quality" }],
    evaluatorEmployeeId: "EMP-1",
  };
  assert.equal(
    validateScores({
      ...input,
      scores: [{ employeeId: "EMP-2", topicId: "quality", score: 2, note: "" }],
    }),
    "คะแนน 1–2 ต้องระบุเหตุผล",
  );
  assert.equal(
    validateScores({
      ...input,
      scores: [
        { employeeId: "EMP-2", topicId: "quality", score: null, note: "" },
      ],
    }),
    null,
  );
});

test("monthly aggregation excludes N/A and never exposes evaluator identity", () => {
  const reports = aggregateMonthlyScores(
    [
      {
        subject_employee_id: "EMP-2",
        evaluator_employee_id: "EMP-1",
        topic_id: "quality",
        score: "5",
        note: "ละเอียดดี",
      },
      {
        subject_employee_id: "EMP-2",
        evaluator_employee_id: "EMP-3",
        topic_id: "quality",
        score: "",
        note: "",
      },
    ],
    [{ topic_id: "quality", title: "คุณภาพ" }],
  );

  assert.equal(reports[0].average, 5);
  assert.equal(reports[0].responseCount, 1);
  assert.equal(reports[0].evaluatorCount, 1);
  assert.equal("evaluatorEmployeeId" in reports[0], false);
});
