// Validators for the dynamic claim forms.

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;

export function isValidRFC(v: string): boolean {
  if (!v) return false;
  return v.length === 13 && RFC_RE.test(v);
}

export function isValidCURP(v: string): boolean {
  if (!v) return false;
  return v.length === 18 && CURP_RE.test(v);
}

export function isValidCLABE(v: string): boolean {
  if (!v) return false;
  return /^\d{18}$/.test(v);
}

export function isValidEmail(v: string): boolean {
  if (!v) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

// Compute age from an ISO date string (YYYY-MM-DD)
export function computeAge(dob: string): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "";
}
