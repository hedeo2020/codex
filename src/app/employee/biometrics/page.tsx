import { BiometricConsentPanel } from "@/components/BiometricConsentPanel";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireEmployeeUser } from "@/lib/auth";
import { appEnv, biometricProviderReady } from "@/lib/env";
import { formatDate } from "@/lib/format";

export default async function BiometricsPage() {
  const { user } = await requireEmployeeUser();
  const profile = user.biometricProfile;

  return (
    <div className="shell">
      <Sidebar active="Face & consent" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header eyebrow="Privacy center" title="Your face, your choice" subtitle="Consent, retention, and deletion controls stay visible to the employee." />
        <div className="layout2">
          <section className="card">
            <div className="cardhead">
              <div>
                <h2>Biometric profile</h2>
                <p className="muted">Provider mode: {appEnv.biometricProvider}</p>
              </div>
              <span className={`badge ${profile?.consentStatus ? "" : "gray"}`}>{profile?.enrollmentStatus?.replaceAll("_", " ") ?? "NOT ENROLLED"}</span>
            </div>
            <div className="feed">
              <div className="feedrow"><span className="doticon">✓</span><div><strong>Explicit consent</strong><small>{profile?.consentStatus ? "Recorded" : "Not recorded"}</small></div></div>
              <div className="feedrow"><span className="doticon">◆</span><div><strong>Provider readiness</strong><small>{biometricProviderReady() ? "Connected for verification" : "Provider still needs production setup"}</small></div></div>
              <div className="feedrow"><span className="doticon">◷</span><div><strong>Expiry</strong><small>{profile?.expiresAt ? formatDate(profile.expiresAt) : "No expiry set"}</small></div></div>
            </div>
            <div className="notice" style={{ marginTop: 22 }}>
              Face data is used only to verify that you are the employee initiating attendance. It is not used for identification, surveillance, performance scoring, or employment decisions.
            </div>
          </section>
          <aside className="card">
            <h2>Your controls</h2>
            <p className="muted">Grant consent, capture a camera frame, and enroll directly into CompreFace when that provider is active.</p>
            <BiometricConsentPanel consentStatus={Boolean(profile?.consentStatus)} canEnroll={appEnv.biometricProvider === "compreface" && biometricProviderReady()} />
          </aside>
        </div>
      </main>
    </div>
  );
}
