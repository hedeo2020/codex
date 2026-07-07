import { AttendanceType, VerificationMethod, VerificationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function recordAttendance(input: { userId: string; type: AttendanceType; method: VerificationMethod; timezone: string; confidence?: number; createdBy?: string; ipAddress?: string }) {
  const duplicateWindow = new Date(Date.now() - 2 * 60 * 1000);
  const duplicate = await db.attendanceRecord.findFirst({ where: { userId: input.userId, attendanceType: input.type, eventTime: { gte: duplicateWindow }, verificationStatus: VerificationStatus.SUCCESS } });
  if (duplicate) throw new Error("A matching attendance event was already recorded recently.");
  const record = await db.attendanceRecord.create({ data: { userId: input.userId, attendanceType: input.type, timezone: input.timezone, verificationMethod: input.method, verificationStatus: VerificationStatus.SUCCESS, confidenceScore: input.confidence, createdBy: input.createdBy ?? input.userId, ipAddress: input.ipAddress } });
  await audit({ actorUserId: input.userId, action: `ATTENDANCE_${input.type}`, entityType: "AttendanceRecord", entityId: record.id, newValues: { type: input.type, method: input.method } });
  return record;
}
