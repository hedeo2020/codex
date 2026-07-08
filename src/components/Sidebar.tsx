import Link from "next/link";

const employee = [
  ["Overview", "/employee"],
  ["Record attendance", "/employee/attendance"],
  ["My history", "/employee/history"],
  ["Face & consent", "/employee/biometrics"],
  ["My profile", "/employee/profile"]
];

const admin = [
  ["Dashboard", "/admin"],
  ["Employees", "/admin/employees"],
  ["Attendance", "/admin/attendance"],
  ["Payroll", "/admin/payroll"],
  ["Enrollments", "/admin/enrollments"],
  ["Reports", "/admin/reports"],
  ["Audit logs", "/admin/audit"],
  ["Privacy & settings", "/admin/settings"]
];

export function Sidebar({
  mode = "employee",
  active = "Overview",
  userName,
  userSubtitle
}: {
  mode?: "employee" | "admin";
  active?: string;
  userName?: string;
  userSubtitle?: string;
}) {
  const links = mode === "admin" ? admin : employee;
  const fallbackName = mode === "admin" ? "Maya Ortiz" : "Alex Rivera";
  const name = userName ?? fallbackName;
  const subtitle = userSubtitle ?? (mode === "admin" ? "Super Admin" : "Employee");
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brandmark">C</span> Clockwise
      </div>
      <div>
        <div className="sidegroup">{mode} workspace</div>
        <nav className="nav">
          {links.map(([label, href]) => (
            <Link key={href} className={label === active ? "active" : ""} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="profile-mini">
        <span className="avatar">{initials}</span>
        <span>
          <strong style={{ fontSize: 13 }}>{name}</strong>
          <br />
          <small style={{ color: "#91aaa0" }}>{subtitle}</small>
        </span>
      </div>
    </aside>
  );
}
