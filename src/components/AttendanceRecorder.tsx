"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  biometricReady: boolean;
  biometricProvider: string;
};

export function AttendanceRecorder({ biometricReady, biometricProvider }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [toast, setToast] = useState("Preparing camera and location...");
  const [loading, setLoading] = useState<"PIN" | "FACE" | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "ready" | "error">("idle");
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState("Current area");
  const [coordinates, setCoordinates] = useState<{ latitude?: number; longitude?: number }>({});
  const [pinOpen, setPinOpen] = useState(false);

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout((showToast as typeof showToast & { timer?: number }).timer);
    (showToast as typeof showToast & { timer?: number }).timer = window.setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    void initializeCapture();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function initializeCapture() {
    await Promise.allSettled([startCamera(), fetchLocation()]);
  }

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
      showToast("Camera is ready.");
    } catch {
      setCameraState("error");
      showToast("Camera access failed. Check browser permission.");
    }
  }

  async function reverseGeocode(latitude: number, longitude: number) {
    const response = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    return typeof payload.locationLabel === "string" && payload.locationLabel.trim() ? payload.locationLabel.trim() : "Current area";
  }

  async function fetchLocation() {
    if (!navigator.geolocation) {
      setLocationLabel("Current area");
      return;
    }

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = Number(position.coords.latitude.toFixed(6));
          const longitude = Number(position.coords.longitude.toFixed(6));
          setCoordinates({ latitude, longitude });
          const placeName = await reverseGeocode(latitude, longitude).catch(() => "Current area");
          setLocationLabel(placeName);
          showToast(`Location ready: ${placeName}`);
          resolve();
        },
        () => {
          setLocationLabel("Current area");
          showToast("Location access failed. Attendance will use Current area.");
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
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
      showToast("Unable to capture the camera frame.");
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
    showToast("Face frame captured.");
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
      showToast(payload.error ?? "Unable to record attendance.");
      return;
    }

    showToast(`Attendance recorded with ${method === "PIN" ? "PIN" : "face verification"}.`);
    if (method === "FACE") setCapturedImage("");
    if (method === "PIN") setPinOpen(false);
    event.currentTarget.reset();
  }

  return (
    <>
      <div className="card glass">
        <div className="cardhead">
          <div>
            <h2>Face attendance</h2>
            <span className="muted">Camera and location are enabled automatically for phone and laptop use.</span>
          </div>
          <div className="actions">
            <span className={`badge ${biometricReady ? "" : "gray"}`}>{biometricReady ? "Available" : "Unavailable"}</span>
            <button className="btn" type="button" onClick={() => setPinOpen(true)}>Use PIN instead</button>
          </div>
        </div>

        <div className="hero-strip" style={{ marginBottom: 16 }}>
          <div className="metric">
            <strong>Provider</strong>
            <div className="muted">{biometricProvider}</div>
          </div>
          <div className="metric">
            <strong>Location</strong>
            <div className="muted">{locationLabel}</div>
          </div>
          <div className="metric">
            <strong>Timezone</strong>
            <div className="muted">Asia/Manila</div>
          </div>
        </div>

        <div className="camera" style={{ marginTop: 8 }}>
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
          <button className="btn" type="button" onClick={captureFrame} disabled={cameraState !== "ready"}>
            Capture face frame
          </button>
          <button className="btn" type="button" onClick={() => void fetchLocation()}>
            Refresh location
          </button>
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
          <button className="btn primary" type="submit" disabled={!biometricReady || !capturedImage || loading === "FACE"}>
            {loading === "FACE" ? "Verifying..." : "Verify & record"}
          </button>
        </form>
        <p className="fine">The captured image is stamped with the current time and the detected place name before verification.</p>
      </div>

      {pinOpen ? (
        <div className="modal-backdrop" onClick={() => setPinOpen(false)}>
          <section className="modal-panel card glass" onClick={(event) => event.stopPropagation()}>
            <div className="cardhead">
              <div>
                <h2>PIN attendance</h2>
                <p className="muted">Use this only when you prefer PIN instead of face verification.</p>
              </div>
              <button className="btn" type="button" onClick={() => setPinOpen(false)}>Close</button>
            </div>
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
          </section>
        </div>
      ) : null}

      {toast ? <div className="floating-toast">{toast}</div> : null}
    </>
  );
}
