"use client";

import { FormEvent, useState } from "react";

type Props = {
  personalEmail: string;
  mobile: string;
  preferredAttendanceMethod: "FACE" | "PIN" | "ADMIN_ASSISTED";
};

export function ProfileForm({ personalEmail, mobile, preferredAttendanceMethod }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/employees/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalEmail: String(form.get("personalEmail") || "") || null,
        mobile: String(form.get("mobile") || "") || null,
        preferredAttendanceMethod: String(form.get("preferredAttendanceMethod"))
      })
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? "Profile updated." : payload.error ?? "Unable to update profile.");
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="personalEmail">Personal email</label>
        <input id="personalEmail" name="personalEmail" type="email" defaultValue={personalEmail} />
      </div>
      <div className="field">
        <label htmlFor="mobile">Mobile number</label>
        <input id="mobile" name="mobile" defaultValue={mobile} />
      </div>
      <div className="field">
        <label htmlFor="preferredAttendanceMethod">Preferred attendance method</label>
        <select id="preferredAttendanceMethod" name="preferredAttendanceMethod" defaultValue={preferredAttendanceMethod}>
          <option value="PIN">PIN</option>
          <option value="FACE">Face verification</option>
          <option value="ADMIN_ASSISTED">Admin assisted</option>
        </select>
      </div>
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save profile"}
      </button>
      {message ? <p className="fine">{message}</p> : null}
    </form>
  );
}
