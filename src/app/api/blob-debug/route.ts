/**
 * DELETE /api/blob-debug?id=120 — حذف سجل فحص كامل (كل نسخ معرّفه).
 * مؤقت لأغراض تنظيف سجلات الاختبار.
 */
import { NextResponse } from "next/server";
import { list, del } from "@vercel/blob";

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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ success: false, message: "id رقمي مطلوب" }, { status: 400 });
    }
    const { blobs } = await list({ prefix: `sick-leaves/${id}`, limit: 1000 });
    const targets = blobs
      .filter((b) => new RegExp(`^sick-leaves/${id}(?:-[^.]+)?\\.json$`).test(b.pathname))
      .map((b) => b.url);
    if (!targets.length) {
      return NextResponse.json({ success: false, message: `لا يوجد سجل ${id}` }, { status: 404 });
    }
    await del(targets);
    return NextResponse.json({ success: true, deleted: targets.length });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "blob delete failed" },
      { status: 500 },
    );
  }
}
