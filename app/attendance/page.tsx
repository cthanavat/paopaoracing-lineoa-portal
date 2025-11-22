"use client";

import { useEffect, useState, useRef } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useLiff } from "../../hooks/useLiff";
import { useAppStore } from "../../store/useAppStore";
import UserProfile from "../components/UserProfile";
import Loader from "../components/Loader";
import Notification from "../components/Notification";
import {
  Button,
  Card,
  Tabs,
  TabItem,
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineBody,
} from "flowbite-react";
import {
  HiClock,
  HiLogin,
  HiLogout,
  HiCalendar,
  HiClipboardCheck,
} from "react-icons/hi";

interface AttendanceRecord {
  attendance_id: string;
  created_at: string;
  employee_id: string;
  date: string;
  userId: string;
  userName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: string;
}

interface LeaveRecord {
  id: string;
  created_at: string;
  employee_id: string;
  date: string;
  leave_option: string;
  days: string;
  reason: string;
  detail: string;
  approval: string;
  dateFrom?: string;
  dateTo?: string;
  leaveType?: string;
}

const LeaveRequestList = ({ leaves }: { leaves: LeaveRecord[] }) => {
  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">ประวัติการลา</h3>
      {leaves.length === 0 ? (
        <p className="text-center text-gray-500">ไม่พบประวัติการลา</p>
      ) : (
        <div className="space-y-3">
          {leaves.map((leave, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(leave.date).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {leave.leave_option} - {leave.reason}
                  </p>
                  {leave.detail && (
                    <p className="mt-1 text-xs text-gray-500">{leave.detail}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    leave.approval === "TRUE"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {leave.approval === "TRUE" ? "อนุมัติ" : "รออนุมัติ"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AttendancePage() {
  const {
    user,
    isLiffReady,
    config,
    member,
    employee,
    setEmployee,
    loadMember,
  } = useAppStore();
  // initLiff is automatic in useLiff hook
  useLiff();
  useAppData(); // Fetch app data (config, members, etc.)

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Attendance & leave states
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);

  // Leave form
  const [leaveForm, setLeaveForm] = useState({
    leave_option: "1 วัน",
    reason: "วันหยุด",
    date: "",
    detail: "",
  });

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(
        () => setNotification((prev) => ({ ...prev, show: false })),
        2800,
      );
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const dataLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      // console.log("🔄 Bootstrap called", {
      //   isLiffReady,
      //   user: user?.userId,
      //   member: member?.userId,
      //   loadMember,
      // });

      if (!isLiffReady) {
        console.log("⏸️ LIFF not ready yet");
        return;
      }

      // Proceed if LIFF is ready OR if we already have a user (from storage)
      if (!isLiffReady && !user) {
        console.log("⏸️ LIFF not ready and no user");
        return;
      }

      // 1. Check User first
      if (!user) {
        console.log("⏸️ No user, stopping loading");
        setLoading(false);
        return;
      }

      // 2. If user exists, check if member is still loading
      if (loadMember) {
        console.log("⏸️ Member is still loading...");
        setLoading(true);
        return;
      }

      // 3. Check if member exists
      if (!member) {
        console.log("⏸️ No member found, stopping loading");
        setLoading(false);
        return;
      }

      // Prevent re-fetching if already loaded for this user
      if (dataLoadedRef.current === user.userId) {
        console.log("✅ Data already loaded for this user");
        setLoading(false);
        return;
      }

      try {
        console.log("🚀 Starting data fetch for user");
        setLoading(true);

        // Load attendance & leave data
        await loadEmployees();
        await loadAttendanceData(user.userId);
        await loadLeaveData(user.userId);

        dataLoadedRef.current = user.userId;
        console.log("✅ All data loaded successfully");
      } catch (error) {
        console.error("❌ Initialize error:", error);
        setNotification({
          show: true,
          message: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, member, config, isLiffReady, loadMember]);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/gSheet/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: {
            sheetId: `${config.employees.sheetId}`,
            range: `${config.employees.range}`,
          },
        }),
      });
      const result = await res.json();
      if (result.data) {
        // setEmployees(
        //   result.data.filter(
        //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //     (e: any) => e.active === "TRUE" && !e.employee_id.startsWith("SYS"),
        //   ),
        // );
        // console.log(
        //   result.data.filter(
        //     (e) => e.active === "TRUE" && !e.employee_id.startsWith("SYS"),
        //   ),
        // );

        if (member) {
          const foundEmployee = result.data.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => e.userId === member.userId,
          )[0];
          setEmployee(foundEmployee || null);
        }
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      // setLoadingEmployees(false);
    }
  };
  const loadAttendanceData = async (userId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const attendanceRes = await fetch("/api/gSheet/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: {
            sheetId: `${config.attendance.sheetId}`,
            range: `${config.attendance.range}`,
          },
        }),
      });
      const attendanceResult = await attendanceRes.json();
      if (attendanceResult.data) {
        const userRecords = attendanceResult.data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r.userId === userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            attendance_id: r.attendance_id || "",
            created_at: r.created_at || "",
            employee_id: r.employee_id || "",
            date: r.date || "",
            userId: r.userId || "",
            userName: r.userName || "",
            checkIn: r.checkIn || "",
            checkOut: r.checkOut || "",
            status: r.status || "",
            workHours: r.workHours || "",
          }))
          .sort(
            (a: AttendanceRecord, b: AttendanceRecord) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        setAttendanceHistory(userRecords);
        setTodayRecord(
          userRecords.find((r: AttendanceRecord) => r.date === today) || null,
        );
      }
    } catch (error) {
      console.error("Load attendance error:", error);
      setNotification({
        show: true,
        message: "โหลดข้อมูลการเข้างานผิดพลาด",
        type: "error",
      });
    }
  };

  const loadLeaveData = async (userId: string) => {
    try {
      const leaveRes = await fetch("/api/gSheet/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: {
            sheetId: `${config.employee_leaves.sheetId}`,
            range: `${config.employee_leaves.range}`,
          },
        }),
      });
      const leaveResult = await leaveRes.json();
      if (leaveResult.data) {
        const userLeaves = leaveResult.data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r.userId === userId)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            id: r.leave_id || "", // single-date requests
            created_at: r.created_at || "",
            employee_id: r.employee_id || "",
            date: r.date || "",
            leave_option: r.leave_option || "",
            days: r.days || "",
            reason: r.reason || "",
            detail: r.detail || "",
            approval: r.approval || "FALSE",
          }))
          .sort(
            (a: LeaveRecord, b: LeaveRecord) =>
              new Date(b.date || b.dateFrom || "").getTime() -
              new Date(a.date || a.dateFrom || "").getTime(),
          );
        setLeaveHistory(userLeaves);
      }
    } catch (error) {
      console.error("Load leave error:", error);
      setNotification({
        show: true,
        message: "โหลดข้อมูลการลาผิดพลาด",
        type: "error",
      });
    }
  };

  const handleCheckIn = async () => {
    if (!user || !member) return;
    console.log("🕒 Check-in requested...");
    setActionLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];

      const res = await fetch("/api/gSheet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: `${config.attendance.sheetId}`,
          range: `${config.attendance.range}`,
          newRow: [
            "",
            "",
            "",
            today,
            user.userId,
            member.name,
            time,
            "",
            "checked_in",
            "",
            "",
          ],
        }),
      });

      const result = await res.json();
      if (result.success) {
        console.log("✅ Check-in successful.");
        setNotification({
          show: true,
          message: `เช็คอินสำเร็จ เวลา ${time}`,
          type: "success",
        });
        await loadAttendanceData(user.userId);
      } else {
        throw new Error("Check-in failed");
      }
    } catch (error) {
      console.error("❌ Check-in error:", error);
      setNotification({
        show: true,
        message: "เกิดข้อผิดพลาดในการเช็คอิน",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !todayRecord) return;
    console.log("🕒 Check-out requested...");
    setActionLoading(true);
    try {
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];

      const checkInTime = new Date(`2000-01-01 ${todayRecord.checkIn}`);
      const checkOutTime = new Date(`2000-01-01 ${time}`);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const workHours = `${hours}:${String(minutes).padStart(2, "0")}`;

      // ใน handleCheckOut() ของ AttendancePage
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId,
          date: todayRecord.date,
          checkOut: time,
          workHours,
          sheetId: config.attendance.sheetId, // ส่งมา
          // range ไม่ต้องส่งก็ได้ ถ้าใน API กำหนดตายตัวว่า A:J
        }),
      });

      const result = await res.json();
      if (result.success) {
        console.log("✅ Check-out successful.");
        setNotification({
          show: true,
          message: `เช็คเอาท์สำเร็จ เวลา ${time} (ทำงาน ${workHours} ชั่วโมง)`,
          type: "success",
        });
        await loadAttendanceData(user.userId);
      } else {
        throw new Error("Check-out failed");
      }
    } catch (error) {
      console.error("❌ Check-out error:", error);
      setNotification({
        show: true,
        message: "เกิดข้อผิดพลาดในการเช็คเอาท์",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !member) return;
    console.log("📝 Leave request submitting...");
    setActionLoading(true);

    try {
      // Validate date range
      if (!leaveForm.date) {
        setNotification({
          show: true,
          message: "กรุณาเลือกวันที่ลา",
          type: "warning",
        });
        setActionLoading(false);
        return;
      }
      // const from = new Date(leaveForm.dateFrom);
      // const to = new Date(leaveForm.dateTo);
      // if (to < from) {
      //   setNotification({
      //     show: true,
      //     message: "ช่วงวันที่ไม่ถูกต้อง",
      //     type: "warning",
      //   });
      //   setActionLoading(false);
      //   return;
      // }

      let days = 0;
      if (leaveForm.leave_option === "ครึ่งวัน") {
        days = 0.5;
      } else if (leaveForm.leave_option === "1 วัน") {
        days = 1;
      } else if (leaveForm.leave_option === "2 วัน") {
        days = 2;
      }

      const res = await fetch("/api/gSheet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: `${config.employee_leaves.sheetId}`,
          range: `${config.employee_leaves.range}`,
          newRow: [
            "",
            new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (employee as any).employee_id,
            leaveForm.date, // createdAt / request date
            leaveForm.leave_option,
            days,
            leaveForm.reason,
            leaveForm.detail,
            "FALSE",
          ],
        }),
      });

      const result = await res.json();
      if (result.success) {
        console.log("✅ Leave request submitted successfully.");
        setNotification({
          show: true,
          message: "ส่งคำขอลาสำเร็จ",
          type: "success",
        });
        setLeaveForm({
          leave_option: "1 วัน",
          reason: "วันหยุด",
          date: "",
          detail: "",
        });
        await loadLeaveData(user.userId);
        // setActiveTab("leave");
      } else {
        throw new Error("Leave request failed");
      }
    } catch (error) {
      console.error("❌ Leave request error:", error);
      setNotification({
        show: true,
        message: "เกิดข้อผิดพลาดในการส่งคำขอลา",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Monthly filter for leave records
  // const monthLeaves = useMemo(() => {
  //   const [year, month] = selectedMonth.split("-");
  //   return leaveHistory.filter((r) => {
  //     const baseDate = r.date || r.dateFrom || "";
  //     if (!baseDate) return false;
  //     const d = new Date(baseDate);
  //     return (
  //       d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month)
  //     );
  //   });
  // }, [leaveHistory, selectedMonth]);

  // const monthLeaveSummary = useMemo(() => {
  //   // Count by leaveType and days
  //   const summary = {};
  //   for (const r of monthLeaves) {
  //     const type = r.leaveType || "อื่นๆ";
  //     if (!summary[type]) summary[type] = { count: 0, days: 0 };
  //     summary[type].count += 1;

  //     // Calculate number of days in the period
  //     const start = new Date(r.dateFrom || r.date);
  //     const end = new Date(r.dateTo || r.date);
  //     const diffDays = Math.max(
  //       1,
  //       Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
  //     );
  //     summary[type].days += diffDays;
  //   }
  //   return summary;
  // }, [monthLeaves]);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  if (!user || !member) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-gray-600">กรุณาเข้าสู่ระบบจากหน้าหลัก</p>
      </main>
    );
  }

  const todayFormatted = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-50 p-5 pb-20">
      <div className="mb-4">
        <UserProfile
          displayName={user.displayName}
          pictureUrl={user.pictureUrl}
          statusMessage={user.statusMessage}
        />
        {!useAppStore.getState().isInClient && (
          <div className="mt-2 flex justify-center">
            <Button
              color="light"
              size="xs"
              onClick={() => {
                localStorage.removeItem("line-user");
                window.location.reload();
              }}
            >
              Logout
            </Button>
          </div>
        )}
      </div>
      {/* Navigation tabs */}
      <Tabs
        aria-label="Tabs with underline"
        variant="underline"
        className="flex min-w-2xs items-center-safe"
      >
        <TabItem
          active
          title="เช็คอิน"
          icon={HiClock}
          className="flex items-center justify-center"
        >
          <div className="mx-auto max-w-xs">
            <p className="text-md text-center font-semibold text-gray-900">
              วันที่ {todayFormatted}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 p-4">
                <div className="mb-2 flex items-center space-x-2 text-green-600">
                  <HiLogin className="h-5 w-5" />
                  <span className="font-medium">เข้างาน</span>
                </div>
                <p className="text-2xl text-green-700">
                  {todayRecord?.checkIn || "--:--:--"}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <div className="mb-2 flex items-center space-x-2 text-red-600">
                  <HiLogout className="h-5 w-5" />
                  <span className="font-medium">ออกงาน</span>
                </div>
                <p className="text-2xl text-red-700">
                  {todayRecord?.checkOut || "--:--:--"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!todayRecord && (
                <Button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  color="success"
                  className="hover:bg-black-800 w-full rounded-full bg-green-700 py-2 text-sm font-medium text-white hover:opacity-90"
                  size="md"
                >
                  <HiLogin className="mr-2 h-5 w-5" />
                  {actionLoading ? "กำลังบันทึก..." : "เช็คอิน"}
                </Button>
              )}

              {todayRecord && !todayRecord.checkOut && (
                <Button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  color="failure"
                  className="hover:bg-black-800 w-full rounded-full bg-red-700 py-2 text-sm font-medium text-white hover:opacity-90"
                  size="md"
                >
                  <HiLogout className="mr-2 h-5 w-5" />
                  {actionLoading ? "กำลังบันทึก..." : "เช็คเอาท์"}
                </Button>
              )}

              {todayRecord?.checkOut && (
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <div className="mb-2 flex items-center justify-center space-x-2">
                    <HiClipboardCheck className="h-5 w-5" />
                    <span className="font-medium">บันทึกเวลาเรียบร้อยแล้ว</span>
                  </div>
                  <p className="text-sm">
                    ทำงาน: {todayRecord.workHours || "-"}
                  </p>
                </div>
              )}
            </div>
            <div> day off all of employe incoming</div>
          </div>
        </TabItem>
        <TabItem
          active
          title="ประวัติ"
          icon={HiCalendar}
          className="flex items-center justify-center"
        >
          <div className="mx-auto max-w-md space-y-4">
            {attendanceHistory.length === 0 ? (
              <Card>
                <p className="text-center text-gray-500">ยังไม่มีประวัติ</p>
              </Card>
            ) : (
              <Timeline>
                {attendanceHistory.map((record, idx) => (
                  <TimelineItem key={idx} className="mb-1 ml-4">
                    <TimelinePoint />
                    <TimelineContent>
                      <TimelineTime>
                        {new Date(record.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TimelineTime>
                      {record.status !== "completed" && (
                        <TimelineTitle>
                          {record.status === "checking_in"
                            ? "กำลังบันทึก"
                            : "กำลังทำงาน"}
                        </TimelineTitle>
                      )}
                      <TimelineBody>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">เข้า:</span>{" "}
                            <span className="font-medium text-green-600">
                              {record.checkIn}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">ออก:</span>{" "}
                            <span className="font-medium text-red-600">
                              {record.checkOut || "-"}
                            </span>
                          </div>
                        </div>
                        {record.workHours && (
                          <p className="mt-1 text-sm text-gray-600">
                            {/* ทำงาน: {record.workHours} */}
                          </p>
                        )}
                      </TimelineBody>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </div>
        </TabItem>
        <TabItem
          active
          title="ลา/หยุด"
          icon={HiLogout}
          className="flex items-center justify-center"
        >
          <div className="mx-auto max-w-xs min-w-2xs space-y-6 px-4">
            {/* <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                เลือกเดือน
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div> */}
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div className="mb-2">
                <label className="mb-1 block text-sm text-gray-700">
                  วันที่
                </label>
                <input
                  type="date"
                  value={leaveForm.date}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, date: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                  required
                />
              </div>
              <div className="mb-2">
                <label className="mb-1 block text-sm text-gray-700">
                  จำนวน
                </label>
                <select
                  value={leaveForm.leave_option}
                  onChange={(e) =>
                    setLeaveForm({
                      ...leaveForm,
                      leave_option: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="ครึ่งวัน">ครึ่งวัน</option>
                  <option value="1 วัน">1 วัน</option>
                  <option value="2 วัน">2 วัน</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="mb-1 block text-sm text-gray-700">
                  ประเภทการลา
                </label>
                <select
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                >
                  <option value="ลาป่วย">วันหยุด</option>
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="ลากิจ">ลากิจ</option>
                </select>
              </div>

              <div className="mb-2">
                <label className="mb-1 block text-sm text-gray-700">
                  เหตุผล
                </label>
                <textarea
                  value={leaveForm.detail}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, detail: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-black focus:outline-none"
                  placeholder="ระบุเหตุผลการลา..."
                />
              </div>

              <Button
                type="submit"
                disabled={actionLoading}
                className="text-md w-full rounded-full bg-orange-400 py-2 font-medium text-white hover:bg-red-800 hover:opacity-90"
                size="md"
              >
                {actionLoading ? "กำลังส่ง..." : "ส่งคำขอลา"}
              </Button>
            </form>
            {/* Monthly summary */}
            <LeaveRequestList leaves={leaveHistory} />
          </div>
        </TabItem>
      </Tabs>
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </main>
  );
}
