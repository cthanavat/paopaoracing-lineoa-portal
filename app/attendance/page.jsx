"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import UserProfile from "@/app/components/UserProfile";
import Loader from "@/app/components/Loader";
import Notification from "@/app/components/Notification";
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
  HiHome,
  HiUserCircle,
} from "react-icons/hi";

export default function AttendancePage() {
  const router = useRouter();

  // Global state from Zustand
  const {
    user,
    config,
    member,
    setMember,
    memberAll,
    employee,
    setEmployee,
    employees,
    setEmployees,
    loadingEmployees,
    setLoadingEmployees,
  } = useAppStore();

  // Local UI states
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Attendance & leave states
  const [todayRecord, setTodayRecord] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);

  // Tabs
  const [activeTab, setActiveTab] = useState("checkin");

  // Monthly leave request
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "ลาป่วย",
    reason: "",
    dateFrom: "",
    dateTo: "",
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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        // Ensure login
        if (!user) {
          router.push("/");
          return;
        }
        // Ensure member exists
        if (!member) {
          setNotification({
            show: true,
            message: "กำลังโหลดข้อมูลสมาชิก...",
            type: "info",
          });
          return;
        }
        // Load attendance & leave data
        await loadEmployees(user.user);
        await loadAttendanceData(user.userId);
        await loadLeaveData(user.userId);
      } catch (error) {
        console.error("Initialize error:", error);
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
  }, [user, member, config]);

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
        setEmployees(
          result.data.filter(
            (e) => e.active === "TRUE" && !e.employee_id.startsWith("SYS"),
          ),
        );
        // console.log(
        //   result.data.filter(
        //     (e) => e.active === "TRUE" && !e.employee_id.startsWith("SYS"),
        //   ),
        // );

        setEmployee(result.data.filter((e) => e.userId === member.userId)[0]);
        console.log("loaded employee");
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };
  const loadAttendanceData = async (userId) => {
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
        console.log("loadAttendanceData", employee);
        const userRecords = attendanceResult.data
          .filter((r) => r.userId === userId)
          .map((r) => ({
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
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceHistory(userRecords);
        setTodayRecord(userRecords.find((r) => r.date === today) || null);
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

  const loadLeaveData = async (userId) => {
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
          .filter((r) => r.userId === userId)
          .map((r) => ({
            date: r.date || "", // single-date requests
            dateFrom: r.dateFrom || "",
            dateTo: r.dateTo || "",
            userId: r.userId || "",
            userName: r.userName || "",
            leaveType: r.leaveType || "",
            reason: r.reason || "",
            status: r.status || "pending",
          }))
          .sort(
            (a, b) =>
              new Date(b.date || b.dateFrom) - new Date(a.date || a.dateFrom),
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
      console.error("Check-in error:", error);
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
    setActionLoading(true);
    try {
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];

      const checkInTime = new Date(`2000-01-01 ${todayRecord.checkIn}`);
      const checkOutTime = new Date(`2000-01-01 ${time}`);
      const diffMs = checkOutTime - checkInTime;
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
      console.error("Check-out error:", error);
      setNotification({
        show: true,
        message: "เกิดข้อผิดพลาดในการเช็คเอาท์",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!user || !member) return;
    setActionLoading(true);

    try {
      // Validate date range
      if (!leaveForm.dateFrom || !leaveForm.dateTo) {
        setNotification({
          show: true,
          message: "กรุณาเลือกวันที่ลา",
          type: "warning",
        });
        setActionLoading(false);
        return;
      }
      const from = new Date(leaveForm.dateFrom);
      const to = new Date(leaveForm.dateTo);
      if (to < from) {
        setNotification({
          show: true,
          message: "ช่วงวันที่ไม่ถูกต้อง",
          type: "warning",
        });
        setActionLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      const res = await fetch("/api/gSheet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: process.env.NEXT_PUBLIC_CONFIG_SHEET_ID,
          range: "leave!A:G",
          newRow: [
            today, // createdAt / request date
            user.userId,
            member.name,
            leaveForm.leaveType,
            leaveForm.reason,
            leaveForm.dateFrom,
            leaveForm.dateTo,
          ],
        }),
      });

      const result = await res.json();
      if (result.success) {
        setNotification({
          show: true,
          message: "ส่งคำขอลาสำเร็จ",
          type: "success",
        });
        setLeaveForm({
          leaveType: "ลาป่วย",
          reason: "",
          dateFrom: "",
          dateTo: "",
        });
        await loadLeaveData(user.userId);
        setActiveTab("leave");
      } else {
        throw new Error("Leave request failed");
      }
    } catch (error) {
      console.error("Leave request error:", error);
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
  const monthLeaves = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return leaveHistory.filter((r) => {
      const baseDate = r.date || r.dateFrom || "";
      if (!baseDate) return false;
      const d = new Date(baseDate);
      return (
        d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month)
      );
    });
  }, [leaveHistory, selectedMonth]);

  const monthLeaveSummary = useMemo(() => {
    // Count by leaveType and days
    const summary = {};
    for (const r of monthLeaves) {
      const type = r.leaveType || "อื่นๆ";
      if (!summary[type]) summary[type] = { count: 0, days: 0 };
      summary[type].count += 1;

      // Calculate number of days in the period
      const start = new Date(r.dateFrom || r.date);
      const end = new Date(r.dateTo || r.date);
      const diffDays = Math.max(
        1,
        Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      );
      summary[type].days += diffDays;
    }
    return summary;
  }, [monthLeaves]);

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
          <div className="mx-auto max-w-md space-y-4">
            <Card>
              <h3 className="text-center text-lg font-semibold text-gray-800">
                สถานะวันนี้
              </h3>
              <p className="text-center text-sm text-gray-500">
                {todayFormatted}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="mb-2 flex items-center space-x-2 text-green-600">
                    <HiLogin className="h-5 w-5" />
                    <span className="font-medium">เข้างาน</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {todayRecord?.checkIn || "--:--:--"}
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-4">
                  <div className="mb-2 flex items-center space-x-2 text-red-600">
                    <HiLogout className="h-5 w-5" />
                    <span className="font-medium">ออกงาน</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {todayRecord?.checkOut || "--:--:--"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {!todayRecord && (
                  <Button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    color="success"
                    className="w-full"
                    size="lg"
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
                    className="w-full"
                    size="lg"
                  >
                    <HiLogout className="mr-2 h-5 w-5" />
                    {actionLoading ? "กำลังบันทึก..." : "เช็คเอาท์"}
                  </Button>
                )}

                {todayRecord?.checkOut && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
                    <p className="font-medium text-blue-700">
                      ✅ บันทึกเวลาเรียบร้อยแล้ว
                    </p>
                    <p className="text-sm text-blue-600">
                      ทำงาน: {todayRecord.workHours || "-"}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabItem>
        <TabItem
          active
          title="ประวัติ"
          icon={HiCalendar}
          className="flex items-center justify-center"
        >
          <div className="mx-auto max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              ประวัติการเข้างาน
            </h3>

            {attendanceHistory.length === 0 ? (
              <Card>
                <p className="text-center text-gray-500">ยังไม่มีประวัติ</p>
              </Card>
            ) : (
              <Timeline>
                {attendanceHistory.map((record, idx) => (
                  <TimelineItem key={idx}>
                    <TimelinePoint />
                    <TimelineContent>
                      <TimelineTime>
                        {new Date(record.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TimelineTime>
                      <TimelineTitle>
                        {record.status === "completed"
                          ? "เสร็จสิ้น"
                          : "กำลังทำงาน"}
                      </TimelineTitle>
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
                            ทำงาน: {record.workHours}
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
          <div className="mx-auto max-w-xs space-y-6">
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-gray-800">
                ขอลา/หยุด
              </h3>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  เลือกเดือน
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <form onSubmit={handleLeaveSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    ประเภทการลา
                  </label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, leaveType: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ลาป่วย">ลาป่วย</option>
                    <option value="ลากิจ">ลากิจ</option>
                    <option value="ลาพักร้อน">ลาพักร้อน</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      ตั้งแต่วันที่
                    </label>
                    <input
                      type="date"
                      value={leaveForm.dateFrom}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, dateFrom: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      ถึงวันที่
                    </label>
                    <input
                      type="date"
                      value={leaveForm.dateTo}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, dateTo: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    เหตุผล
                  </label>
                  <textarea
                    value={leaveForm.reason}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, reason: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="ระบุเหตุผลการลา..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={actionLoading}
                  color="blue"
                  className="w-full"
                  size="lg"
                >
                  {actionLoading ? "กำลังส่ง..." : "ส่งคำขอลา"}
                </Button>
              </form>
            </Card>

            {/* Monthly summary */}
            <Card>
              <h3 className="mb-3 text-lg font-semibold text-gray-800">
                สรุปการลาในเดือนนี้
              </h3>
              {Object.keys(monthLeaveSummary).length === 0 ? (
                <p className="text-gray-500">ยังไม่มีการลาในเดือนนี้</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(monthLeaveSummary).map(([type, data]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded border p-3"
                    >
                      <span className="font-medium">{type}</span>
                      <span className="text-sm text-gray-700">
                        จำนวน {data.count} ครั้ง • รวม {data.days} วัน
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Monthly leave timeline */}
            <Card>
              <h3 className="mb-3 text-lg font-semibold text-gray-800">
                คำขอลาของเดือนที่เลือก
              </h3>
              {monthLeaves.length === 0 ? (
                <p className="text-gray-500">ยังไม่มีคำขอ</p>
              ) : (
                <Timeline>
                  {monthLeaves.map((record, idx) => (
                    <TimelineItem key={idx}>
                      <TimelinePoint />
                      <TimelineContent>
                        <TimelineTime>
                          {record.dateFrom
                            ? `${new Date(record.dateFrom).toLocaleDateString("th-TH")} - ${new Date(record.dateTo).toLocaleDateString("th-TH")}`
                            : new Date(record.date).toLocaleDateString("th-TH")}
                        </TimelineTime>
                        <TimelineTitle>{record.leaveType}</TimelineTitle>
                        <TimelineBody>
                          <p className="text-sm">{record.reason}</p>
                          <span
                            className={`mt-1 inline-block rounded px-2 py-1 text-xs ${
                              record.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : record.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {record.status === "approved"
                              ? "อนุมัติ"
                              : record.status === "rejected"
                                ? "ไม่อนุมัติ"
                                : "รอพิจารณา"}
                          </span>
                        </TimelineBody>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </Card>
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
