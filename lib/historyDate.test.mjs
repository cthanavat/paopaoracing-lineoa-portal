import assert from "node:assert/strict";
import test from "node:test";

import {
  formatHistoryDate,
  getHistoryTimestamp,
  getHistoryYear,
} from "./historyDate.mjs";

test("formats DD/MM/YYYY history dates as YYYY-MM-DD", () => {
  assert.equal(formatHistoryDate("01/10/2026"), "2026-10-01");
  assert.equal(formatHistoryDate("7/2/2025"), "2025-02-07");
});

test("preserves valid YYYY-MM-DD display", () => {
  assert.equal(formatHistoryDate("2025-04-19"), "2025-04-19");
  assert.equal(getHistoryYear("2025-04-19"), "2025");
});

test("rejects impossible dates without inventing a replacement", () => {
  assert.equal(formatHistoryDate("31/02/2026"), "31/02/2026");
  assert.equal(getHistoryYear("31/02/2026"), "ไม่ทราบปี");
});

test("returns deterministic timestamps for sorting", () => {
  assert.ok(
    getHistoryTimestamp("01/10/2026") > getHistoryTimestamp("2025-04-19"),
  );
});
