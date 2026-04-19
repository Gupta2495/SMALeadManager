// TypeScript mirror of lead_tracker/normalizer.py's normalize_phone.
// Keep logic identical — the Python ingester and the web-app's new-lead
// modal must agree on what "the same phone" means so dedupe works.

export type PhoneResult = { normalized: string; valid: boolean; raw: string };

export function normalizePhone(raw: string | null | undefined): PhoneResult {
  if (!raw) return { normalized: "", valid: false, raw: raw ?? "" };
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return { normalized: `+91${digits}`, valid: true, raw };
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return { normalized: `+${digits}`, valid: true, raw };
  }
  if (digits.length === 13 && digits.startsWith("091")) {
    return { normalized: `+${digits.slice(1)}`, valid: true, raw };
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return { normalized: `+91${digits.slice(1)}`, valid: true, raw };
  }
  return { normalized: raw.trim(), valid: false, raw };
}

/** Phone as an `<a href="tel:…">` target. */
export function telHref(phone: string): string {
  const { normalized } = normalizePhone(phone);
  return `tel:${normalized.replace(/\s+/g, "")}`;
}

/** Phone as a `wa.me` deep link. */
export function whatsappHref(phone: string, text?: string): string {
  const { normalized } = normalizePhone(phone);
  const digits = normalized.replace(/^\+/, "");
  const qs = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${qs}`;
}

/** Human-readable display, e.g. "+91 98765 43210". */
export function formatPhoneDisplay(phone: string): string {
  const { normalized, valid } = normalizePhone(phone);
  if (!valid) return phone;
  const digits = normalized.slice(3); // drop +91
  if (digits.length !== 10) return normalized;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
