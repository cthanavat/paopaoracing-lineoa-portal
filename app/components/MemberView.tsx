"use client";

import React from "react";
import { TabItem, Tabs } from "flowbite-react";
import { HiClock, HiClipboardList, HiUserCircle } from "react-icons/hi";
import { useAppStore } from "@/store/useAppStore";
import HistoryView from "./HistoryView";

interface NotificationState {
  show: boolean;
  message: string;
  type: string;
}

interface MemberViewProps {
  sendMessage: (msg: string) => Promise<void>;
  setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
}

const MemberView: React.FC<MemberViewProps> = ({
  sendMessage,
  setNotification,
}) => {
  const { member, isLiffReady } = useAppStore();

  if (!member) return null;

  const handleServiceClick = async () => {
    try {
      await sendMessage(`${new Date().toLocaleDateString()}\nสลับยาง`);
      setNotification({
        show: true,
        message: "Message sent successfully",
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
      className="flex min-w-2xs items-center-safe pt-0"
    >
      <TabItem
        active
        title="สมาชิก"
        icon={HiUserCircle}
        className="flex items-center justify-center"
      >
        <div className="flex flex-col items-center">
          <div className="my-3 flex min-w-2xs justify-center">
            <div className="card">
              <p className="heading text-gray-500">Paopao Racing</p>
              <p className="text-gray-600">{member.name}</p>
              <p className="text-gray-700">{member.phone}</p>
              <p>Member</p>
            </div>
          </div>
        </div>
      </TabItem>

      <TabItem title="ประวัติ" icon={HiClock}>
        <HistoryView />
      </TabItem>

      <TabItem title="บริการ" icon={HiClipboardList}>
        <div className="flex flex-col items-center">
          <button
            onClick={handleServiceClick}
            className="mt-4 max-w-xs rounded-full bg-black px-6 py-2 text-white transition-colors duration-300 hover:bg-blue-500 focus:bg-gray-500 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
            disabled={!isLiffReady}
          >
            สลับยาง
          </button>
        </div>
      </TabItem>
    </Tabs>
  );
};

export default MemberView;
