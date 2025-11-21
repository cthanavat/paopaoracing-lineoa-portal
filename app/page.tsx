"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserProfile from "@/app/components/UserProfile";
import Loader from "@/app/components/Loader";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import "./notifications.css";
import {
  Button,
  TabItem,
  Tabs,
  Timeline,
  TimelineBody,
  TimelineContent,
  TimelineItem,
  TimelinePoint,
  TimelineTime,
  TimelineTitle,
} from "flowbite-react";
import { HiClock, HiClipboardList, HiUserCircle } from "react-icons/hi";
import { useAppStore } from "@/store/useAppStore";

export default function HomePage() {
  const router = useRouter();

  // ใช้ Zustand store แทนการเก็บข้อมูลด้วย useState
  const {
    user,
    setUser,
    member,
    setMember,
    memberAll,
    setMemberAll,
    config,
    setConfig,
    historyList,
    setHistoryList,
  } = useAppStore();

  // local-only UI states (คงเดิม)
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [modal, setModal] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [loadUser, setLoadUser] = useState(true);
  const [loadMember, setLoadMember] = useState(true);
  const [loadHistory, setLoadHistory] = useState(true);
  const [isSignup, setSignup] = useState(false);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLiffLoading, setIsLiffLoading] = useState(true);

  useEffect(() => {
    const initLineAndConfig = async () => {
      // Load config → เก็บใน Zustand
      try {
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: process.env.NEXT_PUBLIC_CONFIG_SHEET_ID,
              range: process.env.NEXT_PUBLIC_CONFIG_RANGE,
            },
          }),
        });
        const result = await res.json();
        if (result.data) {
          const dataJson = result.data.reduce((acc, cur) => {
            if (cur.tableName) acc[cur.tableName] = cur;
            return acc;
          }, {});
          setConfig(dataJson);
        }
      } catch (error) {
        console.error("Error: Get config:", error);
        setNotification({
          show: true,
          message: "Failed to load configuration",
          type: "error",
        });
      }

      // Load user from localStorage or LIFF → เก็บใน Zustand
      const stored = localStorage.getItem("line-user");
      if (stored) {
        setUser(JSON.parse(stored));
        setLoadUser(false);
        setIsLiffLoading(false);
        return;
      }

      try {
        const liffModule = await import("@line/liff");
        await liffModule.default.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID,
        });
        setIsLiffReady(true);

        const storedAgain = localStorage.getItem("line-user");
        if (storedAgain) {
          setUser(JSON.parse(storedAgain));
        } else {
          const profile = await liffModule.default.getProfile();
          const userData = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage,
          };
          localStorage.setItem("line-user", JSON.stringify(userData));
          setUser(userData);
        }
      } catch (err) {
        console.error("LIFF initialization failed:", err);
        setNotification({ show: true, message: err.messages, type: "error" });
      } finally {
        setLoadUser(false);
        setIsLiffLoading(false);
      }

      // Cleanup
      return () => {
        import("@line/liff").then((liffModule) => {
          if (liffModule.default.isInClient()) {
            liffModule.default.closeWindow();
          }
        });
      };
    };

    initLineAndConfig();
  }, [setConfig, setUser]);

  useEffect(() => {
    async function fetchMembers() {
      if (!config?.userLine) return;

      try {
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: `${config.userLine.sheetId}`,
              range: `${config.userLine.range}`,
            },
          }),
        });

        const result = await res.json();
        if (result.data) {
          // เก็บรายการสมาชิกทั้งหมดใน Zustand
          setMemberAll(result.data);

          // map user → member ใน Zustand
          if (user?.userId) {
            const userMember = result.data.find(
              (m) => m.userId === user.userId,
            );
            if (userMember) {
              setMember(userMember);
              setNotification({
                show: true,
                message: "สวัสดี คุณ " + userMember.name,
                type: "success",
              });
            } else {
              setNotification({
                show: true,
                message: "คุณยังไม่ได้สมัครสมาชิก",
                type: "info",
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load members:", error);
        setNotification({
          show: true,
          message: "Failed to load members",
          type: "error",
        });
      } finally {
        setLoadMember(false);
      }
    }

    if (user && config?.userLine) {
      fetchMembers();
    }
  }, [user, isSignup, config, setMemberAll, setMember]);

  useEffect(() => {
    async function fetchHistory() {
      if (!config?.history) return;

      try {
        const res = await fetch("/api/gSheet/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: {
              sheetId: `${config.history.sheetId}`,
              range: `${config.history.range}`,
            },
          }),
        });

        const result = await res.json();
        if (result.data && user?.userId) {
          const userHistory = result.data
            .filter((bill) => bill.userId === user.userId)
            .sort((a, b) =>
              new Date(b.bill_date) > new Date(a.bill_date) ? 1 : -1,
            );
          // เก็บประวัติไว้ใน Zustand
          setHistoryList(userHistory);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
        setNotification({
          show: true,
          message: "Failed to load history",
          type: "error",
        });
      } finally {
        setLoadHistory(false);
      }
    }

    if (user && config?.history) {
      fetchHistory();
    }
  }, [user, config, setHistoryList]);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const sendLiffMessage = async (msg) => {
    if (!msg) {
      setNotification({
        show: true,
        message: "Please enter a message",
        type: "warning",
      });
      return;
    }
    if (!isLiffReady) {
      setNotification({
        show: true,
        message: "LIFF is not initialized",
        type: "error",
      });
      return;
    }
    try {
      const liffModule = await import("@line/liff");
      await liffModule.default.sendMessages([{ type: "text", text: msg }]);
      setNotification({
        show: true,
        message: "Message sent successfully",
        type: "success",
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setNotification({ show: true, message: err.message, type: "error" });
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSignup(true);

    if (!user) {
      setNotification({
        show: true,
        message: "User info not found",
        type: "error",
      });
      setSignup(false);
      return;
    }

    const phone = form.phone;
    if (!phone || phone.length !== 10 || !phone.startsWith("0")) {
      setModal({
        show: true,
        message: "กรอกเบอร์โทรศัพท์ไม่ถูกต้อง",
        type: "warning",
      });
      setSignup(false);
      return;
    }

    const isPhoneNumberExists = memberAll.some(
      (member) => member.phone === phone,
    );
    if (isPhoneNumberExists) {
      setModal({
        show: true,
        message: "เบอร์นี้ถูกใช้งานแล้ว",
        type: "warning",
      });
      setSignup(false);
      return;
    }

    try {
      const res = await fetch("/api/gSheet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: config.userLine.sheetId,
          range: config.userLine.range,
          newRow: [
            new Date().toISOString().slice(0, 10),
            form.name,
            form.phone,
            user.displayName,
            user.userId,
            "",
            "member",
          ],
        }),
      });

      const result = await res.json();
      if (result.success) {
        await fetch("/api/pushover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "สมาชิกใหม่",
            message: `${form.name} (${form.phone}) สมัครสมาชิกแล้ว`,
          }),
        });

        await sendLiffMessage(`${form.name} (${form.phone}) สมัครสมาชิกแล้ว`);

        setSignup(false);
        setNotification({
          show: true,
          message: "สมัครสมาชิกสำเร็จ!",
          type: "success",
        });
        setTimeout(() => {
          router.refresh();
        }, 3000);
      } else {
        setSignup(false);
        setModal({
          show: true,
          message: "สร้างบัญชีผู้ใช้ไม่สําเร็จ",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setNotification({
        show: true,
        message: "สร้างบัญชีผู้ใช้ไม่สําเร็จ",
        type: "error",
      });
      setSignup(false);
    }
  }

  if (loadUser || isSignup || !config || isLiffLoading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  if (!user) {
    router.push("/login");
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  return (
    <main className="p-5 font-sans">
      <div>
        <UserProfile
          displayName={user.displayName}
          pictureUrl={user.pictureUrl}
          statusMessage={user.statusMessage}
        />
      </div>

      <div className="flex justify-center">
        {loadMember && config ? (
          <div className="my-4 flex items-center justify-center">
            <Loader />
          </div>
        ) : member ? (
          <Tabs
            aria-label="Tabs with underline"
            variant="underline"
            className="flex min-w-2xs items-center-safe"
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
              {loadHistory ? (
                <div className="my-4 flex items-center justify-center">
                  <Loader />
                </div>
              ) : (
                <div className="mx-auto w-full max-w-xs min-w-2xs px-4">
                  <Timeline className="pt-0">
                    {historyList.map((bill, idx) => (
                      <TimelineItem key={idx}>
                        <TimelinePoint />
                        <TimelineContent>
                          <TimelineTime className="text-gray-700">
                            {bill.bill_date}
                          </TimelineTime>
                          <TimelineTitle>
                            {bill.car_plate_number +
                              ": " +
                              bill.bill_total_amount || "-"}
                          </TimelineTitle>
                          <TimelineBody className="pl-2 whitespace-pre-line">
                            {bill.bill_detail}
                          </TimelineBody>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </div>
              )}
            </TabItem>

            <TabItem title="บริการ" icon={HiClipboardList}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() =>
                    sendLiffMessage(
                      `${new Date().toLocaleDateString()}\nสลับยาง`,
                    )
                  }
                  className="mt-4 max-w-xs rounded-full bg-black px-6 py-2 text-white transition-colors duration-300 hover:bg-blue-500 focus:bg-gray-500 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
                  disabled={!isLiffReady}
                >
                  สลับยาง
                </button>
              </div>
            </TabItem>
          </Tabs>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-md min-w-2xs space-y-2 rounded-xl bg-white p-6"
          >
            <h4 className="text-center text-lg font-semibold">สมัครสมาชิก</h4>
            <div>
              <label className="mb-1 block text-sm text-gray-600">ชื่อ</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="ใช้ชื่อจริง (สำหรับ ยื่นประกัน)"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                เบอร์โทร
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mb-4 w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="0123456789"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-black py-2 text-sm font-medium text-white hover:bg-red-800 hover:opacity-90"
            >
              Submit
            </button>
          </form>
        )}
      </div>

      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
      <Modal
        isOpen={modal.show}
        onClose={() => setModal({ ...modal, show: false })}
        title={modal.type === "success" ? "Success" : "Attention Required"}
        message={modal.message}
        onConfirm={() => setModal({ ...modal, show: false })}
      />
    </main>
  );
}
