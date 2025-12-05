export type NotificationType = "success" | "error" | "warning";

export interface NotificationState {
  show: boolean;
  message: string;
  type: NotificationType;
}

export interface ModalState {
  show: boolean;
  message: string;
  type: NotificationType;
}
