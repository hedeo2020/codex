import argon2 from "argon2";
import { NextRequest, NextResponse } from "next/server";
import { EmploymentStatus, VerificationMethod } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export async function GET() {
  try {
    await requireRole("SUPER_ADMIN", "HR_ADMIN");
    const [employees, roles, departments, shifts, locations] = await Promise.all([
      db.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          personalEmail: true,
          mobile: true,
          profilePhotoUrl: true,
          employmentStatus: true,
          jobTitle: true,
          roleId: true,
          departmentId: true,
          shiftId: true,
          locationId: true,
          preferredAttendanceMethod: true,
          department: { select: { name: true } },
          shift: { select: { name: true } },
          location: { select: { name: true, timezone: true, address: true } },
          role: { select: { name: true } },
          biometricProfile: { select: { enrollmentStatus: true, consentStatus: true, expiresAt: true } },
          attendanceRecords: {
            select: { id: true, eventTime: true, attendanceType: true, captureImageUrl: true, captureLocationLabel: true },
            orderBy: { eventTime: "desc" },
            take: 6
          }
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      }),
      db.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.shift.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.location.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    ]);
    return NextResponse.json({ employees, roles, departments, shifts, locations });
  } catch {
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }
}

const schema = z.object({
  employeeId: z.string().min(3),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(12),
  pin: z.string().min(4).max(12),
  roleId: z.string(),
  departmentId: z.string().optional(),
  shiftId: z.string().optional(),
  locationId: z.string().optional(),
  jobTitle: z.string().min(1),
  preferredAttendanceMethod: z.enum(["FACE", "PIN", "ADMIN_ASSISTED"]).default("PIN")
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("SUPER_ADMIN", "HR_ADMIN");
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid employee data.", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const user = await db.user.create({
      data: {
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        passwordHash: await argon2.hash(data.password),
        pinHash: await argon2.hash(data.pin),
        roleId: data.roleId,
        departmentId: data.departmentId,
        shiftId: data.shiftId,
        locationId: data.locationId,
        jobTitle: data.jobTitle,
        employmentStatus: EmploymentStatus.ACTIVE,
        preferredAttendanceMethod: data.preferredAttendanceMethod as VerificationMethod
      }
    });

    await audit({
      actorUserId: session.userId,
      action: "EMPLOYEE_CREATED",
      entityType: "User",
      entityId: user.id,
      newValues: { employeeId: user.employeeId, email: user.email, preferredAttendanceMethod: user.preferredAttendanceMethod }
    });

    return NextResponse.json(
      { employee: { id: user.id, employeeId: user.employeeId, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to create employee." }, { status: 500 });
  }
}
