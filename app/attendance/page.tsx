"use client";

import { useEffect, useState, useRef } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useLiff } from "../../hooks/useLiff";
import { useAppStore } from "../../store/useAppStore";
import EmployeeIdentityTicket from "../components/EmployeeIdentityTicket";
import Loader from "../components/Loader";
import Notification from "../components/Notification";
import RoleTransition from "../components/RoleTransition";
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
import { buildLeaveRequestFlexMessage } from "@/lib/leaveRequest.mjs";

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase();
}

function isEmployeeActive(active?: string) {
  return ["true", "1", "yes", "active"].includes(normalizeValue(active));
}

export default function AttendancePage() {
  const {
    user,
    isLiffReady,
    config,
    member,
    employee,
    employees,
    setEmployee,
    setEmployees,
    loadMember,
  } = useAppStore();
  // initLiff is automatic in useLiff hook
  const { sendMessage } = useLiff();
  useAppData(); // Fetch app data (config, members, etc.)

  const [loading, setLoading] = useState(true);
  const [transitionPhase, setTransitionPhase] = useState<"loading" | "swap">(
    "loading",
  );
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [isLeaveConfirming, setIsLeaveConfirming] = useState(false);

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

  useEffect(() => {
    if (!isLeaveConfirming) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isLeaveConfirming]);

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

      // 2. Wait for member loading only while employee is still unknown
      if (loadMember && !employee) {
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

        // Home already revalidated employee access before routing here. Reuse
        // that verified state instead of fetching the employee sheet again.
        let foundEmployee = employee as Employee | null;
        let employeeRows = employees as RawSheetRecord[];

        // Direct visits do not inherit the verified home-page state.
        if (!foundEmployee) {
          const loaded = await loadEmployees();
          foundEmployee = (loaded?.foundEmployee as Employee) || null;
          employeeRows = (loaded?.employeeRows as RawSheetRecord[]) || [];
        }

        if (foundEmployee) {
          const employeeMap = new Map<string, string>();
          employeeRows.forEach((record: RawSheetRecord) => {
            if (record.employee_id) {
              employeeMap.set(
                record.employee_id,
                record.nickname || record.name || "",
              );
            }
          });
          await loadAttendanceData(foundEmployee, employeeMap);
        }

        dataLoadedRef.current = user.userId;
        setTransitionPhase("swap");
        await new Promise((resolve) => window.setTimeout(resolve, 380));
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
    try {
      const res = await authenticatedFetch(
        "/api/gSheet/get",
        {
          method: "POST",
          body: JSON.stringify({ resource: "employees" }),
        },
        { requireVerifiedToken: true },
      );
      const result = await res.json();

      if (!res.ok || !Array.isArray(result.data)) {
        setEmployees([]);
        setEmployee(null);
        return null;
      }

      setEmployees(result.data);
      const employeeMap = new Map<string, string>();
      result.data.forEach((record: RawSheetRecord) => {
        if (record.employee_id) {
          employeeMap.set(
            record.employee_id,
            record.nickname || record.name || "",
          );
        }
      });

      const foundEmployee = result.data.find(
        (record: RawSheetRecord) =>
          record.userId === user?.userId && isEmployeeActive(record.active),
      );
      setEmployee((foundEmployee as Employee) || null);
      return { foundEmployee, employeeMap, employeeRows: result.data };
    } catch (error) {
      setEmployees([]);
      setEmployee(null);
      console.error("Failed to load employees:", error);
      return null;
    }
  };

  const loadAttendanceData = async (
    employeeData?: Employee,
    employeeMap?: Map<string, string>,
  ) => {
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
            await loadLeaveData(
              currentEmployee,
              employeeMap,
              leaveResult.data as RawSheetRecord[],
            );
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
    prefetchedLeaves?: RawSheetRecord[],
  ) => {
    // console.log("🏖️ [loadLeaveData] Called");
    try {
      let leaveRows = prefetchedLeaves;
      if (!leaveRows) {
        const res = await authenticatedFetch("/api/gSheet/get", {
          method: "POST",
          body: JSON.stringify({ resource: "employee_leaves" }),
        });
        const result = await res.json();
        leaveRows = Array.isArray(result.data) ? result.data : [];
      }
      const rows = leaveRows || [];
      if (rows.length > 0) {
        // Process for current user
        const currentEmployee = (employeeData || employee) as
          | Employee
          | undefined;
        const userLeaves = rows

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

        // Load both six-week calendar pages (current and next).
        if (employeeMap) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const mondayOffset = (today.getDay() + 6) % 7;
          const forecastStart = new Date(today);
          forecastStart.setDate(today.getDate() - mondayOffset - 7);
          const forecastEnd = new Date(forecastStart);
          forecastEnd.setDate(forecastStart.getDate() + 83);

          const allLeaves = rows
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((r: any) => {
              const leaveDate = new Date(r.date);
              leaveDate.setHours(0, 0, 0, 0);
              const status = String(r.status || "").toLowerCase();
              return (
                (status === "pending" || status === "approved") &&
                leaveDate >= forecastStart &&
                leaveDate <= forecastEnd
              );
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((r: any) => ({
              employeeId: String(r.employee_id || ""),
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
      } else if (result.code === "EVALUATION_REQUIRED" && result.redirect) {
        window.location.assign(result.redirect);
        return;
      } else {
        throw new Error(result.error || "Check-out failed");
      }
    } catch (error) {
      console.error("❌ Check-out error:", error);
      setNotification({
        show: true,
        message:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการเช็คเอาท์",
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

      setIsLeaveConfirming(true);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmLeaveSubmit = async () => {
    if (!user || !member || !employee || actionLoading) return;
    setActionLoading(true);

    try {
      const days =
        leaveForm.leave_option === "ครึ่งวัน"
          ? 0.5
          : leaveForm.leave_option === "2 วัน"
            ? 2
            : 1;

      const res = await authenticatedFetch("/api/gSheet/add", {
        method: "POST",
        body: JSON.stringify({
          resource: "employee_leaves",
          newRow: [
            new Date().toISOString(),
            new Date().toISOString(),
            employee.employee_id || "",
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
      if (!res.ok || !result.success) {
        throw new Error("Leave request failed");
      }

      let lineMessageSent = false;
      try {
        lineMessageSent = await sendMessage(
          buildLeaveRequestFlexMessage({
            employeeName:
              employee.nickname ||
              `${employee.firstname || ""} ${employee.lastname || ""}`.trim() ||
              member.name,
            date: leaveForm.date,
            leaveOption: leaveForm.leave_option,
            reason: leaveForm.reason,
            detail: leaveForm.detail,
          }),
        );
      } catch (lineError) {
        console.error("❌ Leave Flex message error:", lineError);
      }

      setIsLeaveConfirming(false);
      setNotification({
        show: true,
        message: lineMessageSent
          ? "ส่งคำขอลาและข้อความเข้า LINE สำเร็จ"
          : "บันทึกคำขอลาแล้ว แต่ส่งข้อความเข้า LINE ไม่สำเร็จ",
        type: lineMessageSent ? "success" : "warning",
      });
      setLeaveForm({
        leave_option: "1 วัน",
        reason: "วันหยุด",
        date: "",
        detail: "",
      });

      const { foundEmployee, employeeMap } = (await loadEmployees()) || {};
      if (foundEmployee) {
        await loadLeaveData(foundEmployee, employeeMap);
      } else {
        await loadLeaveData();
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
    if (user && member && employee && isEmployeeActive(employee.active)) {
      return (
        <RoleTransition
          user={user}
          member={member}
          employee={employee}
          phase={transitionPhase}
        />
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#18191a] text-white">
        <Loader
          title="กำลังยืนยันการเข้าถึง"
          detail="กำลังเตรียมข้อมูลสำหรับบัญชีของคุณ"
        />
      </main>
    );
  }

  if (!user || !member || !employee || !isEmployeeActive(employee.active)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center">
        <p className="text-sm font-medium text-[#969696]">
          หน้านี้สำหรับพนักงานที่ยัง active เท่านั้น
        </p>
      </main>
    );
  }

  const todayFormatted = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <main className="employee-shell min-h-screen overflow-x-hidden bg-[#18191a] px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-[#191a1c]">
      <div className="relative mx-auto w-full max-w-lg">
        <EmployeeIdentityTicket
          user={user}
          member={member}
          employee={employee}
          showLogout={
            !useAppStore.getState().isInClient && employee.userRole === "admin"
          }
          onLogout={() => {
            window.localStorage.removeItem("line-user");
            window.location.reload();
          }}
        />

        {/* Navigation tabs */}
        <div className="employee-detail-panel mt-5">
          <Tabs
            aria-label="เมนูพนักงาน"
            variant="pills"
            className="employee-tabs apple-tabs apple-tabs-3 min-w-0 [&_[role=tab]]:min-h-11 [&_[role=tab]]:border-0"
          >
            <TabItem
              active
              title="เช็คอิน"
              icon={HiClock}
              className="flex items-center justify-center"
            >
              <div className="ticket-stack box-border w-full max-w-none">
                <section className="ticket-section bg-white px-4 pt-4 pb-7">
                  <p className="text-center text-[15px] font-bold tracking-tight text-[#b5b5b5]">
                    วันที่ {todayFormatted}
                  </p>

                  <div className="mt-4 rounded-[14px] bg-[#eceef0] px-4 py-4">
                    <div className="grid grid-cols-[auto_minmax(72px,1fr)_auto] items-end gap-3">
                      <div className="min-w-0 text-left">
                        <p className="font-mono text-xl leading-none font-black text-[#191a1c] tabular-nums">
                          {todayRecord?.checkIn || "--:--:--"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[#666]">
                          เช็คอิน
                        </p>
                      </div>

                      <div className="min-w-0 pb-1 text-center">
                        <p className="mb-1 truncate text-[11px] font-semibold text-[#666]">
                          {todayRecord?.workHours
                            ? `${todayRecord.workHours} ชั่วโมง`
                            : todayRecord
                              ? "กำลังทำงาน"
                              : "ยังไม่เริ่มงาน"}
                        </p>
                        <div className="flex items-center" aria-hidden="true">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1972bc] bg-white" />
                          <span className="h-px min-w-0 flex-1 bg-[#8f99a5]" />
                          <span className="text-sm leading-none text-[#1972bc]">
                            ›
                          </span>
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1972bc] ${todayRecord?.checkOut ? "bg-[#1972bc]" : "bg-white"}`}
                          />
                        </div>
                        <p className="mt-1 truncate text-[10px] font-bold text-[#1972bc]">
                          {todayRecord?.checkOut
                            ? "บันทึกครบแล้ว"
                            : todayRecord
                              ? "รอเช็คเอาท์"
                              : "พร้อมเช็คอิน"}
                        </p>
                      </div>

                      <div className="min-w-0 text-right">
                        <p className="font-mono text-xl leading-none font-black text-[#191a1c] tabular-nums">
                          {todayRecord?.checkOut || "--:--:--"}
                        </p>
                        <p className="mt-1 text-[10px] font-bold tracking-[0.12em] text-[#666]">
                          เช็คเอาท์
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto mt-3 w-full space-y-3">
                    {!todayRecord && (
                      <Button
                        onClick={handleCheckIn}
                        disabled={actionLoading}
                        color="success"
                        className="min-h-12 w-full rounded-full border-0 bg-[#38bdf8] px-5 text-base font-black text-white hover:bg-[#0ea5e9] hover:opacity-100 disabled:bg-[#164e63]"
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
                        className="min-h-12 w-full rounded-full border-0 bg-[#38bdf8] px-5 text-base font-black text-white hover:bg-[#0ea5e9] hover:opacity-100 disabled:bg-[#164e63]"
                        size="md"
                      >
                        <HiLogout className="mr-2 h-5 w-5" />
                        {actionLoading ? "กำลังบันทึก..." : "เช็คเอาท์"}
                      </Button>
                    )}

                    {todayRecord?.checkOut && (
                      <div className="rounded-[14px] border border-[#3a3a3a] bg-[#191919] px-4 py-4 text-center">
                        <div className="mb-1 flex items-center justify-center gap-1.5 text-white">
                          <HiClipboardCheck className="h-5 w-5 text-[#38bdf8]" />
                          <span className="font-bold">
                            บันทึกเวลาเรียบร้อยแล้ว
                          </span>
                        </div>
                        <p className="text-sm text-[#969696]">
                          ทำงาน: {todayRecord.workHours || "-"}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="ticket-section bg-white px-4 pt-7 pb-5">
                  <AllEmployeeLeaveSchedule
                    leaves={allEmployeeLeaves}
                    currentEmployeeId={employee.employee_id}
                  />
                </section>
              </div>
            </TabItem>
            <TabItem
              active
              title="ประวัติ"
              icon={HiCalendar}
              className="flex items-center justify-center"
            >
              <div className="ticket-section box-border w-full max-w-none space-y-3 bg-white px-4 py-4">
                {attendanceHistory.length === 0 ? (
                  <Card className="rounded-[14px] border border-[#2d4058] bg-[#142235] shadow-none">
                    <p className="text-center text-[#969696]">
                      ยังไม่มีประวัติ
                    </p>
                  </Card>
                ) : (
                  <Timeline
                    theme={{
                      root: {
                        direction: {
                          vertical: "relative border-l-2 border-[#323232]",
                        },
                      },
                      item: {
                        point: {
                          marker: {
                            base: {
                              vertical:
                                "absolute -left-[0.5rem] mt-1.5 h-4 w-4 rounded-full border-2 border-[#101010] bg-[#38bdf8]",
                            },
                          },
                        },
                      },
                    }}
                  >
                    {attendanceHistory.map((record, idx) => (
                      <TimelineItem key={idx} className="mb-1 ml-4">
                        <TimelinePoint />
                        <TimelineContent>
                          <TimelineTime className="text-[12px] font-medium text-gray-500">
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
                              <TimelineTitle className="text-[14px] font-semibold">
                                {(() => {
                                  const recordDate = new Date(record.date);
                                  const currentDate = new Date();
                                  recordDate.setHours(0, 0, 0, 0);
                                  currentDate.setHours(0, 0, 0, 0);

                                  const isDatePassed = recordDate < currentDate;

                                  if (isDatePassed) {
                                    if (
                                      record.leaveStatus === "leave_approved"
                                    ) {
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
                              <TimelineBody className="pt-1">
                                <div className="grid grid-cols-2 gap-2 text-[13px] text-gray-700">
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
                              <TimelineTitle className="text-[14px] font-semibold">
                                {(() => {
                                  const recordDate = new Date(record.date);
                                  recordDate.setHours(0, 0, 0, 0);
                                  const currentDate = new Date();
                                  currentDate.setHours(0, 0, 0, 0);

                                  const isPastDate = recordDate < currentDate;

                                  if (
                                    isPastDate &&
                                    record.status !== "completed"
                                  ) {
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
                              <TimelineBody className="pt-1">
                                <div className="grid grid-cols-2 gap-2 text-[13px] text-gray-700">
                                  <div>
                                    <span className="text-gray-500">เข้า:</span>{" "}
                                    <span className="font-medium text-green-600">
                                      {record.checkIn}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">ออก:</span>{" "}
                                    <span className="font-medium text-[#38bdf8]">
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
              <div className="leave-ticket-stack box-border w-full max-w-none">
                <section className="ticket-section bg-white px-4 pt-4 pb-7">
                  <AllEmployeeLeaveSchedule
                    leaves={allEmployeeLeaves}
                    currentEmployeeId={employee.employee_id}
                  />
                </section>

                <form
                  onSubmit={handleLeaveSubmit}
                  className="ticket-section box-border w-full min-w-0 bg-[#eceef0] px-4 pt-7 pb-7"
                >
                  <h3 className="mb-4 text-center text-[16px] font-black tracking-tight text-[#191a1c]">
                    ลงวันหยุด
                  </h3>
                  <div className="mb-2 box-border max-w-full min-w-0 overflow-hidden rounded-[12px]">
                    <label className="mb-1.5 block text-[13px] font-bold text-[#4b5563]">
                      วันที่
                    </label>
                    <input
                      type="date"
                      value={leaveForm.date}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, date: e.target.value })
                      }
                      className="leave-date-input box-border block min-h-11 w-full max-w-full min-w-0 rounded-[12px] border border-[#c8cdd2] bg-white px-3 py-2.5 text-[13px] text-[#191a1c] focus:border-[#1972bc] focus:ring-2 focus:ring-[#1972bc]/20 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="mb-1.5 block text-[13px] font-bold text-[#4b5563]">
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
                      className="box-border block min-h-11 w-full max-w-full min-w-0 rounded-[12px] border border-[#c8cdd2] bg-white px-3 py-2.5 text-[13px] text-[#191a1c] focus:border-[#1972bc] focus:ring-2 focus:ring-[#1972bc]/20 focus:outline-none"
                    >
                      <option value="ครึ่งวัน">ครึ่งวัน</option>
                      <option value="1 วัน">1 วัน</option>
                      <option value="2 วัน">2 วัน</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="mb-1.5 block text-[13px] font-bold text-[#4b5563]">
                      ประเภทการลา
                    </label>
                    <select
                      value={leaveForm.reason}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, reason: e.target.value })
                      }
                      className="box-border block min-h-11 w-full max-w-full min-w-0 rounded-[12px] border border-[#c8cdd2] bg-white px-3 py-2.5 text-[13px] text-[#191a1c] focus:border-[#1972bc] focus:ring-2 focus:ring-[#1972bc]/20 focus:outline-none"
                    >
                      <option value="วันหยุด">วันหยุด</option>
                      <option value="ลาป่วย">ลาป่วย</option>
                      <option value="ลากิจ">ลากิจ</option>
                      <option value="อบรม">อบรม</option>
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="mb-1.5 block text-[13px] font-bold text-[#4b5563]">
                      เหตุผล
                    </label>
                    <textarea
                      value={leaveForm.detail}
                      onChange={(e) =>
                        setLeaveForm({ ...leaveForm, detail: e.target.value })
                      }
                      rows={3}
                      className="box-border block min-h-11 w-full max-w-full min-w-0 resize-y rounded-[12px] border border-[#c8cdd2] bg-white px-3 py-2.5 text-[13px] text-[#191a1c] placeholder:text-[#777] focus:border-[#1972bc] focus:ring-2 focus:ring-[#1972bc]/20 focus:outline-none"
                      placeholder="ระบุเหตุผลการลา..."
                    />
                  </div>
                  <div className="mt-4 mb-3">
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="min-h-12 w-full rounded-full border-0 bg-[#38bdf8] px-5 text-base font-black text-white hover:bg-[#0ea5e9] hover:opacity-100 disabled:bg-[#164e63]"
                      size="md"
                    >
                      {actionLoading ? "กำลังส่ง..." : "ส่งคำขอ"}
                    </Button>
                  </div>
                </form>
                <section className="ticket-section bg-white px-4 pt-7 pb-5">
                  <h3 className="mb-4 text-center text-[16px] font-black tracking-tight text-[#191a1c]">
                    คำขอทั้งหมด
                  </h3>
                  {leaveHistory.length === 0 ? (
                    <p className="rounded-[10px] bg-[#eceef0] px-4 py-3 text-center text-[13px] text-[#666]">
                      ไม่พบประวัติการลา
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {leaveHistory.map((leave, index) => (
                        <div
                          key={index}
                          className="rounded-[12px] border border-[#d8dce0] bg-[#eceef0] p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[14px] font-semibold text-gray-900">
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
                              <p className="text-[13px] text-gray-600">
                                {leave.leave_option} - {leave.reason}
                              </p>
                              {/* {leave.detail && (
                    <p className="mt-1 text-xs text-gray-500">{leave.detail}</p>
                  )} */}
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                                // Leave status is directly from the status column.
                                leave.status === "Approved"
                                  ? "border border-green-400 bg-green-100 font-bold text-green-700"
                                  : leave.status === "Rejected"
                                    ? "border border-red-400 bg-red-100 font-bold text-red-700"
                                    : leave.status === "Cancelled"
                                      ? "bg-[#242424] text-[#8e8e8e]"
                                      : "border border-amber-400 bg-amber-100 font-bold text-amber-800"
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
                </section>
              </div>
            </TabItem>
          </Tabs>
        </div>
        {isLeaveConfirming ? (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-confirm-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !actionLoading) {
                setIsLeaveConfirming(false);
              }
            }}
          >
            <section className="max-h-[92dvh] w-full max-w-lg [touch-action:pan-y] overflow-y-auto overscroll-contain bg-transparent px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <div className="modal-ticket-stack ticket-stack drop-shadow-[0_18px_38px_rgba(0,0,0,0.28)]">
                <section className="ticket-section bg-white px-5 pt-5 pb-7">
                  <p className="text-[11px] font-bold tracking-[0.18em] text-[#1972bc]">
                    CONFIRM LEAVE
                  </p>
                  <h2
                    id="leave-confirm-title"
                    className="mt-1 text-2xl font-black text-[#191a1c]"
                  >
                    ยืนยันคำขอลา
                  </h2>
                  <p className="mt-1 text-sm text-[#666]">
                    ตรวจสอบข้อมูลก่อนส่ง ระบบจะบันทึกและส่ง Flex เข้าแชท LINE
                  </p>

                  <dl className="mt-5 overflow-hidden rounded-[12px] bg-[#eceef0]">
                    {[
                      ["วันที่", leaveForm.date],
                      ["จำนวน", leaveForm.leave_option],
                      ["ประเภท", leaveForm.reason],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className={`flex items-start justify-between gap-4 px-4 py-3 ${index ? "border-t border-[#d8dce0]" : ""}`}
                      >
                        <dt className="text-sm font-semibold text-[#666]">
                          {label}
                        </dt>
                        <dd className="text-right text-sm font-black text-[#191a1c]">
                          {value}
                        </dd>
                      </div>
                    ))}
                    <div className="border-t border-[#d8dce0] px-4 py-3">
                      <dt className="text-sm font-semibold text-[#666]">
                        เหตุผล
                      </dt>
                      <dd className="mt-1 text-sm font-bold break-words text-[#191a1c]">
                        {leaveForm.detail.trim() || "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="ticket-section space-y-3 bg-white px-5 pt-7 pb-5">
                  <Button
                    type="button"
                    onClick={() => void confirmLeaveSubmit()}
                    disabled={actionLoading}
                    className="min-h-12 w-full rounded-full border-0 bg-[#1972bc] px-5 text-base font-black text-white hover:bg-[#155f9d] disabled:opacity-55"
                  >
                    {actionLoading ? "กำลังส่ง..." : "ยืนยันส่งคำขอ"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setIsLeaveConfirming(false)}
                    disabled={actionLoading}
                    className="min-h-11 w-full rounded-full text-sm font-bold text-[#52647a] disabled:opacity-45"
                  >
                    กลับไปแก้ไข
                  </button>
                </section>
              </div>
            </section>
          </div>
        ) : null}

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
