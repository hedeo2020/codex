import { LogoutButton } from "@/components/LogoutButton";

export function Header({
  eyebrow,
  title,
  subtitle,
  status
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="title">{title}</h1>
        <div className="muted">{subtitle}</div>
      </div>
      <div className="actions">
        {status ? <span className="badge">{status}</span> : null}
        <LogoutButton />
      </div>
    </header>
  );
}
