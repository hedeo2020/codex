import { EnrollmentStatus, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { appEnv, biometricProviderReady } from "@/lib/env";
import { extractFaceEmbedding } from "@/lib/local-face";
import { cosineSimilarity, decryptBiometricTemplate, encryptBiometricTemplate } from "@/lib/security";

type VerificationInput = {
  userId: string;
  captureToken?: string;
  imageDataUrl?: string;
};

type VerificationResult = {
  passed: boolean;
  confidence?: number;
  reason?: string;
};

type UserWithBiometric = User & {
  biometricProfile: {
    id: string;
    enrollmentStatus: EnrollmentStatus;
    consentStatus: boolean;
    expiresAt: Date | null;
    providerSubjectId: string | null;
    encryptedEmbedding: Uint8Array | null;
    encryptionIv: Uint8Array | null;
    authTag: Uint8Array | null;
  } | null;
};

async function loadUser(userId: string): Promise<UserWithBiometric | null> {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      biometricProfile: {
        select: {
          id: true,
          enrollmentStatus: true,
          consentStatus: true,
          expiresAt: true,
          providerSubjectId: true,
          encryptedEmbedding: true,
          encryptionIv: true,
          authTag: true
        }
      }
    }
  }) as Promise<UserWithBiometric | null>;
}

function biometricAccessCheck(user: UserWithBiometric | null) {
  if (!user) return { ok: false, reason: "User not found." };
  const profile = user.biometricProfile;
  if (!profile?.consentStatus) return { ok: false, reason: "Biometric consent has not been granted." };
  if (profile.enrollmentStatus !== EnrollmentStatus.ACTIVE) return { ok: false, reason: "Biometric enrollment is not active." };
  if (profile.expiresAt && profile.expiresAt < new Date()) return { ok: false, reason: "Biometric enrollment has expired." };
  return { ok: true as const };
}

async function verifyByWebhook(user: UserWithBiometric, input: VerificationInput): Promise<VerificationResult> {
  const response = await fetch(appEnv.biometricWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appEnv.biometricWebhookToken}`
    },
    body: JSON.stringify({
      userId: user.id,
      employeeId: user.employeeId,
      captureToken: input.captureToken,
      imageDataUrl: input.imageDataUrl,
      threshold: appEnv.verificationThreshold
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { passed: false, reason: "Biometric provider rejected the verification request." };
  }

  const payload = (await response.json()) as { passed?: boolean; confidence?: number; reason?: string };
  return {
    passed: Boolean(payload.passed),
    confidence: typeof payload.confidence === "number" ? payload.confidence : undefined,
    reason: payload.reason
  };
}

async function verifyByLocalFace(user: UserWithBiometric, input: VerificationInput): Promise<VerificationResult> {
  if (!input.imageDataUrl) return { passed: false, reason: "A live capture is required." };
  const profile = user.biometricProfile;
  if (!profile?.encryptedEmbedding || !profile.encryptionIv || !profile.authTag) {
    return { passed: false, reason: "This employee has not completed local face enrollment yet." };
  }

  const liveEmbedding = await extractFaceEmbedding(input.imageDataUrl);
  const storedEmbedding = decryptBiometricTemplate({
    ciphertext: Buffer.from(profile.encryptedEmbedding),
    iv: Buffer.from(profile.encryptionIv),
    authTag: Buffer.from(profile.authTag)
  });
  const similarity = cosineSimilarity(storedEmbedding, liveEmbedding);

  return {
    passed: similarity >= appEnv.verificationThreshold,
    confidence: similarity,
    reason: similarity >= appEnv.verificationThreshold ? undefined : "The live face did not meet the local similarity threshold."
  };
}

export async function enrollBiometricExample(userId: string, imageDataUrl: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { biometricProfile: true }
  });

  if (!user) throw new Error("User not found.");
  if (!user.biometricProfile?.consentStatus) throw new Error("Biometric consent is required before enrollment.");
  if (!biometricProviderReady()) throw new Error("The biometric provider is not configured yet.");

  if (appEnv.biometricProvider !== "local-face") {
    throw new Error("Direct local enrollment requires BIOMETRIC_PROVIDER=local-face.");
  }

  const embedding = await extractFaceEmbedding(imageDataUrl);
  const encrypted = encryptBiometricTemplate(embedding);
  const encryptedEmbedding = Uint8Array.from(encrypted.ciphertext);
  const encryptionIv = Uint8Array.from(encrypted.iv);
  const authTag = Uint8Array.from(encrypted.authTag);
  const expiresAt = new Date(Date.now() + appEnv.biometricRetentionDays * 86400000);

  const profile = await db.biometricProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      consentStatus: true,
      consentAt: new Date(),
      consentDocumentVersion: "PRIVACY-2026.1",
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
      expiresAt,
      encryptedEmbedding,
      encryptionIv,
      authTag
    },
    update: {
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
      expiresAt,
      deletedAt: null,
      deletionReason: null,
      encryptedEmbedding,
      encryptionIv,
      authTag
    }
  });

  return { imageId: "local-embedding", subject: user.employeeId, profile };
}

export async function verifyBiometricAttendance(input: VerificationInput): Promise<VerificationResult> {
  const user = await loadUser(input.userId);
  const access = biometricAccessCheck(user);
  if (!access.ok) return { passed: false, reason: access.reason };

  if (!biometricProviderReady()) {
    return { passed: false, reason: "The biometric provider is not configured yet." };
  }

  if (appEnv.biometricProvider === "mock") {
    if (!input.captureToken && !input.imageDataUrl) return { passed: false, reason: "A live capture is required." };
    return {
      passed: input.captureToken === "local-dev-pass" || Boolean(input.imageDataUrl),
      confidence: input.captureToken === "local-dev-pass" || input.imageDataUrl ? 0.99 : 0.2,
      reason: input.captureToken === "local-dev-pass" || input.imageDataUrl ? undefined : "The live capture did not match."
    };
  }

  if (appEnv.biometricProvider === "local-face") {
    return verifyByLocalFace(user as UserWithBiometric, input);
  }

  if (!input.captureToken && !input.imageDataUrl) return { passed: false, reason: "A live capture is required." };
  return verifyByWebhook(user as UserWithBiometric, input);
}
