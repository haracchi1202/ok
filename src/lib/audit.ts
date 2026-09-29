import "server-only";
import { prisma } from "./db";
import { clientIp } from "./request";

export async function audit(actorId: string | null, action: string, entity: string, entityId = "", detail: unknown = "") {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        detail: typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 4000),
        ip: await clientIp(),
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
