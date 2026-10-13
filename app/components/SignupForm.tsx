"use client";

import React, { useEffect, useState } from "react";
import { Button } from "flowbite-react";
import { useAppStore, Member } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { NotificationState, ModalState } from "@/types/ui";
import { validatePhone } from "@/lib/utils/validation";
import { authenticatedFetch } from "@/lib/utils/apiClient";

interface SignupFormProps {
  setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
  setModal: React.Dispatch<React.SetStateAction<ModalState>>;
  sendLiffMessage: (msg: string) => Promise<boolean>;
}

const SignupForm: React.FC<SignupFormProps> = ({
  setNotification,
  setModal,
  sendLiffMessage,
}) => {
  const { user, memberAll, setMemberAll, setMember } = useAppStore();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [isSignup, setSignup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const isPlaceholderUser =
    user?.userId === "dev-user" || user?.displayName === "Local Dev";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignup(true);

    if (!user) {
      setNotification({
        show: true,
        message: "User info not found",
        type: "error",
      });
      setSignup(false);
      return;
    }

    if (isPlaceholderUser) {
      setModal({
        show: true,
        message:
          "ไม่สามารถสมัครสมาชิกด้วยบัญชีทดสอบได้ กรุณาเข้าสู่ระบบด้วย LINE ผู้ใช้จริง",
        type: "warning",
      });
      setSignup(false);
      return;
    }

    const phone = form.phone;
    if (!validatePhone(phone)) {
      setModal({
        show: true,
        message:
          "กรอกเบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็น 10 หลักและขึ้นต้นด้วย 0)",
        type: "warning",
      });
      setSignup(false);
      return;
    }

    const isPhoneNumberExists = memberAll.some(
      (member) => member.phone === phone,
    );
    if (isPhoneNumberExists) {
      setModal({
        show: true,
        message: "เบอร์นี้ถูกใช้งานแล้ว",
        type: "warning",
      });
      setSignup(false);
      return;
    }

    try {
      const res = await authenticatedFetch("/api/gSheet/add", {
        method: "POST",
        body: JSON.stringify({
          resource: "userLine",
          newRow: [
            new Date().toISOString().slice(0, 10),
            form.name,
            form.phone,
            user.displayName,
            user.userId,
            "9",
            "member",
          ],
        }),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        // Try sending notifications, but don't fail registration if they fail
        try {
          await fetch("/api/pushover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "สมาชิกใหม่",
              message: `${form.name} (${form.phone}) สมัครสมาชิกแล้ว`,
            }),
          });
        } catch (notifError) {
          console.error("Failed to send Pushover notification:", notifError);
        }

        try {
          await sendLiffMessage(`${form.name} (${form.phone}) สมัครสมาชิกแล้ว`);
        } catch (liffError) {
          console.error("Failed to send LIFF message:", liffError);
        }

        setNotification({
          show: true,
          message: "สมัครสมาชิกสำเร็จ!",
          type: "success",
        });

        // Manually refetch member data to update UI
        setTimeout(async () => {
          try {
            const res = await authenticatedFetch("/api/gSheet/get", {
              method: "POST",
              body: JSON.stringify({ resource: "userLine" }),
            });
            const memberData = await res.json();
            if (memberData.data) {
              setMemberAll(memberData.data);
              // Find and set the current user's member data
              if (user?.userId) {
                const userMember = memberData.data.find(
                  (m: Member) => m.userId === user.userId,
                );
                if (userMember) {
                  setMember(userMember);
                }
              }
            }
          } catch (err) {
            console.error("Failed to refetch member data:", err);
            // Fallback to router refresh if refetch fails
            router.refresh();
          } finally {
            // Re-enable button after refetch completes
            setSignup(false);
          }
        }, 1500);
      } else {
        setSignup(false);
        setModal({
          show: true,
          message: "สร้างบัญชีผู้ใช้ไม่สําเร็จ",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setNotification({
        show: true,
        message: "สร้างบัญชีผู้ใช้ไม่สําเร็จ",
        type: "error",
      });
      setSignup(false);
    }
  }

  if (isSignup) {
    // You might want to show a loader here or disable the button
  }

  return (
    <div className="signup-viewport fixed inset-0 flex [touch-action:pan-y] flex-col overflow-y-auto overscroll-contain bg-[#18191a] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
      <form
        onSubmit={handleSubmit}
        className="mx-auto my-auto w-full max-w-md shrink-0 space-y-4 rounded-[18px] border border-[#d4d9e1] bg-white px-5 py-6 shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:px-6"
      >
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.png"
            alt="PAOPAO Racing Shop"
            width={72}
            height={72}
            className="h-[72px] w-[72px] object-contain"
          />
          <p className="mt-3 text-[11px] font-bold tracking-[0.18em] text-[#1972bc] uppercase">
            PAOPAO Racing Shop
          </p>
          <h4 className="mt-1 text-xl font-black tracking-tight text-[#191a1c]">
            ยินดีต้อนรับ
          </h4>
          <p className="mt-1 max-w-[280px] text-[13px] leading-5 text-[#666]">
            สมัครสมาชิกเพื่อเก็บประวัติรถและส่งคำขอเข้ารับบริการกับทางร้าน
          </p>
          <div className="mt-5 w-full border-t border-dashed border-[#c8cdd2] pt-4">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#777] uppercase">
              New Member
            </p>
            <h5 className="mt-0.5 text-lg font-black text-[#191a1c]">
              สมัครสมาชิก
            </h5>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            ชื่อ
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 w-full rounded-[18px] border border-[#d4d9e1] bg-[#F9F9FA] px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
            placeholder="ใช้ชื่อจริง (สำหรับ ยื่นประกัน)"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">
            เบอร์โทร
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-11 w-full rounded-[18px] border border-[#d4d9e1] bg-[#F9F9FA] px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#c7ceda] focus:bg-white focus:ring-2 focus:ring-[#d5dbe6] focus:outline-none"
            placeholder="0123456789"
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full rounded-full border border-[#d4d9e1] bg-[#111111] py-2 text-sm font-medium text-white shadow-[0_12px_32px_rgba(17,17,17,0.22)] hover:bg-[#202020] hover:opacity-100"
          size="md"
          disabled={isSignup}
        >
          {isSignup ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
        </Button>
      </form>
    </div>
  );
};

export default SignupForm;
