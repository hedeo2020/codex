import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminEmployeesPage() {
  const { user } = await requireAdminUser();
  const employees = await db.user.findMany({
    where: { deletedAt: null },
    include: { role: true, department: true, biometricProfile: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Employees" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="People directory" title="Employees" subtitle="Live employee roster with role, department, and biometric status." />
        <section className="card">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Biometric</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.firstName} {employee.lastName}</td>
                  <td>{employee.employeeId}</td>
                  <td>{employee.role.name.replaceAll("_", " ")}</td>
                  <td>{employee.department?.name ?? "Unassigned"}</td>
                  <td><span className="badge">{employee.employmentStatus}</span></td>
                  <td>{employee.biometricProfile?.enrollmentStatus?.replaceAll("_", " ") ?? "NOT ENROLLED"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
