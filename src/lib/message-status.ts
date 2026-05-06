export function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "待发送";
    case "processing":
      return "发送中";
    case "sent":
      return "已发送";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return status;
  }
}
