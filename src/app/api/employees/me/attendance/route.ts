import argon2 from "argon2";
import { NextRequest, NextResponse } from "next/server";
import { VerificationMethod } from "@prisma/client";
import { z } from "zod";
import { recordAttendance } from "@/lib/attendance";
import { audit } from "@/lib/audit";
import { verifyBiometricAttendance } from "@/lib/biometric";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const input = z.object({
  type: z.enum(["CHECK_IN", "CHECK_OUT", "BREAK_START", "BREAK_END"]),
  method: z.enum(["FACE", "PIN"]),
  timezone: z.string().min(1),
  pin: z.string().min(4).max(12).optional(),
  captureToken: z.string().min(6).optional()
});

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await db.attendanceRecord.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      attendanceType: true,
      eventTime: true,
      timezone: true,
      verificationMethod: true,
      verificationStatus: true,
      confidenceScore: true,
      notes: true
    },
    orderBy: { eventTime: "desc" },
    take: 100
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = input.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance request." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { biometricProfile: true }
  });

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let confidence: number | undefined;

  if (parsed.data.method === VerificationMethod.PIN) {
    if (!parsed.data.pin || !user.pinHash || !(await argon2.verify(user.pinHash, parsed.data.pin))) {
      await audit({
        actorUserId: session.userId,
        action: "ATTENDANCE_PIN_FAILED",
        entityType: "User",
        entityId: session.userId,
        ipAddress: clientIp(req)
      });
      return NextResponse.json({ error: "The attendance PIN was incorrect." }, { status: 422 });
    }
  }

  if (parsed.data.method === VerificationMethod.FACE) {
    const verification = await verifyBiometricAttendance({
      userId: session.userId,
      captureToken: parsed.data.captureToken
    });

    if (!verification.passed) {
      await audit({
        actorUserId: session.userId,
        action: "ATTENDANCE_FACE_FAILED",
        entityType: "BiometricProfile",
        entityId: user.biometricProfile?.id,
        reason: verification.reason,
        ipAddress: clientIp(req)
      });
      return NextResponse.json(
        { error: verification.reason ?? "Face verification was unsuccessful. You may retry or use PIN." },
        { status: 422 }
      );
    }

    confidence = verification.confidence;
  }

  try {
    const record = await recordAttendance({
      userId: session.userId,
      type: parsed.data.type,
      method: parsed.data.method,
      timezone: parsed.data.timezone,
      confidence,
      ipAddress: clientIp(req)
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record attendance.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
