"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  active: boolean;
};

type SiteNavbarProps = {
  items: NavItem[];
};

export function SiteNavbar({ items }: SiteNavbarProps) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? "#");

  useEffect(() => {
    const syncActiveHref = () => {
      setActiveHref(window.location.hash || "#");
    };

    syncActiveHref();
    window.addEventListener("hashchange", syncActiveHref);

    return () => {
      window.removeEventListener("hashchange", syncActiveHref);
    };
  }, []);

  return (
    <nav className="flex flex-wrap gap-6 sm:gap-8" aria-label="Primary">
      {items.map((item) => {
        const isActive = item.active && activeHref === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (item.active) {
                setActiveHref(item.href);
              }
            }}
            className={`relative pb-2 text-[13px] tracking-[0.08em] text-[#eae7db] transition-colors hover:text-[#ffbd2e] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-[#ffbd2e] after:content-[''] ${
              isActive ? "after:opacity-100" : "after:opacity-0"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
