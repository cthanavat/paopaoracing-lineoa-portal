"use client";

import { useEffect, useDeferredValue, useState } from "react";
import {
  HiArrowUp,
  HiBanknotes,
  HiCalendarDays,
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

const WAITING_TASK_STATUSES = new Set(["รอติดตั้ง", "สั่งของ"]);

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

function getStatusTone(value: string) {
  const normalized = normalizeStatus(value);

  if (normalized === "ส่งรถแล้ว" || normalized === "จ่ายแล้ว") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (
    normalized === "รอติดตั้ง" ||
    normalized === "รอชำระ" ||
    normalized === "ชำระบางส่วน"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (normalized === "ชำระเกิน" || normalized === "ผ่อนชำระ") {
    return "border-violet-200 bg-violet-50 text-violet-800";
  }

  if (
    normalized === "สั่งของ" ||
    normalized === "งานค้าง" ||
    normalized === "ไม่ระบุสถานะงาน" ||
    normalized === "ไม่ระบุสถานะจ่ายเงิน" ||
    normalized === "ไม่ระบุสถานะบิล"
  ) {
    return "border-blue-100 bg-blue-50 text-blue-800";
  }

  if (normalized === "ยกเลิก" || normalized === "ใบเสนอราคา") {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  if (normalized === "เงินสด") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function StatusPill({ value }: { value: string }) {
  return (
    <div
      className={`rounded-[10px] border px-2 py-1 text-[11px] font-medium ${getStatusTone(value)}`}
    >
      {value}
    </div>
  );
}

function BillCard({
  bill,
  tone = "default",
}: {
  bill: DashboardBill;
  tone?: "default" | "accent";
}) {
  const toneClasses =
    tone === "accent"
      ? "border-blue-100 bg-blue-50"
      : "border-gray-200 bg-white";

  return (
    <details className={`rounded-[18px] border ${toneClasses}`}>
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
        <div className="border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-600">
            <span>จ่ายแล้ว</span>
            <span className="font-medium text-gray-900">{bill.paidLabel}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-gray-600">
            <span>คงค้าง</span>
            <span
              className={`font-medium ${bill.remainingAmount > 0 ? "text-amber-700" : "text-green-700"}`}
            >
              {bill.remainingLabel}
            </span>
          </div>
        </div>
        <p className="border-t border-gray-100 pt-2 text-xs leading-5 whitespace-pre-line text-gray-600">
          {bill.detail}
        </p>
      </div>
    </details>
  );
}

function GroupSection({
  eyebrow,
  title,
  description,
  count,
  bills,
  emptyMessage,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count: number;
  bills: DashboardBill[];
  emptyMessage: string;
  tone?: "default" | "accent";
}) {
  return (
    <section className="rounded-[18px] border border-gray-200 bg-white p-3 shadow-sm">
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
        <span className="rounded-[10px] bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
          {count} รายการ
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} tone={tone} />
          ))
        ) : (
          <div className="rounded-[18px] bg-gray-50 px-3 py-4 text-xs text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  );
}

function CollapsibleGroupSection({
  eyebrow,
  title,
  description,
  count,
  bills,
  emptyMessage,
  defaultOpen,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count: number;
  bills: DashboardBill[];
  emptyMessage: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="bg-white shadow-[0_1px_0_rgba(17,24,39,0.05)]"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-[18px] bg-white px-3 py-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
            {eyebrow}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-gray-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 font-normal text-gray-500">
              {description}
            </p>
          ) : null}
        </div>
        <span className="rounded-[10px] border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500">
          {count} รายการ
        </span>
      </summary>

      <div className="space-y-2 bg-white px-0 pt-1 pb-1">
        {bills.length > 0 ? (
          bills.map((bill) => <BillCard key={bill.id} bill={bill} />)
        ) : (
          <div className="rounded-[18px] bg-gray-50 px-3 py-4 text-xs text-gray-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </details>
  );
}

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
  const deferredSearchTerm = useDeferredValue(searchTerm);

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
      setShowBackToTop(window.scrollY > 520);
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
          .filter((bill: DashboardBill) => bill.totalAmount > 0)
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

  const today = new Date();
  const keyword = deferredSearchTerm.trim().toLowerCase();
  const visibleBills = historyBills.filter((bill) => {
    if (shouldExcludeBill(bill)) {
      return false;
    }

    if (!keyword) return true;
    return [bill.customer, bill.plate, bill.detail, bill.id]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  const todayBills = visibleBills.filter(
    (bill) => isSameDay(bill.date, today) || bill.taskStatus === "รอติดตั้ง",
  );
  const waitingBills = visibleBills.filter(
    (bill) =>
      !isSameDay(bill.date, today) &&
      WAITING_TASK_STATUSES.has(bill.taskStatus),
  );
  const paymentPendingBills = visibleBills.filter(
    (bill) => bill.remainingAmount > 0,
  );
  const historyBillsOnly = visibleBills.filter(
    (bill) => !todayBills.some((todayBill) => todayBill.id === bill.id),
  );
  const activeBills = Array.from(
    new Map(
      [...todayBills, ...waitingBills, ...paymentPendingBills].map((bill) => [
        bill.id,
        bill,
      ]),
    ).values(),
  );

  const historyByMonth = historyBillsOnly.reduce<
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
  }, []);

  const waitingInstallRemainingAmount = activeBills.reduce(
    (sum, bill) =>
      bill.taskStatus === "รอติดตั้ง" ? sum + bill.remainingAmount : sum,
    0,
  );
  const todayJobsTotalAmount = todayBills.reduce(
    (sum, bill) => sum + bill.totalAmount,
    0,
  );
  const todayJobsCount = todayBills.length;
  const pendingBills = Array.from(
    new Map(
      [...waitingBills, ...paymentPendingBills].map((bill) => [bill.id, bill]),
    ).values(),
  );
  const waitingBillsRemainingAmount = waitingBills.reduce(
    (sum, bill) => sum + bill.remainingAmount,
    0,
  );
  const paymentPendingRemainingAmount = paymentPendingBills.reduce(
    (sum, bill) => sum + bill.remainingAmount,
    0,
  );
  const pendingBillsTotalAmount = pendingBills.reduce(
    (sum, bill) => sum + bill.totalAmount,
    0,
  );
  const pendingJobs = pendingBills.length;

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
        <div className="mx-auto max-w-5xl px-3 pt-3 pb-3 sm:px-4">
          <div className="rounded-[22px] border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Dashboard
                </p>
                <h1 className="mt-1 text-xl leading-tight font-semibold text-gray-900">
                  Paopao Racing
                </h1>
              </div>

              <div className="shrink-0 rounded-[18px] border border-gray-100 bg-white px-2 py-1.5">
                <UserProfile
                  pictureUrl={user.pictureUrl}
                  displayName={employee?.nickname || user.displayName}
                  statusMessage={employee?.role || "ผู้ดูแลร้าน"}
                  compact
                />
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 rounded-[18px] border border-gray-100 bg-[#F9F9FA] px-3 py-2 text-xs text-gray-600">
              <HiMagnifyingGlass className="h-4 w-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาป้ายทะเบียน รายละเอียด หรือเลขบิล"
                className="w-full bg-transparent outline-none placeholder:text-gray-400"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-3 py-3 sm:px-4">
        {loadingBills ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[22px] border border-gray-100 bg-white">
            <Loader />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="rounded-[18px] border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
                <p className="text-md mt-1 font-medium text-gray-700">
                  {formatDayTitle(today)}
                </p>
              </div>
              <article className="rounded-[18px] border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    ยอดเงินที่รับชำระวันนี้
                  </p>
                  <HiBanknotes className="h-4 w-4 text-green-700" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {formatCurrency(todayReceivedAmount)}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  ยอดรอติดตั้ง :{" "}
                  {formatCurrency(waitingInstallRemainingAmount)}{" "}
                </p>
              </article>

              <div className="grid grid-cols-2 gap-2">
                <article className="rounded-[18px] border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">งานวันนี้</p>
                    <HiCalendarDays className="h-4 w-4 text-blue-700" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {todayJobsCount} คัน
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    (ยอดบิล) : {formatCurrency(todayJobsTotalAmount)}
                  </p>
                </article>

                <article className="rounded-[18px] border border-[#E9E9E9] bg-[#F7F7F7] p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">งานค้าง</p>
                    <HiMiniClock className="h-4 w-4 text-gray-700" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {pendingJobs} คัน
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    (คงค้าง) : {formatCurrency(pendingBillsTotalAmount)}
                  </p>
                </article>
              </div>
            </div>

            <GroupSection
              eyebrow="Today"
              title="งานวันนี้"
              count={todayBills.length}
              bills={todayBills}
              emptyMessage="วันนี้ยังไม่มีรายการที่ตรงกับคำค้น"
            />

            <section className="rounded-[18px] border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                    Pending Groups
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-gray-900">
                    งานค้าง
                  </h2>
                </div>
                <span className="rounded-[10px] bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                  {pendingJobs} รายการ
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <CollapsibleGroupSection
                  eyebrow="Waiting"
                  title="▼ รอติดตั้ง, สั่งของ"
                  description={`ยอดคงค้างรวม ${formatCurrency(waitingBillsRemainingAmount)}`}
                  count={waitingBills.length}
                  bills={waitingBills}
                  emptyMessage="ไม่มีงานค้างในกลุ่ม Waiting"
                  defaultOpen
                />

                <CollapsibleGroupSection
                  eyebrow="Payment Pending"
                  title="▼ รอชําระ, ผ่อนชำระ"
                  description={`ยอดคงค้างรวม ${formatCurrency(paymentPendingRemainingAmount)}`}
                  count={paymentPendingBills.length}
                  bills={paymentPendingBills}
                  emptyMessage="ไม่มีรายการในกลุ่ม Payment Pending"
                />
              </div>
            </section>

            <section className="rounded-[18px] border border-gray-100 bg-white p-3 shadow-sm">
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
                <span className="rounded-[10px] bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                  {historyBillsOnly.length} รายการ
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {historyByMonth.length > 0 ? (
                  historyByMonth.map((monthGroup) => (
                    <details
                      key={monthGroup.monthLabel}
                      className="rounded-[18px] border border-gray-100 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-gray-900">
                        {monthGroup.monthLabel}
                      </summary>
                      <div className="space-y-2 border-t border-gray-100 px-2 py-2">
                        {monthGroup.dates.map((dateGroup) => (
                          <details
                            key={`${monthGroup.monthLabel}-${dateGroup.dateLabel}`}
                            className="rounded-[18px] bg-gray-50"
                          >
                            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-gray-700">
                              {dateGroup.dateLabel} ({dateGroup.bills.length})
                            </summary>
                            <div className="space-y-2 px-2 pb-2">
                              {dateGroup.bills.map((bill) => (
                                <BillCard key={bill.id} bill={bill} />
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
          className="fixed right-3 bottom-24 z-40 rounded-full border border-gray-200 bg-white/95 p-3 text-gray-700 shadow-[0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur"
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
