"use client";

import { memo, useEffect, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  HiArrowUp,
  HiBanknotes,
  HiCalendarDays,
  HiMiniXMark,
  HiMagnifyingGlass,
  HiMiniClock,
} from "react-icons/hi2";
import UserProfile from "../components/UserProfile";
import Loader from "../components/Loader";
import Notification from "../components/Notification";
import { useAppStore, HistoryItem, Member } from "@/store/useAppStore";
import { useLiff } from "@/hooks/useLiff";
import { useAppData } from "@/hooks/useAppData";
import { authenticatedFetch } from "@/lib/utils/apiClient";

interface DashboardBill {
  id: string;
  date: string;
  customer: string;
  plate: string;
  carLabel: string;
  detail: string;
  totalAmount: number;
  totalLabel: string;
  paidAmount: number;
  paidLabel: string;
  remainingAmount: number;
  remainingLabel: string;
  taskStatus: string;
  paymentStatus: string;
  billStatus: string;
}

interface BillNameRow {
  [key: string]: string;
}

interface BillPaymentRow {
  [key: string]: string;
}

const TODAY_TASK_STATUS_ORDER = new Map<string, number>([
  ["รอติดตั้ง", 0],
  ["สั่งของ", 1],
  ["ส่งของ", 1],
  ["ส่งรถแล้ว", 2],
]);

function normalizeStatus(value?: string) {
  return (value || "")
    .replace(/\s+/g, " ")
    .replace(/\u200B/g, "")
    .trim();
}

function parseMoney(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]+/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseSheetDate(value: string) {
  if (!value) return null;

  const normalized = value.trim();
  const slashMatch = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (slashMatch) {
    const [, dayText, monthText, yearText, hourText, minuteText, secondText] =
      slashMatch;
    const day = Number(dayText);
    const month = Number(monthText) - 1;
    const year =
      yearText.length === 2 ? Number(`20${yearText}`) : Number(yearText);
    const hour = hourText ? Number(hourText) : 0;
    const minute = minuteText ? Number(minuteText) : 0;
    const second = secondText ? Number(secondText) : 0;
    const parsed = new Date(year, month, day, hour, minute, second);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(normalized);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  return fallback;
}

function formatDate(value: string) {
  const parsed = parseSheetDate(value);
  if (!parsed) return value || "-";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthYear(value: string) {
  const parsed = parseSheetDate(value);
  if (!parsed) return value || "-";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDayTitle(value: Date) {
  const weekday = value.toLocaleDateString("en-US", { weekday: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${weekday}, ${day}/${month}/${year}`;
}

function isSameDay(value: string, compareDate: Date) {
  const parsed = parseSheetDate(value);
  if (!parsed) return false;

  return (
    parsed.getFullYear() === compareDate.getFullYear() &&
    parsed.getMonth() === compareDate.getMonth() &&
    parsed.getDate() === compareDate.getDate()
  );
}

function getCustomerName(row: HistoryItem, memberMap: Map<string, Member>) {
  const userId = normalizeStatus(row.userId);
  const linkedMember = userId ? memberMap.get(userId) : null;

  if (linkedMember?.name) {
    return linkedMember.name;
  }

  return (
    row.customer_name || row.customer || row.name || row.userId || "ลูกค้า"
  );
}

function getBillNameKey(row: BillNameRow) {
  return normalizeStatus(
    row.bill_name_id || row.id || row.billNameId || row.bill_name_code,
  );
}

function getBillNameValue(row: BillNameRow) {
  return normalizeStatus(
    row.bill_name ||
      row.name ||
      row.model ||
      row.bill_name_name ||
      row.description,
  );
}

function getBillReference(value?: string) {
  return normalizeStatus(value);
}

function getPaymentBillKey(row: BillPaymentRow) {
  return getBillReference(
    row.bill_id ||
      row.bill_no ||
      row.bill_number ||
      row.payment_bill_id ||
      row.ref_bill_id ||
      row.reference_bill_id,
  );
}

function getPaymentAmount(row: BillPaymentRow) {
  return parseMoney(
    row.payment_amount ||
      row.paid_amount ||
      row.amount ||
      row.total_paid ||
      row.pay_amount,
  );
}

function getPaymentDate(row: BillPaymentRow) {
  return (
    row.payment_date ||
    row.paid_date ||
    row.date ||
    row.created_at ||
    row.updated_at ||
    ""
  );
}

function normalizeBill(
  row: HistoryItem,
  index: number,
  memberMap: Map<string, Member>,
  billNameMap: Map<string, string>,
  paymentTotals: Map<string, number>,
): DashboardBill {
  const totalAmount = parseMoney(row.bill_total_amount);
  const customer = getCustomerName(row, memberMap);
  const plate = row.car_plate_number || row.plate_number || "-";
  const billNameId = normalizeStatus(
    row.bill_name_id || row.billNameId || row.bill_name,
  );
  const billNameLabel = billNameMap.get(billNameId) || billNameId || "-";
  const date = row.bill_date || row.created_at || "";
  const detail = row.bill_detail || row.service || "ไม่มีรายละเอียดเพิ่มเติม";
  const taskStatus = normalizeStatus(row.task_status) || "ไม่ระบุสถานะงาน";
  const paymentStatus =
    normalizeStatus(row.payment_status) || "ไม่ระบุสถานะจ่ายเงิน";
  const billStatus = normalizeStatus(row.bill_status) || "ไม่ระบุสถานะบิล";
  const id =
    row.bill_id ||
    row.bill_no ||
    row.bill_number ||
    `${date || "bill"}-${plate}-${index}`;
  const paidAmount = paymentTotals.get(getBillReference(id)) || 0;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  return {
    id,
    date,
    customer,
    plate,
    carLabel: `${billNameLabel}, ${plate}`,
    detail,
    totalAmount,
    totalLabel: formatCurrency(totalAmount),
    paidAmount,
    paidLabel: formatCurrency(paidAmount),
    remainingAmount,
    remainingLabel: formatCurrency(remainingAmount),
    taskStatus,
    paymentStatus,
    billStatus,
  };
}

function shouldExcludeBill(bill: DashboardBill) {
  return (
    (bill.taskStatus === "ยกเลิก" && bill.paymentStatus === "ใบเสนอราคา") ||
    (bill.taskStatus === "เงินสด" && bill.paymentStatus === "จ่ายแล้ว") ||
    (bill.taskStatus === "เงินสด" && bill.paymentStatus === "งานค้าง")
  );
}

function compareTodayBills(a: DashboardBill, b: DashboardBill) {
  const aOrder = TODAY_TASK_STATUS_ORDER.get(a.taskStatus) ?? 99;
  const bOrder = TODAY_TASK_STATUS_ORDER.get(b.taskStatus) ?? 99;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  const aDate = parseSheetDate(a.date)?.getTime() || 0;
  const bDate = parseSheetDate(b.date)?.getTime() || 0;

  if (aDate !== bDate) {
    return bDate - aDate;
  }

  return a.plate.localeCompare(b.plate, "th");
}

function getStatusTone(value: string) {
  const normalized = normalizeStatus(value);

  if (normalized === "ส่งรถแล้ว" || normalized === "จ่ายแล้ว") {
    return "border-[#cfe2d4] bg-[#edf8ef] text-[#2c7a4b]";
  }

  if (
    normalized === "รอติดตั้ง" ||
    normalized === "รอชำระ" ||
    normalized === "ชำระบางส่วน"
  ) {
    return "border-[#e7d7b2] bg-[#fdf5e6] text-[#9a6d14]";
  }

  if (
    normalized === "ชำระเกิน" ||
    normalized === "ผ่อนชำระ" ||
    normalized === "ค่าใช้จ่าย" ||
    normalized === "ค่าอะไหล่"
  ) {
    return "border-[#d7cff6] bg-[#f5f1ff] text-[#6b52c8]";
  }

  if (
    normalized === "สั่งของ" ||
    normalized === "งานค้าง" ||
    normalized === "ไม่ระบุสถานะงาน" ||
    normalized === "ไม่ระบุสถานะจ่ายเงิน" ||
    normalized === "ไม่ระบุสถานะบิล"
  ) {
    return "border-[#d0d9ea] bg-[#eef4fb] text-[#486da8]";
  }

  if (normalized === "ยกเลิก" || normalized === "ใบเสนอราคา") {
    return "border-[#e4e6eb] bg-[#f5f6f8] text-[#666f7d]";
  }

  if (normalized === "เงินสด") {
    return "border-[#dde2e8] bg-[#f4f6f8] text-[#55606e]";
  }

  return "border-[#e4e6eb] bg-[#f7f8fa] text-[#5f6875]";
}

function getSectionTone(tone: "install" | "order" | "paymentDue" | "store") {
  if (tone === "install") {
    return {
      openSummary: "border-[#ecd8cb] bg-[#fcf2ed]",
      openEyebrow: "text-[#b9764f]",
      openTitle: "text-[#a35d33]",
      openDescription: "text-[#93644b]",
      openBadge: "border-[#efd8ca] bg-white text-[#a35d33]",
    };
  }

  if (tone === "order") {
    return {
      openSummary: "border-[#d0d9ea] bg-[#eef4fb]",
      openEyebrow: "text-[#6f88b4]",
      openTitle: "text-[#486da8]",
      openDescription: "text-[#5b79a8]",
      openBadge: "border-[#d6e0f0] bg-white text-[#486da8]",
    };
  }

  if (tone === "store") {
    return {
      openSummary: "border-[#d6dde5] bg-[#f2f5f8]",
      openEyebrow: "text-[#738394]",
      openTitle: "text-[#556779]",
      openDescription: "text-[#68798a]",
      openBadge: "border-[#dce3ea] bg-white text-[#556779]",
    };
  }

  return {
    openSummary: "border-[#d7cff6] bg-[#f5f1ff]",
    openEyebrow: "text-[#8474c4]",
    openTitle: "text-[#6b52c8]",
    openDescription: "text-[#7868b4]",
    openBadge: "border-[#ddd5f7] bg-white text-[#6b52c8]",
  };
}

const StatusPill = memo(function StatusPill({ value }: { value: string }) {
  return (
    <div
      className={`rounded-[10px] border px-2 py-1 text-[11px] font-medium ${getStatusTone(value)}`}
    >
      {value}
    </div>
  );
});

const BillCard = memo(function BillCard({
  bill,
  tone = "default",
  defaultOpen = false,
}: {
  bill: DashboardBill;
  tone?: "default" | "accent";
  defaultOpen?: boolean;
}) {
  const toneClasses =
    tone === "accent"
      ? "border-[#dbe2ee] bg-[#f4f7fb]"
      : "border-[#ececf0] bg-white";

  return (
    <details
      open={defaultOpen}
      className={`rounded-[18px] border ${toneClasses}`}
    >
      <summary className="cursor-pointer list-none p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-sm font-semibold text-gray-900">
            {bill.carLabel}
          </h3>
          <p className="shrink-0 text-sm font-semibold text-gray-900">
            {bill.totalLabel}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-600">
          <span className="truncate">{bill.customer}</span>
          <span className="shrink-0">{formatDate(bill.date)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusPill value={bill.taskStatus} />
          <StatusPill value={bill.paymentStatus} />
          <StatusPill value={bill.billStatus} />
        </div>
      </summary>
      <div className="px-3 pb-3">
        <p className="border-t border-[#f0f1f4] pt-2 text-xs leading-5 whitespace-pre-line text-gray-600">
          {bill.detail}
        </p>
        <div className="border-t border-[#f0f1f4] pt-2">
          <div className="flex items-center justify-end gap-3 text-xs">
            {bill.remainingAmount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="text-gray-500">คงเหลือ</span>
                <span className="text-[#9a6d14]">{bill.remainingLabel}</span>
                <span className="text-gray-400">/</span>
                <span className="text-[#486da8]">{bill.totalLabel}</span>
              </span>
            ) : (
              <span className="font-medium text-[#2c7a4b]">จ่ายแล้ว</span>
            )}
          </div>
        </div>
      </div>
    </details>
  );
});

const GroupSection = memo(function GroupSection({
  eyebrow,
  title,
  description,
  count,
  bills,
  emptyMessage,
  tone = "default",
  expandAllBills = false,
  onToggleExpandAllBills,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count: number;
  bills: DashboardBill[];
  emptyMessage: string;
  tone?: "default" | "accent";
  expandAllBills?: boolean;
  onToggleExpandAllBills?: () => void;
}) {
  return (
    <section className="rounded-[18px] border border-[#ececf0] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onToggleExpandAllBills ? (
            <button
              type="button"
              onClick={onToggleExpandAllBills}
              className="rounded-[10px] border border-[#d9e4f4] bg-[#f4f8fd] px-2 py-1 text-[11px] font-medium text-[#486da8] transition hover:border-[#c7d8ef] hover:bg-[#eaf2fc] hover:text-[#355987]"
            >
              {count} รายการ
            </button>
          ) : null}
          {!onToggleExpandAllBills ? (
            <span className="text-[11px] text-gray-600">{count} รายการ</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <BillCard
              key={`${bill.id}-${expandAllBills ? "open" : "closed"}`}
              bill={bill}
              tone={tone}
              defaultOpen={expandAllBills}
            />
          ))
        ) : (
          <div className="rounded-[18px] bg-[#f7f7f8] px-3 py-4 text-xs text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
});

const CollapsibleGroupSection = memo(function CollapsibleGroupSection({
  eyebrow,
  title,
  description,
  count,
  bills,
  emptyMessage,
  open,
  onOpenChange,
  tone,
  expandAllBills = false,
  onToggleExpandAllBills,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count: number;
  bills: DashboardBill[];
  emptyMessage: string;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tone: "install" | "order" | "paymentDue" | "store";
  expandAllBills?: boolean;
  onToggleExpandAllBills?: () => void;
}) {
  const toneClasses = getSectionTone(tone);
  const openBackgroundClass =
    tone === "order"
      ? "bg-[#eef4fb]"
      : tone === "paymentDue"
        ? "bg-[#f5f1ff]"
        : tone === "store"
          ? "bg-[#f2f5f8]"
          : "bg-[#fcf2ed]";

  return (
    <details
      open={open}
      className={`rounded-[18px] pb-2 ${
        open ? openBackgroundClass : "bg-white"
      }`}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary
        className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-[#ececf0] px-3 py-2.5"
      >
        <div>
          <p
            className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
              open ? toneClasses.openEyebrow : "text-gray-400"
            }`}
          >
            {eyebrow}
          </p>
          <h3
            className={`mt-0.5 text-sm font-semibold ${
              open ? toneClasses.openTitle : "text-gray-900"
            }`}
          >
            {title}
          </h3>
          {description ? (
            <p
              className={`mt-1 text-xs leading-5 font-normal ${
                open ? toneClasses.openDescription : "text-gray-500"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {onToggleExpandAllBills ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleExpandAllBills();
              }}
              className={`inline-flex items-center justify-center rounded-[10px] border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm transition ${
                open
                  ? "border-white/80 bg-white text-gray-700"
                  : "border-[#d9e4f4] bg-[#f4f8fd] text-[#486da8]"
              }`}
            >
              {count} รายการ
            </button>
          ) : null}
          {!onToggleExpandAllBills ? (
            <span
              className={`pt-0.5 text-[11px] font-medium whitespace-nowrap ${
                open ? toneClasses.openTitle : "text-gray-500"
              }`}
            >
              {count} รายการ
            </span>
          ) : null}
        </div>
      </summary>

      <div
        className={`space-y-2 px-2 pt-2 pb-1 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 ${
          open ? "bg-transparent" : "bg-white"
        }`}
      >
        {bills.length > 0 ? (
          bills.map((bill) => (
            <BillCard
              key={`${bill.id}-${expandAllBills ? "open" : "closed"}`}
              bill={bill}
              defaultOpen={expandAllBills}
            />
          ))
        ) : (
          <div className="rounded-[18px] bg-[#f7f7f8] px-3 py-4 text-xs text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </details>
  );
});

export default function DashboardPage() {
  const { error: liffError } = useLiff();
  const { error: appDataError } = useAppData();
  const {
    user,
    member,
    memberAll,
    employee,
    isLiffReady,
    isLiffLoading,
    loadUser,
    config,
  } = useAppStore();

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "error" as "error" | "success",
  });
  const [historyBills, setHistoryBills] = useState<DashboardBill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [todayReceivedAmount, setTodayReceivedAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openPendingGroups, setOpenPendingGroups] = useState({
    order: false,
    paymentDue: false,
    store: false,
  });
  const [expandTodayBills, setExpandTodayBills] = useState(false);
  const [expandPendingBills, setExpandPendingBills] = useState({
    order: false,
    paymentDue: false,
    store: false,
  });
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [today] = useState(() => new Date());
  const todaySectionRef = useRef<HTMLElement | null>(null);
  const orderSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentDueSectionRef = useRef<HTMLDivElement | null>(null);

  const isAdmin =
    member?.userRole === "admin" || employee?.userRole === "admin";

  useEffect(() => {
    if (liffError) {
      setNotification({ show: true, message: liffError, type: "error" });
    }
  }, [liffError]);

  useEffect(() => {
    if (appDataError) {
      setNotification({ show: true, message: appDataError, type: "error" });
    }
  }, [appDataError]);

  useEffect(() => {
    if (!notification.show) return;

    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 3200);

    return () => clearTimeout(timer);
  }, [notification.show]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 260);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isLiffReady || !user || !isAdmin) {
      setLoadingBills(false);
      setTodayReceivedAmount(0);
      return;
    }

    if (!config?.history) {
      setHistoryBills([]);
      setLoadingBills(false);
      setTodayReceivedAmount(0);
      return;
    }

    let active = true;

    const loadBills = async () => {
      try {
        setLoadingBills(true);
        const currentDate = new Date();
        const [historyResponse, billNamesResponse, billPaymentsResponse] =
          await Promise.all([
            authenticatedFetch("/api/gSheet/get", {
              method: "POST",
              body: JSON.stringify({ resource: "history" }),
            }),
            authenticatedFetch("/api/gSheet/get", {
              method: "POST",
              body: JSON.stringify({ resource: "bill_names" }),
            }),
            authenticatedFetch("/api/gSheet/get", {
              method: "POST",
              body: JSON.stringify({ resource: "bill_payments" }),
            }),
          ]);
        const [result, billNamesResult, billPaymentsResult] = await Promise.all(
          [
            historyResponse.json(),
            billNamesResponse.json(),
            billPaymentsResponse.json(),
          ],
        );

        if (!active) return;

        if (!historyResponse.ok) {
          throw new Error(result.error || "Failed to load bills");
        }
        if (!billNamesResponse.ok) {
          throw new Error(billNamesResult.error || "Failed to load bill names");
        }
        if (!billPaymentsResponse.ok) {
          throw new Error(
            billPaymentsResult.error || "Failed to load bill payments",
          );
        }

        const rows = Array.isArray(result.data) ? result.data : [];
        const billNameRows = Array.isArray(billNamesResult.data)
          ? billNamesResult.data
          : [];
        const billPaymentRows = Array.isArray(billPaymentsResult.data)
          ? billPaymentsResult.data
          : [];
        const memberMap = new Map<string, Member>(
          memberAll.map((item) => [normalizeStatus(item.userId), item]),
        );
        const billNameMap = new Map<string, string>(
          billNameRows
            .map((row: BillNameRow) => [
              getBillNameKey(row),
              getBillNameValue(row),
            ])
            .filter(
              (entry: [string, string]): entry is [string, string] =>
                Boolean(entry[0]) && Boolean(entry[1]),
            ),
        );
        const paymentTotals = billPaymentRows.reduce(
          (acc: Map<string, number>, row: BillPaymentRow) => {
            const billKey = getPaymentBillKey(row);
            if (!billKey) return acc;

            const current = acc.get(billKey) || 0;
            acc.set(billKey, current + getPaymentAmount(row));
            return acc;
          },
          new Map<string, number>(),
        );
        const receivedToday = billPaymentRows.reduce(
          (sum: number, row: BillPaymentRow) =>
            isSameDay(getPaymentDate(row), currentDate)
              ? sum + getPaymentAmount(row)
              : sum,
          0,
        );
        const normalized = rows
          .map((row: HistoryItem, index: number) =>
            normalizeBill(row, index, memberMap, billNameMap, paymentTotals),
          )
          .filter((bill: DashboardBill) => bill.totalAmount !== 0)
          .sort(
            (a: DashboardBill, b: DashboardBill) =>
              (parseSheetDate(b.date)?.getTime() || 0) -
              (parseSheetDate(a.date)?.getTime() || 0),
          );

        setHistoryBills(normalized);
        setTodayReceivedAmount(receivedToday);
      } catch (error) {
        if (!active) return;
        setHistoryBills([]);
        setTodayReceivedAmount(0);
        setNotification({
          show: true,
          message:
            error instanceof Error ? error.message : "โหลดข้อมูลบิลไม่สำเร็จ",
          type: "error",
        });
      } finally {
        if (active) {
          setLoadingBills(false);
        }
      }
    };

    loadBills();

    return () => {
      active = false;
    };
  }, [config, isAdmin, isLiffReady, memberAll, user]);

  const keyword = deferredSearchTerm.trim().toLowerCase();
  const shouldExpandHistory = keyword.length > 0;
  const visibleBills = useMemo(
    () =>
      historyBills.filter((bill) => {
        if (shouldExcludeBill(bill)) {
          return false;
        }

        if (!keyword) return true;
        return [bill.customer, bill.plate, bill.detail, bill.id]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      }),
    [historyBills, keyword],
  );

  const todayBills = useMemo(
    () =>
      visibleBills.filter(
        (bill) => isSameDay(bill.date, today) || bill.taskStatus === "รอติดตั้ง",
      ),
    [visibleBills, today],
  );
  const sortedTodayBills = useMemo(
    () => [...todayBills].sort(compareTodayBills),
    [todayBills],
  );
  const installBills = useMemo(
    () =>
      visibleBills.filter(
        (bill) => isSameDay(bill.date, today) || bill.taskStatus === "ค้างเบิก",
      ),
    [visibleBills, today],
  );
  const orderBills = useMemo(
    () => visibleBills.filter((bill) => bill.taskStatus === "สั่งของ"),
    [visibleBills],
  );
  const storeBills = useMemo(
    () =>
      visibleBills.filter(
        (bill) => bill.taskStatus === "เครดิต" || bill.taskStatus === "เงินสด",
      ),
    [visibleBills],
  );
  const paymentDueBills = useMemo(
    () =>
      visibleBills.filter(
        (bill) =>
          bill.billStatus === "ผ่อนชำระ" && bill.paymentStatus !== "จ่ายแล้ว",
      ),
    [visibleBills],
  );
  const historyBillsOnly = useMemo(
    () =>
      visibleBills.filter(
        (bill) => !todayBills.some((todayBill) => todayBill.id === bill.id),
      ),
    [visibleBills, todayBills],
  );
  const activeBills = useMemo(
    () =>
      Array.from(
        new Map(
          [...todayBills, ...installBills, ...orderBills, ...paymentDueBills].map(
            (bill) => [bill.id, bill],
          ),
        ).values(),
      ),
    [todayBills, installBills, orderBills, paymentDueBills],
  );

  const historyByMonth = useMemo(
    () =>
      historyBillsOnly.reduce<
    Array<{
      monthLabel: string;
      dates: Array<{ dateLabel: string; bills: DashboardBill[] }>;
    }>
  >((groups, bill) => {
        const monthLabel = formatMonthYear(bill.date);
        const dateLabel = formatDate(bill.date);
        const monthGroup = groups.find((group) => group.monthLabel === monthLabel);

        if (!monthGroup) {
          groups.push({
            monthLabel,
            dates: [{ dateLabel, bills: [bill] }],
          });
          return groups;
        }

        const dateGroup = monthGroup.dates.find(
          (group) => group.dateLabel === dateLabel,
        );
        if (!dateGroup) {
          monthGroup.dates.push({ dateLabel, bills: [bill] });
          return groups;
        }

        dateGroup.bills.push(bill);
        return groups;
      }, []),
    [historyBillsOnly],
  );

  const waitingInstallRemainingAmount = useMemo(
    () =>
      activeBills.reduce(
        (sum, bill) =>
          bill.taskStatus === "รอติดตั้ง" ? sum + bill.remainingAmount : sum,
        0,
      ),
    [activeBills],
  );
  const todayJobsTotalAmount = useMemo(
    () => sortedTodayBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    [sortedTodayBills],
  );
  const todayJobsCount = sortedTodayBills.length;
  const pendingBills = useMemo(
    () =>
      Array.from(
        new Map(
          [...storeBills, ...orderBills, ...paymentDueBills].map((bill) => [
            bill.id,
            bill,
          ]),
        ).values(),
      ),
    [storeBills, orderBills, paymentDueBills],
  );
  const installBillsRemainingAmount = useMemo(
    () => installBills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
    [installBills],
  );
  const orderBillsRemainingAmount = useMemo(
    () => orderBills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
    [orderBills],
  );
  const storeBillsRemainingAmount = useMemo(
    () => storeBills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
    [storeBills],
  );
  const paymentDueRemainingAmount = useMemo(
    () => paymentDueBills.reduce((sum, bill) => sum + bill.remainingAmount, 0),
    [paymentDueBills],
  );
  const pendingJobs = pendingBills.length;
  const isAllPendingGroupsOpen =
    openPendingGroups.order &&
    openPendingGroups.paymentDue &&
    openPendingGroups.store;

  const scrollToSection = (
    ref: { current: HTMLElement | null } | { current: HTMLDivElement | null },
    pendingGroup?: "order" | "paymentDue" | "store",
  ) => {
    if (pendingGroup) {
      setOpenPendingGroups({
        order: pendingGroup === "order",
        paymentDue: pendingGroup === "paymentDue",
        store: pendingGroup === "store",
      });
    }
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLiffLoading || loadUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F9FA]">
        <Loader />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F9FA]">
        <Loader />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#F9F9FA] px-4 py-12 text-gray-900">
        <div className="mx-auto max-w-sm rounded-[22px] border border-gray-200 bg-white p-6 text-center shadow-sm">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
            Store Dashboard
          </p>
          <h1 className="mt-3 text-xl font-semibold">
            หน้านี้สำหรับผู้ดูแลร้าน
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            เมื่อบัญชีมีสิทธิ์แอดมิน จะเห็นภาพรวมบิล งานวันนี้
            และงานค้างจากหน้านี้
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F9FA] pb-24 text-gray-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),_rgba(249,249,250,0))]" />
      <section className="relative border-b border-gray-100/80 bg-transparent">
        <div className="mx-auto max-w-7xl px-3 pt-3 pb-3 sm:px-4">
          <div className="rounded-[22px] border border-[#ececf0] bg-white p-3 shadow-[0_14px_40px_rgba(15,23,42,0.05)] lg:p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Dashboard
                </p>
                <h1 className="mt-1 text-xl leading-tight font-semibold text-gray-900">
                  Paopao Racing
                </h1>
              </div>

              <div className="shrink-0 rounded-[18px] border border-[#ececf0] bg-white px-2 py-1.5">
                <UserProfile
                  pictureUrl={user.pictureUrl}
                  displayName={employee?.nickname || user.displayName}
                  statusMessage={employee?.role || "ผู้ดูแลร้าน"}
                  compact
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 rounded-[18px] border border-[#e6e6ea] bg-[#F7F7F8] px-3 py-2 text-xs text-gray-600 lg:mt-4 lg:max-w-xl">
              <HiMagnifyingGlass className="h-4 w-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาป้ายทะเบียน รายละเอียด หรือเลขบิล"
                className="w-full bg-transparent outline-none placeholder:text-gray-400"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="ล้างคำค้น"
                >
                  <HiMiniXMark className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-3 py-3 sm:px-4 lg:py-4">
        {loadingBills ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[22px] border border-[#ececf0] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <Loader />
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            <section className="space-y-2">
              <p className="my-0 mt-1 px-4 py-0 text-right text-lg font-medium text-gray-700 lg:px-0 lg:text-left">
                {formatDayTitle(today)}
              </p>
              <article className="rounded-[18px] border border-[#ececf0] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">
                    ยอดเงินที่รับชำระวันนี้
                  </p>
                  <HiBanknotes className="h-4 w-4 text-[#2f6b45]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#2f6b45] lg:text-[2rem]">
                  {formatCurrency(todayReceivedAmount)}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  ยอดรอติดตั้ง : {formatCurrency(waitingInstallRemainingAmount)}
                </p>
              </article>
            </section>

            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => scrollToSection(todaySectionRef)}
                className="rounded-[18px] border border-[#ececf0] bg-white p-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#dfe2e8] hover:bg-[#fcfcfd] lg:min-h-[148px] lg:p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">งานวันนี้</p>
                  <HiCalendarDays className="h-4 w-4 text-[#4f6893]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#4f6893]">
                  {todayJobsCount} บิล
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  (ยอดบิล) : {formatCurrency(todayJobsTotalAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(todaySectionRef)}
                className="rounded-[18px] border border-[#e7e7eb] bg-[#F7F7F8] p-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#ddd6cf] hover:bg-[#faf6f2] lg:min-h-[148px] lg:p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">ค่าใช้จ่าย</p>
                  <HiMiniClock className="h-4 w-4 text-[#a35d33]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#a35d33]">
                  {installBills.length} บิล
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  (คงค้าง) : {formatCurrency(installBillsRemainingAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(orderSectionRef, "order")}
                className="rounded-[18px] border border-[#ececf0] bg-white p-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#e0dfd7] hover:bg-[#fefcf7] lg:min-h-[148px] lg:p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">สั่งของ</p>
                  <HiMiniClock className="h-4 w-4 text-[#8b6a24]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#8b6a24]">
                  {orderBills.length} บิล
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  (คงค้าง) : {formatCurrency(orderBillsRemainingAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection(paymentDueSectionRef, "paymentDue")
                }
                className="rounded-[18px] border border-[#ececf0] bg-white p-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#dfdbef] hover:bg-[#faf8ff] lg:min-h-[148px] lg:p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">ค้างชำระ</p>
                  <HiMiniClock className="h-4 w-4 text-[#6558a8]" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#6558a8]">
                  {paymentDueBills.length} บิล
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  (คงค้าง) : {formatCurrency(paymentDueRemainingAmount)}
                </p>
              </button>
            </section>

            <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start lg:gap-3">
              <div className="space-y-3">
                <section ref={todaySectionRef}>
                  <GroupSection
                    eyebrow="Today"
                    title="งานวันนี้"
                    count={sortedTodayBills.length}
                    bills={sortedTodayBills}
                    emptyMessage="วันนี้ยังไม่มีรายการที่ตรงกับคำค้น"
                    expandAllBills={expandTodayBills}
                    onToggleExpandAllBills={() =>
                      setExpandTodayBills((prev) => !prev)
                    }
                  />
                </section>

                <section className="rounded-[18px] border border-[#ececf0] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                        Pending Groups
                      </p>
                      <h2 className="mt-1 text-base font-semibold text-gray-900">
                        จัดการงาน
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPendingGroups({
                          order: !isAllPendingGroupsOpen,
                          paymentDue: !isAllPendingGroupsOpen,
                          store: !isAllPendingGroupsOpen,
                        })
                      }
                      className="inline-flex items-center justify-center rounded-[10px] border border-[#d9e4f4] bg-[#f4f8fd] px-2.5 py-1 text-[11px] font-medium text-[#486da8] shadow-sm transition hover:border-[#c7d8ef] hover:bg-[#eaf2fc] hover:text-[#355987]"
                    >
                      {pendingJobs} รายการ
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div ref={orderSectionRef}>
                      <CollapsibleGroupSection
                        eyebrow="Order"
                        title="▼ สั่งของ"
                        description={`ยอดคงค้างรวม ${formatCurrency(orderBillsRemainingAmount)}`}
                        count={orderBills.length}
                        bills={orderBills}
                        emptyMessage="ไม่มีรายการสั่งของ"
                        open={openPendingGroups.order}
                        onOpenChange={(isOpen) => {
                          setOpenPendingGroups((prev) => ({
                            ...prev,
                            order: isOpen,
                          }));
                          if (!isOpen) {
                            setExpandPendingBills((prev) => ({
                              ...prev,
                              order: false,
                            }));
                          }
                        }}
                        expandAllBills={expandPendingBills.order}
                        onToggleExpandAllBills={() =>
                          setOpenPendingGroups((prevOpen) => {
                            const shouldCollapse =
                              prevOpen.order && expandPendingBills.order;

                            setExpandPendingBills((prevExpand) => ({
                              ...prevExpand,
                              order: shouldCollapse ? false : true,
                            }));

                            return {
                              ...prevOpen,
                              order: shouldCollapse ? false : true,
                            };
                          })
                        }
                        tone="order"
                      />
                    </div>

                    <div ref={paymentDueSectionRef}>
                      <CollapsibleGroupSection
                        eyebrow="Payment Due"
                        title="▼ ค้างชำระ"
                        description={`ยอดคงค้างรวม ${formatCurrency(paymentDueRemainingAmount)}`}
                        count={paymentDueBills.length}
                        bills={paymentDueBills}
                        emptyMessage="ไม่มีรายการค้างชำระ"
                        open={openPendingGroups.paymentDue}
                        onOpenChange={(isOpen) => {
                          setOpenPendingGroups((prev) => ({
                            ...prev,
                            paymentDue: isOpen,
                          }));
                          if (!isOpen) {
                            setExpandPendingBills((prev) => ({
                              ...prev,
                              paymentDue: false,
                            }));
                          }
                        }}
                        expandAllBills={expandPendingBills.paymentDue}
                        onToggleExpandAllBills={() =>
                          setOpenPendingGroups((prevOpen) => {
                            const shouldCollapse =
                              prevOpen.paymentDue &&
                              expandPendingBills.paymentDue;

                            setExpandPendingBills((prevExpand) => ({
                              ...prevExpand,
                              paymentDue: shouldCollapse ? false : true,
                            }));

                            return {
                              ...prevOpen,
                              paymentDue: shouldCollapse ? false : true,
                            };
                          })
                        }
                        tone="paymentDue"
                      />
                    </div>

                    <CollapsibleGroupSection
                      eyebrow="Store"
                      title="▼ ร้านค้า"
                      description={`ยอดคงค้างรวม ${formatCurrency(storeBillsRemainingAmount)}`}
                      count={storeBills.length}
                      bills={storeBills}
                      emptyMessage="ไม่มีรายการร้านค้า"
                      open={openPendingGroups.store}
                      onOpenChange={(isOpen) => {
                        setOpenPendingGroups((prev) => ({
                          ...prev,
                          store: isOpen,
                        }));
                        if (!isOpen) {
                          setExpandPendingBills((prev) => ({
                            ...prev,
                            store: false,
                          }));
                        }
                      }}
                      expandAllBills={expandPendingBills.store}
                      onToggleExpandAllBills={() =>
                        setOpenPendingGroups((prevOpen) => {
                          const shouldCollapse =
                            prevOpen.store && expandPendingBills.store;

                          setExpandPendingBills((prevExpand) => ({
                            ...prevExpand,
                            store: shouldCollapse ? false : true,
                          }));

                          return {
                            ...prevOpen,
                            store: shouldCollapse ? false : true,
                          };
                        })
                      }
                      tone="store"
                    />
                  </div>
                </section>
              </div>

              <section className="mt-3 rounded-[18px] border border-[#ececf0] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:sticky lg:top-3 lg:mt-0 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-auto">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                      History
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-gray-900">
                      ประวัติบิล
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      สำหรับค้นหาย้อนหลัง โดยจัดกลุ่มตามเดือนและวันที่
                    </p>
                  </div>
                  <span className="rounded-[10px] bg-[#f7f7f8] px-2 py-1 text-[11px] text-gray-600">
                    {historyBillsOnly.length} รายการ
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {historyByMonth.length > 0 ? (
                    historyByMonth.map((monthGroup) => (
                      <details
                        key={monthGroup.monthLabel}
                        open={shouldExpandHistory}
                        className="rounded-[18px] border border-[#ececf0] bg-white"
                      >
                        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-gray-900">
                          {monthGroup.monthLabel}
                        </summary>
                        <div className="space-y-2 border-t border-[#f0f1f4] px-2 py-2">
                          {monthGroup.dates.map((dateGroup) => (
                            <details
                              key={`${monthGroup.monthLabel}-${dateGroup.dateLabel}`}
                              open={shouldExpandHistory}
                              className="rounded-[18px] bg-[#f7f7f8]"
                            >
                              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-gray-700">
                                {dateGroup.dateLabel} ({dateGroup.bills.length})
                              </summary>
                              <div className="space-y-2 px-2 pb-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0">
                                {dateGroup.bills.map((bill) => (
                                  <BillCard
                                    key={bill.id}
                                    bill={bill}
                                    defaultOpen={shouldExpandHistory}
                                  />
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))
                  ) : (
                    <div className="rounded-[18px] bg-gray-50 px-3 py-4 text-xs text-gray-500">
                      ไม่มีประวัติบิลที่ตรงกับคำค้น
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>

      {showBackToTop ? (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
          className="fixed right-3 bottom-24 z-40 rounded-full border border-[#cfe0fb] bg-[#eef5ff] p-3 text-[#3f6da8] shadow-[0_14px_30px_rgba(72,109,168,0.18)] backdrop-blur"
          aria-label="Back to top"
        >
          <HiArrowUp className="h-4 w-4" />
        </button>
      ) : null}

      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </main>
  );
}
