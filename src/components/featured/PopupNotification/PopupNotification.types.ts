export type NotificationTypes =
  | "default"
  | "success"
  | "information"
  | "warning"
  | "error";

export interface INotification {
  id: string;
  type: NotificationTypes;
  title: string | undefined;
  description: string | undefined;
}
