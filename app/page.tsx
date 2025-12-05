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
      console.log("🔴 [Error] LIFF Error detected");
      setNotification({ show: true, message: liffError, type: "error" });
    }
    if (appDataError) {
      console.log("🔴 [Error] App Data Error detected");
      setNotification({ show: true, message: appDataError, type: "error" });
    }
  }, [liffError, appDataError]);

  // State tracking
  useEffect(() => {
    console.log("📊 [State] Current states:");
  }, [user, member, config, loadUser, loadMember, isLiffLoading]);

  // Notification Auto-close
  useEffect(() => {
    if (notification.show) {
      console.log(
        `📢 [Notification] Showing ${notification.type}: ${notification.message}`,
      );
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show, notification.type, notification.message]);

  // Loading state
  if (isLiffLoading || loadUser || !config) {
    console.log("⏳ [Loading] Waiting for initial data...");
    if (isLiffLoading) console.log("  - LIFF is loading");
    if (loadUser) console.log("  - User is loading");
    if (!config) console.log("  - Config not available (Google Sheets)");
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  // No user
  if (!user) {
    console.log("⚠️ [Auth] No user found");
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  console.log("✅ [Render] Rendering main content");

  return (
    <main className="p-5 font-sans">
      <div>
        <UserProfile
          displayName={user.displayName}
          pictureUrl={user.pictureUrl}
          statusMessage={user.statusMessage}
        />
      </div>

      <div className="flex justify-center">
        {loadMember && config ? (
          <>
            {console.log("⏳ [Member] Loading member data...")}
            <div className="my-4 flex items-center justify-center">
              <Loader />
            </div>
          </>
        ) : member ? (
          <>
            {console.log("👤 [Member] Showing MemberView")}
            <MemberView
              sendMessage={sendMessage}
              setNotification={setNotification}
            />
          </>
        ) : (
          <>
            {console.log("📝 [Signup] Showing SignupForm")}
            <SignupForm
              setNotification={setNotification}
              setModal={setModal}
              sendLiffMessage={sendMessage}
            />
          </>
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
