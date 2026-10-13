"use client";

import type { Employee, Member, User } from "@/store/useAppStore";
import EmployeeIdentityTicket from "./EmployeeIdentityTicket";
import Loader from "./Loader";
import MemberIdentityTicket from "./MemberIdentityTicket";

interface RoleTransitionProps {
  user: User;
  member: Member;
  employee: Employee;
  phase: "loading" | "swap";
  direction?: "member-to-employee" | "employee-to-member";
}

export default function RoleTransition({
  user,
  member,
  employee,
  phase,
  direction = "member-to-employee",
}: RoleTransitionProps) {
  const isReverse = direction === "employee-to-member";
  const memberClassName = isReverse
    ? `role-card role-card-reverse-member ${phase === "swap" ? "role-card-reverse-enter" : ""}`
    : `role-card role-card-member ${phase === "swap" ? "role-card-exit" : ""}`;
  const employeeClassName = isReverse
    ? `role-card role-card-reverse-employee ${phase === "swap" ? "role-card-reverse-exit" : ""}`
    : `role-card role-card-employee ${phase === "swap" ? "role-card-enter" : ""}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#18191a] text-[#191a1c]">
      <div className="mx-auto box-border w-full max-w-full px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-xl sm:px-6 sm:pt-6">
        <div className="role-card-viewport">
          <div className={memberClassName}>
            <MemberIdentityTicket user={user} member={member} />
          </div>
          <div className={employeeClassName}>
            <EmployeeIdentityTicket
              user={user}
              member={member}
              employee={employee}
            />
          </div>
        </div>
        <section className="mt-3 bg-transparent px-1 py-3 text-center text-white">
          <Loader
            steps={
              isReverse
                ? [
                    "กำลังเตรียมหน้าสมาชิก",
                    "กำลังโหลดข้อมูลสมาชิก",
                    "พร้อมเข้าสู่หน้าสมาชิก",
                  ]
                : [
                    "กำลังยืนยันการเข้าถึง",
                    "กำลังเตรียมหน้าพนักงาน",
                    "พร้อมเข้าสู่หน้าพนักงาน",
                  ]
            }
            activeStep={phase === "swap" ? 2 : 1}
          />
        </section>
      </div>
    </main>
  );
}
