"use client";

import Link from "next/link";
import { HiIdentification, HiOutlineClock } from "react-icons/hi2";
import { useAppStore } from "@/store/useAppStore";
import React from "react";

const BottomNav: React.FC = () => {
  const { member } = useAppStore();

  // Only render BottomNav if user is admin
  if (!member || member.userRole !== "admin") {
    return null;
  }

  return (
    <div className="border-default fixed bottom-3 left-1/2 z-50 h-16 w-2xs -translate-x-1/2 transform justify-center rounded-full bg-gray-900 text-white">
      <div className="mx-auto flex h-full justify-center">
        <Link
          href="/"
          className="hover:bg-neutral-secondary-medium group inline-flex flex-col items-center justify-center px-5"
        >
          <HiIdentification className="text-body group-hover:text-fg-brand h-7 w-7" />
          <span className="text-body group-hover:text-fg-brand text-sm">
            สมาชิก
          </span>
        </Link>

        <Link
          href="/attendance"
          className="hover:bg-neutral-secondary-medium group inline-flex flex-col items-center justify-center px-5"
        >
          <HiOutlineClock className="text-body group-hover:text-fg-brand h-7 w-7" />
          <span className="text-body group-hover:text-fg-brand text-sm">
            พนักงาน
          </span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
