import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function requireAuthenticatedUser() {
  const session = await getSession();
  if (!session) redirect("/");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      role: true,
      department: true,
      shift: true,
      location: true,
      biometricProfile: true
    }
  });

  if (!user || user.deletedAt) redirect("/");
  return { session, user };
}

export async function requireEmployeeUser() {
  const auth = await requireAuthenticatedUser();
  if (auth.user.role.name !== "EMPLOYEE") redirect("/admin");
  return auth;
}

export async function requireAdminUser() {
  const auth = await requireAuthenticatedUser();
  if (auth.user.role.name !== "SUPER_ADMIN" && auth.user.role.name !== "HR_ADMIN") redirect("/employee");
  return auth;
}
