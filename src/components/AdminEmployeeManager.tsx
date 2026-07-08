"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Option = { id: string; name: string };
type RoleOption = { id: string; name: string };
type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  mobile: string | null;
  jobTitle: string | null;
  profilePhotoUrl: string | null;
  employmentStatus: string;
  preferredAttendanceMethod: "FACE" | "PIN" | "ADMIN_ASSISTED";
  roleId: string;
  departmentId: string | null;
  shiftId: string | null;
  locationId: string | null;
  role: { name: string };
  department: { name: string } | null;
  shift: { name: string } | null;
  location: { name: string; timezone: string; address: string } | null;
  biometricProfile: { enrollmentStatus: string; consentStatus: boolean; expiresAt: string | null } | null;
  attendanceRecords: {
    id: string;
    eventTime: string;
    attendanceType: string;
    captureImageUrl: string | null;
    captureLocationLabel: string | null;
  }[];
};

type Props = {
  employees: Employee[];
  roles: RoleOption[];
  departments: Option[];
  shifts: Option[];
  locations: Option[];
};

type Draft = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  pin: string;
  roleId: string;
  departmentId: string;
  shiftId: string;
  locationId: string;
  jobTitle: string;
  preferredAttendanceMethod: "FACE" | "PIN" | "ADMIN_ASSISTED";
  employmentStatus?: string;
};

function roleLabel(value: string) {
  return value.replaceAll("_", " ");
}

function emptyDraft(roles: RoleOption[], departments: Option[], shifts: Option[], locations: Option[]): Draft {
  return {
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    pin: "",
    roleId: roles[0]?.id ?? "",
    departmentId: departments[0]?.id ?? "",
    shiftId: shifts[0]?.id ?? "",
    locationId: locations[0]?.id ?? "",
    jobTitle: "",
    preferredAttendanceMethod: "PIN"
  };
}

export function AdminEmployeeManager({ employees: initialEmployees, roles, departments, shifts, locations }: Props) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [selectedId, setSelectedId] = useState(initialEmployees[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"create" | "update" | "delete" | null>(null);
  const [createDraft, setCreateDraft] = useState(() => emptyDraft(roles, departments, shifts, locations));

  const selected = useMemo(
    () => employees.find((employee) => employee.id === selectedId) ?? employees[0],
    [employees, selectedId]
  );

  async function refreshEmployees() {
    const response = await fetch("/api/admin/employees");
    const payload = await response.json();
    if (response.ok) {
      setEmployees(payload.employees);
      setSelectedId((current) => payload.employees.find((employee: Employee) => employee.id === current)?.id ?? payload.employees[0]?.id ?? "");
    }
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("create");
    setMessage("");
    const response = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraft)
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to create employee.");
      return;
    }
    setMessage("Employee created.");
    setCreateDraft(emptyDraft(roles, departments, shifts, locations));
    await refreshEmployees();
  }

  async function updateSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setLoading("update");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/employees/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        email: String(form.get("email")),
        jobTitle: String(form.get("jobTitle")),
        roleId: String(form.get("roleId")),
        departmentId: String(form.get("departmentId")) || null,
        shiftId: String(form.get("shiftId")) || null,
        locationId: String(form.get("locationId")) || null,
        preferredAttendanceMethod: String(form.get("preferredAttendanceMethod")),
        employmentStatus: String(form.get("employmentStatus"))
      })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    setMessage(response.ok ? "Employee updated." : payload.error ?? "Unable to update employee.");
    if (response.ok) await refreshEmployees();
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.firstName} ${selected.lastName}?`)) return;
    setLoading("delete");
    setMessage("");
    const response = await fetch(`/api/admin/employees/${selected.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    setLoading(null);
    setMessage(response.ok ? "Employee deleted." : payload.error ?? "Unable to delete employee.");
    if (response.ok) await refreshEmployees();
  }

  return (
    <div className="stack-lg">
      <div className="modern-grid">
        <section className="card glass">
          <div className="cardhead">
            <div>
              <h2>Team directory</h2>
              <p className="muted">Open a profile to review full details, recent face captures, and assigned access.</p>
            </div>
            <span className="badge">{employees.length} active</span>
          </div>
          <div className="employee-list">
            {employees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                className={`employee-item ${selected?.id === employee.id ? "selected" : ""}`}
                onClick={() => setSelectedId(employee.id)}
              >
                {employee.profilePhotoUrl ? <img src={employee.profilePhotoUrl} alt="" className="employee-thumb" /> : <span className="avatar large">{employee.firstName[0]}{employee.lastName[0]}</span>}
                <span>
                  <strong>{employee.firstName} {employee.lastName}</strong>
                  <small>{employee.employeeId} · {roleLabel(employee.role.name)}</small>
                </span>
                <span className="badge gray">{employee.employmentStatus}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card glass">
          <div className="cardhead">
            <div>
              <h2>Create user, moderator, or admin</h2>
              <p className="muted">Admins manage workforce settings here. Employees still control their own profile and face enrollment.</p>
            </div>
          </div>
          <form className="form compact-grid" onSubmit={createEmployee}>
            <input className="input" placeholder="Employee ID" value={createDraft.employeeId} onChange={(event) => setCreateDraft((draft) => ({ ...draft, employeeId: event.target.value }))} />
            <input className="input" placeholder="First name" value={createDraft.firstName} onChange={(event) => setCreateDraft((draft) => ({ ...draft, firstName: event.target.value }))} />
            <input className="input" placeholder="Last name" value={createDraft.lastName} onChange={(event) => setCreateDraft((draft) => ({ ...draft, lastName: event.target.value }))} />
            <input className="input" placeholder="Work email" type="email" value={createDraft.email} onChange={(event) => setCreateDraft((draft) => ({ ...draft, email: event.target.value }))} />
            <input className="input" placeholder="Temporary password" value={createDraft.password} onChange={(event) => setCreateDraft((draft) => ({ ...draft, password: event.target.value }))} />
            <input className="input" placeholder="PIN" value={createDraft.pin} onChange={(event) => setCreateDraft((draft) => ({ ...draft, pin: event.target.value }))} />
            <input className="input" placeholder="Job title" value={createDraft.jobTitle} onChange={(event) => setCreateDraft((draft) => ({ ...draft, jobTitle: event.target.value }))} />
            <select className="input" value={createDraft.roleId} onChange={(event) => setCreateDraft((draft) => ({ ...draft, roleId: event.target.value }))}>
              {roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}
            </select>
            <select className="input" value={createDraft.departmentId} onChange={(event) => setCreateDraft((draft) => ({ ...draft, departmentId: event.target.value }))}>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="input" value={createDraft.shiftId} onChange={(event) => setCreateDraft((draft) => ({ ...draft, shiftId: event.target.value }))}>
              {shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="input" value={createDraft.locationId} onChange={(event) => setCreateDraft((draft) => ({ ...draft, locationId: event.target.value }))}>
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select className="input" value={createDraft.preferredAttendanceMethod} onChange={(event) => setCreateDraft((draft) => ({ ...draft, preferredAttendanceMethod: event.target.value as Draft["preferredAttendanceMethod"] }))}>
              <option value="PIN">PIN</option>
              <option value="FACE">Face</option>
              <option value="ADMIN_ASSISTED">Admin assisted</option>
            </select>
            <button className="btn primary" disabled={loading === "create"} type="submit">{loading === "create" ? "Creating..." : "Create account"}</button>
          </form>
        </section>
      </div>

      {selected ? (
        <div className="modern-grid">
          <section className="card glass">
            <div className="cardhead">
              <div>
                <h2>Full employee details</h2>
                <p className="muted">Admin-manageable role, department, shift, status, and attendance preferences.</p>
              </div>
              <button className="btn danger" type="button" onClick={deleteSelected} disabled={loading === "delete"}>{loading === "delete" ? "Deleting..." : "Delete user"}</button>
            </div>
            <div className="detail-hero">
              {selected.profilePhotoUrl ? <img src={selected.profilePhotoUrl} alt="" className="profile-photo" /> : <span className="avatar jumbo">{selected.firstName[0]}{selected.lastName[0]}</span>}
              <div>
                <h3>{selected.firstName} {selected.lastName}</h3>
                <p className="muted">{selected.email}</p>
                <div className="chip-row">
                  <span className="badge">{roleLabel(selected.role.name)}</span>
                  <span className="badge gray">{selected.department?.name ?? "No department"}</span>
                  <span className="badge gray">{selected.biometricProfile?.enrollmentStatus?.replaceAll("_", " ") ?? "NOT ENROLLED"}</span>
                </div>
              </div>
            </div>
            <form className="form compact-grid" onSubmit={updateSelected}>
              <input className="input" name="firstName" defaultValue={selected.firstName} />
              <input className="input" name="lastName" defaultValue={selected.lastName} />
              <input className="input" name="email" type="email" defaultValue={selected.email} />
              <input className="input" name="jobTitle" defaultValue={selected.jobTitle ?? ""} />
              <select className="input" name="roleId" defaultValue={selected.roleId}>
                {roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}
              </select>
              <select className="input" name="employmentStatus" defaultValue={selected.employmentStatus}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
              <select className="input" name="departmentId" defaultValue={selected.departmentId ?? ""}>
                <option value="">No department</option>
                {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="input" name="shiftId" defaultValue={selected.shiftId ?? ""}>
                <option value="">No shift</option>
                {shifts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="input" name="locationId" defaultValue={selected.locationId ?? ""}>
                <option value="">No location</option>
                {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className="input" name="preferredAttendanceMethod" defaultValue={selected.preferredAttendanceMethod}>
                <option value="PIN">PIN</option>
                <option value="FACE">Face</option>
                <option value="ADMIN_ASSISTED">Admin assisted</option>
              </select>
              <button className="btn primary" disabled={loading === "update"} type="submit">{loading === "update" ? "Saving..." : "Save changes"}</button>
            </form>
            <div className="feed" style={{ marginTop: 18 }}>
              <div className="feedrow"><span className="doticon">L</span><div><strong>{selected.location?.name ?? "No assigned site"}</strong><small>{selected.location?.address ?? "No stored address"}</small></div></div>
              <div className="feedrow"><span className="doticon">T</span><div><strong>{selected.location?.timezone ?? "Asia/Manila"}</strong><small>Default operating timezone</small></div></div>
              <div className="feedrow"><span className="doticon">M</span><div><strong>{selected.mobile ?? "No personal mobile"}</strong><small>Visible for admin review only</small></div></div>
            </div>
          </section>

          <section className="card glass">
            <div className="cardhead">
              <div>
                <h2>Recent record captures</h2>
                <p className="muted">Photos shown here are attendance evidence only. Face enrollment stays employee-controlled.</p>
              </div>
            </div>
            <div className="photo-grid">
              {selected.attendanceRecords.length ? selected.attendanceRecords.map((record) => (
                <article className="photo-card" key={record.id}>
                  {record.captureImageUrl ? <img src={record.captureImageUrl} alt={record.attendanceType} className="record-photo" /> : <div className="photo-placeholder">No image</div>}
                  <strong>{record.attendanceType.replaceAll("_", " ")}</strong>
                  <small>{new Date(record.eventTime).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</small>
                  <small>{record.captureLocationLabel ?? "Location unavailable"}</small>
                </article>
              )) : <p className="muted">No attendance images yet for this employee.</p>}
            </div>
          </section>
        </div>
      ) : null}

      {message ? <div className="notice">{message}</div> : null}
    </div>
  );
}
