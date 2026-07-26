// Test PDF generation with multiple day counts to verify the new format
const fs = require('fs');

const basePayload = {
  patient_name_ar: 'محمد أحمد علي',
  patient_name_en: 'Mohammed Ahmed Ali',
  id_number: '1234567890',
  nationality_ar: 'السعودية',
  nationality_en: 'Saudi Arabia',
  employer_ar: 'مستشفى الملك فهد',
  employer_en: 'King Fahd Hospital',
  doctor_name_ar: 'د. خالد السعيد',
  doctor_name_en: 'Dr. Khaled Al-Saeed',
  position_ar: 'استشاري طب الأسرة',
  position_en: 'Family Medicine Consultant',
  hospital_name_ar: 'مستشفى الملك فهد التخصصي',
  hospital_name_en: 'King Fahd Specialist Hospital',
  license_number: '12345',
  time: '10:00 AM',
};

const testCases = [
  {
    name: '1-day',
    admission_date_gregorian: '2026-06-09',
    discharge_date_gregorian: '2026-06-09',
  },
  {
    name: '2-days',
    admission_date_gregorian: '2026-06-09',
    discharge_date_gregorian: '2026-06-10',
  },
  {
    name: '5-days',
    admission_date_gregorian: '2026-06-09',
    discharge_date_gregorian: '2026-06-13',
  },
];

(async () => {
  for (const tc of testCases) {
    const payload = { ...basePayload, ...tc };
    const res = await fetch('http://localhost:3000/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`Failed ${tc.name}:`, res.status, await res.text());
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = `/home/z/my-project/download/test-duration-${tc.name}.pdf`;
    fs.writeFileSync(outPath, buf);
    console.log(`\n=== ${tc.name} (size: ${buf.length} bytes) ===`);

    // Extract text
    try {
      const { execSync } = require('child_process');
      execSync(`pdftotext -layout ${outPath} /tmp/pdf-${tc.name}.txt`, { stdio: 'pipe' });
      const text = fs.readFileSync(`/tmp/pdf-${tc.name}.txt`, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (/يوم|يومان|أيام|day|Duration|مدة/i.test(line)) {
          console.log(`  Line ${i+1}: ${line.trim()}`);
        }
      });
    } catch (e) {
      console.log('  pdftotext not available');
    }
  }
})();
