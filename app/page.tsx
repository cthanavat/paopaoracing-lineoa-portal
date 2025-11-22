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

export default function HomePage() {
  const { user, member, config, loadUser, loadMember, isLiffLoading } =
    useAppStore();

  // Custom Hooks
  const { error: liffError, sendMessage } = useLiff();
  const { error: appDataError } = useAppData();

  // Local UI State
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [modal, setModal] = useState({
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
  }, [notification.show]);

  if (loadUser || !config || isLiffLoading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

  if (!user) {
    // Redirecting to login is handled in useLiff or we can do it here if user is null after loading
    // But useLiff tries to login if not logged in.
    // If we are here, it means user is null but loading is done.
    // This might happen if LIFF failed or local storage is empty and LIFF login didn't trigger yet?
    // Let's show loader or redirect.
    // router.push("/login"); // If you have a login page
    return (
      <main className="flex h-screen items-center justify-center">
        <Loader />
      </main>
    );
  }

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
          <div className="my-4 flex items-center justify-center">
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
