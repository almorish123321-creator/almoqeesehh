// Minimal test: render "رقم الهوية / الإقامة" with the Arabic font to see
// where the slash box appears.
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fontArabicRegPath = path.join(
  root, "node_modules", "@fontsource", "noto-sans-arabic", "files",
  "noto-sans-arabic-arabic-400-normal.woff"
);

async function main() {
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0 });
  const out = fs.createWriteStream("/tmp/slash-test.pdf");
  doc.pipe(out);

  doc.registerFont("NotoArabic", fontArabicRegPath);

  const tests = [
    { label: "1. rtla, full string", text: "رقم الهوية / الإقامة", opts: { features: ["rtla"] } },
    { label: "2. no features, full string", text: "رقم الهوية / الإقامة", opts: { features: [] } },
    { label: "3. no features key, full string", text: "رقم الهوية / الإقامة", opts: {} },
    { label: "4. Times-Roman, slash only", text: "/", opts: {} },
    { label: "5. NotoArabic, slash only, rtla", text: "/", opts: { features: ["rtla"] } },
    { label: "6. NotoArabic, slash only, no features", text: "/", opts: { features: [] } },
    { label: "7. NotoArabic, slash + space + Arab", text: "/ الإقامة", opts: { features: [] } },
    { label: "8. NotoArabic, Arab + space + slash", text: "رقم /", opts: { features: [] } },
    { label: "9. U+2215 division slash", text: "رقم الهوية ∕ الإقامة", opts: { features: [] } },
    { label: "10. U+FF0F fullwidth slash", text: "رقم الهوية ／ الإقامة", opts: { features: [] } },
  ];

  let y = 50;
  for (const t of tests) {
    doc.font("Times-Roman").fontSize(11).fillColor("#000").text(t.label, 50, y);
    doc.font("NotoArabic").fontSize(20).fillColor("#000").text(t.text, 350, y, { ...t.opts });
    y += 60;
  }

  doc.end();
  await new Promise((r) => out.on("finish", r));
  console.log("Wrote /tmp/slash-test.pdf");
  require("child_process").execSync("pdftoppm -r 150 -png /tmp/slash-test.pdf /tmp/slash-test", { stdio: "inherit" });
  console.log("Wrote /tmp/slash-test-1.png");
}
main().catch((e) => { console.error(e); process.exit(1); });
