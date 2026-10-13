export function normalizeAccessValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isEmployeeActive(active) {
  return ["true", "1", "yes", "active"].includes(normalizeAccessValue(active));
}

export function findMemberByUserId(members, userId) {
  return members.find((member) => member.userId === userId) || null;
}

export function findEmployeeByUserId(employees, userId) {
  return employees.find((employee) => employee.userId === userId) || null;
}

export function findActiveEmployeeByUserId(employees, userId) {
  const employee = findEmployeeByUserId(employees, userId);
  return employee?.employee_id && isEmployeeActive(employee.active)
    ? employee
    : null;
}

export function getMemberRegistrationConflict({
  members,
  employees,
  userId,
  phone,
}) {
  if (findMemberByUserId(members, userId)) return "existing_member";
  if (findEmployeeByUserId(employees, userId)) return "employee_record";

  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (
    members.some(
      (member) =>
        String(member.phone || "").replace(/\D/g, "") === normalizedPhone,
    )
  ) {
    return "phone_in_use";
  }

  return null;
}

export function resolveEmployeeAccess({ members, employees, userId }) {
  const member = findMemberByUserId(members, userId);
  const employee = findActiveEmployeeByUserId(employees, userId);

  if (!member || !employee) return null;
  return { member, employee };
}
