/* 開発確認用のサンプルデータ投入。すべて架空の人物・文章・画像です。
 * 出勤データは「実行時点の現在時刻」を基準に生成するため、いつ実行しても
 * 本日出勤 / 今すぐ会える / 予約済 などの状態が確認できます。 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import sharp from "sharp";
import { portraitSvg, sceneSvg } from "./seed-images";
import { saveImageBuffer, IMAGE_PRESETS, UPLOAD_ROOT } from "../src/lib/storage";
import { addDays, businessDateTime, todayBusinessDate, toJstDateString } from "../src/lib/time";

const prisma = new PrismaClient();

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260929);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const pickN = <T,>(arr: readonly T[], n: number) => [...arr].sort(() => rand() - 0.5).slice(0, n);

async function svgToImage(svg: string, folder: string, preset: keyof typeof IMAGE_PRESETS) {
  return saveImageBuffer(Buffer.from(svg), folder, IMAGE_PRESETS[preset]);
}

// ───────── マスターデータ ─────────

const TAGS: [string, string, string][] = [
  ["癒し系", "healing", "FEATURE"],
  ["会話好き", "talkative", "FEATURE"],
  ["聞き上手", "good-listener", "FEATURE"],
  ["優しい", "kind", "FEATURE"],
  ["紳士的", "gentleman", "FEATURE"],
  ["笑顔が素敵", "smile", "FEATURE"],
  ["甘え上手", "sweet", "FEATURE"],
  ["クール", "cool", "STYLE"],
  ["爽やか", "fresh", "STYLE"],
  ["大人の余裕", "mature", "STYLE"],
  ["細身", "slim", "STYLE"],
  ["筋肉質", "muscular", "STYLE"],
  ["高身長", "tall", "STYLE"],
  ["塩顔", "shio", "STYLE"],
  ["マッサージ", "massage", "SERVICE"],
  ["デート向き", "date", "SERVICE"],
  ["初心者向き", "beginner", "SERVICE"],
  ["添い寝", "cuddle", "SERVICE"],
  ["カフェデート", "cafe", "SERVICE"],
  ["お酒OK", "drink", "SERVICE"],
];

const QUESTIONS = ["趣味", "好きな食べ物", "性格", "休日の過ごし方", "得意なこと", "好きなタイプ", "おすすめポイント"];

const AREAS: [string, string, number][] = [
  ["新宿", "shinjuku", 0],
  ["渋谷", "shibuya", 0],
  ["池袋", "ikebukuro", 1000],
  ["恵比寿・目黒", "ebisu", 1000],
  ["六本木・麻布", "roppongi", 1000],
  ["銀座・新橋", "ginza", 1000],
  ["品川", "shinagawa", 1500],
  ["上野・浅草", "ueno", 1500],
  ["23区その他", "tokyo-other", 2000],
  ["都下・近郊（要相談）", "suburbs", 3000],
];

type T = {
  slug: string;
  name: string;
  kana: string;
  age: number;
  height: number;
  catch: string;
  newcomer?: boolean;
  overnight?: boolean;
  fee?: number;
  tags: string[];
};

const THERAPISTS: T[] = [
  { slug: "ao", name: "蒼", kana: "あお", age: 27, height: 178, catch: "静かな夜に、そっと寄り添う聞き上手", fee: 3000, overnight: true, tags: ["healing", "good-listener", "kind", "massage", "beginner", "tall"] },
  { slug: "minato", name: "湊", kana: "みなと", age: 29, height: 181, catch: "大人の余裕で包み込む、落ち着いた時間を", fee: 3000, overnight: true, tags: ["mature", "gentleman", "date", "drink", "tall"] },
  { slug: "ritsu", name: "律", kana: "りつ", age: 25, height: 174, catch: "まっすぐな眼差しと、やわらかな笑顔", tags: ["smile", "fresh", "talkative", "cafe", "beginner"] },
  { slug: "ren", name: "蓮", kana: "れん", age: 31, height: 183, catch: "鍛えた腕で本格ボディケアを", overnight: true, tags: ["muscular", "massage", "gentleman", "tall"] },
  { slug: "yuma", name: "悠真", kana: "ゆうま", age: 24, height: 172, catch: "話すほどに距離が縮まる、弟系の癒し", tags: ["sweet", "talkative", "smile", "cafe", "slim"] },
  { slug: "haruto", name: "陽翔", kana: "はると", age: 26, height: 176, catch: "太陽みたいに明るく、あなたを笑顔に", tags: ["fresh", "smile", "talkative", "date"] },
  { slug: "hayate", name: "颯", kana: "はやて", age: 28, height: 180, catch: "クールな見た目と、意外な甘さのギャップ", tags: ["cool", "shio", "sweet", "cuddle", "tall"] },
  { slug: "saku", name: "朔", kana: "さく", age: 30, height: 177, catch: "新月の夜のように、静かで深い安らぎ", overnight: true, tags: ["healing", "mature", "cuddle", "massage"] },
  { slug: "toma", name: "冬馬", kana: "とうま", age: 33, height: 185, catch: "包容力のある大人の男性をお探しなら", overnight: true, tags: ["mature", "gentleman", "tall", "drink", "date"] },
  { slug: "chikage", name: "千景", kana: "ちかげ", age: 23, height: 170, catch: "中性的な雰囲気と、やさしい手のひら", newcomer: true, tags: ["slim", "kind", "healing", "beginner", "massage"] },
  { slug: "itsuki", name: "樹", kana: "いつき", age: 26, height: 179, catch: "穏やかな声で、緊張をほどいていきます", tags: ["good-listener", "kind", "shio", "beginner"] },
  { slug: "kanade", name: "奏", kana: "かなで", age: 22, height: 173, catch: "音楽と映画が好きな、感性派の新人", newcomer: true, tags: ["talkative", "fresh", "cafe", "slim"] },
  { slug: "hal", name: "晴", kana: "はる", age: 25, height: 175, catch: "晴れた日の午後みたいな、心地よい距離感", newcomer: true, tags: ["smile", "kind", "date", "beginner"] },
  { slug: "iori", name: "伊織", kana: "いおり", age: 29, height: 182, catch: "所作の美しさにこだわる、上質なひととき", overnight: true, tags: ["gentleman", "cool", "mature", "tall", "massage"] },
  { slug: "nagi", name: "凪", kana: "なぎ", age: 27, height: 171, catch: "波ひとつない、穏やかな癒しの時間", tags: ["healing", "good-listener", "cuddle", "slim"] },
  { slug: "reo", name: "玲央", kana: "れお", age: 24, height: 184, catch: "高身長×人懐っこさ。はじめてでも安心", newcomer: true, tags: ["tall", "muscular", "sweet", "beginner", "date"] },
];

const ANSWERS: Record<string, string[]> = {
  趣味: ["カフェ巡り", "映画鑑賞（ミニシアター系）", "筋トレとサウナ", "写真を撮りに散歩", "料理。最近はスパイスカレー", "読書と美術館", "キャンプ", "ピアノ"],
  好きな食べ物: ["焼き鳥", "チーズケーキ", "お寿司", "パスタ全般", "韓国料理", "和菓子", "ラーメン", "果物"],
  性格: ["マイペースで穏やか", "よく笑う方です", "意外と心配性", "落ち着いているとよく言われます", "人懐っこい", "几帳面"],
  休日の過ごし方: ["朝からカフェで読書", "ジムのあと銭湯", "一日中映画を観る", "知らない街を歩く", "友人と料理会"],
  得意なこと: ["肩・首まわりのケア", "話を最後まで聞くこと", "美味しいお店探し", "ストレッチ", "コーヒーを淹れること"],
  好きなタイプ: ["笑顔が素敵な方", "自分の好きなものを語れる方", "マイペースな方", "甘えるのが苦手な方の力になりたい"],
  おすすめポイント: ["初めての方にも丁寧にご説明します", "時間を忘れるくらいゆったり過ごせます", "手の温かさには自信があります", "会話のテンポを合わせるのが得意です"],
};

export const CAST_PHOTO = "prisma/seed-assets/cast.jpg";

/** キャスト写真を 3:4 (顔が中心) に切り出して保存。全セラピストで同じファイルを共有する */
export async function loadCastPhoto() {
  if (!existsSync(CAST_PHOTO)) return null;
  const src = sharp(await readFile(CAST_PHOTO)).rotate();
  const { width = 0, height = 0 } = await src.metadata();
  const w = Math.round(Math.min(width, (height * 3) / 4) * 0.75);
  const h = Math.round((w * 4) / 3);
  const left = Math.max(0, Math.min(width - w, Math.round(width * 0.25)));
  const top = Math.max(0, Math.min(height - h, Math.round(height * 0.05)));
  const buf = await src.extract({ left, top, width: w, height: h }).toBuffer();
  return saveImageBuffer(buf, "therapists", IMAGE_PRESETS.therapist);
}

async function main() {
  console.log("Resetting data...");
  await rm(UPLOAD_ROOT, { recursive: true, force: true });
  // 依存関係の順に削除
  for (const m of [
    "auditLog", "mailLog", "rankingEntry", "ranking", "availability", "schedule", "reservation", "review", "diary",
    "eventTherapist", "event", "profileAnswer", "profileQuestion", "therapistTag", "tag", "therapistImage", "adminUser",
    "therapist", "area", "course", "option", "priceRule", "campaign", "news", "feature", "faq", "banner", "page",
    "siteSetting", "inquiry",
  ] as const) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[m].deleteMany();
  }

  const now = new Date();
  const today = todayBusinessDate(now);

  // タグ・質問・エリア
  const tagMap = new Map<string, string>();
  for (const [i, [name, slug, group]] of TAGS.entries()) {
    const t = await prisma.tag.create({ data: { name, slug, group, sortOrder: i * 10 } });
    tagMap.set(slug, t.id);
  }
  const questions = [];
  for (const [i, q] of QUESTIONS.entries()) questions.push(await prisma.profileQuestion.create({ data: { question: q, sortOrder: i * 10 } }));
  const areas = [];
  for (const [i, [name, slug, fee]] of AREAS.entries()) areas.push(await prisma.area.create({ data: { name, slug, transportFee: fee, sortOrder: i * 10 } }));

  // 料金マスター
  const courses = await Promise.all(
    [
      ["スタンダード 90分", 90, 16000, "はじめての方に人気。会話とボディケアをバランスよく。", false],
      ["ゆったり 120分", 120, 21000, "一番人気。時間を気にせずリラックスできる長さです。", false],
      ["ロング 150分", 150, 26000, "お食事やお散歩を組み合わせたい方に。", false],
      ["デート 180分", 180, 30000, "カフェやお散歩からスタートするデートプラン。", false],
      ["お泊まり 10時間", 600, 60000, "対応セラピスト限定。深夜料金・延長料金はかかりません。", true],
    ].map(([name, minutes, price, description, isOvernight], i) =>
      prisma.course.create({ data: { name: name as string, minutes: minutes as number, price: price as number, description: description as string, isOvernight: isOvernight as boolean, sortOrder: i * 10 } }),
    ),
  );
  await prisma.option.createMany({
    data: [
      { name: "アロマオイル", price: 2000, description: "香りを選べるオイルでのボディケア", sortOrder: 10 },
      { name: "ホットストーン", price: 3000, description: "温かい石で深部までほぐします", sortOrder: 20 },
      { name: "待ち合わせお散歩 30分", price: 3000, description: "合流後に少しお散歩やカフェへ", sortOrder: 30 },
      { name: "スーツ指定", price: 1000, description: "スーツ姿でお伺いします", sortOrder: 40 },
    ],
  });
  await prisma.priceRule.createMany({
    data: [
      { key: "nomination_first", label: "初回指名料", amount: 1000, sortOrder: 10 },
      { key: "nomination_repeat", label: "本指名料", amount: 2000, sortOrder: 20 },
      { key: "extension_fee", label: "延長料金（30分）", amount: 5000, sortOrder: 30 },
      { key: "extension_unit_minutes", label: "延長単位（分）", amount: 30, sortOrder: 40 },
      { key: "late_night_fee", label: "深夜料金", amount: 2000, note: "24:00〜翌5:00 の開始", sortOrder: 50 },
      { key: "late_night_start_hour", label: "深夜料金 開始時刻（時）", amount: 24, sortOrder: 60 },
      { key: "late_night_end_hour", label: "深夜料金 終了時刻（24+時）", amount: 29, sortOrder: 70 },
    ],
  });
  await prisma.campaign.createMany({
    data: [
      { name: "はじめての方 ¥3,000 OFF", description: "初回ご利用の方限定。全コース対象。", discountType: "AMOUNT", value: 3000, target: "FIRST", sortOrder: 10 },
      { name: "ロングコース 10%OFF", description: "150分以上のコースで基本料金・延長料金から10%割引。", discountType: "PERCENT", value: 10, target: "ALL", minCourseMinutes: 150, sortOrder: 20 },
      { name: "おかえりなさい ¥2,000 OFF", description: "リピートの方限定。", discountType: "AMOUNT", value: 2000, target: "REPEAT", sortOrder: 30 },
    ],
  });

  // キャスト写真 (prisma/seed-assets/cast.jpg があれば全員のメイン写真に使用。無ければシルエット画像のみ)
  console.log("Generating therapist images...");
  const castPhoto = await loadCastPhoto();
  const therapists = [];
  for (const [i, t] of THERAPISTS.entries()) {
    const joinedAt = t.newcomer ? new Date(now.getTime() - (5 + i * 2) * 86400000) : new Date(now.getTime() - (120 + i * 40) * 86400000);
    const th = await prisma.therapist.create({
      data: {
        slug: t.slug,
        name: t.name,
        nameKana: t.kana,
        age: t.age,
        height: t.height,
        catchCopy: t.catch,
        shopComment: `${t.name}は、${t.catch.replace(/[、。]$/, "")}という言葉がぴったりのセラピストです。\n\n初対面でも自然と会話が生まれる柔らかな雰囲気が魅力。ご利用後のアンケートでは「時間があっという間だった」「また会いたい」というお声を多くいただいています。はじめての方にも自信をもっておすすめします。`,
        selfMessage: `はじめまして、${t.name}です。\n緊張している方も、話すのが苦手な方も大丈夫。あなたのペースに合わせて、ゆっくり過ごせる時間をつくります。\n会えるのを楽しみにしています。`,
        isNewcomer: !!t.newcomer,
        joinedAt,
        canOvernight: !!t.overnight,
        nominationFee: t.fee ?? null,
        recommendOrder: i * 10,
        popularityScore: Math.round(rand() * 100),
        repeatScore: Math.round(rand() * 100),
        currentAreaId: pick(areas).id,
        snsX: i % 3 === 0 ? `https://x.com/example_${t.slug}` : null,
        snsInstagram: i % 4 === 0 ? `https://instagram.com/example_${t.slug}` : null,
        tags: { create: t.tags.filter((s) => tagMap.has(s)).map((s) => ({ tagId: tagMap.get(s)! })) },
        answers: {
          create: questions.map((q) => ({ questionId: q.id, answer: pick(ANSWERS[q.question]) })),
        },
      },
    });
    if (castPhoto) await prisma.therapistImage.create({ data: { therapistId: th.id, ...castPhoto, alt: `${t.name}の写真`, sortOrder: 0 } });
    const offset = castPhoto ? 1 : 0;
    const count = castPhoto ? 2 : 3 + (i % 2);
    for (let v = 0; v < count; v++) {
      const img = await svgToImage(portraitSvg(i + 1, v), "therapists", "therapist");
      await prisma.therapistImage.create({ data: { therapistId: th.id, ...img, alt: `${t.name}のイメージ写真${v + 1}`, sortOrder: v + offset } });
    }
    therapists.push(th);
  }

  // 出勤・予約枠 (本日〜6日後)
  console.log("Generating schedules...");
  const jstHour = (now.getUTCHours() + 9) % 24;
  const nowBH = jstHour < 6 ? jstHour + 24 : jstHour; // 営業日基準の時 (6〜29)
  const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
  const SHIFTS: [number, number][] = [
    [12, 20],
    [14, 22],
    [17, 25],
    [19, 27],
    [20, 29],
    [12, 18],
  ];
  for (const [i, th] of therapists.entries()) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(today, d);
      let start: number;
      let end: number;
      if (d === 0 && i < 6) {
        // 現在時刻をカバーする出勤 → 「今すぐ会える」
        start = Math.max(6, nowBH - 2);
        end = Math.min(30, Math.max(start + 8, nowBH + 3));
      } else if (d === 0 && i < 9) {
        // これから出勤
        start = Math.min(28, nowBH + 3);
        end = Math.min(30, start + 6);
        if (end - start < 2) continue;
      } else if (d === 0 && i < 11) {
        // 本日出勤済み (受付終了)
        end = Math.max(8, nowBH - 1);
        start = Math.max(6, end - 6);
        if (end <= start) continue;
      } else if (d === 0) {
        continue;
      } else {
        if (rand() < 0.35) continue; // 休み
        [start, end] = pick(SHIFTS);
      }
      const startAt = businessDateTime(date, fmt(start));
      const endAt = businessDateTime(date, fmt(end));
      const status = d > 4 && rand() < 0.15 ? "TBD" : "WORKING";
      const sched = await prisma.schedule.create({
        data: { therapistId: th.id, date, startAt, endAt, status, note: rand() < 0.15 ? "最終受付は終了1時間前まで" : "" },
      });
      if (status !== "WORKING") continue;
      const slots = [];
      for (let t = startAt.getTime(); t + 3600000 <= endAt.getTime(); t += 3600000) {
        const r = rand();
        let s = "AVAILABLE";
        if (i === 5 && d === 0) s = "BOOKED"; // 本日出勤だが満枠のケース
        else if (r < 0.28) s = "BOOKED";
        else if (r < 0.36) s = "INQUIRY";
        slots.push({ scheduleId: sched.id, therapistId: th.id, startAt: new Date(t), endAt: new Date(t + 3600000), status: s });
      }
      // 「今すぐ会える」セラピストの直近枠は空けておく
      if (d === 0 && i < 5) {
        for (const s of slots) if (s.endAt.getTime() > now.getTime() && s.startAt.getTime() < now.getTime() + 3 * 3600000) s.status = "AVAILABLE";
      }
      await prisma.availability.createMany({ data: slots });
    }
  }

  // 予約
  console.log("Generating reservations...");
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "CONFIRMED", "REVIEWING", "PENDING", "PENDING", "CANCELLED"];
  const names = ["ゆき", "M.K", "さくら", "あや", "なな", "りさ", "ちひろ", "みお", "かな", "えり", "まい", "はるか"];
  for (let n = 0; n < 60; n++) {
    const th = therapists[Math.floor(Math.pow(rand(), 1.6) * therapists.length)];
    const status = n < 6 ? pick(["PENDING", "REVIEWING", "CONFIRMED"]) : pick(statuses);
    const offset = status === "COMPLETED" ? -Math.floor(1 + rand() * 50) : Math.floor(rand() * 5);
    const date = addDays(today, offset);
    const course = pick(courses.filter((c) => !c.isOvernight));
    const area = pick(areas);
    const time = pick(["13:00", "15:00", "18:00", "20:00", "22:00"]);
    const total = course.price + 1000 + area.transportFee;
    await prisma.reservation.create({
      data: {
        reservationNo: `R${date.replaceAll("-", "").slice(2)}-${String(1000 + n)}`,
        accessToken: Math.random().toString(36).slice(2),
        status,
        desiredDate: date,
        desiredTime: time,
        startAt: businessDateTime(date, time),
        therapistId: th.id,
        isRepeat: rand() < 0.45,
        customerName: pick(names),
        phone: "090-0000-0000",
        email: "sample@example.com",
        areaId: area.id,
        nearestStation: `${area.name}駅`,
        meetingMethod: "駅・指定場所で待ち合わせ",
        place: "ホテル（予約済み）",
        courseId: course.id,
        paymentMethod: "現金",
        estimatedTotal: total,
        priceBreakdown: JSON.stringify({ total }),
        createdAt: new Date(businessDateTime(date, time).getTime() - 2 * 86400000),
      },
    });
  }

  // 口コミ
  console.log("Generating reviews, diaries...");
  const reviewTitles = ["緊張がすぐにほどけました", "また絶対にお願いしたいです", "聞き上手で癒されました", "想像以上に紳士的でした", "はじめてでも安心できました", "時間があっという間でした", "マッサージが本格的", "笑顔に元気をもらいました"];
  const reviewBodies = [
    "初めての利用でとても緊張していましたが、待ち合わせの時点から丁寧に声をかけてくれて、すぐにリラックスできました。話のペースを合わせてくれるので、沈黙も心地よかったです。",
    "仕事で疲れていたのですが、肩と首のケアが本当に上手で驚きました。会話も楽しく、帰り道は気持ちが軽くなっていました。次はロングコースでお願いしたいです。",
    "写真の雰囲気そのままで、落ち着いた方でした。こちらの話をたくさん聞いてくれて、自分でも気づいていなかった疲れに気づけた気がします。",
    "予約から当日までの連絡がスムーズで安心できました。気配りが細やかで、最後まで紳士的。お店の対応も含めて満足度が高いです。",
  ];
  for (let n = 0; n < 40; n++) {
    const th = therapists[Math.floor(Math.pow(rand(), 1.3) * therapists.length)];
    const created = new Date(now.getTime() - n * 1.7 * 86400000);
    await prisma.review.create({
      data: {
        therapistId: th.id,
        nickname: pick(names),
        visitDate: toJstDateString(new Date(created.getTime() - 86400000)),
        rating: rand() < 0.75 ? 5 : 4,
        title: pick(reviewTitles),
        body: pick(reviewBodies),
        tags: pickN(["癒された", "会話が楽しい", "初めてでも安心", "マッサージ上手", "時間通り", "また会いたい"], 2).join(","),
        status: n < 3 ? "PENDING" : n === 3 ? "HIDDEN" : "PUBLISHED",
        shopReply: n % 5 === 4 ? "素敵な口コミをありがとうございます。またのご利用をスタッフ一同お待ちしております。" : "",
        createdAt: created,
      },
    });
  }

  // 日記
  const diaryTitles = ["今日のカフェ", "雨の日の過ごし方", "出勤しました", "最近ハマっていること", "ありがとうございました", "月がきれいな夜", "おすすめの映画", "朝活はじめました"];
  for (let n = 0; n < 28; n++) {
    const th = therapists[n % therapists.length];
    const hasImage = n % 3 !== 2;
    const img = hasImage ? await svgToImage(sceneSvg(n + 3, 1200, 900, pick(["night", "dawn", "cafe"] as const)), "diary", "diary") : null;
    const publishedAt = n === 0 ? new Date(now.getTime() + 2 * 86400000) : new Date(now.getTime() - n * 9 * 3600000);
    await prisma.diary.create({
      data: {
        slug: `${th.slug}-${n + 1}`,
        therapistId: th.id,
        title: pick(diaryTitles),
        body: `こんにちは、${th.name}です。\n\n今日は少し早起きして、近所のカフェで本を読んでいました。窓際の席から見る街の景色って、なんだか落ち着きますよね。\n\n最近は寒暖差が大きいので、みなさんも体調に気をつけてくださいね。\n会える日を楽しみにしています。`,
        imagePath: img?.path,
        thumbPath: img?.thumbPath,
        status: n === 1 ? "DRAFT" : "PUBLISHED",
        publishedAt,
      },
    });
  }

  // ランキング (今月・先月 / 今週) — 先月との比較で UP / DOWN / NEW を確認できる
  console.log("Generating rankings...");
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonth = toJstDateString(new Date(new Date(`${monthStart}T12:00:00+09:00`).getTime() - 20 * 86400000)).slice(0, 7) + "-01";
  const weekStart = addDays(today, -((new Date(`${today}T12:00:00+09:00`).getUTCDay() + 6) % 7));
  const types = ["POPULAR", "REPEAT", "NEWCOMER", "SUPPORT"] as const;
  for (const type of types) {
    const pool = type === "NEWCOMER" ? therapists.filter((_, i) => THERAPISTS[i].newcomer) : therapists;
    const prevOrder = pickN(pool, Math.min(pool.length, 8));
    const prev = await prisma.ranking.create({
      data: { type, period: "MONTHLY", periodStart: prevMonth, entries: { create: prevOrder.map((t, i) => ({ therapistId: t.id, rank: i + 1, score: 100 - i * 7 })) } },
    });
    const curOrder = pickN(pool, Math.min(pool.length, type === "NEWCOMER" ? 4 : 10));
    const prevEntries = await prisma.rankingEntry.findMany({ where: { rankingId: prev.id } });
    await prisma.ranking.create({
      data: {
        type,
        period: "MONTHLY",
        periodStart: monthStart,
        entries: {
          create: curOrder.map((t, i) => ({
            therapistId: t.id,
            rank: i + 1,
            score: 120 - i * 9,
            previousRank: prevEntries.find((e) => e.therapistId === t.id)?.rank ?? null,
          })),
        },
      },
    });
    await prisma.ranking.create({
      data: {
        type,
        period: "WEEKLY",
        periodStart: weekStart,
        entries: { create: pickN(pool, Math.min(pool.length, 5)).map((t, i) => ({ therapistId: t.id, rank: i + 1, score: 50 - i * 5 })) },
      },
    });
  }

  // コンテンツ
  console.log("Generating content...");
  const bannerImgs = await Promise.all([1, 2, 3, 4, 5].map((s) => svgToImage(sceneSvg(s, 1600, 800, s % 2 ? "night" : "dawn"), "banners", "banner")));
  await prisma.banner.createMany({
    data: [
      { title: "はじめての方 ¥3,000 OFF", subtitle: "初回限定キャンペーン実施中", imagePath: bannerImgs[0].path, linkUrl: "/price", position: "HOME_MAIN", sortOrder: 10 },
      { title: "新人セラピスト デビュー", subtitle: "フレッシュな4名が仲間入りしました", imagePath: bannerImgs[1].path, linkUrl: "/newcomers", position: "HOME_MAIN", sortOrder: 20 },
      { title: "秋の夜長 ロングコース 10%OFF", subtitle: "150分以上のコースがお得に", imagePath: bannerImgs[2].path, linkUrl: "/events/autumn-long", position: "HOME_MAIN", sortOrder: 30 },
      { title: "料金シミュレーター", subtitle: "お支払い総額を事前にチェック", imagePath: bannerImgs[3].path, linkUrl: "/price/simulator", position: "HOME_SUB", sortOrder: 10 },
      { title: "初めての方へ", subtitle: "ご利用の流れと安心ポイント", imagePath: bannerImgs[4].path, linkUrl: "/guide", position: "HOME_SUB", sortOrder: 20 },
    ],
  });

  const eventImgs = await Promise.all([11, 12, 13].map((s) => svgToImage(sceneSvg(s, 1200, 675, "night"), "events", "wide")));
  const ev1 = await prisma.event.create({
    data: {
      slug: "autumn-long",
      title: "秋の夜長 ロングコース 10%OFF",
      summary: "150分以上のコースをご予約の方は、基本料金・延長料金から10%割引。",
      body: "## 概要\n150分以上のコースをご利用の方を対象に、基本料金と延長料金から10%を割引いたします。\n\n## 対象\n- 150分以上のコース\n- 初回・リピート問わずご利用いただけます\n\n## ご予約方法\n予約フォームのキャンペーン欄で「ロングコース 10%OFF」を選択してください。",
      imagePath: eventImgs[0].path,
      startsAt: new Date(now.getTime() - 5 * 86400000),
      endsAt: new Date(now.getTime() + 30 * 86400000),
    },
  });
  await prisma.eventTherapist.createMany({ data: therapists.slice(0, 6).map((t) => ({ eventId: ev1.id, therapistId: t.id })) });
  const ev2 = await prisma.event.create({
    data: {
      slug: "newcomer-debut",
      title: "新人デビューウィーク",
      summary: "新人セラピストを初回指名料無料でご案内します。",
      body: "新しく仲間入りしたセラピストたちのデビューを記念して、期間中は新人セラピストの初回指名料が無料になります。\n\n※ 料金シミュレーターには反映されません。ご予約時の備考欄に「デビューウィーク」とご記入ください。",
      imagePath: eventImgs[1].path,
      startsAt: new Date(now.getTime() - 2 * 86400000),
      endsAt: new Date(now.getTime() + 12 * 86400000),
    },
  });
  await prisma.eventTherapist.createMany({ data: therapists.filter((_, i) => THERAPISTS[i].newcomer).map((t) => ({ eventId: ev2.id, therapistId: t.id })) });
  await prisma.event.create({
    data: {
      slug: "summer-night",
      title: "夏の夜カフェデート企画（終了）",
      summary: "カフェデートオプションを特別価格でご案内しました。",
      body: "たくさんのご利用ありがとうございました。",
      imagePath: eventImgs[2].path,
      startsAt: new Date(now.getTime() - 80 * 86400000),
      endsAt: new Date(now.getTime() - 40 * 86400000),
    },
  });

  await prisma.news.createMany({
    data: [
      { slug: "system-maintenance", title: "【重要】予約フォームのメンテナンスについて", body: "サービス向上のため、下記日程で予約フォームのメンテナンスを予定しています。メンテナンス中は公式メッセージまたはお電話にてご予約ください。", category: "IMPORTANT", isImportant: true, publishedAt: new Date(now.getTime() - 3600000) },
      { slug: "newcomer-join", title: "新人セラピスト4名が入店しました", body: "千景・奏・晴・玲央の4名が新たに仲間入りしました。プロフィールと出勤スケジュールをぜひご覧ください。", category: "TOPICS", publishedAt: new Date(now.getTime() - 2 * 86400000) },
      { slug: "autumn-campaign", title: "秋の夜長キャンペーンを開始しました", body: "150分以上のコースが10%OFFになるキャンペーンを開始しました。詳しくはイベントページをご確認ください。", category: "NEWS", publishedAt: new Date(now.getTime() - 5 * 86400000) },
      { slug: "simulator-release", title: "料金シミュレーターをリニューアルしました", body: "セラピスト・コース・エリアを選ぶだけで、お支払い総額を明細付きで確認できるようになりました。そのまま予約フォームへ進むことも可能です。", category: "NEWS", publishedAt: new Date(now.getTime() - 9 * 86400000) },
      { slug: "card-payment", title: "クレジットカード決済に対応しました", body: "ご予約時に「クレジットカード」をお選びいただけます。", category: "NEWS", publishedAt: new Date(now.getTime() - 20 * 86400000) },
      { slug: "ranking-update", title: "月間ランキングを更新しました", body: "今月のランキングを公開しました。", category: "TOPICS", publishedAt: new Date(now.getTime() - 28 * 86400000) },
    ],
  });

  const featureImgs = await Promise.all([21, 22, 23, 24].map((s, i) => svgToImage(sceneSvg(s, 1200, 675, i % 2 ? "cafe" : "night"), "features", "wide")));
  await prisma.feature.createMany({
    data: [
      { slug: "interview-ao", title: "セラピストインタビュー：蒼", summary: "「話を聞く」ことを大切にする理由。", body: "## 聞き上手の秘密\n相手の言葉を最後まで待つこと。それが一番大切だと思っています。\n\n## はじめての方へ\n緊張して当然です。僕も最初は緊張していました。", kind: "ARTICLE", imagePath: featureImgs[0].path, therapistSlugs: "ao", publishedAt: new Date(now.getTime() - 86400000) },
      { slug: "movie-minato", title: "【動画】湊の1日", summary: "出勤前のルーティンを少しだけ。", body: "動画は準備中です。公開までお待ちください。", kind: "VIDEO", imagePath: featureImgs[1].path, therapistSlugs: "minato", publishedAt: new Date(now.getTime() - 4 * 86400000) },
      { slug: "first-guide", title: "はじめての方が選ぶ、セラピストの探し方", summary: "タグ・口コミ・出勤から、自分に合う人を見つけるコツ。", body: "## 1. 雰囲気タグで絞り込む\n「癒し系」「会話好き」など、気分に合うタグを選んでみましょう。\n\n## 2. 口コミを読む\n実際に利用した方の声は、プロフィールでは分からない魅力を教えてくれます。\n\n## 3. 空き時間で選ぶ\n「今すぐ会える」ページなら、すぐに会える人だけを表示します。", kind: "ARTICLE", imagePath: featureImgs[2].path, therapistSlugs: "", publishedAt: new Date(now.getTime() - 7 * 86400000) },
      { slug: "movie-newcomers", title: "【動画】新人セラピスト紹介", summary: "新人4名の自己紹介ムービー。", body: "動画は準備中です。", kind: "VIDEO", imagePath: featureImgs[3].path, therapistSlugs: "chikage,kanade,hal,reo", publishedAt: new Date(now.getTime() - 10 * 86400000) },
    ],
  });

  await prisma.faq.createMany({
    data: [
      ["はじめて", "初めてでも利用できますか？", "もちろんです。ご利用の多くが初めての方です。ご不安な点は予約前に公式メッセージやお電話でお気軽にご相談ください。"],
      ["はじめて", "どのセラピストを選べばいいか分かりません。", "特徴タグで絞り込むか、ご希望の雰囲気をお伝えいただければスタッフがご提案します。「初心者向き」タグもおすすめです。"],
      ["予約", "予約はいつまでに必要ですか？", "当日のご予約も可能です。「今すぐ会える」ページで最短の受付時刻をご確認いただけます。人気のセラピストはお早めのご予約をおすすめします。"],
      ["予約", "予約フォーム送信後、すぐに確定しますか？", "送信時点では「仮受付」です。スタッフが空き状況を確認し、ご連絡を差し上げた時点で確定となります。"],
      ["予約", "キャンセルはできますか？", "可能です。キャンセルポリシーをご確認のうえ、なるべくお早めにご連絡ください。"],
      ["料金", "料金以外にかかる費用はありますか？", "コース料金のほか、指名料・交通費・深夜料金・オプション料金がかかる場合があります。料金シミュレーターで総額を事前にご確認いただけます。"],
      ["料金", "支払い方法は？", "現金・クレジットカード・電子決済に対応しています。"],
      ["当日", "待ち合わせはどこでできますか？", "駅や指定のカフェなど、ご希望の場所で待ち合わせが可能です。詳しくは「待ち合わせ・利用場所」ページをご覧ください。"],
      ["当日", "利用場所はどこになりますか？", "ご自宅またはホテルなど、プライバシーが守られる場所でのご利用をお願いしています。"],
      ["プライバシー", "個人情報は守られますか？", "ご予約時の情報は予約対応の目的にのみ使用し、適切に管理しています。詳しくはプライバシーポリシーをご確認ください。"],
    ].map(([category, question, answer], i) => ({ category, question, answer, sortOrder: i * 10 })),
  });

  const PAGES: [string, string, string][] = [
    ["guide", "初めての方へ", "## ご利用の流れ\n1. **セラピストを探す** — 特徴タグや口コミから、気になるセラピストを見つけます。\n2. **空き時間を確認** — プロフィールの出勤表で、時間帯ごとの空き状況をチェック。\n3. **料金を確認** — 料金シミュレーターで総額を確認できます。\n4. **予約する** — 予約フォーム・公式メッセージ・お電話からご予約ください。\n5. **当日** — 待ち合わせ場所またはご利用場所でセラピストと合流します。\n\n## 安心してご利用いただくために\n- すべてのセラピストは面接・研修を経て在籍しています\n- ご予約内容はスタッフが確認し、確定のご連絡を差し上げます\n- 不安なことは予約前にいつでもご相談ください"],
    ["about", "サービスについて", "## 私たちについて\n日々頑張る女性が、安心して心と体を休められる時間を提供するサービスです。\n\n## 大切にしていること\n- **安心** — スタッフによる予約確認と、丁寧な事前説明\n- **選びやすさ** — 出勤・空き状況・料金をすべて公開\n- **プライバシー** — 個人情報の厳重な管理"],
    ["access", "待ち合わせ・利用場所", "## 待ち合わせ\n主要駅の改札付近やカフェなど、分かりやすい場所で待ち合わせが可能です。予約フォームの「合流方法」でお選びください。\n\n## 利用場所\n- ご自宅\n- ホテル（ご予約済み / これから探す）\n\nホテルをお探しの場合は、スタッフがエリアに合わせてご案内します。\n\n## 対応エリア\nエリアごとの交通費は料金ページをご確認ください。"],
    ["terms", "利用規約", "この利用規約は、運営者が専門家の確認を経て設定するためのサンプルです。管理画面の「固定ページ」から編集してください。\n\n## 第1条（適用）\n本規約は、本サービスの利用に関する一切の関係に適用されます。\n\n## 第2条（禁止事項）\n禁止事項ページをご確認ください。"],
    ["privacy", "プライバシーポリシー", "本ページはサンプルです。運営者が専門家の確認を経て内容を設定してください（管理画面 → 固定ページ）。\n\n## 取得する情報\n予約時にご入力いただいた氏名（ニックネーム）、電話番号、メールアドレス、利用エリア等。\n\n## 利用目的\n予約の確認・連絡、サービス提供のため。\n\n## 第三者提供\n法令に基づく場合を除き、本人の同意なく第三者に提供しません。"],
    ["cancel-policy", "キャンセルポリシー", "本ページはサンプルです。運営者が内容を設定してください。\n\n- 前日までのキャンセル：無料\n- 当日のキャンセル：ご相談ください\n- 無断キャンセル：以降のご予約をお断りする場合があります"],
    ["prohibited", "サービス上の禁止事項", "本ページはサンプルです。運営者が内容を設定してください。\n\n- セラピストへの迷惑行為・過度な要求\n- 撮影・録音\n- 個人的な連絡先の交換\n- 18歳未満の方のご利用\n- その他、運営が不適切と判断する行為"],
    ["legal", "法令に基づく表記", "このページは、法令・行政上必要となる表記を運営者が専門家確認後に設定するためのページです。\n\n管理画面 → 固定ページ → 「法令に基づく表記」から内容を入力し、店舗設定の「フッターに法定表記ページを表示」を有効にしてください。"],
  ];
  for (const [slug, title, body] of PAGES) await prisma.page.create({ data: { slug, title, body } });

  // 管理ユーザー
  const hash = (p: string) => bcrypt.hash(p, 10);
  await prisma.adminUser.create({
    data: { email: process.env.SEED_ADMIN_EMAIL || "admin@example.com", name: "管理者", role: "ADMIN", passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD || "admin-password-123") },
  });
  await prisma.adminUser.create({ data: { email: "staff@example.com", name: "スタッフ", role: "STAFF", passwordHash: await hash("staff-password-123") } });
  await prisma.adminUser.create({
    data: { email: "ao@example.com", name: "蒼", role: "THERAPIST", therapistId: therapists[0].id, passwordHash: await hash("therapist-password-123") },
  });

  console.log("Seed completed.");
}

if (process.argv[1]?.endsWith("seed.ts")) main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
