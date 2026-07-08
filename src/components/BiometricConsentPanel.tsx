"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  consentStatus: boolean;
  canEnroll: boolean;
};

export function BiometricConsentPanel({ consentStatus, canEnroll }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState<"consent" | "enroll" | "delete" | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout((showToast as typeof showToast & { timer?: number }).timer);
    (showToast as typeof showToast & { timer?: number }).timer = window.setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    void startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function grantConsent() {
    setLoading("consent");
    const response = await fetch("/api/employees/me/biometric-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, documentVersion: "PRIVACY-2026.1" })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    showToast(response.ok ? "Consent recorded. You can now capture an enrollment image." : payload.error ?? "Unable to record consent.");
    router.refresh();
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      showToast("Camera is ready for enrollment.");
    } catch {
      showToast("Camera access failed. Confirm HTTPS, permissions, and camera availability.");
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      showToast("The camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      showToast("Unable to capture the enrollment image.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    showToast("Enrollment image captured.");
  }

  async function enrollProfile() {
    if (!capturedImage) {
      showToast("Capture an enrollment image first.");
      return;
    }
    setLoading("enroll");
    const response = await fetch("/api/employees/me/biometric-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: capturedImage })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    showToast(response.ok ? "Enrollment completed. Face attendance is now active." : payload.error ?? "Unable to enroll the biometric profile.");
    if (response.ok) setCapturedImage("");
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
    showToast(response.ok ? "Biometric profile deleted. PIN is now your fallback method." : payload.error ?? "Unable to delete biometric profile.");
    router.refresh();
  }

  return (
    <>
      <div className="form">
        <div className="camera" style={{ marginTop: 8 }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
          />
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capturedImage} alt="Enrollment capture" style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>
        <div className="hero-strip">
          <div className="metric"><strong>Consent</strong><div className="muted">{consentStatus ? "Granted" : "Not granted yet"}</div></div>
          <div className="metric"><strong>Camera</strong><div className="muted">{cameraReady ? "Ready" : "Starting..."}</div></div>
          <div className="metric"><strong>Enrollment</strong><div className="muted">{canEnroll ? "Available" : "Unavailable"}</div></div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={grantConsent} disabled={loading === "consent" || consentStatus}>
            {loading === "consent" ? "Saving..." : consentStatus ? "Consent already granted" : "Grant biometric consent"}
          </button>
          <button className="btn" onClick={captureFrame} type="button" disabled={!cameraReady}>Capture frame</button>
        </div>
        <button className="btn primary" onClick={enrollProfile} disabled={loading === "enroll" || !consentStatus || !canEnroll || !capturedImage}>
          {loading === "enroll" ? "Enrolling..." : "Enroll face profile"}
        </button>
        <button className="btn" onClick={deleteProfile} disabled={loading === "delete"}>
          {loading === "delete" ? "Deleting..." : "Delete biometric profile"}
        </button>
      </div>
      {toast ? <div className="floating-toast">{toast}</div> : null}
    </>
  );
}
