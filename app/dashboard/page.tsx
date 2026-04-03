"use client";

import Image from "next/image";
import {
  memo,
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HiArrowUp,
  HiBanknotes,
  HiCreditCard,
  HiMiniXMark,
  HiMagnifyingGlass,
  HiReceiptPercent,
  HiShoppingBag,
  HiWrenchScrewdriver,
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

interface PaymentMethodSummary {
  label: string;
  amount: number;
  count: number;
  details?: string;
}

interface PaymentMethodBucket {
  amount: number;
  count: number;
  details: Set<string>;
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

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isEmployeeActive(active?: string) {
  return ["true", "1", "yes", "active"].includes(normalizeValue(active));
}

function hasDashboardAccess(role?: string, active?: string) {
  const normalizedRole = normalizeValue(role);
  return (
    isEmployeeActive(active) &&
    ["admin", "manager", "supervisor"].includes(normalizedRole)
  );
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
  const monthShort = parsed.toLocaleDateString("en-US", { month: "short" });
  return `${year}-${month} (${monthShort})`;
}

function formatDayTitle(value: Date) {
  const weekday = value.toLocaleDateString("en-US", { weekday: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = value.getFullYear();
  return `${weekday}, ${day}/${month}/${year}`;
}

function formatDateFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getPaymentMethod(row: BillPaymentRow) {
  return normalizeStatus(
    row.payment_type ||
      row.payment_method ||
      row.pay_type ||
      row.payment_channel ||
      row.channel ||
      row.method ||
      row.pay_by ||
      row.bill_credit_type ||
      row.credit_type,
  );
}

function categorizePaymentMethod(value: string) {
  return normalizeStatus(value) || "ไม่ระบุ";
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
    normalized === "รอจ่าย" ||
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
      openSummary: "border-[#e6c9b8] bg-[#f7e6dc]",
      openEyebrow: "text-[#b9764f]",
      openTitle: "text-[#a35d33]",
      openDescription: "text-[#93644b]",
      openBadge: "border-[#efd8ca] bg-white text-[#a35d33]",
    };
  }

  if (tone === "order") {
    return {
      openSummary: "border-[#e3d3a7] bg-[#f3ead1]",
      openEyebrow: "text-[#9b7a2f]",
      openTitle: "text-[#8b6a24]",
      openDescription: "text-[#8b7441]",
      openBadge: "border-[#ddcfa7] bg-white text-[#8b6a24]",
    };
  }

  if (tone === "store") {
    return {
      openSummary: "border-[#c8d2dc] bg-[#e3eaf1]",
      openEyebrow: "text-[#738394]",
      openTitle: "text-[#556779]",
      openDescription: "text-[#68798a]",
      openBadge: "border-[#d1d9e3] bg-white text-[#556779]",
    };
  }

  return {
    openSummary: "border-[#cec2f4] bg-[#ece5ff]",
    openEyebrow: "text-[#8474c4]",
    openTitle: "text-[#6b52c8]",
    openDescription: "text-[#7868b4]",
    openBadge: "border-[#ddd5f7] bg-white text-[#6b52c8]",
  };
}

const StatusPill = memo(function StatusPill({ value }: { value: string }) {
  return (
    <div
      className={`rounded-[8px] border px-2 py-1 text-[11px] font-medium ${getStatusTone(value)}`}
    >
      {value}
    </div>
  );
});

const BillCard = memo(function BillCard({
  bill,
  tone = "default",
  defaultOpen = false,
  largeText = false,
}: {
  bill: DashboardBill;
  tone?: "default" | "accent";
  defaultOpen?: boolean;
  largeText?: boolean;
}) {
  const toneClasses =
    tone === "accent"
      ? "border-[#c8d4e6] bg-[#f4f7fb]"
      : "border-[#d4d9e1] bg-white";

  return (
    <details
      open={defaultOpen}
      className={`rounded-[16px] border ${toneClasses}`}
    >
      <summary className="cursor-pointer list-none p-3">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={`min-w-0 font-semibold text-gray-900 ${
              largeText ? "text-base" : "text-sm"
            }`}
          >
            {bill.carLabel}
          </h3>
          <p
            className={`shrink-0 font-semibold text-gray-900 ${
              largeText ? "text-base" : "text-sm"
            }`}
          >
            {bill.totalLabel}
          </p>
        </div>
        <div
          className={`mt-1 flex items-center justify-between gap-3 text-gray-600 ${
            largeText ? "text-sm" : "text-xs"
          }`}
        >
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
        <p
          className={`border-t border-[#dde3eb] pt-2 whitespace-pre-line text-gray-600 ${
            largeText ? "text-sm leading-6" : "text-xs leading-5"
          }`}
        >
          {bill.detail}
        </p>
        <div className="border-t border-[#dde3eb] pt-2">
          <div
            className={`flex items-center justify-end gap-3 ${
              largeText ? "text-sm" : "text-xs"
            }`}
          >
            {bill.remainingAmount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="text-[#c24141]">ค้างจ่าย</span>
                <span className="text-[#c24141]">{bill.remainingLabel}</span>
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
  sectionTone = "neutral",
  expandAllBills = false,
  onToggleExpandAllBills,
  largeText = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count: number;
  bills: DashboardBill[];
  emptyMessage: string;
  tone?: "default" | "accent";
  sectionTone?: "neutral" | "today";
  expandAllBills?: boolean;
  onToggleExpandAllBills?: () => void;
  largeText?: boolean;
}) {
  const sectionClasses =
    sectionTone === "today"
      ? "border-[#c0cde3] bg-[#e3edf9]"
      : "border-[#d4d9e1] bg-white";

  return (
    <section
      className={`rounded-[16px] border p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${sectionClasses}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
              sectionTone === "today" ? "text-[#5b79a8]" : "text-gray-500"
            }`}
          >
            {eyebrow}
          </p>
          <h2
            className={`mt-1 text-base font-semibold ${
              sectionTone === "today" ? "text-[#486da8]" : "text-gray-900"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={`mt-1 text-xs leading-5 ${
                sectionTone === "today" ? "text-[#5d78a1]" : "text-gray-600"
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
              onClick={onToggleExpandAllBills}
              className={`rounded-[8px] border px-2 py-1 text-[11px] font-medium transition ${
                sectionTone === "today"
                  ? "border-[#b0c0da] bg-white text-[#486da8] hover:border-[#9db2d2] hover:bg-[#edf4fc] hover:text-[#355987]"
                  : "border-[#c0d0e9] bg-[#f4f8fd] text-[#486da8] hover:border-[#aebfdd] hover:bg-[#eaf2fc] hover:text-[#355987]"
              }`}
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
              largeText={largeText}
            />
          ))
        ) : (
          <div className="rounded-[16px] bg-[#f7f7f8] px-3 py-4 text-xs text-gray-500">
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
  largeText = false,
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
  largeText?: boolean;
}) {
  const toneClasses = getSectionTone(tone);
  const openBackgroundClass =
    tone === "order"
      ? "bg-[#f3ead1]"
      : tone === "paymentDue"
        ? "bg-[#ece5ff]"
        : tone === "store"
          ? "bg-[#e3eaf1]"
          : "bg-[#f7e6dc]";

  return (
    <details
      open={open}
      className={`rounded-[16px] pb-2 ${
        open ? openBackgroundClass : "bg-white"
      }`}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-[#d4d9e1] px-3 py-2.5">
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
              className={`inline-flex items-center justify-center rounded-[8px] border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm transition ${
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
              largeText={largeText}
            />
          ))
        ) : (
          <div className="rounded-[16px] bg-[#f7f7f8] px-3 py-4 text-xs text-gray-500">
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
  const [todayPaymentBreakdown, setTodayPaymentBreakdown] = useState<
    PaymentMethodSummary[]
  >([]);
  const [showTodayPaymentModal, setShowTodayPaymentModal] = useState(false);
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
  const [openHistoryDates, setOpenHistoryDates] = useState<
    Record<string, boolean>
  >({});
  const [expandHistoryBills, setExpandHistoryBills] = useState<
    Record<string, boolean>
  >({});
  const [useLargeBillText, setUseLargeBillText] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [today] = useState(() => new Date());
  const todaySectionRef = useRef<HTMLElement | null>(null);
  const orderSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentDueSectionRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = hasDashboardAccess(employee?.role, employee?.active);

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
    if (!showTodayPaymentModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowTodayPaymentModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTodayPaymentModal]);

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
      setTodayPaymentBreakdown([]);
      return;
    }

    if (!config?.history) {
      setHistoryBills([]);
      setLoadingBills(false);
      setTodayReceivedAmount(0);
      setTodayPaymentBreakdown([]);
      return;
    }

    let active = true;
    let hasLoadedOnce = false;

    const loadBills = async (showLoadingState = false) => {
      try {
        if (showLoadingState || !hasLoadedOnce) {
          setLoadingBills(true);
        }
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
        const todayMethodMap: Map<string, PaymentMethodBucket> = new Map();
        for (const row of billPaymentRows as BillPaymentRow[]) {
          if (!isSameDay(getPaymentDate(row), currentDate)) {
            continue;
          }

          const amount = getPaymentAmount(row);
          const bucket = categorizePaymentMethod(getPaymentMethod(row));
          const rawMethod = getPaymentMethod(row);
          const entry: PaymentMethodBucket = todayMethodMap.get(bucket) || {
            amount: 0,
            count: 0,
            details: new Set<string>(),
          };

          entry.amount += amount;
          entry.count += 1;
          if (rawMethod && bucket === rawMethod) {
            entry.details.add(rawMethod);
          }
          todayMethodMap.set(bucket, entry);
        }
        const receivedToday = Array.from(
          todayMethodMap.values(),
        ).reduce<number>((sum, entry) => sum + entry.amount, 0);
        const todayBreakdown: PaymentMethodSummary[] = Array.from(
          todayMethodMap.keys(),
        )
          .sort((a, b) => a.localeCompare(b, "th"))
          .map((label): PaymentMethodSummary => {
            const entry = todayMethodMap.get(label);
            return {
              label,
              amount: entry?.amount || 0,
              count: entry?.count || 0,
              details:
                entry && entry.details.size > 0
                  ? Array.from(entry.details).join(", ")
                  : undefined,
            };
          })
          .filter(
            (entry: PaymentMethodSummary) =>
              entry.amount !== 0 || entry.count > 0,
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
        setTodayPaymentBreakdown(todayBreakdown);
        hasLoadedOnce = true;
      } catch (error) {
        if (!active) return;
        setHistoryBills([]);
        setTodayReceivedAmount(0);
        setTodayPaymentBreakdown([]);
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

    const handleFocusRefresh = () => {
      void loadBills();
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        void loadBills();
      }
    };

    void loadBills(true);

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadBills();
      }
    }, 30_000);

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
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
        (bill) =>
          isSameDay(bill.date, today) || bill.taskStatus === "รอติดตั้ง",
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
        (bill) =>
          bill.billStatus === "ใบสั่งซื้อ" &&
          (isSameDay(bill.date, today) || bill.taskStatus === "ค้างเบิก"),
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
          [
            ...todayBills,
            ...installBills,
            ...orderBills,
            ...paymentDueBills,
          ].map((bill) => [bill.id, bill]),
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
        const monthGroup = groups.find(
          (group) => group.monthLabel === monthLabel,
        );

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
        <div className="mx-auto max-w-sm rounded-[20px] border border-gray-200 bg-white p-6 text-center shadow-sm">
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
      <section className="relative mx-auto max-w-7xl px-3 py-3 sm:px-4 lg:py-4">
        <div className="mb-3 grid gap-2 lg:mb-4 lg:min-h-[108px] lg:grid-cols-3 lg:items-stretch">
          <div className="grid gap-2 lg:h-full lg:grid-rows-2">
            <div className="rounded-[16px] border border-[#d1d6de] bg-[#F7F7F8] px-3 py-1.5 lg:h-full lg:px-3.5 lg:py-1.5">
              <div className="grid grid-cols-2 items-center gap-2">
                <UserProfile
                  pictureUrl={user.pictureUrl}
                  displayName={employee?.nickname || user.displayName}
                  statusMessage={employee?.role || "ผู้ดูแลร้าน"}
                  compact
                />
                <p className="text-right text-sm leading-tight font-semibold text-gray-800 lg:text-[1.08rem]">
                  {formatDayTitle(today)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(84px,1fr)_minmax(0,5fr)] items-center gap-2 text-xs text-gray-600 lg:h-full">
              <div className="flex min-w-0 items-center justify-center rounded-[16px] border border-[#d1d6de] bg-[#F7F7F8] px-3 py-1.5 lg:h-full lg:px-3.5 lg:py-1.5">
                <button
                  type="button"
                  onClick={() => setUseLargeBillText((prev) => !prev)}
                  className={`inline-flex w-full items-center justify-center text-[11px] font-semibold transition ${
                    useLargeBillText
                      ? "text-[#486da8]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  aria-label="สลับขนาดตัวหนังสือบิล"
                  title="สลับขนาดตัวหนังสือบิล"
                >
                  {useLargeBillText ? "Normal" : "Jumbo"}
                </button>
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-[16px] border border-[#d1d6de] bg-[#F7F7F8] px-3 py-1.5 lg:h-full lg:px-3.5 lg:py-1.5">
              <HiMagnifyingGlass className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ค้นหาป้ายทะเบียน รายละเอียด หรือเลขบิล"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="ล้างคำค้น"
                >
                  <HiMiniXMark className="h-3.5 w-3.5" />
                </button>
              ) : null}
              </label>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#d4d9e1] bg-white px-2 py-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:flex lg:h-full lg:flex-col lg:justify-center">
            <div className="flex items-start justify-between gap-3">
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(64px,1.2fr)_minmax(0,3.8fr)] items-center gap-3">
                <div className="relative ml-auto h-[4.5rem] w-[4.5rem] overflow-hidden lg:h-[4.75rem] lg:w-[4.75rem]">
                  <Image
                    src="/pprs-logo-2024.png"
                    alt="Paopao Racing logo"
                    fill
                    className="object-contain"
                    sizes="76px"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-500 uppercase lg:text-[11px]">
                    Dashboard
                  </p>
                  <h1 className="truncate text-[1.5rem] leading-[0.98] font-semibold tracking-[-0.03em] text-[#111827] lg:text-[2.15rem]">
                    Paopao Racing
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTodayPaymentModal(true)}
            className="rounded-[16px] border border-[#c7d8c8] bg-[#e7f3e8] px-3 py-2.5 text-right shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#b6cab8] hover:bg-[#e1efe3] lg:flex lg:h-full lg:flex-col lg:items-end lg:justify-center lg:gap-0 lg:px-3 lg:py-2"
          >
            <div className="flex items-center justify-between gap-2 self-stretch">
              <HiBanknotes className="h-4 w-4 text-[#2f6b45]" />
              <p className="text-xs text-gray-700">ยอดเงินที่รับชำระวันนี้</p>
            </div>
            <p className="mt-0 text-[1.7rem] font-semibold text-[#2f6b45] lg:text-[2.15rem]">
              {formatCurrency(todayReceivedAmount)}
            </p>
            <p className="mt-0 text-sm leading-5 text-gray-600">
              ยอดรอติดตั้ง : {formatCurrency(waitingInstallRemainingAmount)}
            </p>
          </button>
        </div>

        {loadingBills ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[20px] border border-[#d4d9e1] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <Loader />
          </div>
        ) : (
          <div className="space-y-3 lg:space-y-4">
            <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => scrollToSection(todaySectionRef)}
                className="rounded-[16px] border border-[#c0cde3] bg-[#e3edf9] px-2 py-1.5 text-right shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#b0c0da] hover:bg-[#dbe8f7] lg:min-h-[108px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <HiWrenchScrewdriver className="h-4 w-4 text-[#4f6893]" />
                  <p className="text-xs text-gray-700">งานวันนี้</p>
                </div>
                <p className="mt-1 text-[1.45rem] font-semibold text-[#4f6893]">
                  {todayJobsCount} บิล
                </p>
                <p className="mt-0 text-[11px] text-gray-600">
                  (ยอดบิล) : {formatCurrency(todayJobsTotalAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(todaySectionRef)}
                className="rounded-[16px] border border-[#e6c9b8] bg-[#f7e6dc] px-2 py-1.5 text-right shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#d8b9a7] hover:bg-[#f3ddd0] lg:min-h-[108px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <HiReceiptPercent className="h-4 w-4 text-[#a35d33]" />
                  <p className="text-xs text-gray-700">ค่าใช้จ่าย</p>
                </div>
                <p className="mt-1 text-[1.45rem] font-semibold text-[#a35d33]">
                  {installBills.length} บิล
                </p>
                <p className="mt-0 text-[11px] text-gray-600">
                  (คงค้าง) : {formatCurrency(installBillsRemainingAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(orderSectionRef, "order")}
                className="rounded-[16px] border border-[#e3d3a7] bg-[#f3ead1] px-2 py-1.5 text-right shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#d4c38f] hover:bg-[#eee3c3] lg:min-h-[108px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <HiShoppingBag className="h-4 w-4 text-[#8b6a24]" />
                  <p className="text-xs text-gray-700">สั่งของ</p>
                </div>
                <p className="mt-1 text-[1.45rem] font-semibold text-[#8b6a24]">
                  {orderBills.length} บิล
                </p>
                <p className="mt-0 text-[11px] text-gray-600">
                  (คงค้าง) : {formatCurrency(orderBillsRemainingAmount)}
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection(paymentDueSectionRef, "paymentDue")
                }
                className="rounded-[16px] border border-[#cec2f4] bg-[#ece5ff] px-2 py-1.5 text-right shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:border-[#c0b2ef] hover:bg-[#e7deff] lg:min-h-[108px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <HiCreditCard className="h-4 w-4 text-[#6558a8]" />
                  <p className="text-xs text-gray-700">ค้างชำระ</p>
                </div>
                <p className="mt-1 text-[1.45rem] font-semibold text-[#6558a8]">
                  {paymentDueBills.length} บิล
                </p>
                <p className="mt-0 text-[11px] text-gray-600">
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
                    sectionTone="today"
                    largeText={useLargeBillText}
                    expandAllBills={expandTodayBills}
                    onToggleExpandAllBills={() =>
                      setExpandTodayBills((prev) => !prev)
                    }
                  />
                </section>

                <section className="rounded-[16px] border border-[#d7deea] bg-[#f6f8fb] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
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
                      className="inline-flex items-center justify-center rounded-[8px] border border-[#c0d0e9] bg-[#f4f8fd] px-2.5 py-1 text-[11px] font-medium text-[#486da8] shadow-sm transition hover:border-[#aebfdd] hover:bg-[#eaf2fc] hover:text-[#355987]"
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
                        largeText={useLargeBillText}
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
                        largeText={useLargeBillText}
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
                      largeText={useLargeBillText}
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

              <section className="mt-3 rounded-[16px] border border-[#d4d9e1] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] lg:sticky lg:top-3 lg:mt-0 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-auto">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                      History
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-gray-900">
                      ประวัติ
                    </h2>
                  </div>
                  <span className="rounded-[8px] bg-[#f7f7f8] px-2 py-1 text-[11px] text-gray-600">
                    {historyBillsOnly.length} รายการ
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {historyByMonth.length > 0 ? (
                    historyByMonth.map((monthGroup) => (
                      <details
                        key={monthGroup.monthLabel}
                        open={shouldExpandHistory}
                        className="rounded-[16px] border border-[#d4d9e1] bg-white"
                      >
                        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-gray-900">
                          {monthGroup.monthLabel}
                        </summary>
                        <div className="space-y-2 border-t border-[#dde3eb] px-2 py-2">
                          {monthGroup.dates.map((dateGroup) => (
                            <details
                              key={`${monthGroup.monthLabel}-${dateGroup.dateLabel}`}
                              open={
                                shouldExpandHistory ||
                                openHistoryDates[
                                  `${monthGroup.monthLabel}-${dateGroup.dateLabel}`
                                ] ||
                                false
                              }
                              className="rounded-[16px] bg-[#eef4fb]"
                              onToggle={(event) => {
                                const groupKey = `${monthGroup.monthLabel}-${dateGroup.dateLabel}`;
                                const isOpen = event.currentTarget.open;
                                setOpenHistoryDates((prev) => ({
                                  ...prev,
                                  [groupKey]: isOpen,
                                }));
                                if (!isOpen) {
                                  setExpandHistoryBills((prev) => ({
                                    ...prev,
                                    [groupKey]: false,
                                  }));
                                }
                              }}
                            >
                              <summary className="cursor-pointer list-none rounded-[12px] border border-[#d4d9e1] bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-[#c8ced8] hover:bg-[#fbfcfd]">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="shrink-0">
                                      {dateGroup.dateLabel}
                                    </span>
                                    <span className="truncate text-[#486da8]">
                                      {formatCurrency(
                                        dateGroup.bills.reduce(
                                          (sum, bill) => sum + bill.totalAmount,
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      const groupKey = `${monthGroup.monthLabel}-${dateGroup.dateLabel}`;
                                      const isExpanded =
                                        shouldExpandHistory ||
                                        expandHistoryBills[groupKey] ||
                                        false;
                                      const nextValue = !isExpanded;

                                      setOpenHistoryDates((prev) => ({
                                        ...prev,
                                        [groupKey]: nextValue,
                                      }));
                                      setExpandHistoryBills((prev) => ({
                                        ...prev,
                                        [groupKey]: nextValue,
                                      }));
                                    }}
                                    className="inline-flex shrink-0 items-center justify-center rounded-[8px] border border-[#d4d9e1] bg-[#f7f9fc] px-2 py-1 text-gray-500 shadow-sm"
                                  >
                                    {dateGroup.bills.length} คัน
                                  </button>
                                </div>
                              </summary>
                              <div className="space-y-3 px-3 pt-2 pb-3">
                                {dateGroup.bills.map((bill) => (
                                  <BillCard
                                    key={`${bill.id}-${
                                      shouldExpandHistory ||
                                      expandHistoryBills[
                                        `${monthGroup.monthLabel}-${dateGroup.dateLabel}`
                                      ]
                                        ? "open"
                                        : "closed"
                                    }`}
                                    bill={bill}
                                    largeText={useLargeBillText}
                                    defaultOpen={
                                      shouldExpandHistory ||
                                      expandHistoryBills[
                                        `${monthGroup.monthLabel}-${dateGroup.dateLabel}`
                                      ] ||
                                      false
                                    }
                                  />
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </details>
                    ))
                  ) : (
                    <div className="rounded-[16px] bg-gray-50 px-3 py-4 text-xs text-gray-500">
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
          className="fixed right-3 bottom-24 z-40 rounded-full bg-[#1a2232]/76 p-3 text-slate-100 shadow-[0_22px_48px_rgba(2,6,23,0.42),0_8px_22px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#1a2232]/68"
          aria-label="Back to top"
        >
          <HiArrowUp className="h-4 w-4 text-[#8fc2ff]" />
        </button>
      ) : null}

      {showTodayPaymentModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/20 px-3 pt-4 pb-24"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowTodayPaymentModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-[340px] rounded-[20px] border border-[#d3dae5]/80 bg-white/58 p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/46"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.14))]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-gray-500 uppercase">
                  Today
                </p>
                <h3 className="mt-0.5 text-[15px] font-semibold text-gray-900">
                  ยอดเงินที่รับชำระวันนี้
                </h3>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {formatDateFromDate(today)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTodayPaymentModal(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f4f6f8] text-gray-500 transition hover:bg-[#e9edf2] hover:text-gray-700"
                aria-label="ปิดรายละเอียดการรับเงิน"
              >
                <HiMiniXMark className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mt-3 space-y-1.5">
              {todayPaymentBreakdown.length > 0 ? (
                todayPaymentBreakdown.map((entry) => (
                  <div
                    key={entry.label}
                    className="rounded-[14px] border border-[#d7dde6] bg-white/82 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.label}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {entry.count} รายการ
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#2f6b45]">
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[14px] bg-[#f7f7f8] px-3 py-4 text-xs text-gray-500">
                  วันนี้ยังไม่มีรายการรับชำระ
                </div>
              )}
            </div>

            <div className="relative mt-3 flex items-center justify-between border-t border-[#e1e6ed] pt-2.5">
              <p className="text-sm text-gray-600">ยอดรวมวันนี้</p>
              <p className="text-[15px] font-semibold text-[#2f6b45]">
                {formatCurrency(todayReceivedAmount)}
              </p>
            </div>
          </div>
        </div>
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
