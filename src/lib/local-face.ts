import { spawn } from "node:child_process";
import path from "node:path";
import { appEnv } from "@/lib/env";

export async function extractFaceEmbedding(imageDataUrl: string) {
  const scriptPath = path.join(process.cwd(), "python", "face_service.py");
  const payload = JSON.stringify({ imageDataUrl });

  const result = await new Promise<string>((resolve, reject) => {
    const child = spawn(appEnv.faceRecognitionPythonBin, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr.trim() || "The local face recognition helper failed."));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(payload);
    child.stdin.end();
  });

  try {
    const parsed = JSON.parse(result) as { ok: boolean; embedding?: number[]; error?: string };
    if (!parsed.ok || !parsed.embedding?.length) {
      throw new Error(parsed.error ?? "Unable to extract a face embedding.");
    }
    return new Float32Array(parsed.embedding);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("The local face recognition helper failed.");
  }
}
