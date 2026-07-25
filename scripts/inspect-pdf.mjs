// Examine PDF stream content to see how pdfkit wrote each Arabic string.
// We extract the actual text shown in the content stream and decode the
// glyph IDs back to unicode where possible.

import fs from "fs";
import { execSync } from "node:child_process";

// Use pdftotext to extract text from the test PDF in physical (layout) order.
// This is what a reader sees visually.
const txt = execSync("pdftotext -layout /tmp/arabic-labels-test.pdf -", { encoding: "utf-8" });
console.log("=== pdftotext -layout (visual layout) ===");
console.log(txt);
console.log("=== end ===");

// Also try without -layout to see logical order
const txt2 = execSync("pdftotext /tmp/arabic-labels-test.pdf -", { encoding: "utf-8" });
console.log("\n=== pdftotext (logical/raw order) ===");
console.log(txt2);
console.log("=== end ===");
