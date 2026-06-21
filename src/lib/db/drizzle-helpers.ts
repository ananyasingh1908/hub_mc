export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

export function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return Number(value);
}

export function ensureDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}