/**
 * Validadores oficiales para México.
 */

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

export function isValidCURP(value: string): boolean {
  if (!value) return false;
  return CURP_REGEX.test(value.toUpperCase().trim());
}

export function isValidRFC(value: string): boolean {
  if (!value) return false;
  return RFC_REGEX.test(value.toUpperCase().trim());
}

export function normalizeCURP(value: string): string {
  return (value ?? "").toUpperCase().trim();
}

export function normalizeRFC(value: string): string {
  return (value ?? "").toUpperCase().trim();
}

export const PRIVACY_VERSION = "2026-07-17";
export const TERMS_VERSION = "2026-07-17";