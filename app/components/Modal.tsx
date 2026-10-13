"use client";

import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  onConfirm?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[3px]">
      <div className="max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[26px] bg-[#18191a] px-3 py-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#777]" />
        <div className="ticket-stack">
          <section className="ticket-section bg-white px-5 pt-5 pb-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eceef0] text-[#191a1c]">
              <svg
                className="h-7 w-7"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            {title ? (
              <h3 className="mt-4 text-xl font-black text-[#191a1c]">
                {title}
              </h3>
            ) : null}
            {message ? (
              <p className="mt-2 text-sm leading-6 text-[#666]">{message}</p>
            ) : null}
          </section>
          <section className="ticket-section bg-white px-5 pt-7 pb-5">
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              type="button"
              className="min-h-12 w-full rounded-full bg-[#191a1c] px-5 text-base font-black text-white"
            >
              ตกลง
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Modal;
