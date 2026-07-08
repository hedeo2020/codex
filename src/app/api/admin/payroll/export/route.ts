import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

function workingDays(records: { attendanceType: string; eventTime: Date }[]) {
  const days = new Set(
    records
      .filter((record) => record.attendanceType === "CHECK_IN")
      .map((record) => record.eventTime.toISOString().slice(0, 10))
  );
  return days.size;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN", "HR_ADMIN");
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {
      deletedAt: null,
      attendanceRecords:
        from || to
          ? {
              some: {
                eventTime: {
                  gte: from ? new Date(`${from}T00:00:00+08:00`) : undefined,
                  lte: to ? new Date(`${to}T23:59:59+08:00`) : undefined
                }
              }
            }
          : undefined
    };

    const employees = await db.user.findMany({
      where,
      include: {
        department: true,
        shift: true,
        attendanceRecords: {
          where: {
            eventTime: {
              gte: from ? new Date(`${from}T00:00:00+08:00`) : undefined,
              lte: to ? new Date(`${to}T23:59:59+08:00`) : undefined
            }
          },
          orderBy: { eventTime: "asc" }
        }
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
    });

    const rows = employees.map((employee) => {
      const daysPresent = workingDays(employee.attendanceRecords);
      return {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name ?? "",
        shift: employee.shift?.name ?? "",
        totalRecords: employee.attendanceRecords.length,
        daysPresent,
        estimatedPayrollHours: daysPresent * 8,
        timezone: "Asia/Manila"
      };
    });

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="payroll-export.xlsx"`
        }
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-export.csv"`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "You do not have permission to export payroll." }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to export payroll." }, { status: 500 });
  }
}
