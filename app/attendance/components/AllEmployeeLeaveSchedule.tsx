import React from "react";
import { AllEmployeeLeave } from "../types/attendance";

interface AllEmployeeLeaveScheduleProps {
  leaves: AllEmployeeLeave[];
}

export default function AllEmployeeLeaveSchedule({
  leaves,
}: AllEmployeeLeaveScheduleProps) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="mb-4">
      <h3 className="mb-2 text-center text-[15px] font-semibold tracking-tight text-gray-900">
        ตารางวันหยุด
      </h3>
      <div className="space-y-2.5">
        {leaves.length === 0 ? (
          <div className="rounded-[18px] border border-[#d4d9e1] bg-white px-3 py-4 text-center text-sm text-gray-500">
            ไม่มีรายการลาที่อนุมัติแล้วในเร็วๆ นี้
          </div>
        ) : (
          leaves
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            )
            .map((leave, index) => {
              const leaveDate = new Date(leave.date);
              const leaveDateKey = `${leaveDate.getFullYear()}-${String(leaveDate.getMonth() + 1).padStart(2, "0")}-${String(leaveDate.getDate()).padStart(2, "0")}`;
              const isToday = leaveDateKey === todayKey;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-[18px] px-3 py-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${
                    isToday
                      ? "border border-[#bfd4ff] bg-[#eef5ff]"
                      : "border border-[#d4d9e1] bg-white"
                  }`}
                >
                <div className="min-w-0 pr-3">
                  <p className={`truncate text-[14px] font-semibold ${isToday ? "text-[#295aa6]" : "text-gray-900"}`}>
                    {leave.employeeName}
                  </p>
                  <p className={`truncate text-[12px] ${isToday ? "text-[#4f6893]" : "text-gray-600"}`}>
                    {leave.leaveType} - {leave.leaveReason}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[12px] font-semibold ${isToday ? "text-[#295aa6]" : "text-gray-900"}`}>
                    {new Date(leave.date).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                  <p className={`text-[11px] ${isToday ? "text-[#5d7fb6]" : "text-gray-500"}`}>
                    {leave.status === "Approved"
                      ? "อนุมัติ"
                      : leave.status === "Pending"
                        ? "รออนุมัติ"
                        : leave.status}
                  </p>
                </div>
              </div>
              );
            })
        )}
      </div>
    </div>
  );
}
