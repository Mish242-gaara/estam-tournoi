"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/live/1", label: "Live" },
  { href: "/preview/1", label: "Avant match" },
  { href: "/teams", label: "Équipes" },
  { href: "/players", label: "Joueurs" },
  { href: "/fans", label: "Fans" }
];

export default function SiteShell({ title, subtitle, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site">
        <div className="header-inner">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <img src="/images/estam-logo.svg" alt="Logo ESTAM" className="brand-logo" />
            <div className="brand-text">
              <div className="t1">ESTAM · POINTE-NOIRE</div>
              <div className="t2">Experience football pro</div>
            </div>
          </Link>

          <nav className={`tabs${open ? " open" : ""}`}>
            {navItems.map(item => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button className="mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Ouvrir le menu">☰</button>
        </div>
      </header>

      <main className="page-shell">
        <section className="page-hero">
          <div className="wrap">
            <div className="eyebrow">Plateforme sportive · ESTAM</div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </section>

        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
