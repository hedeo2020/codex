import { EnrollmentStatus, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { appEnv, biometricProviderReady } from "@/lib/env";

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
  } | null;
};

function dataUrlToBase64(value: string) {
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match?.[1] ?? "";
}

async function loadUser(userId: string): Promise<UserWithBiometric | null> {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      biometricProfile: {
        select: {
          id: true,
          enrollmentStatus: true,
          consentStatus: true,
          expiresAt: true
        }
      }
    }
  });
}

function biometricAccessCheck(user: UserWithBiometric | null) {
  if (!user) return { ok: false, reason: "User not found." };
  const profile = user.biometricProfile;
  if (!profile?.consentStatus) return { ok: false, reason: "Biometric consent has not been granted." };
  if (profile.enrollmentStatus !== EnrollmentStatus.ACTIVE) return { ok: false, reason: "Biometric enrollment is not active." };
  if (profile.expiresAt && profile.expiresAt < new Date()) return { ok: false, reason: "Biometric enrollment has expired." };
  return { ok: true as const };
}

async function comprefaceRequest(path: string, payload: Record<string, unknown>) {
  return fetch(`${appEnv.comprefaceBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": appEnv.comprefaceApiKey
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
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

async function verifyByCompreFace(user: UserWithBiometric, input: VerificationInput): Promise<VerificationResult> {
  const base64 = input.imageDataUrl ? dataUrlToBase64(input.imageDataUrl) : "";
  if (!base64) return { passed: false, reason: "A live capture is required." };

  const response = await comprefaceRequest("/api/v1/recognition/recognize", {
    file: base64,
    det_prob_threshold: 0.8,
    prediction_count: 1
  });

  if (!response.ok) {
    return { passed: false, reason: "CompreFace could not process the live image." };
  }

  const payload = (await response.json()) as {
    result?: Array<{ subjects?: Array<{ subject?: string; similarity?: number }> }>;
  };

  const match = payload.result?.[0]?.subjects?.[0];
  const similarity = typeof match?.similarity === "number" ? match.similarity : 0;
  const passed = match?.subject === user.employeeId && similarity >= appEnv.verificationThreshold;

  return {
    passed,
    confidence: similarity,
    reason: passed ? undefined : "The live face did not meet the similarity threshold for this employee."
  };
}

export async function enrollBiometricExample(userId: string, imageDataUrl: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { biometricProfile: true }
  });

  if (!user) throw new Error("User not found.");
  if (!user.biometricProfile?.consentStatus) throw new Error("Biometric consent is required before enrollment.");
  if (appEnv.biometricProvider !== "compreface") {
    throw new Error("CompreFace enrollment requires BIOMETRIC_PROVIDER=compreface.");
  }
  if (!biometricProviderReady()) throw new Error("CompreFace is not configured yet.");

  const base64 = dataUrlToBase64(imageDataUrl);
  if (!base64) throw new Error("A valid image capture is required.");

  const response = await comprefaceRequest(
    `/api/v1/recognition/faces?subject=${encodeURIComponent(user.employeeId)}&det_prob_threshold=0.8`,
    { file: base64 }
  );

  if (!response.ok) {
    throw new Error("CompreFace rejected the enrollment image.");
  }

  const payload = (await response.json()) as { image_id?: string; subject?: string };
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
      expiresAt
    },
    update: {
      enrollmentStatus: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
      expiresAt,
      deletedAt: null,
      deletionReason: null
    }
  });

  return { imageId: payload.image_id, subject: payload.subject ?? user.employeeId, profile };
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

  if (appEnv.biometricProvider === "compreface") {
    return verifyByCompreFace(user as UserWithBiometric, input);
  }

  if (!input.captureToken && !input.imageDataUrl) return { passed: false, reason: "A live capture is required." };
  return verifyByWebhook(user as UserWithBiometric, input);
}
