"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiIdentification,
  HiOutlineClock,
  HiSquares2X2,
} from "react-icons/hi2";
import { useAppStore } from "@/store/useAppStore";
import React from "react";

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
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: HiSquares2X2,
  },
];

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { member, employee } = useAppStore();

  const isAdmin =
    member?.userRole === "admin" || employee?.userRole === "admin";

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <nav className="pointer-events-auto relative flex w-full max-w-[340px] items-center gap-1 rounded-[22px] border border-white/70 bg-white/72 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.16),0_4px_14px_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/62">
        <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))]" />
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[18px] px-2 py-2 text-[11px] transition ${
                isActive
                  ? "bg-white/88 text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_8px_18px_rgba(15,23,42,0.14)]"
                  : "text-gray-700 hover:bg-white/58 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-blue-700" : "text-gray-600"}`}
              />
              <span className="mt-1 truncate font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
