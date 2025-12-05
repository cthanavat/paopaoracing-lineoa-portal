import React from "react";
import { AllEmployeeLeave } from "../types/attendance";

interface AllEmployeeLeaveScheduleProps {
  leaves: AllEmployeeLeave[];
}

export default function AllEmployeeLeaveSchedule({
  leaves,
}: AllEmployeeLeaveScheduleProps) {
  return (
    <div className="mt-0 mb-4">
      <h3 className="text-md mb-1 max-w-xs text-center font-semibold text-gray-800">
        ตารางวันหยุด
      </h3>
      <div className="space-y-3">
        {leaves.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-gray-500">
            ไม่มีรายการลาที่อนุมัติแล้วในเร็วๆ นี้
          </div>
        ) : (
          leaves
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            )
            .map((leave, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {leave.employeeName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {leave.leaveType} - {leave.leaveReason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(leave.date).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leave.status === "Approved"
                      ? "อนุมัติ"
                      : leave.status === "Pending"
                        ? "รออนุมัติ"
                        : leave.status}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
