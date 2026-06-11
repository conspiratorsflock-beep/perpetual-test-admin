import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("returns headers and rows joined with commas and newlines", () => {
    const result = toCsv(["A", "B"], [["1", "2"]]);
    expect(result).toBe("A,B\n1,2");
  });

  it("escapes commas by wrapping in quotes", () => {
    const result = toCsv(["H"], [["a,b"]]);
    expect(result).toBe('H\n"a,b"');
  });

  it("escapes quotes by doubling them", () => {
    const result = toCsv(["H"], [['say "hi"']]);
    expect(result).toBe('H\n"say ""hi"""');
  });

  it("escapes newlines by wrapping in quotes", () => {
    const result = toCsv(["H"], [["line1\nline2"]]);
    expect(result).toBe('H\n"line1\nline2"');
  });

  it("renders null and undefined as empty strings", () => {
    const result = toCsv(["A", "B"], [[null, undefined]]);
    expect(result).toBe("A,B\n,");
  });

  it("renders numbers and booleans as their string representation", () => {
    const result = toCsv(["N", "B"], [[42, true], [-5, false]]);
    expect(result).toBe("N,B\n42,true\n-5,false");
  });

  describe("formula-injection guard", () => {
    it("prefixes strings starting with =", () => {
      const result = toCsv(["H"], [["=SUM(A1)"]]);
      expect(result).toBe("H\n'=SUM(A1)");
    });

    it("prefixes strings starting with +", () => {
      const result = toCsv(["H"], [["+1"]]);
      expect(result).toBe("H\n'+1");
    });

    it("prefixes strings starting with @", () => {
      const result = toCsv(["H"], [["@A1"]]);
      expect(result).toBe("H\n'@A1");
    });

    it("prefixes strings starting with tab", () => {
      const result = toCsv(["H"], [["\tbad"]]);
      expect(result).toBe("H\n'\tbad");
    });

    it("prefixes strings starting with carriage return", () => {
      const result = toCsv(["H"], [["\rbad"]]);
      expect(result).toBe("H\n'\rbad");
    });

    it("does NOT guard numeric negative values", () => {
      const result = toCsv(["H"], [[-5]]);
      expect(result).toBe("H\n-5");
    });

    it("guards then escapes when dangerous char and comma coexist", () => {
      // Guard adds ', then comma triggers quote wrapping
      const result = toCsv(["H"], [["=evil,comma"]]);
      expect(result).toBe('H\n"\'=evil,comma"');
    });

    it("guards then escapes when dangerous char and quote coexist", () => {
      // Guard adds ', then internal quotes trigger doubling
      const result = toCsv(["H"], [['=say "hi"']]);
      expect(result).toBe('H\n"\'=say ""hi"""');
    });
  });
});
