import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "EMPLOYEE" ? "/employee" : "/admin");

  return (
    <main className="login">
      <section className="login-art">
        <div className="brand">
          <span className="brandmark">C</span> Clockwise
        </div>
        <div>
          <span className="eyebrow" style={{ color: "#bddd77" }}>Attendance, with dignity</span>
          <h1>Presence confirmed. Privacy protected.</h1>
          <p>
            A secure, consent-first way to record the workday. Facial verification stays server-side,
            PIN attendance works immediately, and admin assistance remains available.
          </p>
        </div>
        <div className="privacy-pill">
          <span>◈</span>
          <span>
            <strong>Your face is not your file.</strong>
            <br />
            <small>Temporary captures stay outside the browser trust boundary.</small>
          </span>
        </div>
      </section>
      <section className="login-panel">
        <div className="eyebrow">Employee access</div>
        <h2>Welcome back</h2>
        <p className="muted">Sign in with your work email or employee ID.</p>
        <LoginForm />
        <p className="fine">By signing in, you accept the acceptable use policy. Biometric verification is never used for performance or employment decisions.</p>
      </section>
    </main>
  );
}
