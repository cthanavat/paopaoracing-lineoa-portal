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
];

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isEmployeeActive(active?: string) {
  return ["true", "1", "yes", "active"].includes(normalizeValue(active));
}

function canAccessDashboard(role?: string, active?: string) {
  const normalizedRole = normalizeValue(role);
  return (
    isEmployeeActive(active) &&
    ["admin", "manager", "supervisor"].includes(normalizedRole)
  );
}

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { employee } = useAppStore();

  const showNav = isEmployeeActive(employee?.active);
  const showDashboard = canAccessDashboard(employee?.role, employee?.active);

  if (!showNav) {
    return null;
  }

  const items = showDashboard
    ? [
        ...navItems,
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: HiSquares2X2,
        },
      ]
    : navItems;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3">
      <nav className="pointer-events-auto relative flex w-full max-w-[340px] items-center gap-1 rounded-[22px] bg-[#1a2232]/76 p-1.5 shadow-[0_22px_48px_rgba(2,6,23,0.42),0_8px_22px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#1a2232]/68">
        <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))]" />
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
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[18px] px-2 py-2 text-[11px] transition ${
                isActive
                  ? "border border-white/16 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_22px_rgba(2,6,23,0.18)]"
                  : "border border-transparent text-slate-300 hover:bg-white/7 hover:text-white"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-[#8fc2ff]" : "text-slate-300"}`}
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
