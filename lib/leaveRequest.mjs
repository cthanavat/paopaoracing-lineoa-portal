export function buildLeaveRequestFlexMessage({
  employeeName,
  date,
  leaveOption,
  reason,
  detail,
}) {
  const rows = [
    ["วันที่", date],
    ["จำนวน", leaveOption],
    ["ประเภท", reason],
  ];

  const detailContents = rows.map(([label, value]) => ({
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#666666",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        size: "sm",
        color: "#191A1C",
        weight: "bold",
        align: "end",
        wrap: true,
        flex: 4,
      },
    ],
  }));

  if (String(detail || "").trim()) {
    detailContents.push(
      { type: "separator", color: "#D8DCE0", margin: "md" },
      {
        type: "text",
        text: "เหตุผลเพิ่มเติม",
        size: "xs",
        color: "#666666",
        weight: "bold",
        margin: "md",
      },
      {
        type: "text",
        text: String(detail).trim(),
        size: "sm",
        color: "#191A1C",
        wrap: true,
        margin: "sm",
      },
    );
  }

  return {
    type: "flex",
    altText: `คำขอลา ${employeeName} วันที่ ${date} (${leaveOption})`,
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
            size: "xs",
            color: "#FFFFFF",
            weight: "bold",
          },
          {
            type: "text",
            text: "คำขอลา / วันหยุด",
            size: "xl",
            color: "#FFFFFF",
            weight: "bold",
            margin: "sm",
          },
          {
            type: "text",
            text: employeeName,
            size: "sm",
            color: "#DCEEFF",
            margin: "sm",
            wrap: true,
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "md",
        contents: detailContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#18191A",
            cornerRadius: "999px",
            paddingAll: "10px",
            contents: [
              {
                type: "text",
                text: "รออนุมัติ",
                color: "#38BDF8",
                size: "sm",
                weight: "bold",
                align: "center",
              },
            ],
          },
        ],
      },
    },
  };
}
