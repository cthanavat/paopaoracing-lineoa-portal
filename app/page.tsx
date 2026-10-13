"use client";

import { useState, useEffect } from "react";
import Loader from "@/app/components/Loader";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import "./notifications.css";
import { useAppStore } from "@/store/useAppStore";
import { useLiff } from "@/hooks/useLiff";
import { useAppData } from "@/hooks/useAppData";
import MemberView from "@/app/components/MemberView";
import RoleTransition from "@/app/components/RoleTransition";
import SignupForm from "@/app/components/SignupForm";
import { NotificationState, ModalState } from "@/types/ui";

function isPlaceholderUser(
  user: { userId?: string; displayName?: string } | null,
) {
  return user?.userId === "dev-user" || user?.displayName === "Local Dev";
}

export default function HomePage() {
  const {
    user,
    member,
    config,
    loadUser,
    loadMember,
    loadingEmployees,
    employee,
    isLiffLoading,
  } = useAppStore();

  // Custom Hooks
  const { error: liffError, sendMessage } = useLiff();
  const { error: appDataError } = useAppData();

  // Local UI State
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: "",
    type: "success",
  });
  const [modal, setModal] = useState<ModalState>({
    show: false,
    message: "",
    type: "success",
  });
  const [returnTransition, setReturnTransition] = useState<
    "idle" | "loading" | "swap"
  >("idle");

  useEffect(() => {
    if (
      window.sessionStorage.getItem("paopao-role-transition") !==
      "employee-to-member"
    ) {
      return;
    }

    window.sessionStorage.removeItem("paopao-role-transition");
    setReturnTransition("loading");
  }, []);

  useEffect(() => {
    if (returnTransition !== "loading" || loadingEmployees) return;

    const swapTimer = window.setTimeout(() => setReturnTransition("swap"), 180);
    return () => window.clearTimeout(swapTimer);
  }, [loadingEmployees, returnTransition]);

  useEffect(() => {
    if (returnTransition !== "swap") return;

    const doneTimer = window.setTimeout(() => setReturnTransition("idle"), 420);
    return () => window.clearTimeout(doneTimer);
  }, [returnTransition]);

  // Handle errors from hooks
  useEffect(() => {
    if (liffError) {
      setNotification({ show: true, message: liffError, type: "error" });
    }
    if (appDataError) {
      setNotification({ show: true, message: appDataError, type: "error" });
    }
  }, [liffError, appDataError]);

  // Notification Auto-close
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show, notification.type, notification.message]);

  const canOpenSignup = Boolean(user) && !isPlaceholderUser(user);
  const hasDataConfig = Boolean(config?.userLine);

  // Keep one continuous loading surface while the identity and membership
  // checks advance, so users see progress instead of repeated blank spinners.
  if (isLiffLoading || loadUser || !hasDataConfig || (user && loadMember)) {
    return (
      <main className="welcome-loading relative flex min-h-[100dvh] items-start justify-center overflow-hidden px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white">
        <div className="welcome-orb welcome-orb-one" aria-hidden="true" />
        <div className="welcome-orb welcome-orb-two" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.png"
            alt="PAOPAO Racing Shop"
            width={176}
            height={176}
            className="welcome-logo h-36 w-36 object-contain sm:h-40 sm:w-40"
          />
          <p className="mt-4 text-[28px] leading-[1.1] font-black tracking-[0.14em] text-white uppercase sm:text-[32px]">
            Welcome
          </p>
          <div className="mt-8">
            <Loader
              steps={[
                "กำลังโหลดข้อมูล",
                "กำลังเตรียมข้อมูลสมาชิก",
                "กำลังยืนยันการเข้าถึง",
              ]}
              activeStep={
                isLiffLoading || loadUser ? 0 : !hasDataConfig ? 1 : 2
              }
            />
          </div>
        </div>
      </main>
    );
  }

  if (returnTransition !== "idle" && user && member && employee) {
    return (
      <RoleTransition
        user={user}
        member={member}
        employee={employee}
        phase={returnTransition === "swap" ? "swap" : "loading"}
        direction="employee-to-member"
      />
    );
  }

  // No user
  if (!user) {
    return (
      <main className="min-h-screen bg-[#18191a] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                กำลังพาไปเข้าสู่ระบบ LINE
              </p>
              <p className="text-xs text-gray-500">
                หากยังไม่เข้าสู่ระบบ กรุณาเปิดผ่าน LINE login
              </p>
            </div>
            {process.env.NEXT_PUBLIC_LIFF_ID ? (
              <a
                href={`https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`}
                className="inline-flex items-center justify-center rounded-full border border-[#d4d9e1] bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              >
                เข้าสู่ระบบด้วย LINE
              </a>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#18191a] pb-24 font-sans">
      {member ? (
        <MemberView
          sendMessage={sendMessage}
          setNotification={setNotification}
          isAccessVerifying={loadingEmployees}
        />
      ) : !canOpenSignup ? (
        <div className="mx-auto flex min-h-52 w-full max-w-lg flex-col items-center justify-center rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-4 py-4 text-center shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium tracking-[0.24em] text-gray-400 uppercase">
            Line Login Required
          </p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900">
            กรุณาเข้าสู่ระบบด้วย LINE ก่อน
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            หากยังไม่ได้เข้าสู่ระบบ LINE จริง ระบบจะยังไม่เปิดหน้าสมัครสมาชิก
          </p>
          {process.env.NEXT_PUBLIC_LIFF_ID ? (
            <a
              href={`https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-[#d4d9e1] bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
            >
              เข้าสู่ระบบด้วย LINE
            </a>
          ) : null}
        </div>
      ) : (
        <SignupForm
          setNotification={setNotification}
          setModal={setModal}
          sendLiffMessage={sendMessage}
        />
      )}

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
