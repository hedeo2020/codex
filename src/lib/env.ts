type BiometricProvider = "disabled" | "mock" | "webhook" | "compreface";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function numberWithDefault(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number.`);
  return value;
}

function provider(): BiometricProvider {
  const raw = (process.env.BIOMETRIC_PROVIDER ?? "disabled").trim().toLowerCase();
  if (raw === "disabled" || raw === "mock" || raw === "webhook" || raw === "compreface") return raw;
  throw new Error("BIOMETRIC_PROVIDER must be one of disabled, mock, webhook, or compreface.");
}

export const appEnv = {
  get appUrl() {
    return process.env.APP_URL?.trim() ?? "";
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get biometricEncryptionKey() {
    return required("BIOMETRIC_ENCRYPTION_KEY");
  },
  get biometricProvider() {
    return provider();
  },
  get biometricWebhookUrl() {
    return process.env.BIOMETRIC_WEBHOOK_URL?.trim() ?? "";
  },
  get biometricWebhookToken() {
    return process.env.BIOMETRIC_WEBHOOK_TOKEN?.trim() ?? "";
  },
  get comprefaceBaseUrl() {
    return process.env.COMPREFACE_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
  },
  get comprefaceApiKey() {
    return process.env.COMPREFACE_API_KEY?.trim() ?? "";
  },
  get verificationThreshold() {
    return numberWithDefault("VERIFICATION_THRESHOLD", 0.82);
  },
  get maxVerificationAttempts() {
    return numberWithDefault("MAX_VERIFICATION_ATTEMPTS", 3);
  },
  get biometricRetentionDays() {
    return numberWithDefault("BIOMETRIC_TEMPLATE_RETENTION_DAYS", 365);
  },
  get attendanceRetentionDays() {
    return numberWithDefault("ATTENDANCE_RETENTION_DAYS", 2555);
  },
  get auditRetentionDays() {
    return numberWithDefault("AUDIT_LOG_RETENTION_DAYS", 2555);
  },
  get tempImageRetentionMinutes() {
    return numberWithDefault("TEMP_IMAGE_RETENTION_MINUTES", 0);
  }
};

export function biometricProviderReady() {
  if (appEnv.biometricProvider === "disabled") return false;
  if (appEnv.biometricProvider === "mock") return process.env.NODE_ENV !== "production";
  if (appEnv.biometricProvider === "webhook") {
    return Boolean(appEnv.biometricWebhookUrl && appEnv.biometricWebhookToken);
  }
  return Boolean(appEnv.comprefaceBaseUrl && appEnv.comprefaceApiKey);
}
