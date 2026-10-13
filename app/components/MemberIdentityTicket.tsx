"use client";

import type { Member, User } from "@/store/useAppStore";

interface MemberIdentityTicketProps {
  user: User | null;
  member: Member;
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const formatPhone = (phone: string) => {
  const digits = normalizePhone(phone);
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;
};

const barcodeUrl = (phone: string) =>
  `https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(normalizePhone(phone))}&includeText=false&format=svg&width=480&height=54`;

const qrUrl = (userId: string) =>
  `https://quickchart.io/qr?size=300&dark=191a1c&light=ffffff&margin=2&text=${encodeURIComponent(userId)}`;

export default function MemberIdentityTicket({
  user,
  member,
}: MemberIdentityTicketProps) {
  const memberNumber = member.userId.slice(-4).toUpperCase();

  return (
    <section className="member-identity-ticket flex h-[264px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
      <header className="grid h-[38px] shrink-0 grid-cols-2 bg-[#1972bc] text-white">
        <div className="flex min-w-0 items-center justify-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.png"
            alt=""
            aria-hidden="true"
            width={30}
            height={30}
            className="h-[30px] w-[30px] shrink-0 object-contain"
          />
          <span className="truncate text-[14px] leading-5 font-black tracking-[0.03em] uppercase">
            Paopao Racing
          </span>
        </div>
        <div className="flex items-center justify-center border-l border-dashed border-white/55 px-3 text-[10px] font-black tracking-[0.14em] whitespace-nowrap">
          MEMBER CARD
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col items-center justify-start px-3 py-[9px] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user?.pictureUrl || "/assets/logo.png"}
            alt={member.name}
            width={116}
            height={116}
            className="h-[116px] w-[116px] shrink-0 rounded-full object-cover ring-1 ring-[#d8dce0]"
          />
          <p className="mt-1 text-[10px] leading-[14px] font-bold tracking-[0.14em] text-[#6b6b6d]">
            สมาชิก
          </p>
          <h1 className="max-w-full truncate text-base leading-5 font-black text-[#191a1c]">
            {member.name}
          </h1>
          <div
            className="mt-1 w-full max-w-[170px]"
            aria-label={`บาร์โค้ดเบอร์โทรสมาชิก ${formatPhone(member.phone)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={barcodeUrl(member.phone)}
              alt=""
              aria-hidden="true"
              width={170}
              height={18}
              className="block h-[18px] w-full object-fill object-top"
            />
            <p className="font-mono text-[10px] leading-[12px] font-semibold tracking-wide text-[#666] tabular-nums">
              {formatPhone(member.phone)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-0 border-l border-dashed border-[#c8cdd2] bg-white px-2 py-2">
          <p className="member-id-vertical shrink-0 font-mono text-[9px] leading-none font-bold tracking-wider text-[#1972bc]">
            MEMBER {memberNumber}
          </p>
          <div className="w-full max-w-[168px] overflow-hidden rounded-[6px] bg-white leading-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl(member.userId)}
              alt={`QR Code สมาชิก ${member.name}`}
              width={300}
              height={300}
              loading="eager"
              className="block aspect-square h-auto w-full object-contain"
            />
          </div>
        </div>
      </div>

      <footer className="h-[10px] shrink-0 bg-[#1972bc]" aria-hidden="true" />
    </section>
  );
}
