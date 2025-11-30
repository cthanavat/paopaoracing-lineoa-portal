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
  HiOutlineClock,
  HiClipboardCheck,
} from "react-icons/hi";

interface AttendanceRecord {
  attendance_id: string;
  created_at: string;
  employee_id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: string;
  type?: string;
  leaveType?: string;
  leaveReason?: string;
  leaveDays?: string;
}

interface RawSheetRecord {
  [key: string]: string;
  employee_id: string;
}

interface Employee {
  employee_id: string;
  [key: string]: string;
}

interface LeaveRecord {
  leave_id: string;
  created_at: string;
  employee_id: string;
  date: string;
  leave_option: string;
  reason: string;
  days: string;
  approval: string;
}

interface AllEmployeeLeave {
  employeeName: string;
  leaveType: string;
  leaveReason: string;
  leaveDays: string;
  date: string;
  approval: string;
}

const AllEmployeeLeaveSchedule = ({
  leaves,
}: {
  leaves: AllEmployeeLeave[];
}) => {
  return (
    <div className="mt-0 mb-4">
      <h3 className="text-md mb-1 max-w-xs text-center font-semibold text-gray-800">
        ตารางวันหยุด
      </h3>
      <div className="space-y-3">
        {leaves.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center text-gray-500">
            ไม่มีรายการลาที่อนุมัติแล้วในเร็วๆ นี้
          </div>
        ) : (
          leaves
            .sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            )
            .map((leave, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {leave.employeeName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {leave.leaveType} - {leave.leaveReason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(leave.date).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leave.approval === "TRUE" ? "อนุมัติ" : "ไม่อนุมัติ"}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
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
  const [allEmployeeLeaves, setAllEmployeeLeaves] = useState<
    AllEmployeeLeave[]
  >([]);

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
        const { foundEmployee, employeeMap } = (await loadEmployees()) || {};
        if (foundEmployee) {
          await loadAttendanceData(foundEmployee);
          await loadLeaveData(foundEmployee, employeeMap);
        } else {
          // Fallback if loadEmployees returns null (though it shouldn't if member exists)
          await loadLeaveData();
        }

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
        const employeeMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.data.forEach((e: any) => {
          if (e.employee_id) {
            employeeMap.set(e.employee_id, e.nickname || e.name);
          }
        });

        if (member) {
          const foundEmployee = result.data.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => e.userId === member.userId,
          )[0];
          setEmployee(foundEmployee || null);
          console.log("✅ Employee loaded:", foundEmployee?.employee_id);
          return { foundEmployee, employeeMap }; // Return map as well
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to load employees:", error);
      return null;
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadAttendanceData = async (employeeData?: any) => {
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

      const currentEmployee = (employeeData || employee) as
        | Employee
        | undefined;
      console.log("📊 Attendance data from sheet:", attendanceResult.data);
      console.log("🔍 Filtering by employee_id:", currentEmployee?.employee_id);

      if (attendanceResult.data) {
        let userRecords = (attendanceResult.data as RawSheetRecord[])
          .filter((r: RawSheetRecord) => {
            const match = r.employee_id === currentEmployee?.employee_id;
            console.log(
              `Record: ${r.employee_id} === ${currentEmployee?.employee_id}? ${match}`,
            );
            return match;
          })
          .map((r: RawSheetRecord) => ({
            attendance_id: r.attendance_id || "",
            created_at: r.created_at || "",
            employee_id: r.employee_id || "",
            date: r.date || "",
            checkIn: r.checkIn || "",
            checkOut: r.checkOut || "",
            status: r.status || "",
            workHours: r.workHours || "",
            type: "attendance", // Mark as attendance
          }));

        // Create a map to merge records by date
        const recordsMap = new Map<string, AttendanceRecord>();

        // Add attendance records to map
        userRecords.forEach((record: AttendanceRecord) => {
          recordsMap.set(record.date, record);
        });

        // Fetch and merge leave data
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
            (leaveResult.data as RawSheetRecord[])

              .filter(
                (r: RawSheetRecord) =>
                  r.employee_id === currentEmployee?.employee_id,
              )
              .forEach((r: RawSheetRecord) => {
                const date = r.date || "";
                const existingRecord = recordsMap.get(date);

                const leaveData = {
                  attendance_id: existingRecord
                    ? existingRecord.attendance_id
                    : `LEAVE-${r.leave_id || date}`,
                  created_at: existingRecord
                    ? existingRecord.created_at
                    : r.created_at || "",
                  employee_id: existingRecord
                    ? existingRecord.employee_id
                    : r.employee_id || "",
                  date: date,
                  checkIn: existingRecord ? existingRecord.checkIn : "",
                  checkOut: existingRecord ? existingRecord.checkOut : "",
                  status: existingRecord
                    ? existingRecord.status
                    : r.approval === "TRUE"
                      ? "leave_approved"
                      : "leave_pending",
                  workHours: existingRecord ? existingRecord.workHours : "",
                  type: existingRecord ? "mixed" : "leave", // Mark as mixed if both exist
                  leaveType: r.leave_option || "ลา",
                  leaveReason: r.reason || "",
                  leaveDays: r.days || "",
                  // If mixed, we might want to preserve the leave status specifically?
                  // For now, let's add a specific leaveStatus field if needed, or just use the existing logic.
                  // But wait, 'status' field is used for attendance status (checking_in, etc).
                  // Leave status is derived from approval.
                  // Let's add leaveStatus to be safe.
                  leaveStatus:
                    r.approval === "TRUE" ? "leave_approved" : "leave_pending",
                  leaveStatusText:
                    r.approval === "TRUE" ? "อนุมัติ" : "รออนุมัติ",
                };

                recordsMap.set(date, { ...existingRecord, ...leaveData });
              });
          }
        } catch (err) {
          console.error("Failed to merge leave data:", err);
        }

        // Convert map back to array
        userRecords = Array.from(recordsMap.values());

        // Filter records: Start of last month onwards
        const now = new Date();
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );

        userRecords = userRecords.filter((r: AttendanceRecord) => {
          const recordDate = new Date(r.date);
          // Reset hours to ensure accurate date comparison
          recordDate.setHours(0, 0, 0, 0);
          return recordDate >= startOfLastMonth;
        });

        userRecords.sort(
          (a: AttendanceRecord, b: AttendanceRecord) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        console.log("✅ Filtered records (merged):", userRecords);
        setAttendanceHistory(userRecords);
        console.log("✅ userRecords record:", userRecords);
        setTodayRecord(
          userRecords.find(
            (r: AttendanceRecord) => r.date === today && r.type !== "leave",
          ) || null,
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

  const loadLeaveData = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employeeData?: any,
    employeeMap?: Map<string, string>,
  ) => {
    try {
      const res = await fetch("/api/gSheet/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: {
            sheetId: `${config.employee_leaves.sheetId}`,
            range: `${config.employee_leaves.range}`,
          },
        }),
      });
      const result = await res.json();
      if (result.data) {
        // Process for current user
        const currentEmployee = (employeeData || employee) as
          | Employee
          | undefined;
        const userLeaves = (result.data as RawSheetRecord[])

          .filter(
            (r: RawSheetRecord) =>
              r.employee_id === currentEmployee?.employee_id,
          )
          .map((r: RawSheetRecord) => ({
            leave_id: r.leave_id || "",
            created_at: r.created_at || "",
            employee_id: r.employee_id || "",
            date: r.date || "",
            leave_option: r.leave_option || "",
            reason: r.reason || "",
            days: r.days || "",
            approval: r.approval || "",
          }))
          .filter((r: LeaveRecord) => {
            const recordDate = new Date(r.date);
            const now = new Date();
            const startOfCurrentMonth = new Date(
              now.getFullYear(),
              now.getMonth(),
              1,
            );
            startOfCurrentMonth.setHours(0, 0, 0, 0);
            recordDate.setHours(0, 0, 0, 0);

            return recordDate >= startOfCurrentMonth;
          })
          .sort(
            (a: LeaveRecord, b: LeaveRecord) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

        setLeaveHistory(userLeaves);

        // Process for ALL employees (Future & Approved)
        if (employeeMap) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const allLeaves = result.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((r: any) => {
              const leaveDate = new Date(r.date);
              leaveDate.setHours(0, 0, 0, 0);
              return r.approval === "TRUE" && leaveDate >= today;
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r: any) => ({
              employeeName: employeeMap.get(r.employee_id) || "Unknown",
              leaveType: r.leave_option || "ลา",
              leaveReason: r.reason || "",
              leaveDays: r.days || "",
              date: r.date || "",
              approval: r.approval || "",
            }))
            .sort(
              (a: AllEmployeeLeave, b: AllEmployeeLeave) =>
                new Date(a.date).getTime() - new Date(b.date).getTime(),
            );

          setAllEmployeeLeaves(allLeaves);
        }
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
    if (!user || !member || !employee) return;
    console.log("🕒 Check-in requested...");
    console.log("Employee ID:", (employee as Employee)?.employee_id);
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (employee as any)?.employee_id || "", // Key: employee_id
            today,
            member.name,
            time,
            "",
            "checked_in",
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
        await loadAttendanceData();
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
    if (!user || !todayRecord || !employee) return;
    console.log("🕒 Check-out requested...");
    console.log(
      "Employee ID for checkout:",
      (employee as Employee)?.employee_id,
    );
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          employeeId: (employee as any)?.employee_id, // ส่ง employee_id แทน userId
          date: todayRecord.date,
          checkOut: time,
          workHours,
          sheetId: config.attendance.sheetId,
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
        await loadAttendanceData();
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
            employee?.employee_id || "", // Key: employee_id
            leaveForm.date,
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
          pictureUrl={user.pictureUrl}
          displayName={employee?.nickname || user.displayName}
          statusMessage={
            `${employee?.firstname || ""} ${employee?.lastname || ""}`.trim() ||
            employee?.nickname ||
            user.statusMessage
          }
          bio={`${employee?.role || ""}`}
        />
        {!useAppStore.getState().isInClient &&
          employee.userRole === "admin" && (
            <div className="mt-2 flex justify-center">
              <Button
                color="light"
                size="xs"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem("line-user");
                    window.location.reload();
                  }
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

            <div className="mx-8 mt-4 space-y-3">
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

            <div className="my-8 border-t border-gray-700"></div>

            <div className="mx-auto max-w-xs min-w-2xs px-4 pt-0">
              <AllEmployeeLeaveSchedule leaves={allEmployeeLeaves} />
            </div>
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
                        {`${new Date(record.date).getFullYear()}-${(
                          "0" +
                          (new Date(record.date).getMonth() + 1)
                        ).slice(-2)}-${(
                          "0" + new Date(record.date).getDate()
                        ).slice(-2)} (${new Date(
                          record.date,
                        ).toLocaleDateString("en-US", {
                          weekday: "short",
                        })})`}
                      </TimelineTime>

                      {/* Leave Section */}
                      {record.leaveType && (
                        <div className="mb-3 border-l-4 border-purple-200 pl-3">
                          <TimelineTitle>
                            {(() => {
                              const recordDate = new Date(record.date);
                              const currentDate = new Date();
                              recordDate.setHours(0, 0, 0, 0);
                              currentDate.setHours(0, 0, 0, 0);

                              const isDatePassed = recordDate < currentDate;

                              if (isDatePassed) {
                                if (record.leaveStatus === "leave_approved") {
                                  return (
                                    <span className="text-gray-900">
                                      {record.leaveReason}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-400 line-through">
                                      ไม่อนุมัติ
                                    </span>
                                  );
                                }
                              }

                              // Future date or today
                              const statusColorClass =
                                record.leaveStatus === "leave_pending"
                                  ? "text-yellow-500 text-thin"
                                  : record.leaveStatus === "leave_approved"
                                    ? "text-green-500"
                                    : "text-gray-500";

                              return (
                                <span className={statusColorClass}>
                                  {record.leaveStatusText}
                                </span>
                              );
                            })()}
                          </TimelineTitle>
                          <TimelineBody>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <p>
                                <span className="font-medium">ประเภท:</span>{" "}
                                {record.leaveReason}
                              </p>
                              <p>
                                <span className="font-medium">จำนวน:</span>{" "}
                                {record.leaveDays} วัน
                              </p>
                            </div>
                          </TimelineBody>
                        </div>
                      )}

                      {/* Attendance Section */}
                      {record.checkIn && (
                        <div
                          className={
                            record.leaveType
                              ? "border-l-4 border-green-200 pl-3"
                              : ""
                          }
                        >
                          <TimelineTitle>
                            {(() => {
                              const recordDate = new Date(record.date);
                              recordDate.setHours(0, 0, 0, 0);
                              const currentDate = new Date();
                              currentDate.setHours(0, 0, 0, 0);

                              const isPastDate = recordDate < currentDate;

                              if (isPastDate && record.status !== "completed") {
                                return "ไม่ลงบันทึกเวลา";
                              }
                              if (record.status === "checked_in") {
                                return (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <HiOutlineClock className="h-4 w-4" />
                                    กำลังทำงาน
                                  </span>
                                );
                              }
                              return null; // Or an empty string if no title is desired for completed records
                            })()}
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
                          </TimelineBody>
                        </div>
                      )}
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
          <div className="mx-auto max-w-xs min-w-2xs px-4 pt-0">
            <AllEmployeeLeaveSchedule leaves={allEmployeeLeaves} />
          </div>

          <div className="mt-6">
            <form
              onSubmit={handleLeaveSubmit}
              className="mt-6 rounded-t-2xl bg-orange-100 px-4 py-4"
            >
              {" "}
              <h3 className="mb-1 max-w-xs text-center text-lg font-semibold text-orange-400">
                ลงวันหยุด
              </h3>
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
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black focus:outline-none"
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
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black focus:outline-none"
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
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black focus:outline-none"
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
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-black focus:outline-none"
                  placeholder="ระบุเหตุผลการลา..."
                />
              </div>
              <div className="mb-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="text-md w-full rounded-full bg-orange-400 py-2 font-medium text-white hover:bg-red-800 hover:opacity-90"
                  size="md"
                >
                  {actionLoading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </Button>
              </div>
            </form>
            <div className="rounded-b-2xl bg-orange-200 px-3 pt-6 pb-4">
              <h3 className="mb-4 text-center text-lg font-semibold text-gray-900">
                ประวัติการลา
              </h3>
              {leaveHistory.length === 0 ? (
                <p className="text-center text-gray-500">ไม่พบประวัติการลา</p>
              ) : (
                <div className="space-y-3">
                  {leaveHistory.map((leave, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-orange-100 p-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {`${new Date(leave.date).getFullYear()}-${(
                              "0" +
                              (new Date(leave.date).getMonth() + 1)
                            ).slice(-2)}-${(
                              "0" + new Date(leave.date).getDate()
                            ).slice(-2)} (${new Date(
                              leave.date,
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                            })})`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {leave.leave_option} - {leave.reason}
                          </p>
                          {/* {leave.detail && (
                    <p className="mt-1 text-xs text-gray-500">{leave.detail}</p>
                  )} */}
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
