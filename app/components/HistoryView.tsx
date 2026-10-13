"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiArrowRight, HiX } from "react-icons/hi";
import { type HistoryItem, useAppStore } from "@/store/useAppStore";
import Loader from "./Loader";
import { formatHistoryDate, getHistoryYear } from "@/lib/historyDate.mjs";

interface HistoryViewProps {
  compact?: boolean;
  onShowAll?: () => void;
}

function getHistoryField(item: HistoryItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

const HistoryView: React.FC<HistoryViewProps> = ({
  compact = false,
  onShowAll,
}) => {
  const { historyList, loadHistory, member } = useAppStore();
  const visibleHistory = compact ? historyList.slice(0, 3) : historyList;
  const [selectedBill, setSelectedBill] = useState<HistoryItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const customerName = selectedBill
    ? getHistoryField(selectedBill, ["customer_name", "customer", "name"]) ||
      member?.name ||
      "ไม่ระบุชื่อ"
    : "";
  const customerPhone = selectedBill
    ? getHistoryField(selectedBill, [
        "customer_phone",
        "phone_number",
        "phone",
      ]) ||
      member?.phone ||
      "ไม่ระบุเบอร์"
    : "";
  const billNote = selectedBill
    ? getHistoryField(selectedBill, ["bill_note", "note", "remark", "memo"])
    : "";
  const paymentStatus = selectedBill
    ? getHistoryField(selectedBill, [
        "payment_status",
        "bill_payment_status",
        "bill_status",
      ])
    : "";

  useEffect(() => {
    if (!selectedBill) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const original = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedBill(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [selectedBill]);

  return (
    <section className="w-full" aria-labelledby="history-heading">
      <div className="ticket-divider mb-2 flex items-center justify-between gap-3 pb-1">
        <div>
          {!compact ? (
            <p className="text-xs font-bold tracking-[0.2em] text-[#777]">
              SERVICE HISTORY
            </p>
          ) : null}
          <h2
            id="history-heading"
            className={`${compact ? "text-lg" : "mt-1 text-2xl"} font-black text-[#191a1c]`}
          >
            ประวัติการใช้บริการ
          </h2>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={onShowAll}
            className="flex min-h-9 items-center gap-1 rounded-full px-1 text-sm font-bold text-[#1972bc]"
          >
            ประวัติทั้งหมด
            <HiArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {loadHistory ? (
        <div className="flex min-h-32 items-center justify-center text-[#191a1c]">
          <Loader
            title="กำลังโหลดประวัติบริการ"
            detail="รายการล่าสุดจะแสดงตรงนี้เมื่อพร้อม"
          />
        </div>
      ) : visibleHistory.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-[#3a3a3a] bg-[#101010] p-5 text-sm text-[#929292]">
          ยังไม่มีประวัติการใช้บริการ
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleHistory.map((bill, idx) => {
            const year = getHistoryYear(bill.bill_date);
            const previousYear =
              idx > 0
                ? getHistoryYear(visibleHistory[idx - 1].bill_date)
                : null;
            const showYear = year !== previousYear;

            return (
              <React.Fragment
                key={`${bill.bill_date}-${bill.car_plate_number}-${idx}`}
              >
                {showYear ? (
                  <div
                    className="flex items-center gap-3 pt-1 first:pt-0"
                    aria-label={`ปี ${year}`}
                  >
                    <span className="text-[12px] leading-4 font-black tracking-[0.12em] text-[#1972bc]">
                      {year}
                    </span>
                    <span
                      className="h-px flex-1 bg-[#d8dce0]"
                      aria-hidden="true"
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedBill(bill)}
                  aria-haspopup="dialog"
                  className="relative block w-full overflow-hidden rounded-[10px] border border-[#e2e4e7] bg-[#eceef0] px-3 py-2.5 pl-4 text-left transition active:scale-[0.99]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-[#1972bc]" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <time
                        dateTime={formatHistoryDate(bill.bill_date)}
                        className="text-[11px] leading-4 font-bold text-[#1972bc]"
                      >
                        {formatHistoryDate(bill.bill_date)}
                      </time>
                      <h3 className="truncate text-[15px] leading-5 font-black text-[#191a1c]">
                        {bill.car_plate_number || "ไม่ระบุทะเบียน"}
                      </h3>
                    </div>
                    <p className="shrink-0 text-sm leading-5 font-black text-[#191a1c]">
                      {bill.bill_total_amount || "-"}
                    </p>
                  </div>
                  {bill.bill_detail ? (
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 whitespace-pre-line text-[#666666]">
                      {bill.bill_detail}
                    </p>
                  ) : null}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {selectedBill
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedBill(null);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="bill-detail-heading"
                className="relative max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-lg [touch-action:pan-y] overflow-y-auto overscroll-contain rounded-[18px] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.32)] sm:px-6"
              >
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setSelectedBill(null)}
                  aria-label="ปิดใบเสร็จ"
                  className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#eceef0] text-[#191a1c]"
                >
                  <HiX className="h-5 w-5" />
                </button>

                <header className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-5 pr-10">
                  <div className="min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/logo.png"
                      alt="PAOPAO Racing"
                      width={72}
                      height={72}
                      className="h-14 w-14 object-contain"
                    />
                    <p className="mt-3 text-[10px] font-bold tracking-[0.08em] text-[#777] uppercase">
                      วันที่
                    </p>
                    <time
                      dateTime={formatHistoryDate(selectedBill.bill_date)}
                      className="mt-0.5 block text-[13px] font-bold text-[#191a1c] tabular-nums"
                    >
                      {formatHistoryDate(selectedBill.bill_date)}
                    </time>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-bold tracking-[0.08em] text-[#777] uppercase">
                      ทะเบียนรถ
                    </p>
                    <h2
                      id="bill-detail-heading"
                      className="text-xl leading-7 font-black break-words text-[#191a1c]"
                    >
                      {selectedBill.car_plate_number || "ไม่ระบุทะเบียน"}
                    </h2>
                    <p className="mt-3 truncate text-[14px] leading-5 font-bold text-[#191a1c]">
                      {customerName}
                    </p>
                    <p className="text-[12px] leading-5 text-[#666] tabular-nums">
                      {customerPhone}
                    </p>
                  </div>
                </header>

                <div className="my-5 border-t border-dashed border-[#b8bdc2]" />

                <section aria-labelledby="receipt-detail-heading">
                  <h3
                    id="receipt-detail-heading"
                    className="text-[11px] font-bold tracking-[0.12em] text-[#777] uppercase"
                  >
                    รายละเอียดบิล
                  </h3>
                  <p className="mt-3 text-[14px] leading-6 whitespace-pre-wrap text-[#191a1c]">
                    {selectedBill.bill_detail || "ไม่มีรายละเอียด"}
                  </p>
                </section>

                <div className="my-5 border-t border-dashed border-[#b8bdc2]" />

                <footer>
                  <div className="grid grid-cols-[minmax(0,1fr)_max-content] items-end gap-4">
                    <p className="text-base font-black text-[#191a1c]">
                      ยอดรวม
                    </p>
                    <p className="text-right text-[28px] leading-none font-black text-[#191a1c] tabular-nums">
                      {selectedBill.bill_total_amount || "-"}
                    </p>
                  </div>

                  <dl className="mt-5 space-y-3 text-[13px] leading-5">
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                      <dt className="font-bold text-[#777]">หมายเหตุ</dt>
                      <dd className="text-right whitespace-pre-wrap text-[#191a1c]">
                        {billNote || "ไม่ระบุ"}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                      <dt className="font-bold text-[#777]">สถานะการเงิน</dt>
                      <dd className="justify-self-end rounded-full bg-[#eceef0] px-3 py-1 text-right font-black text-[#191a1c]">
                        {paymentStatus || "ไม่ระบุ"}
                      </dd>
                    </div>
                  </dl>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}

      {compact ? (
        <div className="mt-5 flex flex-col items-center text-center">
          <p className="text-xs font-medium text-[#666666]">
            เปาเปา เรสซิ่ง ร้านแต่งรถ อุบลราชธานี
          </p>
          {/* Barcode is decorative; the readable shop phone remains visible. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://quickchart.io/barcode?type=code128&text=0804706857&includeText=false&format=svg&width=540&height=60"
            alt=""
            aria-hidden="true"
            width={220}
            height={24}
            className="mt-2 block h-6 w-[220px] object-fill object-top"
          />
          <p className="font-mono text-[10px] leading-4 font-semibold tracking-wide text-[#666] tabular-nums">
            080-470-6857
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default HistoryView;
