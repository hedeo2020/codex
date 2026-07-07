import { EnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { getSession } from "@/lib/session";

const schema = z.object({ consent: z.literal(true), documentVersion: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Explicit consent is required before enrollment." }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + appEnv.biometricRetentionDays * 86400000);
  const profile = await db.biometricProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      consentStatus: true,
      consentAt: new Date(),
      consentDocumentVersion: parsed.data.documentVersion,
      enrollmentStatus: EnrollmentStatus.PENDING,
      expiresAt
    },
    update: {
      consentStatus: true,
      consentAt: new Date(),
      consentDocumentVersion: parsed.data.documentVersion,
      enrollmentStatus: EnrollmentStatus.PENDING,
      expiresAt
    }
  });

  await audit({
    actorUserId: session.userId,
    action: "BIOMETRIC_CONSENT_GRANTED",
    entityType: "BiometricProfile",
    entityId: profile.id,
    newValues: { documentVersion: parsed.data.documentVersion, enrollmentStatus: EnrollmentStatus.PENDING }
  });

  return NextResponse.json({ status: "consent-recorded", enrollmentStatus: EnrollmentStatus.PENDING }, { status: 201 });
}
