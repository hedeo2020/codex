import { NextRequest, NextResponse } from "next/server";
import { EmploymentStatus, VerificationMethod } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

const updateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  jobTitle: z.string().min(1),
  roleId: z.string(),
  departmentId: z.string().nullable().optional(),
  shiftId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  preferredAttendanceMethod: z.enum(["FACE", "PIN", "ADMIN_ASSISTED"]),
  employmentStatus: z.nativeEnum(EmploymentStatus)
});

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("SUPER_ADMIN", "HR_ADMIN");
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid employee update." }, { status: 400 });

    const user = await db.user.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email.toLowerCase(),
        jobTitle: parsed.data.jobTitle,
        roleId: parsed.data.roleId,
        departmentId: parsed.data.departmentId || null,
        shiftId: parsed.data.shiftId || null,
        locationId: parsed.data.locationId || null,
        preferredAttendanceMethod: parsed.data.preferredAttendanceMethod as VerificationMethod,
        employmentStatus: parsed.data.employmentStatus
      }
    });

    await audit({
      actorUserId: session.userId,
      action: "EMPLOYEE_UPDATED",
      entityType: "User",
      entityId: user.id,
      newValues: parsed.data
    });

    return NextResponse.json({ employee: { id: user.id } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to update employee." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("SUPER_ADMIN", "HR_ADMIN");
    const { id } = await context.params;
    await db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        employmentStatus: EmploymentStatus.INACTIVE
      }
    });
    await audit({ actorUserId: session.userId, action: "EMPLOYEE_DELETED", entityType: "User", entityId: id });
    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to delete employee." }, { status: 500 });
  }
}
