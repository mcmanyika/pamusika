import { CommerceError } from "@/lib/commerce/errors";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new CommerceError("INVALID_PHONE", "A phone number is required");
  }

  let digits = digitsOnly(trimmed);

  if (trimmed.startsWith("00")) {
    digits = digitsOnly(trimmed.slice(2));
  } else if (trimmed.startsWith("0") && !trimmed.startsWith("00")) {
    digits = `263${digits.slice(1)}`;
  } else if (digits.startsWith("0")) {
    digits = `263${digits.slice(1)}`;
  } else if (!digits.startsWith("263") && digits.length <= 10) {
    digits = `263${digits.replace(/^0+/, "")}`;
  }

  if (digits.length < 11 || digits.length > 15) {
    throw new CommerceError("INVALID_PHONE", "Enter a valid WhatsApp number");
  }

  return `+${digits}`;
}
