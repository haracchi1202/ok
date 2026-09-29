import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, isLateNightTime, type PriceMaster } from "./pricing";

const master: PriceMaster = {
  courses: [
    { id: "c90", name: "スタンダード", minutes: 90, price: 18000, isOvernight: false },
    { id: "c120", name: "ゆったり", minutes: 120, price: 24000, isOvernight: false },
    { id: "night", name: "お泊まり", minutes: 600, price: 60000, isOvernight: true },
  ],
  options: [{ id: "o1", name: "アロマ", price: 2000 }],
  areas: [{ id: "a1", name: "中央", transportFee: 1000 }],
  campaigns: [
    { id: "first", name: "初回割", discountType: "AMOUNT", value: 3000, target: "FIRST", minCourseMinutes: 0 },
    { id: "pct", name: "10%OFF", discountType: "PERCENT", value: 10, target: "ALL", minCourseMinutes: 120 },
  ],
  therapists: [
    { id: "t1", name: "A", nominationFee: null },
    { id: "t2", name: "B", nominationFee: 5000 },
  ],
  rules: {
    nomination_first: 1000,
    nomination_repeat: 2000,
    extension_fee: 6000,
    extension_unit_minutes: 30,
    late_night_fee: 2000,
    late_night_start_hour: 24,
    late_night_end_hour: 29,
  },
};

test("基本料金 + 指名 + 交通費 + オプション", () => {
  const r = calculatePrice({ therapistId: "t1", isRepeat: false, courseId: "c90", areaId: "a1", optionIds: ["o1"] }, master);
  assert.equal(r.total, 18000 + 1000 + 1000 + 2000);
  assert.equal(r.isComplete, true);
});

test("リピート指名・個別指名料", () => {
  assert.equal(calculatePrice({ therapistId: "t1", isRepeat: true, courseId: "c90", areaId: "a1" }, master).total, 21000);
  assert.equal(calculatePrice({ therapistId: "t2", isRepeat: true, courseId: "c90", areaId: "a1" }, master).total, 24000);
});

test("延長と深夜料金", () => {
  const r = calculatePrice({ isRepeat: false, courseId: "c90", areaId: "a1", extensionCount: 2, lateNight: true }, master);
  assert.equal(r.total, 18000 + 12000 + 1000 + 2000);
  assert.equal(r.totalMinutes, 150);
});

test("宿泊コースは延長・深夜料金なし", () => {
  const r = calculatePrice({ isRepeat: false, courseId: "night", areaId: "a1", extensionCount: 2, lateNight: true }, master);
  assert.equal(r.total, 61000);
});

test("キャンペーン条件", () => {
  const ok = calculatePrice({ isRepeat: false, courseId: "c90", areaId: "a1", campaignId: "first" }, master);
  assert.equal(ok.discount, 3000);
  const ng = calculatePrice({ isRepeat: true, courseId: "c90", areaId: "a1", campaignId: "first" }, master);
  assert.equal(ng.discount, 0);
  assert.ok(ng.warnings.some((w) => w.includes("初回")));
  const pct = calculatePrice({ isRepeat: true, courseId: "c120", areaId: "a1", campaignId: "pct" }, master);
  assert.equal(pct.discount, 2400);
});

test("深夜時間帯の判定", () => {
  assert.equal(isLateNightTime("23:30", master.rules), false);
  assert.equal(isLateNightTime("24:00", master.rules), true);
  assert.equal(isLateNightTime("02:00", master.rules), true);
  assert.equal(isLateNightTime("29:00", master.rules), false);
});
