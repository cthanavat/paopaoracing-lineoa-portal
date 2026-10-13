"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AllEmployeeLeave } from "../types/attendance";

interface AllEmployeeLeaveScheduleProps {
  leaves: AllEmployeeLeave[];
  currentEmployeeId: string;
}

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeEmployeeId(value: string) {
  return value.trim().toLowerCase();
}

function getLeaveDayCount(leave: AllEmployeeLeave) {
  const explicitDays = Number.parseFloat(leave.leaveDays);
  if (Number.isFinite(explicitDays) && explicitDays > 0) {
    return Math.max(1, Math.ceil(explicitDays));
  }
  return leave.leaveType.includes("2") ? 2 : 1;
}

export default function AllEmployeeLeaveSchedule({
  leaves,
  currentEmployeeId,
}: AllEmployeeLeaveScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<{
    date: Date;
    leaves: AllEmployeeLeave[];
  } | null>(null);
  const [calendarPage, setCalendarPage] = useState<0 | 1>(0);

  useEffect(() => {
    if (!selectedDate) return;

    const scrollY = window.scrollY;
    const originalStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.width = originalStyles.width;
      document.body.style.overflow = originalStyles.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [selectedDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const currentWeekMonday = addDays(today, -mondayOffset);
  const currentPageStart = addDays(currentWeekMonday, -7);
  const forecastStart = addDays(currentPageStart, calendarPage * 42);
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(forecastStart, index),
  );

  const leavesByDate = new Map<string, AllEmployeeLeave[]>();
  leaves.forEach((leave) => {
    const start = parseLocalDate(leave.date);
    if (Number.isNaN(start.getTime())) return;

    for (let offset = 0; offset < getLeaveDayCount(leave); offset += 1) {
      const key = toDateKey(addDays(start, offset));
      leavesByDate.set(key, [...(leavesByDate.get(key) || []), leave]);
    }
  });

  const firstMonth = forecastStart.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const forecastEnd = days.at(-1) || forecastStart;
  const lastMonth = forecastEnd.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const rangeLabel =
    firstMonth === lastMonth ? firstMonth : `${firstMonth} – ${lastMonth}`;
  const todayKey = toDateKey(today);

  return (
    <section className="px-1 py-1" aria-labelledby="leave-schedule-heading">
      <div className="mb-4 text-center">
        <h3
          id="leave-schedule-heading"
          className="text-[16px] font-black tracking-tight text-[#191a1c]"
        >
          ปฏิทินวันหยุด
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold text-[#777]">
          {rangeLabel}
        </p>
        <div
          className="mx-auto mt-3 grid w-fit grid-cols-2 rounded-full bg-[#eceef0] p-1"
          aria-label="เลือกช่วงปฏิทิน"
        >
          <button
            type="button"
            onClick={() => setCalendarPage(0)}
            aria-pressed={calendarPage === 0}
            className={`min-h-8 rounded-full px-4 text-[11px] font-black transition ${
              calendarPage === 0 ? "bg-[#191a1c] text-white" : "text-[#666]"
            }`}
          >
            ปัจจุบัน
          </button>
          <button
            type="button"
            onClick={() => setCalendarPage(1)}
            aria-pressed={calendarPage === 1}
            className={`min-h-8 rounded-full px-4 text-[11px] font-black transition ${
              calendarPage === 1 ? "bg-[#191a1c] text-white" : "text-[#666]"
            }`}
          >
            ถัดไป
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-[10px] font-bold text-[#777]"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`ปฏิทินวันหยุด 6 สัปดาห์ ช่วง${calendarPage === 0 ? "ปัจจุบัน" : "ถัดไป"}`}
      >
        {days.map((date) => {
          const key = toDateKey(date);
          const dateLeaves = leavesByDate.get(key) || [];
          const normalizedCurrentEmployeeId =
            normalizeEmployeeId(currentEmployeeId);
          const isOwnLeave = (leave: AllEmployeeLeave) =>
            Boolean(normalizedCurrentEmployeeId) &&
            normalizeEmployeeId(leave.employeeId) ===
              normalizedCurrentEmployeeId;
          const ownPending = dateLeaves.filter(
            (leave) =>
              isOwnLeave(leave) && leave.status.toLowerCase() === "pending",
          );
          const ownApproved = dateLeaves.filter(
            (leave) =>
              isOwnLeave(leave) && leave.status.toLowerCase() === "approved",
          );
          const otherPending = dateLeaves.filter(
            (leave) =>
              !isOwnLeave(leave) && leave.status.toLowerCase() === "pending",
          );
          const otherApproved = dateLeaves.filter(
            (leave) =>
              !isOwnLeave(leave) && leave.status.toLowerCase() === "approved",
          );
          const pending = [...ownPending, ...otherPending];
          const approved = [...ownApproved, ...otherApproved];
          const isToday = key === todayKey;
          const isPast = date < today;
          const statusLabel = [
            pending.length ? `รออนุมัติ ${pending.length} รายการ` : "",
            approved.length ? `อนุมัติแล้ว ${approved.length} รายการ` : "",
          ]
            .filter(Boolean)
            .join(" และ ");
          const names = dateLeaves
            .map((leave) => leave.employeeName)
            .join(", ");

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={!dateLeaves.length}
              onClick={() => setSelectedDate({ date, leaves: dateLeaves })}
              aria-label={`${date.toLocaleDateString("th-TH", { dateStyle: "long" })}${statusLabel ? ` ${statusLabel}: ${names} กดเพื่อดูรายละเอียด` : " ไม่มีรายการลา"}`}
              title={statusLabel ? `${statusLabel}: ${names}` : undefined}
              className={`flex aspect-square min-h-10 flex-col items-center justify-center rounded-[10px] border text-center transition active:scale-95 disabled:cursor-default disabled:active:scale-100 ${
                isToday
                  ? "border-[#1972bc] bg-[#e8f2fb]"
                  : "border-[#e1e4e7] bg-[#f7f8f9]"
              } ${isPast ? "opacity-60" : ""}`}
            >
              <span
                className={`text-[12px] leading-none font-black tabular-nums ${isToday ? "text-[#1972bc]" : "text-[#191a1c]"}`}
              >
                {date.getDate()}
              </span>
              <span className="mt-1 flex h-2.5 items-center justify-center gap-1">
                {ownPending.length ? (
                  <span className="flex items-center gap-0.5 text-[9px] leading-none font-black text-red-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-red-700/25" />
                    {ownPending.length > 1 ? ownPending.length : null}
                  </span>
                ) : null}
                {ownApproved.length ? (
                  <span className="flex items-center gap-0.5 text-[9px] leading-none font-black text-green-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-600 ring-1 ring-green-700/25" />
                    {ownApproved.length > 1 ? ownApproved.length : null}
                  </span>
                ) : null}
                {otherPending.length ? (
                  <span className="flex items-center gap-0.5 text-[9px] leading-none font-black text-[#a15c00]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b] ring-1 ring-[#d97706]/25" />
                    {otherPending.length > 1 ? otherPending.length : null}
                  </span>
                ) : null}
                {otherApproved.length ? (
                  <span className="flex items-center gap-0.5 text-[9px] leading-none font-black text-[#145b96]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1972bc] ring-1 ring-[#145b96]/25" />
                    {otherApproved.length > 1 ? otherApproved.length : null}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-[max-content_max-content] justify-center gap-x-7 gap-y-1.5 text-[10px] font-semibold text-[#666]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
          เพื่อน · รออนุมัติ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          ตนเอง · รออนุมัติ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#1972bc]" />
          เพื่อน · อนุมัติแล้ว
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          ตนเอง · อนุมัติแล้ว
        </span>
      </div>

      {selectedDate
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedDate(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="leave-date-detail-heading"
                className="max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[24px] bg-white p-5 shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-[#1972bc] uppercase">
                      รายละเอียดวันหยุด
                    </p>
                    <h4
                      id="leave-date-detail-heading"
                      className="mt-0.5 text-[18px] font-black text-[#191a1c]"
                    >
                      {selectedDate.date.toLocaleDateString("th-TH", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    aria-label="ปิดรายละเอียด"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef0] text-[20px] font-bold text-[#191a1c]"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2.5">
                  {selectedDate.leaves.map((leave, index) => {
                    const isApproved =
                      leave.status.toLowerCase() === "approved";
                    const isOwn =
                      Boolean(normalizeEmployeeId(currentEmployeeId)) &&
                      normalizeEmployeeId(leave.employeeId) ===
                        normalizeEmployeeId(currentEmployeeId);
                    const statusClasses = isOwn
                      ? isApproved
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                      : isApproved
                        ? "bg-[#e8f2fb] text-[#145b96]"
                        : "bg-[#fef3c7] text-[#a15c00]";
                    return (
                      <article
                        key={`${leave.employeeName}-${leave.date}-${index}`}
                        className="rounded-[14px] border border-[#d8dce0] bg-[#f7f8f9] p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-black text-[#191a1c]">
                              {leave.employeeName}
                            </p>
                            <p className="mt-0.5 text-[12px] font-semibold text-[#666]">
                              {leave.leaveType}
                              {leave.leaveReason
                                ? ` · ${leave.leaveReason}`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses}`}
                          >
                            {isApproved ? "อนุมัติแล้ว" : "รออนุมัติ"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
