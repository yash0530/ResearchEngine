import { describe, expect, it } from "vitest";
import { jsonsafe } from "../lib/analyst/jsonsafe";

describe("jsonsafe", () => {
  it("parses strict JSON", () => {
    expect(jsonsafe('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    expect(jsonsafe('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts an object wrapped in prose", () => {
    expect(jsonsafe('Sure! Here is the JSON you asked for: {"brief_md":"x","flags":[]} hope it helps')).toEqual({
      brief_md: "x",
      flags: [],
    });
  });

  it("handles nested braces", () => {
    expect(jsonsafe('noise {"a":{"b":{"c":1}},"d":[{"e":2}]} trailing')).toEqual({
      a: { b: { c: 1 } },
      d: [{ e: 2 }],
    });
  });

  it("returns null on garbage", () => {
    expect(jsonsafe("no json here")).toBeNull();
    expect(jsonsafe("{broken")).toBeNull();
    expect(jsonsafe("")).toBeNull();
  });
});
