import { EnrollmentStatus, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { appEnv, biometricProviderReady } from "@/lib/env";

type VerificationInput = {
  userId: string;
  captureToken?: string;
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

async function verifyByWebhook(user: UserWithBiometric, captureToken: string): Promise<VerificationResult> {
  const response = await fetch(appEnv.biometricWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${appEnv.biometricWebhookToken}`
    },
    body: JSON.stringify({
      userId: user.id,
      employeeId: user.employeeId,
      captureToken,
      threshold: appEnv.verificationThreshold
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { passed: false, reason: "Biometric provider rejected the verification request." };
  }

  const payload = await response.json() as { passed?: boolean; confidence?: number; reason?: string };
  return {
    passed: Boolean(payload.passed),
    confidence: typeof payload.confidence === "number" ? payload.confidence : undefined,
    reason: payload.reason
  };
}

export async function verifyBiometricAttendance(input: VerificationInput): Promise<VerificationResult> {
  const user = await loadUser(input.userId);
  const access = biometricAccessCheck(user);
  if (!access.ok) return { passed: false, reason: access.reason };

  if (!biometricProviderReady()) {
    return { passed: false, reason: "The biometric provider is not configured yet." };
  }

  if (appEnv.biometricProvider === "mock") {
    if (!input.captureToken) return { passed: false, reason: "A capture token is required." };
    return {
      passed: input.captureToken === "local-dev-pass",
      confidence: input.captureToken === "local-dev-pass" ? 0.99 : 0.2,
      reason: input.captureToken === "local-dev-pass" ? undefined : "The live capture did not match."
    };
  }

  if (!input.captureToken) return { passed: false, reason: "A capture token is required." };
  return verifyByWebhook(user as UserWithBiometric, input.captureToken);
}
