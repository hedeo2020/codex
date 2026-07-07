import { AttendanceRecorder } from "@/components/AttendanceRecorder";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireEmployeeUser } from "@/lib/auth";
import { appEnv, biometricProviderReady } from "@/lib/env";

export default async function AttendancePage() {
  const { user } = await requireEmployeeUser();
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <div className="shell">
      <Sidebar active="Record attendance" userName={name} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header eyebrow="Attendance" title="Record your workday" subtitle="Use live PIN verification now, or face verification once your provider is connected." />
        <AttendanceRecorder biometricReady={biometricProviderReady()} biometricProvider={appEnv.biometricProvider} />
      </main>
    </div>
  );
}
