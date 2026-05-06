import { describe, expect, it } from "vitest";

import { statusLabel } from "@/lib/message-status";

describe("statusLabel", () => {
  it.each([
    ["pending", "待发送"],
    ["processing", "发送中"],
    ["sent", "已发送"],
    ["failed", "失败"],
    ["cancelled", "已取消"],
  ])("maps %s to Chinese label", (code, expected) => {
    expect(statusLabel(code)).toBe(expected);
  });

  it("returns unknown codes unchanged", () => {
    expect(statusLabel("custom")).toBe("custom");
  });
});
