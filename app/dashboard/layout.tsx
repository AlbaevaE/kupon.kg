import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const user = session.user;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <p className="font-semibold text-sm truncate">{user.businessName}</p>
          <p className="text-xs text-gray-400 truncate">{user.name}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/dashboard/scan">Scan QR</NavLink>
          <NavLink href="/dashboard/templates">Coupon Templates</NavLink>
          {user.role === "OWNER" && (
            <>
              <NavLink href="/dashboard/staff">Staff</NavLink>
              <NavLink href="/dashboard/settings">Settings</NavLink>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
    >
      {children}
    </Link>
  );
}
