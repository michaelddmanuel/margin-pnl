// Round-trip check: seed → rows → xlsx → rows → parse → derived numbers must match.
import * as XLSX from "xlsx";
import { writeFileSync, readFileSync } from "node:fs";
import { businessesToRows, sampleRows, parseRows, SHEET_HEADERS } from "../src/lib/sheet";
import { makeSeedBusinesses } from "../src/lib/seed";
import { deriveBusiness } from "../src/lib/engine";

const seed = makeSeedBusinesses();
const rows = [[...SHEET_HEADERS] as (string | number)[], ...businessesToRows(seed), ...sampleRows()];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
writeFileSync("/tmp/margin-portfolio.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

const wb2 = XLSX.read(readFileSync("/tmp/margin-portfolio.xlsx"), { type: "buffer" });
const rows2 = XLSX.utils.sheet_to_json<(string | number)[]>(wb2.Sheets.Portfolio, { header: 1, defval: "" });
const parsed = parseRows(rows2);

let fail = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

check("businesses parsed", parsed.businesses.length, 2);
check("sample rows skipped", parsed.sampleRowsSkipped, 6);
check("warnings", parsed.warnings, []);

for (const orig of seed) {
  const back = parsed.businesses.find((b) => b.name === orig.name)!;
  const d0 = deriveBusiness(orig);
  const d1 = deriveBusiness(back);
  check(`${orig.name} revenue`, d1.revenueMo, d0.revenueMo);
  check(`${orig.name} expenses`, d1.expensesMo, d0.expensesMo);
  check(`${orig.name} net`, d1.netMo, d0.netMo);
  check(`${orig.name} breakEven`, d1.breakEvenUnits, d0.breakEvenUnits);
  check(`${orig.name} groups`, back.groups.map((g) => [g.label, g.count]), orig.groups.map((g) => [g.label, g.count]));
  check(`${orig.name} unit`, back.unitLabel, orig.unitLabel);
  check(`${orig.name} line counts`, [back.income.length, back.expenses.length], [orig.income.length, orig.expenses.length]);
}

// tiered line survived?
const sun = parsed.businesses.find((b) => b.name.includes("Sunshine"))!;
const tuition = sun.income[0];
check("tuition tiered", !!tuition.groupAmounts && Object.keys(tuition.groupAmounts).length, 2);
check(
  "tuition rates",
  Object.values(tuition.groupAmounts ?? {}).sort((a, b) => a - b),
  [72500, 95000],
);

console.log(fail === 0 ? "\nROUND-TRIP OK" : `\n${fail} CHECKS FAILED`);
process.exit(fail === 0 ? 0 : 1);
