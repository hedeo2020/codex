"use client";

import { BiometricConsentPanel } from "@/components/BiometricConsentPanel";

export function EmployeeBiometricControls({ consentStatus, canEnroll }: { consentStatus: boolean; canEnroll: boolean }) {
  return (
    <section className="card glass">
      <div className="cardhead">
        <div>
          <h2>Your controls</h2>
          <p className="muted">Grant consent, capture a face frame, enroll, or delete your biometric profile.</p>
        </div>
      </div>
      <BiometricConsentPanel consentStatus={consentStatus} canEnroll={canEnroll} />
    </section>
  );
}
