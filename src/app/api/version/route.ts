/**
 * GET /api/version — يعرض SHA الـ commit المنشور حالياً على Vercel
 * (Vercel يحقن VERCEL_GIT_COMMIT_SHA وقت البناء) — للتشخيص السريع:
 * هل آخر رفع إلى GitHub انعكس فعلاً على الموقع؟
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    deployedAt: new Date().toISOString(),
    region: process.env.VERCEL_REGION || null,
  });
}
