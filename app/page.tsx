"use client";

import { useState, useEffect } from "react";
import UserProfile from "@/app/components/UserProfile";
import Loader from "@/app/components/Loader";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import "./notifications.css";
import { useAppStore } from "@/store/useAppStore";
import { useLiff } from "@/hooks/useLiff";
import { useAppData } from "@/hooks/useAppData";
import MemberView from "@/app/components/MemberView";
import SignupForm from "@/app/components/SignupForm";
import { NotificationState, ModalState } from "@/types/ui";

function isPlaceholderUser(user: { userId?: string; displayName?: string } | null) {
  return user?.userId === "dev-user" || user?.displayName === "Local Dev";
}

function canRedirectToLineLogin() {
  if (typeof window === "undefined") return false;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return false;

  const { hostname, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }

  if (protocol !== "https:") {
    return false;
  }

  return true;
}

export default function HomePage() {
  const { user, member, config, loadUser, loadMember, isLiffLoading } =
    useAppStore();

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

  useEffect(() => {
    if (member || canOpenSignup) {
      return;
    }

    if (!canRedirectToLineLogin()) {
      return;
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const currentUrl = window.location.href;
    const loginUrl = `https://liff.line.me/${liffId}?redirect=${encodeURIComponent(currentUrl)}`;

    window.location.replace(loginUrl);
  }, [canOpenSignup, member, user]);

  // Loading state
  if (isLiffLoading || loadUser || !config) {
    return (
      <main className="min-h-screen bg-[#F9F9FA] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center rounded-[22px] border border-[#d4d9e1] bg-white/92 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <Loader />
        </div>
      </main>
    );
  }

  // No user
  if (!user) {
    return (
      <main className="min-h-screen bg-[#F9F9FA] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center rounded-[22px] border border-[#d4d9e1] bg-white/92 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                กำลังพาไปเข้าสู่ระบบ LINE
              </p>
              <p className="text-xs text-gray-500">
                หากไม่เด้งอัตโนมัติ กรุณาเปิดผ่าน LINE login อีกครั้ง
              </p>
            </div>
            {canRedirectToLineLogin() ? (
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
    <main className="min-h-screen bg-[#F9F9FA] px-4 py-4 pb-24 font-sans">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),_rgba(249,249,250,0))]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-[22px] border border-[#d4d9e1] bg-white/92 p-3 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <UserProfile
            displayName={user.displayName}
            pictureUrl={user.pictureUrl}
            statusMessage={user.statusMessage}
          />
        </section>

        <section className="rounded-[22px] border border-[#d4d9e1] bg-white/94 px-4 py-5 shadow-[0_20px_56px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          {loadMember && config ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader />
            </div>
          ) : member ? (
            <MemberView
              sendMessage={sendMessage}
              setNotification={setNotification}
            />
          ) : !canOpenSignup ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[18px] border border-[#d4d9e1] bg-[#f7f7f8] px-5 py-6 text-center">
              <p className="text-xs font-medium tracking-[0.24em] text-gray-400 uppercase">
                Line Login Required
              </p>
              <h3 className="mt-2 text-lg font-semibold text-gray-900">
                กรุณาเข้าสู่ระบบด้วย LINE ก่อน
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                หากยังไม่ได้เข้าสู่ระบบ LINE จริง ระบบจะยังไม่เปิดหน้าสมัครสมาชิก
              </p>
              {canRedirectToLineLogin() ? (
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
        </section>
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
