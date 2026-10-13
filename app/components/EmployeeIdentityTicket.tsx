"use client";

import type { Employee, Member, User } from "@/store/useAppStore";

interface EmployeeIdentityTicketProps {
  user: User;
  member?: Member | null;
  employee: Employee;
  showLogout?: boolean;
  onLogout?: () => void;
}

const normalizePhone = (phone?: string) => (phone || "").replace(/\D/g, "");

const formatPhone = (phone?: string) => {
  const digits = normalizePhone(phone);
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone || "—";
};

const barcodeUrl = (phone: string) =>
  `https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(normalizePhone(phone))}&includeText=false&format=svg&width=600&height=80`;

export default function EmployeeIdentityTicket({
  user,
  member,
  employee,
  showLogout = false,
  onLogout,
}: EmployeeIdentityTicketProps) {
  const phone = employee.phone || member?.phone || "";

  return (
    <section className="employee-identity-ticket grid h-[150px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
      <div className="flex min-w-0 items-center gap-3 px-4 py-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-1 ring-[#d4d9e1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.pictureUrl || "/placeholder-avatar.svg"}
            alt={employee.nickname || user.displayName}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[18px] leading-6 font-black text-[#191a1c]">
              {employee.nickname || user.displayName}
            </h2>
            {employee.role ? (
              <span className="shrink-0 rounded-full bg-[#eceef0] px-2 py-0.5 text-[10px] font-bold text-[#666]">
                {employee.role}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[12px] text-[#666]">
            {`${employee.firstname || ""} ${employee.lastname || ""}`.trim() ||
              employee.nickname ||
              user.statusMessage}
          </p>
          <p className="mt-2 font-mono text-[12px] font-semibold tracking-wide text-[#52647a] tabular-nums">
            {formatPhone(phone)}
          </p>
          {showLogout && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 min-h-8 rounded-full border border-[#d8dce0] bg-[#eceef0] px-3 text-[10px] font-bold text-[#666] hover:bg-[#dfe2e5]"
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="relative flex h-full items-center justify-center gap-0.5 overflow-hidden border-l border-dashed border-white/55 bg-[#1972bc] pr-1 pl-3"
        aria-label={`สถานะ Active บาร์โค้ดเบอร์โทรพนักงาน ${formatPhone(phone)}`}
      >
        {normalizePhone(phone) ? (
          <>
            <div className="relative h-[132px] w-6 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={barcodeUrl(phone)}
                alt=""
                aria-hidden="true"
                width={132}
                height={24}
                className="absolute top-1/2 left-1/2 h-6 w-[132px] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-fill object-top mix-blend-screen invert"
              />
            </div>
            <p className="employee-phone-vertical shrink-0 font-mono text-[11px] leading-none font-black tracking-[0.04em] text-white tabular-nums">
              {formatPhone(phone)}
            </p>
          </>
        ) : (
          <p className="employee-phone-vertical font-mono text-[9px] font-bold tracking-wide text-white">
            ACTIVE
          </p>
        )}
      </div>
    </section>
  );
}
