/**
 * GET /api/blob-debug — تشخيص: يسرد ملفات Blob الفعلية في المخزن
 * (المسار + وقت الرفع فقط — بلا محتوى) لفهم سلوك التحديث/القراءة
 * في وضع العرض (Blob). مؤقت لأغراض الفحص.
 */
import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { blobs, hasMore } = await list({ prefix: "sick-leaves/", limit: 1000 });
    const items = blobs
      .map((b) => ({
        pathname: b.pathname,
        uploadedAt: b.uploadedAt,
        size: b.size,
      }))
      .sort((a, b) => (a.pathname < b.pathname ? -1 : 1));
    return NextResponse.json({ success: true, count: items.length, hasMore, items });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "blob list failed", hasToken: !!process.env.BLOB_READ_WRITE_TOKEN },
      { status: 500 },
    );
  }
}
