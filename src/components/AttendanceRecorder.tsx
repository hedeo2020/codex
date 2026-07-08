"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  biometricReady: boolean;
  biometricProvider: string;
};

export function AttendanceRecorder({ biometricReady, biometricProvider }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Choose a method to record attendance.");
  const [loading, setLoading] = useState<"PIN" | "FACE" | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error">("idle");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState("Location pending");
  const [coordinates, setCoordinates] = useState<{ latitude?: number; longitude?: number }>({});

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
      setStatus("Camera ready. Keep one face inside the frame, then capture.");
    } catch {
      setCameraState("error");
      setStatus("Camera access failed. Confirm HTTPS, browser permission, and camera availability.");
    }
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const address = payload.address ?? {};
      return (
        address.road ||
        address.neighbourhood ||
        address.suburb ||
        address.village ||
        address.town ||
        address.city ||
        payload.name ||
        null
      ) as string | null;
    } catch {
      return null;
    }
  }

  function fetchLocation() {
    if (!navigator.geolocation) {
      setLocationLabel("Location not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setCoordinates({ latitude, longitude });
        const placeName = await reverseGeocode(latitude, longitude);
        setLocationLabel(placeName ?? `Area near ${latitude}, ${longitude}`);
      },
      () => setLocationLabel("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setStatus("The camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setStatus("Unable to capture the camera frame.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(12, 20, 18, 0.72)";
    context.fillRect(0, canvas.height - 90, canvas.width, 90);
    context.fillStyle = "#ffffff";
    context.font = "bold 24px Inter, sans-serif";
    context.fillText("Clockwise Attendance", 22, canvas.height - 50);
    context.font = "18px Inter, sans-serif";
    context.fillText(
      new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Manila" }).format(new Date()),
      22,
      canvas.height - 22
    );
    context.textAlign = "right";
    context.fillText(locationLabel, canvas.width - 22, canvas.height - 22);
    context.textAlign = "left";
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.92));
    setStatus("Frame captured. Submit to verify attendance.");
  }

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
        timezone: "Asia/Manila",
        captureLocationLabel: locationLabel,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        pin: form.get("pin") ? String(form.get("pin")) : undefined,
        imageDataUrl: method === "FACE" ? capturedImage || undefined : undefined
      })
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(null);

    if (!response.ok) {
      setStatus(payload.error ?? "Unable to record attendance.");
      return;
    }

    setStatus(`Attendance recorded successfully with ${method === "PIN" ? "PIN" : "face verification"}.`);
    if (method === "FACE") setCapturedImage("");
    event.currentTarget.reset();
  }

  return (
    <div className="layout2">
      <section className="card">
        <div className="cardhead">
          <div>
            <h2>Face attendance</h2>
            <span className="muted">Use your phone or laptop camera in the browser</span>
          </div>
          <span className={`badge ${biometricReady ? "" : "gray"}`}>{biometricReady ? "Available" : "Unavailable"}</span>
        </div>
        <div className="notice">
          {biometricReady
            ? `Your ${biometricProvider} provider is connected. The browser captures the frame, but the server decides the match.`
            : "Face attendance needs a server-side biometric provider. Camera capture itself works on phone and laptop browsers over HTTPS."}
        </div>
        <div className="camera" style={{ marginTop: 16 }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
          />
          {capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImage}
              alt="Captured face frame"
              style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" type="button" onClick={startCamera}>
            {cameraState === "ready" ? "Camera on" : "Enable camera"}
          </button>
          <button className="btn" type="button" onClick={fetchLocation}>
            Use current location
          </button>
          <button className="btn" type="button" onClick={captureFrame} disabled={cameraState !== "ready"}>
            Capture frame
          </button>
        </div>
        <p className="fine">Timezone fixed to Asia/Manila. Current location: {locationLabel}.</p>
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
          <button className="btn primary" type="submit" disabled={!biometricReady || !capturedImage || loading === "FACE"}>
            {loading === "FACE" ? "Verifying..." : "Verify & record"}
          </button>
        </form>
        <p className="fine">For phone use, open the site over HTTPS and allow both camera and location access when your browser asks.</p>
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
