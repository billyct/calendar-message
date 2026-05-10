export type MessageTemplate = {
  id: string;
  name: string;
  msgtype: "text" | "markdown";
  content: string;
  createdAt: number;
  updatedAt: number;
};
