"use client";

import { useState } from "react";
import { BiometricConsentPanel } from "@/components/BiometricConsentPanel";

export function EmployeeBiometricControls({ consentStatus, canEnroll }: { consentStatus: boolean; canEnroll: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn primary" type="button" onClick={() => setOpen(true)}>Open controls</button>
      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section className="modal-panel modal-wide biometric-controls-panel card glass" onClick={(event) => event.stopPropagation()}>
            <div className="cardhead">
              <div>
                <h2>Your controls</h2>
                <p className="muted">Grant consent, capture a face frame, enroll, or delete your biometric profile.</p>
              </div>
              <button className="btn" type="button" onClick={() => setOpen(false)}>Close</button>
            </div>
            <BiometricConsentPanel consentStatus={consentStatus} canEnroll={canEnroll} />
          </section>
        </div>
      ) : null}
    </>
  );
}
