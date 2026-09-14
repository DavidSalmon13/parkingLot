import { Link, Outlet } from 'react-router-dom';

export function AdminPanel() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin</h1>
        <Link to="/" className="text-sm text-gray-600 underline">
          ← Back to dashboard
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
