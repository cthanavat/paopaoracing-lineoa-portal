"use client";

import { useEffect, useState, useRef } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useLiff } from "../../hooks/useLiff";
import { useAppStore } from "../../store/useAppStore";
import UserProfile from "../components/UserProfile";
import Loader from "../components/Loader";
import Notification from "../components/Notification";
import AllEmployeeLeaveSchedule from "./components/AllEmployeeLeaveSchedule";
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
import type {
  AttendanceRecord,
  AllEmployeeLeave,
  RawSheetRecord,
  Employee,
  LeaveRecord,
} from "./types/attendance";
import { authenticatedFetch } from "@/lib/utils/apiClient";

export default function AttendancePage() {
  const {
    user,
    isLiffReady,
    config,
    member,
    employee,
    employees,
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
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      // Prevent multiple simultaneous bootstraps
      if (hasInitializedRef.current) {
        return;
      }

      if (!isLiffReady) {
        return;
      }

      // Proceed if LIFF is ready OR if we already have a user (from storage)
      if (!isLiffReady && !user) {
        return;
      }

      // 1. Check User first
      if (!user) {
        setLoading(false);
        return;
      }

      // 2. If user exists, check if member is still loading
      if (loadMember) {
        return;
      }

      // 3. Check if member exists
      if (!member) {
        setLoading(false);
        return;
      }

      // Prevent re-fetching if already loaded for this user
      if (dataLoadedRef.current === user.userId) {
        setLoading(false);
        return;
      }

      try {
        hasInitializedRef.current = true;
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
      } catch (error) {
        console.error("❌ Initialize error:", error);
        setNotification({
          show: true,
          message: "เกิดข้อผิดพลาดในการโหลดข้อมูล",
          type: "error",
        });
      } finally {
        setLoading(false);
        hasInitializedRef.current = false;
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, member, config, isLiffReady]);

  const loadEmployees = async () => {
    // console.log("📋 [loadEmployees] Called");
    try {
      if (employees.length > 0) {
        const employeeMap = new Map<string, string>();
        employees.forEach((e: RawSheetRecord) => {
          if (e.employee_id) {
            employeeMap.set(e.employee_id, e.nickname || e.name || "");
          }
        });

        if (member) {
          const foundEmployee = employees.find(
            (e: RawSheetRecord) => e.userId === member.userId,
          );
          setEmployee((foundEmployee as Employee) || null);
          return { foundEmployee, employeeMap };
        }
      }

      const res = await authenticatedFetch("/api/gSheet/get", {
        method: "POST",
        body: JSON.stringify({ resource: "employees" }),
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
          return { foundEmployee, employeeMap }; // Return map as well
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to load employees:", error);
      return null;
    }
  };

  const loadAttendanceData = async (employeeData?: Employee) => {
    // console.log("📅 [loadAttendanceData] Called");
    try {
      const today = new Date().toISOString().split("T")[0];

      const attendanceRes = await authenticatedFetch("/api/gSheet/get", {
        method: "POST",
        body: JSON.stringify({ resource: "attendance" }),
      });
      const attendanceResult = await attendanceRes.json();

      const currentEmployee = (employeeData || employee) as
        | Employee
        | undefined;
      if (attendanceResult.data) {
        let userRecords = (attendanceResult.data as RawSheetRecord[])
          .filter((r: RawSheetRecord) => {
            const match = r.employee_id === currentEmployee?.employee_id;
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
          const leaveRes = await authenticatedFetch("/api/gSheet/get", {
            method: "POST",
            body: JSON.stringify({ resource: "employee_leaves" }),
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

                const getLeaveStatusInfo = (rawStatus: string) => {
                  switch (rawStatus) {
                    case "Approved":
                      return {
                        statusKey: "leave_approved",
                        statusText: "อนุมัติ",
                      };
                    case "Rejected":
                      return {
                        statusKey: "leave_rejected",
                        statusText: "ไม่อนุมัติ",
                      };
                    case "Cancelled":
                      return {
                        statusKey: "leave_cancelled",
                        statusText: "ยกเลิกแล้ว",
                      };
                    case "Pending":
                    default: // Default to pending for any unknown status
                      return {
                        statusKey: "leave_pending",
                        statusText: "รออนุมัติ",
                      };
                  }
                };

                const leaveStatusDetails = getLeaveStatusInfo(r.status || "");

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
                    : leaveStatusDetails.statusKey,
                  workHours: existingRecord ? existingRecord.workHours : "",
                  type: existingRecord ? "mixed" : "leave",
                  leaveType: r.leave_option || "ลา",
                  leaveReason: r.reason || "",
                  leaveDays: r.days || "",
                  leaveStatus: leaveStatusDetails.statusKey,
                  leaveStatusText: leaveStatusDetails.statusText,
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
        setAttendanceHistory(userRecords);
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
    // console.log("🏖️ [loadLeaveData] Called");
    try {
      const res = await authenticatedFetch("/api/gSheet/get", {
        method: "POST",
        body: JSON.stringify({ resource: "employee_leaves" }),
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
            status: r.status || "Pending",
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
              return r.status === "Approved" && leaveDate >= today;
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r: any) => ({
              employeeName: employeeMap.get(r.employee_id) || "Unknown",
              leaveType: r.leave_option || "ลา",
              leaveReason: r.reason || "",
              leaveDays: r.days || "",
              date: r.date || "",
              status: r.status || "Pending",
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
    setActionLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];

      const res = await authenticatedFetch("/api/gSheet/add", {
        method: "POST",
        body: JSON.stringify({
          resource: "attendance",
          newRow: [
            new Date().toISOString(),
            new Date().toISOString(),
            employee?.employee_id || "", // Key: employee_id
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
    if (!user || !todayRecord || !employee || !member) return;
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
      const res = await authenticatedFetch("/api/attendance/checkout", {
        method: "POST",
        body: JSON.stringify({
          date: todayRecord.date,
          checkOut: time,
          workHours,
        }),
      });

      const result = await res.json();
      if (result.success) {
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

      // Validate duplicate holiday requests
      if (leaveForm.reason === "วันหยุด") {
        const selectedDate = leaveForm.date;

        const hasExistingHoliday = allEmployeeLeaves.some((leave) => {
          const match =
            leave.date === selectedDate &&
            leave.leaveReason === "วันหยุด" &&
            leave.status === "Approved";

          return match;
        });

        if (hasExistingHoliday) {
          setNotification({
            show: true,
            message: "วันที่เลือกมีคนขอวันหยุดไปแล้ว กรุณาเลือกวันอื่น",
            type: "warning",
          });
          setActionLoading(false);
          return;
        }
      }

      let days = 0;
      if (leaveForm.leave_option === "ครึ่งวัน") {
        days = 0.5;
      } else if (leaveForm.leave_option === "1 วัน") {
        days = 1;
      } else if (leaveForm.leave_option === "2 วัน") {
        days = 2;
      }

      const res = await authenticatedFetch("/api/gSheet/add", {
        method: "POST",
        body: JSON.stringify({
          resource: "employee_leaves",
          newRow: [
            new Date().toISOString(),
            new Date().toISOString(),
            employee?.employee_id || "", // Key: employee_id
            leaveForm.date,
            leaveForm.leave_option,
            days,
            leaveForm.reason,
            leaveForm.detail,
            "Pending",
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
          leave_option: "1 วัน",
          reason: "วันหยุด",
          date: "",
          detail: "",
        });
        // Reload employee data to get fresh employeeMap for all employee leaves
        const { foundEmployee, employeeMap } = (await loadEmployees()) || {};
        if (foundEmployee) {
          await loadLeaveData(foundEmployee, employeeMap);
        } else {
          await loadLeaveData();
        }
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
    <main className="min-h-screen bg-[#F9F9FA] px-4 py-4 pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),_rgba(249,249,250,0))]" />

      <div className="relative mx-auto max-w-md">
      <div className="mb-4 rounded-[22px] border border-[#d4d9e1] bg-white/92 p-3 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
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
          employee?.userRole === "admin" && (
            <div className="mt-3 flex justify-center">
              <Button
                color="light"
                size="xs"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem("line-user");
                    window.location.reload();
                  }
                }}
                className="rounded-full border border-[#d4d9e1] bg-[#F9F9FA] px-4 text-xs font-medium text-gray-600"
              >
                Logout
              </Button>
            </div>
          )}
      </div>

      {/* Navigation tabs */}
      <div className="rounded-[22px] border border-[#d4d9e1] bg-white/94 px-4 py-5 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <Tabs
        aria-label="Tabs with underline"
        variant="underline"
        className="apple-tabs flex min-w-2xs items-center-safe"
      >
        <TabItem
          active
          title="เช็คอิน"
          icon={HiClock}
          className="flex items-center justify-center"
        >
          <div className="mx-auto max-w-xs">
            <p className="text-center text-sm font-medium tracking-tight text-gray-500">
              วันที่ {todayFormatted}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="rounded-[18px] border border-[#d4d9e1] bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex items-center space-x-2 text-emerald-600">
                  <HiLogin className="h-5 w-5" />
                  <span className="text-sm font-medium">เข้างาน</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-emerald-700">
                  {todayRecord?.checkIn || "--:--:--"}
                </p>
              </div>

              <div className="rounded-[18px] border border-[#d4d9e1] bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex items-center space-x-2 text-rose-600">
                  <HiLogout className="h-5 w-5" />
                  <span className="text-sm font-medium">ออกงาน</span>
                </div>
                <p className="text-2xl font-semibold tracking-tight text-rose-700">
                  {todayRecord?.checkOut || "--:--:--"}
                </p>
              </div>
            </div>

            <div className="mx-6 mt-5 space-y-3">
              {!todayRecord && (
                <Button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  color="success"
                  className="w-full rounded-full border border-emerald-200 bg-emerald-600 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(5,150,105,0.22)] hover:bg-emerald-700 hover:opacity-100"
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
                  className="w-full rounded-full border border-rose-200 bg-rose-600 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(225,29,72,0.2)] hover:bg-rose-700 hover:opacity-100"
                  size="md"
                >
                  <HiLogout className="mr-2 h-5 w-5" />
                  {actionLoading ? "กำลังบันทึก..." : "เช็คเอาท์"}
                </Button>
              )}

              {todayRecord?.checkOut && (
                <div className="rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] p-3 text-center">
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

            <div className="my-8 border-t border-[#d4d9e1]"></div>

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
              <Card className="rounded-[18px] border border-[#d4d9e1] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
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
                        <div className="mb-3 border-l-4 border-orange-200 pl-3">
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
                                    <span className="text-orange-300 line-through">
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
                                    : "text-orange-500";

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
              className="mt-6 rounded-[18px] border border-[#d4d9e1] bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
            >
              <h3 className="mb-1 max-w-xs text-center text-lg font-semibold tracking-tight text-gray-950">
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
                  className="w-full rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-4 py-2.5 text-sm shadow-sm focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
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
                  className="w-full rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-4 py-2.5 text-sm shadow-sm focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
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
                  className="w-full rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-4 py-2.5 text-sm shadow-sm focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
                >
                  <option value="วันหยุด">วันหยุด</option>
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="ลากิจ">ลากิจ</option>
                  <option value="อบรม">อบรม</option>
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
                  className="w-full rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-4 py-2 text-sm shadow-sm focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
                  placeholder="ระบุเหตุผลการลา..."
                />
              </div>
              <div className="mb-2">
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="text-md w-full rounded-full border border-[#e7e7eb] bg-[#111111] py-2.5 font-medium text-white shadow-[0_12px_32px_rgba(17,17,17,0.2)] hover:bg-[#202020] hover:opacity-100"
                  size="md"
                >
                  {actionLoading ? "กำลังส่ง..." : "ส่งคำขอ"}
                </Button>
              </div>
            </form>
            <div className="mt-4 rounded-[18px] border border-[#d4d9e1] bg-white px-3 pt-6 pb-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <h3 className="mb-4 text-center text-lg font-semibold tracking-tight text-gray-900">
                คำขอทั้งหมด
              </h3>
              {leaveHistory.length === 0 ? (
                <p className="text-center text-gray-500">ไม่พบประวัติการลา</p>
              ) : (
                <div className="space-y-3">
                  {leaveHistory.map((leave, index) => (
                    <div
                      key={index}
                      className="rounded-[18px] border border-[#d4d9e1] bg-[#fafafb] p-4"
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
                            // Leave status is directly from the status column.
                            leave.status === "Approved"
                              ? "bg-green-100 text-green-800"
                              : leave.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : leave.status === "Cancelled"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {leave.status === "Approved"
                            ? "อนุมัติ"
                            : leave.status === "Rejected"
                              ? "ไม่อนุมัติ"
                              : leave.status === "Cancelled"
                                ? "ยกเลิก"
                                : "รออนุมัติ"}
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
      </div>
      <Notification
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
      </div>
    </main>
  );
}
