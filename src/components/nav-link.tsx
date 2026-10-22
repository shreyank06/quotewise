"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

/** `icon` is a rendered element (not a component) so server layouts can pass it across the client boundary. */
export function NavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition",
        active ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/80" : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900",
      )}
    >
      <span className={cx("[&>svg]:size-4", active ? "text-brand-600" : "text-stone-400")}>{icon}</span>
      {label}
    </Link>
  );
}
