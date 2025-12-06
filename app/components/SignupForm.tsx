"use client";

import React, { useState } from "react";
import { Button } from "flowbite-react";
import { useAppStore, Member } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { NotificationState, ModalState } from "@/types/ui";
import { validatePhone } from "@/lib/utils/validation";

interface SignupFormProps {
  setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
  setModal: React.Dispatch<React.SetStateAction<ModalState>>;
  sendLiffMessage: (msg: string) => Promise<void>;
}

const SignupForm: React.FC<SignupFormProps> = ({
  setNotification,
  setModal,
  sendLiffMessage,
}) => {
  const { user, config, memberAll, setMemberAll, setMember } = useAppStore();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [isSignup, setSignup] = useState(false);
  const router = useRouter();

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
      const res = await fetch("/api/gSheet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: config.userLine?.sheetId,
          range: config.userLine?.range,
          newRow: [
            new Date().toISOString().slice(0, 10),
            form.name,
            form.phone,
            user.displayName,
            user.userId,
            "",
            "member",
          ],
        }),
      });

      console.log("📡 [API] Response status:", res.status, res.statusText);
      console.log("📡 [API] Response ok:", res.ok);

      const result = await res.json();
      console.log("📡 [API] Response body:", result);

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
            const res = await fetch("/api/gSheet/get", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sheet: {
                  sheetId: config.userLine?.sheetId,
                  range: config.userLine?.range,
                },
              }),
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
    <form
      onSubmit={handleSubmit}
      className="max-w-md min-w-2xs space-y-2 rounded-xl bg-white p-6"
    >
      <h4 className="text-center text-lg font-semibold">สมัครสมาชิก</h4>
      <div>
        <label className="mb-1 block text-sm text-gray-600">ชื่อ</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-2 focus:ring-black focus:outline-none"
          placeholder="ใช้ชื่อจริง (สำหรับ ยื่นประกัน)"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">เบอร์โทร</label>
        <input
          type="text"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="mb-4 w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-2 focus:ring-black focus:outline-none"
          placeholder="0123456789"
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-full bg-black py-2 text-sm font-medium text-white hover:bg-red-800 hover:opacity-90"
        size="md"
        disabled={isSignup}
      >
        {isSignup ? "กำลังสมัครสมาชิก..." : "Submit"}
      </Button>
    </form>
  );
};

export default SignupForm;
