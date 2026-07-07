import { db } from "@/lib/db";
import { redactSensitive } from "@/lib/security";
import { Prisma } from "@prisma/client";

export async function audit(input: { actorUserId?: string; action: string; entityType: string; entityId?: string; oldValues?: unknown; newValues?: unknown; reason?: string; ipAddress?: string; deviceInfo?: string }) {
  const { oldValues, newValues, ...metadata } = input;
  return db.auditLog.create({ data: {
    ...metadata,
    ...(oldValues === undefined ? {} : { oldValues: redactSensitive(oldValues) as Prisma.InputJsonValue }),
    ...(newValues === undefined ? {} : { newValues: redactSensitive(newValues) as Prisma.InputJsonValue })
  } });
}
