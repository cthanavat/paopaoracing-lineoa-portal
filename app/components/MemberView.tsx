"use client";

import React from "react";
import { TabItem, Tabs } from "flowbite-react";
import { HiClock, HiUserCircle } from "react-icons/hi";
import { useAppStore } from "@/store/useAppStore";
import HistoryView from "./HistoryView";
import { NotificationState } from "@/types/ui";

interface MemberViewProps {
  sendMessage: (msg: string) => Promise<boolean>;
  setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
}

const MemberView: React.FC<MemberViewProps> = ({
  sendMessage,
  setNotification,
}) => {
  const { member, isLiffReady, isInClient } = useAppStore();

  if (!member) return null;

  const isActionEnabled = isLiffReady && isInClient;

  const formatToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleServiceClick = async (service: string) => {
    try {
      const sent = await sendMessage(`${service} ${formatToday()}`);

      if (!sent) {
        throw new Error("ส่งข้อความไม่สำเร็จ");
      }

      setNotification({
        show: true,
        message: "ส่งข้อความเข้า LINE สำเร็จ",
        type: "success",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setNotification({
        show: true,
        message: error.message || "Failed to send message",
        type: "error",
      });
    }
  };

  return (
    <Tabs
      aria-label="Tabs with underline"
      variant="underline"
      className="apple-tabs flex min-w-2xs items-center-safe pt-0"
    >
      <TabItem
        active
        title="สมาชิก"
        icon={HiUserCircle}
        className="flex items-center justify-center"
      >
        <div className="flex flex-col items-center">
          <div className="my-2 flex min-w-2xs justify-center">
            <div className="w-full rounded-[18px] border border-[#d4d9e1] bg-white px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-medium tracking-[0.24em] text-gray-400 uppercase">
                Paopao Racing
              </p>
              <div className="mt-4 space-y-1">
                <p className="text-xl font-semibold tracking-tight text-gray-950">
                  {member.name}
                </p>
                <p className="text-sm text-gray-500">{member.phone}</p>
              </div>
              <div className="mt-4 inline-flex rounded-full border border-[#d4d9e1] bg-[#f8f8fa] px-3 py-1 text-xs font-medium text-gray-600">
                Member
              </div>
            </div>
          </div>

          <div className="mt-1 w-full rounded-[18px] border border-[#d4d9e1] bg-[#fcfcfd] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <div className="mb-3">
              <p className="text-[11px] font-medium tracking-[0.18em] text-gray-400 uppercase">
                Quick Actions
              </p>
            </div>

            <div className="space-y-2">
                <button
                  onClick={() => handleServiceClick("เข้ารับบริการ")}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#d4d9e1] bg-white px-6 py-2.5 text-sm font-medium text-gray-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:bg-[#F9F9FA] focus:bg-[#F9F9FA] focus-visible:ring-2 focus-visible:ring-[#bfc8d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isActionEnabled}
                >
                  เข้ารับบริการ
                </button>

                <button
                  onClick={() => handleServiceClick("สลับยาง")}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#d4d9e1] bg-white px-6 py-2.5 text-sm font-medium text-gray-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition duration-200 hover:bg-[#F9F9FA] focus:bg-[#F9F9FA] focus-visible:ring-2 focus-visible:ring-[#bfc8d8] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isActionEnabled}
                >
                  สลับยาง
                </button>
            </div>
          </div>
        </div>
      </TabItem>

      <TabItem title="ประวัติ" icon={HiClock}>
        <HistoryView />
      </TabItem>
    </Tabs>
  );
};

export default MemberView;
