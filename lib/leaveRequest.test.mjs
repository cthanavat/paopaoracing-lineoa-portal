import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaveRequestFlexMessage } from "./leaveRequest.mjs";

test("builds a pending leave request Flex card", () => {
  const message = buildLeaveRequestFlexMessage({
    employeeName: "เปา",
    date: "2026-10-05",
    leaveOption: "1 วัน",
    reason: "วันหยุด",
    detail: "ธุระส่วนตัว",
  });

  assert.equal(message.type, "flex");
  assert.equal(message.altText, "คำขอลา เปา วันที่ 2026-10-05 (1 วัน)");
  assert.equal(message.contents.header.contents[1].text, "คำขอลา / วันหยุด");
  assert.equal(
    message.contents.body.contents[0].contents[1].text,
    "2026-10-05",
  );
  assert.equal(message.contents.body.contents[1].contents[1].text, "1 วัน");
  assert.equal(message.contents.body.contents[2].contents[1].text, "วันหยุด");
  assert.equal(message.contents.body.contents[5].text, "ธุระส่วนตัว");
  assert.equal(
    message.contents.footer.contents[0].contents[0].text,
    "รออนุมัติ",
  );
});

test("omits the optional detail block when blank", () => {
  const message = buildLeaveRequestFlexMessage({
    employeeName: "เปา",
    date: "2026-10-05",
    leaveOption: "ครึ่งวัน",
    reason: "ลาป่วย",
    detail: "   ",
  });

  assert.equal(message.contents.body.contents.length, 3);
});
