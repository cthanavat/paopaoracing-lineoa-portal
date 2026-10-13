export const SERVICE_OPTIONS = [
  "สอบถาม / จองคิว",
  "สลับยาง",
  "เช็คระยะ",
  "เปลี่ยนน้ำมันเครื่อง",
  "อื่นๆ",
];

export function validateServiceRequest({ plate, services }) {
  if (!String(plate || "").trim()) return "กรุณาเลือกรถ";
  if (!Array.isArray(services) || services.length === 0) {
    return "กรุณาเลือกรายการบริการ";
  }
  return "";
}

export function buildServiceRequestMessage({ date, phone, plate, services }) {
  return [
    "เข้ารับบริการ",
    "รายการบริการ",
    ...services.map((service) => `- ${service}`),
    `วันที่ ${date}`,
    `เบอร์โทร ${phone}`,
    `ทะเบียนรถ ${plate}`,
  ].join("\n");
}

export function buildServiceRequestFlexMessage({
  date,
  phone,
  plate,
  brand,
  model,
  services,
}) {
  const serviceRows = services.map((service) => ({
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: "•",
        flex: 0,
        color: "#1972BC",
        weight: "bold",
      },
      {
        type: "text",
        text: service,
        wrap: true,
        size: "sm",
        color: "#191A1C",
        weight: "bold",
      },
    ],
  }));

  return {
    type: "flex",
    altText: `คำขอเข้ารับบริการ ${plate}: ${services.join(", ")}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        backgroundColor: "#1972BC",
        contents: [
          {
            type: "text",
            text: "PAOPAO RACING",
            color: "#FFFFFF",
            size: "xs",
            weight: "bold",
          },
          {
            type: "text",
            text: "คำขอเข้ารับบริการ",
            color: "#FFFFFF",
            size: "xl",
            weight: "bold",
            margin: "sm",
          },
          {
            type: "text",
            text: date,
            color: "#DCEEFF",
            size: "sm",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "lg",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#ECEEF0",
            cornerRadius: "12px",
            paddingAll: "14px",
            contents: [
              {
                type: "text",
                text: `${brand} · ${model}`,
                color: "#191A1C",
                size: "md",
                weight: "bold",
                wrap: true,
              },
              {
                type: "text",
                text: plate,
                color: "#1972BC",
                size: "xl",
                weight: "bold",
                margin: "sm",
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "รายการบริการ",
                color: "#666666",
                size: "xs",
                weight: "bold",
              },
              ...serviceRows,
            ],
          },
          {
            type: "separator",
            color: "#D8DCE0",
          },
          {
            type: "text",
            text: "รอแอดมินตอบกลับ",
            color: "#191A1C",
            size: "md",
            weight: "bold",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1972BC",
            height: "sm",
            action: {
              type: "uri",
              label: "โทร 080-470-6857",
              uri: "tel:0804706857",
            },
          },
          {
            type: "text",
            text: `เบอร์ติดต่อผู้ส่งคำขอ ${phone}`,
            color: "#999999",
            size: "xxs",
            align: "center",
            margin: "md",
          },
        ],
      },
    },
  };
}
