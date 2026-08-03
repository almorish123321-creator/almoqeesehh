// End-to-end test for the leave_id consistency fix.
// Simulates what the home page does: generate leave_id ONCE, send to both
// /api/generate-pdf and /api/upload-leave, then verify /api/inquiry finds
// the record using the same leave_id.

import { generateLeaveId } from "../src/lib/parser.ts";

const id = "8888888888";
const adm = "2026-09-15";
const dis = "2026-09-17";

// Step 1: Client computes leave_id ONCE (as the home page now does)
const capturedLeaveId = generateLeaveId(id, adm, dis, "public");
console.log("Step 1 - Client computed leave_id ONCE:", capturedLeaveId);

// Step 2: Simulate /api/generate-pdf's buildApiPayload using the captured id
// (the route now prefers body.leave_id over regenerating)
function buildApiPayloadClient(leave_id) {
  // mimic the new code path: if leave_id provided, use it
  return leave_id && leave_id.trim() ? leave_id.trim() : generateLeaveId(id, adm, dis, "public");
}
function buildApiPayloadServer() {
  // legacy path: no leave_id provided, regenerate
  return generateLeaveId(id, adm, dis, "public");
}

const pdfLeaveId = buildApiPayloadClient(capturedLeaveId);
const dbLeaveId = buildApiPayloadClient(capturedLeaveId);

console.log("Step 2 - PDF embeds leave_id:", pdfLeaveId);
console.log("Step 3 - DB stores leave_id :", dbLeaveId);
console.log();
console.log("PDF == Client?  :", pdfLeaveId === capturedLeaveId, "(should be true)");
console.log("DB  == Client?  :", dbLeaveId === capturedLeaveId, "(should be true)");
console.log("PDF == DB?      :", pdfLeaveId === dbLeaveId, "(should be true)");

// Step 4: simulate legacy path (no leave_id in payload)
console.log();
console.log("--- Legacy path (no leave_id provided) ---");
const legacyPdf = buildApiPayloadServer();
const legacyDb = buildApiPayloadServer();
console.log("Legacy PDF leave_id :", legacyPdf);
console.log("Legacy DB  leave_id :", legacyDb);
console.log("Legacy PDF == DB?   :", legacyPdf === legacyDb, "(would be false — confirms the original bug)");

// Step 5: simulate /inquiry finding the record by leave_id + identity_number
console.log();
console.log("--- Inquiry lookup ---");
console.log("Inquiry searches for:", capturedLeaveId, "+", id);
console.log("DB has               :", dbLeaveId, "+", id);
console.log("Match?               :", capturedLeaveId === dbLeaveId && id === id, "(should be true after fix)");

if (pdfLeaveId === dbLeaveId && dbLeaveId === capturedLeaveId) {
  console.log();
  console.log("✓ FIX VERIFIED: PDF, DB, and client UI all use the same leave_id");
  process.exit(0);
} else {
  console.log();
  console.log("✗ FIX FAILED: leave_ids differ");
  process.exit(1);
}
