import { arabicReshape, processArabicText } from '../src/lib/arabic-text';

const text = "رمز الإجازة";
console.log(`Input:        ${text}`);
console.log(`  codes:      ${Array.from(text).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ')}`);

const reshaped = arabicReshape(text);
console.log(`\nReshaped:     ${reshaped}`);
console.log(`  codes:      ${Array.from(reshaped).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ')}`);

const processed = processArabicText(text);
console.log(`\nProcessed:    ${processed}`);
console.log(`  codes:      ${Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ')}`);
