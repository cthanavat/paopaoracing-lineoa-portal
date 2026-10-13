import assert from "node:assert/strict";
import test from "node:test";
import {
  buildServiceRequestFlexMessage,
  buildServiceRequestMessage,
  validateServiceRequest,
} from "./serviceRequest.mjs";

test("requires a vehicle and at least one service", () => {
  assert.equal(
    validateServiceRequest({ plate: "", services: [] }),
    "กรุณาเลือกรถ",
  );
  assert.equal(
    validateServiceRequest({ plate: "กข 1234", services: [] }),
    "กรุณาเลือกรายการบริการ",
  );
  assert.equal(
    validateServiceRequest({ plate: "กข 1234", services: ["สลับยาง"] }),
    "",
  );
});

test("builds one request containing every selected service", () => {
  const message = buildServiceRequestMessage({
    date: "2026-10-03",
    phone: "0812345678",
    plate: "กข 1234",
    services: ["สลับยาง", "เช็คระยะ"],
  });

  assert.equal(
    message,
    "เข้ารับบริการ\nรายการบริการ\n- สลับยาง\n- เช็คระยะ\nวันที่ 2026-10-03\nเบอร์โทร 0812345678\nทะเบียนรถ กข 1234",
  );
});

test("builds a Flex card from the selected vehicle and services", () => {
  const message = buildServiceRequestFlexMessage({
    date: "2026-10-04",
    phone: "0812345678",
    plate: "กข 1234",
    brand: "Toyota",
    model: "Tiger",
    services: ["สลับยาง", "เช็คระยะ"],
  });

  assert.equal(message.type, "flex");
  assert.equal(message.altText, "คำขอเข้ารับบริการ กข 1234: สลับยาง, เช็คระยะ");
  assert.equal(message.contents.header.contents[1].text, "คำขอเข้ารับบริการ");
  assert.equal(
    message.contents.body.contents[0].contents[0].text,
    "Toyota · Tiger",
  );
  assert.deepEqual(
    message.contents.body.contents[1].contents
      .slice(1)
      .map((row) => row.contents[1].text),
    ["สลับยาง", "เช็คระยะ"],
  );
  assert.equal(message.contents.body.contents[3].text, "รอแอดมินตอบกลับ");
  assert.deepEqual(message.contents.footer.contents[0].action, {
    type: "uri",
    label: "โทร 080-470-6857",
    uri: "tel:0804706857",
  });
});
