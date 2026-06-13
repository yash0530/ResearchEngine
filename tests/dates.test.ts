import { describe, expect, it } from "vitest";
import { isLastDayOfMonth, daysBetween, withinDays } from "../lib/dates";

describe("isLastDayOfMonth", () => {
  it("returns true for Jan 31", () => {
    const date = new Date(2026, 0, 31);
    expect(isLastDayOfMonth(date)).toBe(true);
  });

  it("returns true for Apr 30", () => {
    const date = new Date(2026, 3, 30);
    expect(isLastDayOfMonth(date)).toBe(true);
  });

  it("returns true for Feb 28 in non-leap year", () => {
    const date = new Date(2026, 1, 28);
    expect(isLastDayOfMonth(date)).toBe(true);
  });

  it("returns false for Feb 28 in leap year (Feb 29 exists)", () => {
    const date = new Date(2028, 1, 28);
    expect(isLastDayOfMonth(date)).toBe(false);
  });

  it("returns true for Feb 29 in leap year", () => {
    const date = new Date(2028, 1, 29);
    expect(isLastDayOfMonth(date)).toBe(true);
  });

  it("returns false for mid-month date", () => {
    const date = new Date(2026, 0, 15);
    expect(isLastDayOfMonth(date)).toBe(false);
  });

  it("returns true for Dec 31", () => {
    const date = new Date(2026, 11, 31);
    expect(isLastDayOfMonth(date)).toBe(true);
  });
});

describe("daysBetween", () => {
  it("returns 7 days between 2026-01-01 and 2026-01-08", () => {
    expect(daysBetween("2026-01-01", "2026-01-08")).toBe(7);
  });

  it("returns 0 when dates are the same", () => {
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("returns negative when b is earlier than a", () => {
    expect(daysBetween("2026-01-08", "2026-01-01")).toBe(-7);
  });

  it("returns 365 days for one year apart", () => {
    expect(daysBetween("2026-01-01", "2027-01-01")).toBe(365);
  });

  it("handles leap years correctly (366 days)", () => {
    expect(daysBetween("2028-01-01", "2029-01-01")).toBe(366);
  });

  it("returns 1 for consecutive days", () => {
    expect(daysBetween("2026-06-12", "2026-06-13")).toBe(1);
  });
});

describe("withinDays", () => {
  it("returns true when date is within range", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-10", 5, today)).toBe(true);
  });

  it("returns true when date is today", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-13", 0, today)).toBe(true);
  });

  it("returns false when date is in the future", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-14", 5, today)).toBe(false);
  });

  it("returns false when date is outside range", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-01", 5, today)).toBe(false);
  });

  it("returns true at the boundary of range", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-08", 5, today)).toBe(true);
  });

  it("returns false outside boundary", () => {
    const today = "2026-06-13";
    expect(withinDays("2026-06-07", 5, today)).toBe(false);
  });
});
