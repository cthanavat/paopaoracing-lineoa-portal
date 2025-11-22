"use client";

import { useEffect } from "react";
import React from "react";

interface NotificationProps {
  show: boolean;
  type: string;
  message: string;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  show,
  type,
  message,
  onClose,
}) => {
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
};

export default Notification;
