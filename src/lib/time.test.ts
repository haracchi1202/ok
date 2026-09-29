import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDateTime, formatShift, toBusinessDate, toJstTime } from "./time";

test("日付をまたぐ勤務", () => {
  const start = businessDateTime("2026-09-29", "20:00");
  const end = businessDateTime("2026-09-29", "04:00");
  assert.ok(end > start);
  assert.equal(end.getTime() - start.getTime(), 8 * 3600000);
  assert.equal(formatShift(start, end, "2026-09-29"), "20:00〜翌4:00");
  assert.equal(toBusinessDate(end), "2026-09-29");
});

test("24時以降表記", () => {
  const t = businessDateTime("2026-09-29", "26:30");
  assert.equal(toJstTime(t), "02:30");
  assert.equal(toBusinessDate(t), "2026-09-29");
});
