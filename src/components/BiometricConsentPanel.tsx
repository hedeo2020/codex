"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  consentStatus: boolean;
};

export function BiometricConsentPanel({ consentStatus }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"consent" | "delete" | null>(null);

  async function grantConsent() {
    setLoading("consent");
    const response = await fetch("/api/employees/me/biometric-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, documentVersion: "PRIVACY-2026.1" })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    setMessage(response.ok ? "Consent recorded. Enrollment is now pending." : payload.error ?? "Unable to record consent.");
    router.refresh();
  }

  async function deleteProfile() {
    const reason = window.prompt("Reason for deletion request");
    if (!reason) return;
    setLoading("delete");
    const response = await fetch("/api/employees/me/biometric-profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    setMessage(response.ok ? "Biometric profile deleted. PIN is now your fallback method." : payload.error ?? "Unable to delete biometric profile.");
    router.refresh();
  }

  return (
    <div className="form">
      <button className="btn primary" onClick={grantConsent} disabled={loading === "consent" || consentStatus}>
        {loading === "consent" ? "Saving..." : consentStatus ? "Consent already granted" : "Grant biometric consent"}
      </button>
      <button className="btn" onClick={deleteProfile} disabled={loading === "delete"}>
        {loading === "delete" ? "Deleting..." : "Delete biometric profile"}
      </button>
      {message ? <p className="fine">{message}</p> : null}
    </div>
  );
}
