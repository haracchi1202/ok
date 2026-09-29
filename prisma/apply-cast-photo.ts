/* 既存データを消さずに、キャスト写真を全セラピストのメイン写真として追加する */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { loadCastPhoto } from "./seed";

const prisma = new PrismaClient();

async function main() {
  const photo = await loadCastPhoto();
  if (!photo) throw new Error("prisma/seed-assets/cast.jpg がありません");
  const therapists = await prisma.therapist.findMany({ include: { images: true } });
  for (const t of therapists) {
    if (t.images.some((i) => i.alt === `${t.name}の写真` && i.sortOrder === 0)) continue;
    await prisma.therapistImage.updateMany({ where: { therapistId: t.id }, data: { sortOrder: { increment: 1 } } });
    await prisma.therapistImage.create({ data: { therapistId: t.id, ...photo, alt: `${t.name}の写真`, sortOrder: 0 } });
  }
  console.log(`applied to ${therapists.length} therapists`);
}
main().finally(() => prisma.$disconnect());
