// Crop the ID row from the test PDF for closer inspection
const { execSync } = require("child_process");
// The ID row is roughly at y = 250 + (45 * N) in PDF coords.
// Row 1: Leave ID (y=250, h=45)
// Row 2: Duration (special, h=45)
// Row 3: Admission Date (h~40)
// Row 4: Discharge Date
// Row 5: Issue Date
// Row 6: Name
// Row 7: National ID / Iqama  <-- this one
// Approx y in PDF: 250 + 45 + 45 + 40 + 40 + 40 + 40 = 500
// At 150 DPI: 500 * 150/72 = ~1042 px from top
// But A3 height is 1150pt = ~2400px at 150 DPI
// So the ID row is around y=1042-1092px

// Use pdftoppm with crop
execSync('pdftoppm -r 300 -png /tmp/full-test.pdf /tmp/full-test-hires');
console.log("done");
