import {
  AttendanceType,
  EmploymentStatus,
  EnrollmentStatus,
  PrismaClient,
  RoleName,
  VerificationMethod,
  VerificationStatus
} from "@prisma/client";
import argon2 from "argon2";

const db = new PrismaClient();

function seededAttendanceTime(daysAgo: number) {
  const date = new Date();
  date.setHours(8, 45, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function main() {
  const roles = await Promise.all(
    [
      { name: RoleName.SUPER_ADMIN, permissions: ["*"] },
      { name: RoleName.HR_ADMIN, permissions: ["employees:manage", "attendance:manage", "reports:export", "biometrics:manage"] },
      { name: RoleName.EMPLOYEE, permissions: ["profile:self", "attendance:self", "biometrics:self"] }
    ].map((role) =>
      db.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: { ...role, description: role.name.replaceAll("_", " ") }
      })
    )
  );

  const roleMap = Object.fromEntries(roles.map((role) => [role.name, role.id]));
  const departmentNames = ["HR", "IT", "Finance", "Operations", "Sales"];
  const departments = await Promise.all(
    departmentNames.map((name) =>
      db.department.upsert({
        where: { code: name.toUpperCase().slice(0, 3) },
        update: {},
        create: {
          name,
          code: name.toUpperCase().slice(0, 3),
          description: `${name} department`
        }
      })
    )
  );

  const location = await db.location.upsert({
    where: { name: "Manila HQ" },
    update: {
      address: "Makati Avenue, Makati City, Metro Manila, Philippines",
      timezone: "Asia/Manila"
    },
    create: {
      name: "Manila HQ",
      address: "Makati Avenue, Makati City, Metro Manila, Philippines",
      timezone: "Asia/Manila"
    }
  });

  const shift = await db.shift.upsert({
    where: { name: "Standard Day" },
    update: {
      locationId: location.id
    },
    create: {
      name: "Standard Day",
      startTime: "09:00",
      endTime: "17:00",
      workDays: [1, 2, 3, 4, 5],
      locationId: location.id
    }
  });

  const passwordHash = await argon2.hash("ChangeMe!2026");
  const pinHash = await argon2.hash("246810");
  const people = [
    ["ADM-0001", "Maya", "Ortiz", "maya.ortiz@example.test", RoleName.SUPER_ADMIN, 0],
    ["HR-0002", "Nora", "Chen", "nora.chen@example.test", RoleName.HR_ADMIN, 0],
    ["HR-0003", "Daniel", "Okafor", "daniel.okafor@example.test", RoleName.HR_ADMIN, 0],
    ["EMP-1001", "Priya", "Nair", "priya.nair@example.test", RoleName.EMPLOYEE, 2],
    ["EMP-1002", "Theo", "Martin", "theo.martin@example.test", RoleName.EMPLOYEE, 1],
    ["EMP-1003", "Alex", "Rivera", "alex.rivera@example.test", RoleName.EMPLOYEE, 4],
    ["EMP-1004", "Sam", "Wong", "sam.wong@example.test", RoleName.EMPLOYEE, 2],
    ["EMP-1005", "Jordan", "Lee", "jordan.lee@example.test", RoleName.EMPLOYEE, 3],
    ["EMP-1006", "Fatima", "Rahman", "fatima.rahman@example.test", RoleName.EMPLOYEE, 0],
    ["EMP-1007", "Lucas", "Silva", "lucas.silva@example.test", RoleName.EMPLOYEE, 1],
    ["EMP-1008", "Aisha", "Khan", "aisha.khan@example.test", RoleName.EMPLOYEE, 3],
    ["EMP-1009", "Mei", "Tan", "mei.tan@example.test", RoleName.EMPLOYEE, 4],
    ["EMP-1010", "Noah", "Williams", "noah.williams@example.test", RoleName.EMPLOYEE, 1]
  ] as const;

  for (const [employeeId, firstName, lastName, email, roleName, departmentIndex] of people) {
    const user = await db.user.upsert({
      where: { employeeId },
      update: {
        passwordHash,
        pinHash,
        roleId: roleMap[roleName],
        departmentId: departments[departmentIndex].id,
        shiftId: shift.id,
        locationId: location.id,
        jobTitle: roleName === RoleName.EMPLOYEE ? "Specialist" : "Administrator",
        employmentStatus: EmploymentStatus.ACTIVE
      },
      create: {
        employeeId,
        firstName,
        lastName,
        email,
        passwordHash,
        pinHash,
        roleId: roleMap[roleName],
        departmentId: departments[departmentIndex].id,
        shiftId: shift.id,
        locationId: location.id,
        jobTitle: roleName === RoleName.EMPLOYEE ? "Specialist" : "Administrator",
        employmentStatus: EmploymentStatus.ACTIVE
      }
    });

    if (roleName !== RoleName.EMPLOYEE) continue;

    const statuses = [EnrollmentStatus.ACTIVE, EnrollmentStatus.NOT_ENROLLED, EnrollmentStatus.PENDING];
    const enrollmentStatus = statuses[Number(employeeId.slice(-1)) % 3];

    await db.biometricProfile.upsert({
      where: { userId: user.id },
      update: {
        enrollmentStatus,
        consentStatus: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED,
        consentAt: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED ? new Date() : null,
        consentDocumentVersion: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED ? "PRIVACY-2026.1" : null,
        expiresAt: enrollmentStatus === EnrollmentStatus.ACTIVE ? new Date(Date.now() + 365 * 86400000) : null
      },
      create: {
        userId: user.id,
        enrollmentStatus,
        consentStatus: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED,
        consentAt: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED ? new Date() : null,
        consentDocumentVersion: enrollmentStatus !== EnrollmentStatus.NOT_ENROLLED ? "PRIVACY-2026.1" : null,
        expiresAt: enrollmentStatus === EnrollmentStatus.ACTIVE ? new Date(Date.now() + 365 * 86400000) : null
      }
    });

    const existingAttendance = await db.attendanceRecord.count({
      where: {
        userId: user.id,
        notes: "seeded-attendance"
      }
    });

    if (!existingAttendance) {
      for (let daysAgo = 1; daysAgo <= 3; daysAgo++) {
        await db.attendanceRecord.create({
          data: {
            userId: user.id,
            attendanceType: AttendanceType.CHECK_IN,
            eventTime: seededAttendanceTime(daysAgo),
            timezone: "Asia/Manila",
            verificationMethod: daysAgo % 2 ? VerificationMethod.FACE : VerificationMethod.PIN,
            verificationStatus: VerificationStatus.SUCCESS,
            createdBy: user.id,
            captureLocationLabel: "Manila HQ",
            notes: "seeded-attendance"
          }
        });
      }
    }
  }

  await db.systemSetting.upsert({
    where: { key: "privacy_policy" },
    update: {
      value: {
        version: "PRIVACY-2026.1",
        biometricRetentionDays: 365,
        tempImages: "immediate",
        verificationRetryLimit: 3,
        nonBiometricFallback: true
      }
    },
    create: {
      key: "privacy_policy",
      value: {
        version: "PRIVACY-2026.1",
        biometricRetentionDays: 365,
        tempImages: "immediate",
        verificationRetryLimit: 3,
        nonBiometricFallback: true
      }
    }
  });

  console.log("Seed complete. Development password: ChangeMe!2026 | Development PIN: 246810");
}

main().finally(() => db.$disconnect());
