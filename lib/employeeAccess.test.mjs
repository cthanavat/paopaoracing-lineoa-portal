import assert from "node:assert/strict";
import test from "node:test";

import {
  findActiveEmployeeByUserId,
  getMemberRegistrationConflict,
  isEmployeeActive,
  resolveEmployeeAccess,
} from "./employeeAccess.mjs";

const userId = "U-valid";
const member = { userId, name: "Member" };
const employee = {
  userId,
  employee_id: "EMP-001",
  active: "TRUE",
  nickname: "Staff",
};

test("allows only matching member plus active employee", () => {
  const access = resolveEmployeeAccess({
    members: [member],
    employees: [employee],
    userId,
  });

  assert.deepEqual(access, { member, employee });
});

test("denies when member mapping was deleted even if employee remains", () => {
  assert.equal(
    resolveEmployeeAccess({ members: [], employees: [employee], userId }),
    null,
  );
});

test("denies when employee was deleted", () => {
  assert.equal(
    resolveEmployeeAccess({ members: [member], employees: [], userId }),
    null,
  );
});

test("denies inactive employee", () => {
  assert.equal(
    resolveEmployeeAccess({
      members: [member],
      employees: [{ ...employee, active: "FALSE" }],
      userId,
    }),
    null,
  );
});

test("denies employee without employee_id and mismatched user", () => {
  assert.equal(
    findActiveEmployeeByUserId(
      [
        { ...employee, employee_id: "" },
        { ...employee, userId: "U-other" },
      ],
      userId,
    ),
    null,
  );
});

test("blocks self-registration when an employee row remains after member deletion", () => {
  assert.equal(
    getMemberRegistrationConflict({
      members: [],
      employees: [employee],
      userId,
      phone: "0812345678",
    }),
    "employee_record",
  );
});

test("blocks duplicate user and normalized phone registration", () => {
  assert.equal(
    getMemberRegistrationConflict({
      members: [member],
      employees: [],
      userId,
      phone: "0999999999",
    }),
    "existing_member",
  );
  assert.equal(
    getMemberRegistrationConflict({
      members: [{ ...member, userId: "U-other", phone: "081-234-5678" }],
      employees: [],
      userId,
      phone: "0812345678",
    }),
    "phone_in_use",
  );
});

test("allows new customer registration without membership or employee conflicts", () => {
  assert.equal(
    getMemberRegistrationConflict({
      members: [],
      employees: [],
      userId,
      phone: "0812345678",
    }),
    null,
  );
});

test("accepts explicit active values and rejects empty/default values", () => {
  for (const value of [true, 1, "yes", "ACTIVE"]) {
    assert.equal(isEmployeeActive(value), true);
  }
  for (const value of [false, 0, "", undefined, "inactive", "no"]) {
    assert.equal(isEmployeeActive(value), false);
  }
});
