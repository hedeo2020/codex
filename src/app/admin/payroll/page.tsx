import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminPayrollPage() {
  const { user } = await requireAdminUser();

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Payroll" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Payroll exports" title="Payroll-ready attendance export" subtitle="Download payroll summaries in CSV or Excel. Google Sheets can be connected later through an external service account flow." />
        <section className="card glass">
          <form className="form compact-grid" action="/api/admin/payroll/export" method="GET">
            <div className="field">
              <label htmlFor="from">From</label>
              <input className="input" id="from" name="from" type="date" />
            </div>
            <div className="field">
              <label htmlFor="to">To</label>
              <input className="input" id="to" name="to" type="date" />
            </div>
            <div className="field">
              <label htmlFor="format">Format</label>
              <select className="input" id="format" name="format" defaultValue="csv">
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
              </select>
            </div>
            <button className="btn primary" type="submit">Download export</button>
          </form>
          <div className="notice" style={{ marginTop: 18 }}>
            Export includes employee ID, employee name, department, shift, total attendance events, days present, estimated payroll hours, and the enforced Asia/Manila timezone.
          </div>
        </section>
      </main>
    </div>
  );
}
