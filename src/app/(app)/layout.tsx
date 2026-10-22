import { FileText, LogOut, Settings, Tags, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { Avatar } from "@/components/ui";
import { requireTenant } from "@/server/auth/session";
import { logout } from "../login/actions";

const NAV = [
  { href: "/quotes", label: "Quotes", icon: <FileText /> },
  { href: "/rates", label: "Price list", icon: <Tags /> },
  { href: "/customers", label: "Customers", icon: <Users /> },
  { href: "/settings", label: "Settings", icon: <Settings /> },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const tenant = await requireTenant();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-stone-200/80 bg-stone-100/60 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-5">
          <Link href="/quotes">
            <Logo />
          </Link>
          <form action={logout} className="lg:hidden">
            <button type="submit" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-200/60">
              <LogOut className="size-4" /> Sign out
            </button>
          </form>
        </div>

        <div className="hidden px-5 pb-4 lg:block">
          <div className="rounded-lg border border-stone-200/80 bg-white px-3 py-2.5">
            <div className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">Company</div>
            <div className="truncate text-sm font-semibold text-stone-900">{tenant.companyName}</div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:px-3 lg:pb-0">
          {NAV.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="hidden border-t border-stone-200/80 p-3 lg:block">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={tenant.userName} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-stone-900">{tenant.userName}</div>
              <div className="truncate text-xs text-stone-500">{tenant.companyName}</div>
            </div>
            <form action={logout}>
              <button type="submit" title="Sign out" aria-label="Sign out" className="rounded-md p-1.5 text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-700">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
