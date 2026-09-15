import { Link, Outlet } from 'react-router-dom';

export function AdminPanel() {
  return (
    <div className="p-6 flex flex-col gap-6 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          <span className="text-amber-400">ניהול</span>
        </h1>
        <Link to="/" className="link-muted">
          ← חזרה ללוח הבקרה
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
