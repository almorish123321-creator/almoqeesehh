import { arabicReshape } from '/home/z/my-project/src/lib/arabic-text.ts';

const r = arabicReshape("إلى");
console.log("arabicReshape('إلى') =", JSON.stringify(r));
console.log("Codes:", [...r].map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
