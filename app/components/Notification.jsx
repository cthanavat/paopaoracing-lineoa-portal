"use client";

import { useEffect } from "react";

export default function Notification({ show, type, message, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return <div className={`notification notification-${type}`}>{message}</div>;
}
