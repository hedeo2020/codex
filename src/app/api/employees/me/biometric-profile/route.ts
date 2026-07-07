import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { enrollBiometricExample } from "@/lib/biometric";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

const deleteSchema = z.object({ reason: z.string().min(10) });
const enrollSchema = z.object({ imageDataUrl: z.string().min(20) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = enrollSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "A captured enrollment image is required." }, { status: 400 });

  try {
    const result = await enrollBiometricExample(session.userId, parsed.data.imageDataUrl);
    await audit({
      actorUserId: session.userId,
      action: "BIOMETRIC_ENROLLED",
      entityType: "BiometricProfile",
      entityId: result.profile.id,
      newValues: { subject: result.subject, imageId: result.imageId }
    });
    return NextResponse.json({ status: "enrolled", enrollmentStatus: result.profile.enrollmentStatus }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to enroll biometric profile." }, { status: 422 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "A deletion reason is required." }, { status: 400 });

  const profile = await db.biometricProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "No biometric profile exists." }, { status: 404 });

  await db.biometricProfile.update({
    where: { id: profile.id },
    data: {
      encryptedEmbedding: null,
      encryptionIv: null,
      authTag: null,
      enrollmentStatus: "DELETED",
      deletedAt: new Date(),
      deletionReason: parsed.data.reason,
      consentStatus: false
    }
  });

  await db.user.update({ where: { id: session.userId }, data: { preferredAttendanceMethod: "PIN" } });
  await audit({
    actorUserId: session.userId,
    action: "BIOMETRIC_TEMPLATE_DELETED",
    entityType: "BiometricProfile",
    entityId: profile.id,
    reason: parsed.data.reason
  });

  return NextResponse.json({ status: "deleted", fallbackMethod: "PIN" });
}
