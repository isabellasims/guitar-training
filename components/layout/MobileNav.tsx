"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Layers, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/tracks", label: "Tracks", Icon: Layers },
  { href: "/library", label: "Library", Icon: BookOpen },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-rule bg-paper/95 pb-safe backdrop-blur-sm"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider",
                  active ? "text-rust" : "text-ink-mute hover:text-ink-soft",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
