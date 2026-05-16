import type { NextRequest } from "next/server";

export const JSON_BODY_LIMIT = 100 * 1024;
export const FORM_BODY_LIMIT = 5 * 1024 * 1024;

export function isBodyTooLarge(req: NextRequest, limit: number) {
  const header = req.headers.get("content-length");
  if (!header) return false;
  const length = Number.parseInt(header, 10);
  return Number.isFinite(length) && length > limit;
}
