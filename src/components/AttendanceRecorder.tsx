"use client";

import { FormEvent, useState } from "react";

type Props = {
  biometricReady: boolean;
  biometricProvider: string;
};

export function AttendanceRecorder({ biometricReady, biometricProvider }: Props) {
  const [status, setStatus] = useState("Choose a method to record attendance.");
  const [loading, setLoading] = useState<"PIN" | "FACE" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, method: "PIN" | "FACE") {
    event.preventDefault();
    setLoading(method);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/employees/me/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: String(form.get("type")),
        method,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        pin: form.get("pin") ? String(form.get("pin")) : undefined,
        captureToken: form.get("captureToken") ? String(form.get("captureToken")) : undefined
      })
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(null);

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to record attendance.");
      return;
    }

    setStatus(`Attendance recorded successfully with ${method === "PIN" ? "PIN" : "face verification"}.`);
    event.currentTarget.reset();
  }

  return (
    <div className="layout2">
      <section className="card">
        <div className="cardhead">
          <div>
            <h2>Face attendance</h2>
            <span className="muted">Server-side verification only</span>
          </div>
          <span className={`badge ${biometricReady ? "" : "gray"}`}>{biometricReady ? "Available" : "Unavailable"}</span>
        </div>
        <div className="notice">
          {biometricReady
            ? `Your ${biometricProvider} provider is connected. The browser never decides whether a face match passed.`
            : "Face attendance stays off until you connect a production biometric provider and complete enrollment."}
        </div>
        <form className="form" onSubmit={(event) => submit(event, "FACE")}>
          <div className="field">
            <label htmlFor="face-type">Event</label>
            <select id="face-type" name="type" defaultValue="CHECK_IN">
              <option value="CHECK_IN">Check in</option>
              <option value="CHECK_OUT">Check out</option>
              <option value="BREAK_START">Break start</option>
              <option value="BREAK_END">Break end</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="captureToken">Provider capture token</label>
            <input
              id="captureToken"
              name="captureToken"
              placeholder={biometricReady ? "Paste the live capture token" : "Provider not configured"}
              disabled={!biometricReady}
            />
          </div>
          <button className="btn primary" type="submit" disabled={!biometricReady || loading === "FACE"}>
            {loading === "FACE" ? "Verifying..." : "Verify & record"}
          </button>
        </form>
      </section>

      <aside className="card">
        <h2>PIN attendance</h2>
        <p className="muted">Fully live and ready for production.</p>
        <form className="form" onSubmit={(event) => submit(event, "PIN")}>
          <div className="field">
            <label htmlFor="pin-type">Event</label>
            <select id="pin-type" name="type" defaultValue="CHECK_IN">
              <option value="CHECK_IN">Check in</option>
              <option value="CHECK_OUT">Check out</option>
              <option value="BREAK_START">Break start</option>
              <option value="BREAK_END">Break end</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pin">Attendance PIN</label>
            <input id="pin" name="pin" type="password" inputMode="numeric" placeholder="••••••" required />
          </div>
          <button className="btn primary" type="submit" disabled={loading === "PIN"}>
            {loading === "PIN" ? "Recording..." : "Record with PIN"}
          </button>
        </form>
        <p className="fine">If face verification is unavailable, employees can still record attendance with PIN or authorized admin assistance.</p>
      </aside>

      <div className="notice" style={{ gridColumn: "1 / -1" }}>{status}</div>
    </div>
  );
}
