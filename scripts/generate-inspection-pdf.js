/**
 * توليد PDF مرجعي بمحتوى محدد بدقة، ثم نطابقه مع الفحص البصري.
 * Generate a reference PDF with controlled content and visually inspect.
 */
const fs = require('fs');

const payload = {
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
  admission_date_gregorian: '2026-06-09',
  discharge_date_gregorian: '2026-06-09',
};

(async () => {
  const res = await fetch('http://localhost:3000/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error('Failed:', res.status, await res.text());
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = '/home/z/my-project/download/inspection-final.pdf';
  fs.writeFileSync(outPath, buf);
  console.log('Reference PDF saved:', outPath, '(' + buf.length + ' bytes)');
})();
