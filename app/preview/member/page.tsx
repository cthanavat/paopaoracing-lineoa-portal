"use client";

import { useEffect, useState } from "react";
import MemberView from "@/app/components/MemberView";
import Notification from "@/app/components/Notification";
import { useAppStore } from "@/store/useAppStore";
import type { NotificationState } from "@/types/ui";

export default function MemberPreviewPage() {
  const setMember = useAppStore((state) => state.setMember);
  const setHistoryList = useAppStore((state) => state.setHistoryList);
  const setLoadHistory = useAppStore((state) => state.setLoadHistory);
  const [ready, setReady] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    setMember({
      name: "สมาชิกตัวอย่าง",
      phone: "08X-XXX-1234",
      userId: "preview-only",
    });
    setHistoryList([
      {
        bill_date: "28/09/2026",
        car_plate_number: "กฉ 1234",
        bill_total_amount: "฿2,450",
        bill_detail: "เปลี่ยนน้ำมันเครื่อง · เช็กระยะ",
        userId: "preview-only",
      },
      {
        bill_date: "12/08/2026",
        car_plate_number: "ขก 5678",
        bill_total_amount: "฿600",
        bill_detail: "สลับยาง",
        userId: "preview-only",
      },
    ]);
    setLoadHistory(false);
    setReady(true);

    return () => {
      setMember(null);
      setHistoryList([]);
      setLoadHistory(true);
    };
  }, [setHistoryList, setLoadHistory, setMember]);

  const previewSendMessage = async (message: unknown) => {
    setLastMessage(message);
    return true;
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-4 text-gray-950">
      <div className="mx-auto max-w-md">
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Preview เท่านั้น — ไม่ส่ง LINE และไม่เขียนข้อมูลจริง
        </div>
        <MemberView
          preview
          sendMessage={previewSendMessage}
          setNotification={setNotification}
        />
        {lastMessage ? (
          <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-1 text-xs font-semibold text-emerald-900">
              ข้อความตัวอย่าง
            </p>
            <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-emerald-950">
              {typeof lastMessage === "string"
                ? lastMessage
                : JSON.stringify(lastMessage, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
      <Notification
        {...notification}
        onClose={() =>
          setNotification((current) => ({ ...current, show: false }))
        }
      />
    </main>
  );
}
