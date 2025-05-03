"use client";
import React from "react";

const Modal = ({ isOpen, onClose, title, message, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div className="relative w-full max-w-sm p-4">
        <div className="relative rounded-2xl bg-white p-4 shadow-sm md:p-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900"
          >
            <svg
              className="h-3 w-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
            <span className="sr-only">Close modal</span>
          </button>

          <div className="text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-gray-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>

            {message && <p className="text-md mb-5 text-gray-800">{message}</p>}

            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              type="button"
              className="text-md mr-2 inline-flex items-center rounded-full bg-gray-800 px-5 py-2 text-center font-medium text-white hover:bg-red-800 focus:ring-4 focus:ring-red-300 focus:outline-none"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
