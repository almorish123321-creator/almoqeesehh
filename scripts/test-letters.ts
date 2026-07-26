import { arabicReshape } from '../src/lib/arabic-text';

const tests = [
    ["ر alone", "ر"],
    ["م alone", "م"],
    ["ز alone", "ز"],
    ["ا alone", "ا"],
    ["ل alone", "ل"],
    ["إ alone", "إ"],
    ["ج alone", "ج"],
    ["ة alone", "ة"],
    ["رم alone", "رم"],
    ["رمز alone", "رمز"],
];

for (const [desc, t] of tests) {
    const r = arabicReshape(t);
    const codes = Array.from(r).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
    console.log(`  ${desc}: ${t} → ${r} (${codes})`);
}
