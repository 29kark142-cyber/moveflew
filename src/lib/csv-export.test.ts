import { describe, expect, it } from "vitest";
import { csvCell, csvContent } from "./csv-export";

describe("spreadsheet exports", () => {
  it("neutralises text cells a customer could otherwise run as a formula", () => {
    expect(csvCell("=SUM(1,2)")).toBe('"\'=SUM(1,2)"');
    expect(csvCell("+1+1")).toBe('"\'1+1"'.replace("1+1", "+1+1"));
    expect(csvCell("-1+1")).toBe('"\'-1+1"');
    expect(csvCell("@evil")).toBe('"\'@evil"');
    expect(csvCell("\tscale")).toBe('"\'\tscale"');
    expect(csvCell("\rscale")).toBe('"\'\rscale"');
  });

  it("leaves numbers and normal text readable so column totals still work", () => {
    expect(csvCell(-500)).toBe('"-500"');
    expect(csvCell(1500.5)).toBe('"1500.5"');
    expect(csvCell("Fuel surcharge")).toBe('"Fuel surcharge"');
    expect(csvCell("")).toBe('""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("keeps quotes inside a cell", () => {
    expect(csvCell('He said "yes"')).toBe('"He said ""yes"""');
  });

  it("builds a full sheet with one header row and one row per record", () => {
    const sheet = csvContent([
      ["Reference", "Description", "Amount"],
      ["INV-1", "=cmd|'/C calc'!A0", 2400],
      ["INV-2", "Piano", -150],
    ]);
    expect(sheet.split("\r\n")).toHaveLength(3);
    expect(sheet).toContain('"\'=cmd|\'/C calc\'!A0"');
    expect(sheet).toContain('"2400"');
    expect(sheet).toContain('"-150"');
  });
});
