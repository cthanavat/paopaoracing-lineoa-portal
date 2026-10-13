"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HiIdentification, HiOutlineClock } from "react-icons/hi2";
import { HiClipboardCheck, HiDotsVertical } from "react-icons/hi";
import { useAppStore } from "@/store/useAppStore";
import React, { useEffect, useRef, useState } from "react";

const navItems = [
  {
    href: "/",
    label: "สมาชิก",
    icon: HiIdentification,
  },
  {
    href: "/attendance",
    label: "พนักงาน",
    icon: HiOutlineClock,
  },
];

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isEmployeeActive(active?: string) {
  return ["true", "1", "yes", "active"].includes(normalizeValue(active));
}

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { employee, setLoadingEmployees } = useAppStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canEvaluate = ["admin", "supervisor"].includes(
    normalizeValue(employee?.role || employee?.userRole),
  );

  useEffect(() => {
    if (!isMoreOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMoreOpen]);

  if (!isEmployeeActive(employee?.active)) {
    return null;
  }

  const items = navItems;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-end gap-2">
        <nav
          aria-label="เมนูหลัก"
          className="flex w-fit gap-1.5 rounded-full border border-[#d8dce0] bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.32),0_3px_10px_rgba(0,0,0,0.2)]"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  setIsMoreOpen(false);
                  if (item.href === "/attendance" && pathname === "/") {
                    event.preventDefault();
                    window.dispatchEvent(
                      new Event("paopao-member-detail-exit"),
                    );
                    window.setTimeout(() => {
                      router.push(item.href);
                    }, 320);
                    return;
                  }

                  if (item.href === "/" && pathname !== "/") {
                    window.sessionStorage.setItem(
                      "paopao-role-transition",
                      "employee-to-member",
                    );
                    setLoadingEmployees(true);
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`flex h-[42px] min-w-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold whitespace-nowrap transition-[flex-grow,background-color,color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#1972bc] focus-visible:outline-none ${
                  isActive
                    ? "shrink-0 grow-0 gap-2 bg-[#191a1c] px-3 text-white"
                    : "w-[42px] shrink-0 grow-0 basis-[42px] bg-[#eceef0] p-0 text-[#52647a] hover:bg-[#dfe3e7] hover:text-[#191a1c]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isActive ? (
                  <span className="truncate">{item.label}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {canEvaluate ? (
          <div ref={menuRef} className="relative">
            {isMoreOpen ? (
              <div
                role="menu"
                aria-label="เมนูเพิ่มเติม"
                className="absolute right-0 bottom-[calc(100%+0.6rem)] w-52 overflow-hidden rounded-[18px] border border-[#d8dce0] bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.38)]"
              >
                <Link
                  href="/evaluation"
                  role="menuitem"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex min-h-11 items-center gap-3 rounded-[13px] px-3 text-[14px] font-bold text-[#191a1c] transition-colors hover:bg-[#eceef0] focus-visible:bg-[#eceef0] focus-visible:outline-none"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf4fd] text-[#1972bc]">
                    <HiClipboardCheck className="h-5 w-5" />
                  </span>
                  ประเมินพนักงาน
                </Link>
              </div>
            ) : null}
            <button
              type="button"
              aria-label="เปิดเมนูเพิ่มเติม"
              aria-haspopup="menu"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen((open) => !open)}
              className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border border-[#d8dce0] bg-white text-[#52647a] shadow-[0_12px_32px_rgba(0,0,0,0.32),0_3px_10px_rgba(0,0,0,0.2)] transition-colors focus-visible:ring-2 focus-visible:ring-[#1972bc] focus-visible:outline-none ${isMoreOpen ? "bg-[#eceef0] text-[#191a1c]" : "hover:bg-[#eceef0] hover:text-[#191a1c]"}`}
            >
              <HiDotsVertical className="h-6 w-6" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BottomNav;
