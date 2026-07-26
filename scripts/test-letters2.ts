import { arabicReshape } from '../src/lib/arabic-text';

const tests = [
    ["رم alone", "رم"],
    ["رمز alone", "رمز"],
    ["الإجازة", "الإجازة"],
    ["رمز الإجازة", "رمز الإجازة"],
];

for (const [desc, t] of tests) {
    const r = arabicReshape(t);
    const codes = Array.from(r).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
    console.log(`  ${desc}: ${t} → ${codes}`);
}
