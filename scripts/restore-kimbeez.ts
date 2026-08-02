// Emit the recovered Kimbeez portfolio as an uploadable .xlsx (no sample rows).
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import { businessesToRows, SHEET_HEADERS } from "../src/lib/sheet";
import type { Business } from "../src/lib/types";

const recovered = JSON.parse(readFileSync("/tmp/kimbeez-recovered.json", "utf8")) as {
  businesses: Business[];
};
// drop empty placeholder lines (amount 0) — importer would skip them with warnings anyway
for (const b of recovered.businesses) {
  b.income = b.income.filter((l) => l.amountCents > 0);
  b.expenses = b.expenses.filter((l) => l.amountCents > 0);
}
const rows = [[...SHEET_HEADERS] as (string | number)[], ...businessesToRows(recovered.businesses)];
const ws = XLSX.utils.aoa_to_sheet(rows);
ws["!cols"] = SHEET_HEADERS.map(() => ({ wch: 18 }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
const out = process.argv[2] ?? "/tmp/kimbeez-recovered.xlsx";
writeFileSync(out, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("wrote", out, "with", recovered.businesses.length, "businesses");
