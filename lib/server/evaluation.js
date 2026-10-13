export const DEFAULT_EVALUATION_TOPICS = [
  [
    "punctuality",
    "การตรงต่อเวลาและความพร้อม",
    "พร้อมเริ่มงานตามเวลา",
    "common",
    "1",
    "TRUE",
    "1",
  ],
  [
    "cleanliness",
    "ความสะอาดและความเป็นระเบียบ",
    "พื้นที่ เครื่องมือ และงานหลังจบ",
    "common",
    "1",
    "TRUE",
    "2",
  ],
  [
    "quality",
    "คุณภาพและความละเอียดของงาน",
    "เรียบร้อยและไม่ต้องแก้ซ้ำ",
    "common",
    "1",
    "TRUE",
    "3",
  ],
  [
    "efficiency",
    "ประสิทธิภาพและความเร็ว",
    "ทำงานทันเวลาโดยรักษาคุณภาพ",
    "common",
    "1",
    "TRUE",
    "4",
  ],
  [
    "responsibility",
    "ความรับผิดชอบ",
    "รับงานแล้วทำจนเสร็จและแจ้งปัญหา",
    "common",
    "1",
    "TRUE",
    "5",
  ],
  [
    "teamwork",
    "การช่วยเหลือและทำงานเป็นทีม",
    "ช่วยงานส่วนรวมและประสานงาน",
    "common",
    "1",
    "TRUE",
    "6",
  ],
  [
    "discipline",
    "ความตั้งใจและวินัยระหว่างทำงาน",
    "มีสมาธิและไม่อู้งาน",
    "common",
    "1",
    "TRUE",
    "7",
  ],
  [
    "phone_use",
    "การใช้โทรศัพท์อย่างเหมาะสม",
    "ไม่ทำให้งานหรือเพื่อนร่วมงานต้องรอ",
    "common",
    "1",
    "TRUE",
    "8",
  ],
];

export function isTruthy(value) {
  return ["true", "1", "yes", "active"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

export function canUseEvaluation(
  employee,
  accessRows,
  permission = "can_evaluate",
) {
  if (!employee || !isTruthy(employee.active) || !Array.isArray(accessRows)) {
    return false;
  }

  const role = String(employee.role || employee.userRole || "")
    .trim()
    .toLowerCase();
  if (!["admin", "supervisor"].includes(role)) return false;

  const access = accessRows.find(
    (row) => row.employee_id === employee.employee_id && isTruthy(row.active),
  );
  return Boolean(access && isTruthy(access[permission]));
}

export function getBangkokDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getWeekContext(date = new Date()) {
  const p = getBangkokDateParts(date);
  const local = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`);
  const day = local.getUTCDay();
  const monday = new Date(local);
  monday.setUTCDate(local.getUTCDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (d) => d.toISOString().slice(0, 10);
  return {
    weekKey: iso(monday),
    monthKey: iso(sunday).slice(0, 7),
    isFriday: p.weekday === "Fri",
    today: `${p.year}-${p.month}-${p.day}`,
    label: `${monday.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" })}–${sunday.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" })}`,
  };
}

export function validateScores({
  scores,
  employees,
  topics,
  evaluatorEmployeeId,
}) {
  if (!Array.isArray(scores)) return "ข้อมูลคะแนนไม่ถูกต้อง";
  const allowedEmployees = new Set(employees.map((item) => item.employee_id));
  const allowedTopics = new Set(topics.map((item) => item.topic_id));
  const seen = new Set();
  for (const item of scores) {
    const key = `${item.employeeId}:${item.topicId}`;
    if (
      !allowedEmployees.has(item.employeeId) ||
      !allowedTopics.has(item.topicId) ||
      seen.has(key)
    )
      return "พบรายการคะแนนที่ไม่ถูกต้องหรือซ้ำกัน";
    if (item.employeeId === evaluatorEmployeeId)
      return "ไม่สามารถประเมินตัวเองได้";
    const score = item.score === null ? null : Number(item.score);
    if (score !== null && (!Number.isInteger(score) || score < 1 || score > 5))
      return "คะแนนต้องอยู่ระหว่าง 1–5 หรือไม่มีข้อมูล";
    const note = String(item.note || "").trim();
    if (score !== null && score <= 2 && !note)
      return "คะแนน 1–2 ต้องระบุเหตุผล";
    if (note.length > 500) return "หมายเหตุต้องไม่เกิน 500 ตัวอักษร";
    seen.add(key);
  }
  return null;
}

export function aggregateMonthlyScores(rows, topics) {
  const byEmployee = new Map();
  const topicMap = new Map(topics.map((topic) => [topic.topic_id, topic]));
  for (const row of rows) {
    const score = Number(row.score);
    if (!Number.isFinite(score) || score < 1 || score > 5) continue;
    const employee = byEmployee.get(row.subject_employee_id) || {
      total: 0,
      count: 0,
      evaluators: new Set(),
      topics: new Map(),
      notes: [],
    };
    employee.total += score;
    employee.count += 1;
    employee.evaluators.add(row.evaluator_employee_id);
    const topic = employee.topics.get(row.topic_id) || { total: 0, count: 0 };
    topic.total += score;
    topic.count += 1;
    employee.topics.set(row.topic_id, topic);
    if (row.note)
      employee.notes.push({ topicId: row.topic_id, note: row.note });
    byEmployee.set(row.subject_employee_id, employee);
  }
  return [...byEmployee.entries()].map(([employeeId, data]) => ({
    employeeId,
    average: Number((data.total / data.count).toFixed(2)),
    responseCount: data.count,
    evaluatorCount: data.evaluators.size,
    topics: [...data.topics.entries()].map(([topicId, value]) => ({
      topicId,
      title: topicMap.get(topicId)?.title || topicId,
      average: Number((value.total / value.count).toFixed(2)),
      responseCount: value.count,
    })),
    notes: data.notes,
  }));
}
