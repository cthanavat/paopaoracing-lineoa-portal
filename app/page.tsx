"use client";

import { useEffect, useState } from "react";
// import liff from "@line/liff";
import { useRouter } from "next/navigation";
import UserProfile from "@/app/components/UserProfile";
import Loader from "@/app/components/Loader";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import "./notifications.css";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("member");
  const [config, setConfig] = useState([]);
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
  const [user, setUser] = useState(null);
  const [loadUser, setLoadUser] = useState(true);
  const [member, setMember] = useState(null);
  const [memberAll, setMemberAll] = useState([]);
  const [loadMember, setLoadMember] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [loadHistory, setLoadHistory] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [isSignup, setSignup] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [isLiffReady, setIsLiffReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("line-user");

    const initLineAndConfig = async () => {
      // get config from sheet
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
            if (cur.tableName) {
              acc[cur.tableName] = cur;
            }
            return acc;
          }, {});
          setConfig(dataJson);
        }
      } catch (error) {
        console.error("Error: Get config:", error);
      }

      if (stored) {
        setUser(JSON.parse(stored));
        setLoadUser(false);
      } else {
        const initializeLiff = async () => {
          try {
            const liffModule = await import("@line/liff");
            await liffModule.default.init({
              liffId: process.env.NEXT_PUBLIC_LIFF_ID,
            });
            console.log("LIFF initialized successfully");
            setIsLiffReady(true);
          } catch (err) {
            console.error("LIFF initialization failed:", err);
            setError(err.message);
          }
        };

        initializeLiff();

        // Cleanup: Close LIFF window when component unmounts
        return () => {
          import("@line/liff").then((liffModule) => {
            if (liffModule.default.isInClient()) {
              liffModule.default.closeWindow();
            }
          });
        };
      }
    };

    initLineAndConfig();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      if (!config.userLine) return;

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
          // Save all members to state
          setMemberAll(result.data);

          // Find current user's member data
          if (user?.userId) {
            const userMember = result.data.find(
              (m) => m.userId === user.userId,
            );
            if (userMember) {
              setMember(userMember);
              setNotification({
                show: true,
                message: "สวัสดี  คุณ " + userMember.name,
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
      } finally {
        setLoadMember(false);
      }
    }

    if (user && config.userLine) {
      fetchMembers();
    }
  }, [user, isSignup, config]);

  useEffect(() => {
    async function fetchHistory() {
      if (!config.history) return;

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
          setHistoryList(userHistory);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setLoadHistory(false);
      }
    }

    if (user && config.history) {
      fetchHistory();
    }
  }, [user, config]);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  if (loadUser || isSignup || !config) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  if (!user) {
    return <div>Something went wrong. Please refresh.</div>;
  }

  const sendMessage = async (message = "") => {
    if (!message) {
      alert("Please enter a message");
      return;
    }

    try {
      const liffModule = await import("@line/liff");
      await liffModule.default.sendMessages([
        {
          type: "text",
          text: message,
        },
      ]);
      console.log("Message sent successfully");
      setMessage(""); // Clear input after sending
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.message);
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

    // Validate phone number
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

    // Check if phone already exists in memberAll
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
        sendMessage(`${form.name} (${form.phone}) สมัครสมาชิกแล้ว`);
        setSignup(false);
        setNotification({
          show: true,
          message: "สมัครสมาชิกสำเร็จ!",
          type: "success",
        });
        setTimeout(() => {
          router.refresh(); // You can delay this if needed
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

  return (
    <main className="p-5 font-sans">
      {/* User Profile */}
      <div>
        <UserProfile
          displayName={user.displayName}
          pictureUrl={user.pictureUrl}
          statusMessage={user.statusMessage}
        />
      </div>
      {/* Members Section */}
      <div className="flex justify-center">
        {loadMember && config ? (
          <div className="my-4 flex justify-center gap-3">
            <Loader />
          </div>
        ) : member ? (
          <div className="flex min-w-2xs flex-col items-center justify-center">
            {/* Tab Buttons */}
            <div className="relative my-6 flex justify-center">
              <button
                onClick={() => setActiveTab("member")}
                className={`flex w-20 flex-col items-center px-3 pb-1 ${
                  activeTab === "member"
                    ? "font-semibold text-black"
                    : "text-gray-400"
                }`}
              >
                สมาชิก
                <div
                  className={`mt-1 h-1 rounded-full transition-all duration-300 ${
                    activeTab === "member" ? "w-20 bg-black" : "w-0"
                  }`}
                />
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex w-20 flex-col items-center px-3 pb-1 ${
                  activeTab === "history"
                    ? "font-semibold text-black"
                    : "text-gray-400"
                }`}
              >
                ประวัติ
                <div
                  className={`mt-1 h-1 rounded-full transition-all duration-300 ${
                    activeTab === "history" ? "w-20 bg-black" : "w-0"
                  }`}
                />
              </button>

              <button
                onClick={() => setActiveTab("service")}
                className={`flex w-20 flex-col items-center px-3 pb-1 ${
                  activeTab === "service"
                    ? "font-semibold text-black"
                    : "text-gray-400"
                }`}
              >
                บริการ
                <div
                  className={`mt-1 h-1 rounded-full transition-all duration-300 ${
                    activeTab === "service" ? "w-20 bg-black" : "w-0"
                  }`}
                />
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "member" && (
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
            )}

            {activeTab === "history" && (
              <div>
                {loadHistory ? (
                  <Loader />
                ) : historyList.length === 0 ? (
                  <p className="text-center text-gray-400">No history found.</p>
                ) : (
                  <div className="mx-auto w-full max-w-xs min-w-2xs space-y-4">
                    {historyList.map((bill, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-white px-6 py-2 shadow-md"
                      >
                        <p className="text-sm font-semibold text-gray-800">
                          {bill.bill_date || "-"}
                        </p>
                        <p className="text-xs whitespace-pre-line text-gray-500 italic">
                          {bill.car_plate_number || "-"}
                        </p>
                        <p className="pl-2 text-xs whitespace-pre-line text-gray-800">
                          {bill.bill_detail || "-"}
                        </p>
                        <p className="mt-1 text-right text-sm font-semibold text-gray-600">
                          {bill.bill_total_amount || "-"} ฿
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "service" && (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => sendMessage("สวัสดีครับ")}
                  className="mt-4 max-w-xs rounded-full bg-black px-6 py-2 text-white transition-colors duration-300 hover:bg-blue-500 focus:bg-gray-500 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none"
                >
                  ทักทาย
                </button>
                <div style={{ padding: "20px" }}>
                  <h1>LIFF Message Sender</h1>
                  {error && <p style={{ color: "red" }}>Error: {error}</p>}
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message"
                  />
                  <button onClick={sendMessage}>Send Message</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-md min-w-2xs space-y-2 rounded-xl bg-white p-6"
          >
            <h4 className="text-center text-lg font-semibold">สมัครสามาชิก</h4>
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
