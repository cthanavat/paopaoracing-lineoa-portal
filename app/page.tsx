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

  // Loading state
  if (isLiffLoading || loadUser || !config) {
    return (
      <main className="min-h-screen bg-[#F9F9FA] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center rounded-[22px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <Loader />
        </div>
      </main>
    );
  }

  // No user
  if (!user) {
    return (
      <main className="min-h-screen bg-[#F9F9FA] px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center rounded-[22px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <Loader />
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#F9F9FA] px-4 py-4 pb-24 font-sans">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.82),_rgba(249,249,250,0))]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-[22px] border border-white/80 bg-white/78 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <UserProfile
            displayName={user.displayName}
            pictureUrl={user.pictureUrl}
            statusMessage={user.statusMessage}
          />
        </section>

        <section className="rounded-[22px] border border-white/80 bg-white/88 px-4 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          {loadMember && config ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader />
            </div>
          ) : member ? (
            <MemberView
              sendMessage={sendMessage}
              setNotification={setNotification}
            />
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
