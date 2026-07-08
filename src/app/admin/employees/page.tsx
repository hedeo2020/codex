import { AdminEmployeeManager } from "@/components/AdminEmployeeManager";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminEmployeesPage() {
  const { user } = await requireAdminUser();
  const [employees, roles, departments, shifts, locations] = await Promise.all([
    db.user.findMany({
      where: { deletedAt: null },
      include: {
        role: true,
        department: true,
        shift: true,
        location: true,
        biometricProfile: true,
        attendanceRecords: {
          select: { id: true, eventTime: true, attendanceType: true, captureImageUrl: true, captureLocationLabel: true },
          orderBy: { eventTime: "desc" },
          take: 6
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    }),
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.shift.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Employees" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="People directory" title="Employees" subtitle="Create, edit, review, and deactivate accounts while keeping profile edits and face enrollment in employee hands." />
        <AdminEmployeeManager
          employees={employees.map((employee) => ({
            ...employee,
            jobTitle: employee.jobTitle ?? "",
            personalEmail: employee.personalEmail ?? null,
            mobile: employee.mobile ?? null,
            profilePhotoUrl: employee.profilePhotoUrl ?? null,
            departmentId: employee.departmentId ?? null,
            shiftId: employee.shiftId ?? null,
            locationId: employee.locationId ?? null,
            preferredAttendanceMethod:
              employee.preferredAttendanceMethod === "MANUAL_CORRECTION"
                ? "ADMIN_ASSISTED"
                : employee.preferredAttendanceMethod,
            biometricProfile: employee.biometricProfile
              ? {
                  enrollmentStatus: employee.biometricProfile.enrollmentStatus,
                  consentStatus: employee.biometricProfile.consentStatus,
                  expiresAt: employee.biometricProfile.expiresAt?.toISOString() ?? null
                }
              : null,
            attendanceRecords: employee.attendanceRecords.map((record) => ({
              ...record,
              eventTime: record.eventTime.toISOString()
            }))
          }))}
          roles={roles}
          departments={departments}
          shifts={shifts}
          locations={locations}
        />
      </main>
    </div>
  );
}
