import { describe, expect, it } from "vitest";
import { resolveAdminAccess } from "@/lib/auth/access";
import { canHandleSupport, canManageCommerce, canViewPii, isStaffRole } from "@/lib/auth/roles";
import { isAllowedImageSize, isAllowedImageType, MAX_IMAGE_BYTES, safeImageFileName } from "@/lib/storage/validate";
import { isSensitiveLogKey } from "@/lib/utils/logger";
import { clientIp, rateLimit, resetRateLimitForTests } from "@/lib/utils/rate-limit";
import { loginSchema } from "@/lib/validation/auth";
import { parseUuid } from "@/lib/validation/ids";
import { webhookBodyTooLarge, WHATSAPP_WEBHOOK_MAX_BODY_BYTES } from "@/lib/whatsapp/config";
import { interactivePayload } from "@/lib/whatsapp/client";
import { customerMenuReplies, helpReplies, mainMenuReply, vendorMenuReplies } from "@/lib/conversation/copy";

describe("unauthorized admin access", () => {
  it("rejects missing users and non-staff profiles", () => {
    expect(resolveAdminAccess({ user: null, profile: null })).toBe("unauthenticated");
    expect(
      resolveAdminAccess({
        user: { id: "user-1" },
        profile: { role: "CUSTOMER" },
      }),
    ).toBe("unauthorized");
    expect(
      resolveAdminAccess({
        user: { id: "user-1" },
        profile: null,
      }),
    ).toBe("unauthorized");
  });

  it("allows staff roles and still hides commerce writes from analysts", () => {
    expect(resolveAdminAccess({ user: { id: "user-1" }, profile: { role: "ANALYST" } })).toBe("ok");
    expect(isStaffRole("ANALYST")).toBe(true);
    expect(canManageCommerce("ANALYST")).toBe(false);
    expect(canHandleSupport("ANALYST")).toBe(false);
    expect(canViewPii("ANALYST")).toBe(false);
    expect(canManageCommerce("OPERATIONS")).toBe(true);
  });

  it("rejects invalid admin entity ids", () => {
    expect(parseUuid("not-a-uuid")).toBeNull();
    expect(parseUuid("")).toBeNull();
    expect(parseUuid("a1111111-1111-4111-8111-111111111111")).toBe(
      "a1111111-1111-4111-8111-111111111111",
    );
  });
});

describe("login validation", () => {
  it("rejects a short password and an invalid email", () => {
    expect(loginSchema.safeParse({ email: "ops@paysell.test", password: "short" }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ email: "not-an-email", password: "long-enough" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ email: "ops@paysell.test", password: "long-enough" }).success,
    ).toBe(true);
  });
});

describe("rate limiting", () => {
  it("blocks a key after the window is exhausted", () => {
    resetRateLimitForTests();
    const now = 1_000_000;
    expect(rateLimit("login:1", 2, 60_000, now).ok).toBe(true);
    expect(rateLimit("login:1", 2, 60_000, now).ok).toBe(true);
    expect(rateLimit("login:1", 2, 60_000, now).ok).toBe(false);
    expect(rateLimit("login:2", 2, 60_000, now).ok).toBe(true);
    expect(rateLimit("login:1", 2, 60_000, now + 60_001).ok).toBe(true);
  });

  it("reads the first forwarded IP", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.10");
  });
});

describe("log redaction", () => {
  it("treats secrets and phone fields as sensitive", () => {
    expect(isSensitiveLogKey("OPENAI_API_KEY")).toBe(true);
    expect(isSensitiveLogKey("password")).toBe(true);
    expect(isSensitiveLogKey("phone_number")).toBe(true);
    expect(isSensitiveLogKey("whatsapp_number")).toBe(true);
    expect(isSensitiveLogKey("operation")).toBe(false);
  });
});

describe("upload validation", () => {
  it("accepts common image types under the size cap and mints a safe name", () => {
    expect(isAllowedImageType("image/jpeg")).toBe(true);
    expect(isAllowedImageType("application/pdf")).toBe(false);
    expect(isAllowedImageSize(1024)).toBe(true);
    expect(isAllowedImageSize(MAX_IMAGE_BYTES + 1)).toBe(false);
    expect(safeImageFileName("My Photo.PNG")).toMatch(/^[0-9a-f-]{36}\.png$/);
  });
});

describe("webhook body cap", () => {
  it("rejects a declared or actual body over 256KB", () => {
    expect(webhookBodyTooLarge(String(WHATSAPP_WEBHOOK_MAX_BODY_BYTES + 1), 0)).toBe(true);
    expect(webhookBodyTooLarge(null, WHATSAPP_WEBHOOK_MAX_BODY_BYTES + 1)).toBe(true);
    expect(webhookBodyTooLarge("128", 128)).toBe(false);
  });
});

describe("menu buttons", () => {
  it("sends Meta reply buttons, not a list", () => {
    const reply = mainMenuReply();
    expect(reply.kind).toBe("interactive");
    if (reply.kind !== "interactive") {
      return;
    }
    const payload = interactivePayload(reply.message);
    expect(payload.type).toBe("button");
    expect(payload.header).toEqual({ type: "text", text: "PaySell Musika" });
    expect(payload.body).toEqual({ text: " " });
    expect(payload.action).toEqual({
      buttons: [
        { type: "reply", reply: { id: "buyer", title: "Buyer" } },
        { type: "reply", reply: { id: "vendor", title: "Vendor" } },
      ],
    });
  });

  it("sends buyer, vendor, and help options as reply buttons", () => {
    const menus = [...customerMenuReplies(), ...vendorMenuReplies(), ...helpReplies()];
    expect(menus.length).toBeGreaterThan(0);
    for (const reply of menus) {
      expect(reply.kind).toBe("interactive");
      if (reply.kind !== "interactive") {
        continue;
      }
      expect(reply.message.list).toBeUndefined();
      expect(interactivePayload(reply.message).type).toBe("button");
    }
  });
});
