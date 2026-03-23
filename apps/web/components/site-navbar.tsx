"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  active: boolean;
};

type SiteNavbarProps = {
  items: NavItem[];
};

export function SiteNavbar({ items }: SiteNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const mobileMenuId = useId();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const syncHash = () => {
      setCurrentHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (target && mobileMenuRef.current?.contains(target)) {
        return;
      }

      setMobileOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  const isCurrentItem = (href: string) => {
    if (href.startsWith("#")) {
      return pathname === "/" && currentHash === href;
    }

    if (href === "/") {
      return pathname === "/" && currentHash === "";
    }

    return pathname === href;
  };

  return (
    <div className="relative w-full min-w-0 md:w-auto">
      <div className="fixed inset-x-4 top-4 z-50 md:hidden">
        <div ref={mobileMenuRef} className="relative w-full min-w-0">
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileMenuId}
            aria-haspopup="menu"
            onClick={() => setMobileOpen((current) => !current)}
            className="flex h-11 w-[7.5rem] items-center justify-center gap-2 border border-white/15 bg-black/75 px-4 text-[11px] uppercase tracking-[0.22em] text-[#f2f1ea] transition hover:bg-white/8"
          >
            <span>Menu</span>
            <span
              aria-hidden="true"
              className={`text-[10px] transition-transform duration-150 ${
                mobileOpen ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {mobileOpen ? (
            <div
              id={mobileMenuId}
              className="absolute left-0 top-full z-40 mt-2 w-full overflow-hidden border border-white/15 bg-[#0e0e0e] shadow-2xl shadow-black/50"
            >
              <nav aria-label="Primary" className="flex flex-col">
                {items.map((item) => {
                  const isCurrent = item.active && isCurrentItem(item.href);

                  if (!item.active) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="flex items-center border-b border-white/10 px-4 py-4 text-[13px] tracking-[0.08em] text-[#8f8b80] transition-colors last:border-b-0 cursor-not-allowed opacity-60"
                      >
                        {item.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center border-b border-white/10 px-4 py-4 text-[13px] tracking-[0.08em] text-[#eae7db] transition-colors last:border-b-0 hover:bg-white/5 hover:text-[#ffbd2e] ${
                        isCurrent ? "bg-white/5 text-[#ffbd2e]" : ""
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : null}
        </div>
      </div>

      <nav
        className="hidden w-full min-w-0 flex-wrap items-start gap-x-3 gap-y-2 text-[11px] leading-none tracking-[0.07em] sm:gap-x-4 sm:gap-y-2 sm:text-[12px] md:flex md:gap-x-6 md:text-[13px]"
        aria-label="Primary"
      >
        {items.map((item) => {
          const isCurrent = item.active && isCurrentItem(item.href);

          if (!item.active) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                className="relative cursor-not-allowed pb-1.5 text-[#8f8b80] opacity-60"
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`relative pb-1.5 text-[#eae7db] transition-colors hover:text-[#ffbd2e] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-[#ffbd2e] after:content-[''] ${
                isCurrent ? "after:opacity-100" : "after:opacity-0"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
