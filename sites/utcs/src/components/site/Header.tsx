import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

const SERVIZI_LINKS = [
  { to: "/servizi", label: "Tutti i Servizi", desc: "Panoramica completa delle aree" },
  { to: "/apl", label: "Agenzia per il Lavoro", desc: "APL, tirocini, offerte" },
  { to: "/caf-patronato", label: "CAF & Patronato", desc: "730, ISEE, pensioni, NASpI" },
  { to: "/formazione", label: "Formazione", desc: "Corsi, E-learning, FAD" },
  { to: "/convenzioni", label: "Convenzioni", desc: "Vantaggi dei partner ufficiali" },
] as const;

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/chi-siamo", label: "Chi Siamo" },
  { to: "/notizie", label: "Notizie" },
  { to: "/contatti", label: "Contatti" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [servOpen, setServOpen] = useState(false);
  const servRef = useRef<HTMLDivElement>(null);
  const servBtnRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Oculta el header al bajar y lo muestra al subir (throttle con rAF).
    const HIDE_AFTER = 80; // px desde el top antes de empezar a ocultar
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const goingDown = y > lastScrollY.current;
      if (goingDown && y > HIDE_AFTER) setHidden(true);
      else if (!goingDown) setHidden(false);
      lastScrollY.current = y;
      ticking.current = false;
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };
    lastScrollY.current = window.scrollY;
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the Servizi dropdown on an outside pointer press.
  useEffect(() => {
    if (!servOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (servRef.current && !servRef.current.contains(e.target as Node)) {
        setServOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [servOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        // No ocultar mientras el menú móvil esté abierto.
        hidden && !open ? "-translate-y-full" : "translate-y-0",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-[var(--shadow-soft)]"
          : "bg-background/60 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-20 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <img
            src="/images/logo-utcs.png"
            alt="UAI-UTCS – Unione Turismo Commercio Servizi"
            className="h-12 w-auto lg:h-14"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              UAI-UTCS
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hidden sm:block">
              Unione Turismo Commercio Servizi
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            activeProps={{ className: "text-primary" }}
          >
            Home
          </Link>
          <Link
            to="/chi-siamo"
            className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            activeProps={{ className: "text-primary" }}
          >
            Chi Siamo
          </Link>

          {/* Servizi dropdown */}
          <div
            ref={servRef}
            className="relative"
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setServOpen(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setServOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && servOpen) {
                setServOpen(false);
                servBtnRef.current?.focus();
              }
            }}
            onBlur={(e) => {
              if (!servRef.current?.contains(e.relatedTarget as Node)) setServOpen(false);
            }}
          >
            <button
              ref={servBtnRef}
              type="button"
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-expanded={servOpen}
              aria-controls="servizi-menu"
              onClick={() => setServOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setServOpen(true);
                  requestAnimationFrame(() =>
                    servRef.current?.querySelector<HTMLAnchorElement>("#servizi-menu a")?.focus(),
                  );
                }
              }}
            >
              Servizi
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", servOpen && "rotate-180")}
              />
            </button>
            {servOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[420px]">
                <div
                  id="servizi-menu"
                  className="rounded-xl border border-border bg-popover p-2 shadow-[var(--shadow-elegant)]"
                >
                  {SERVIZI_LINKS.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="flex flex-col gap-0.5 rounded-lg px-4 py-3 hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none transition-colors"
                      onClick={() => setServOpen(false)}
                    >
                      <span className="text-sm font-semibold text-foreground">{l.label}</span>
                      <span className="text-xs text-muted-foreground">{l.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/notizie"
            className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            activeProps={{ className: "text-primary" }}
          >
            Notizie
          </Link>
          <Link
            to="/contatti"
            className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            activeProps={{ className: "text-primary" }}
          >
            Contatti
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={SITE.phone.href}
            className="hidden md:flex items-center gap-2 rounded-md px-1 text-sm font-medium text-foreground/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Phone className="h-4 w-4" />
            {SITE.phone.display}
          </a>
          <Button
            asChild
            className="hidden md:inline-flex bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/registrati">Registrati</Link>
          </Button>

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Apri menu">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-[380px] p-0">
              <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="border-b border-border px-6 py-5">
                  <div className="flex items-center gap-3">
                    <img src="/images/logo-utcs.png" alt="UAI-UTCS" className="h-10 w-auto" />
                    <div>
                      <div className="font-display font-bold">UAI-UTCS</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Italia
                      </div>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  {NAV_LINKS.slice(0, 2).map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none"
                    >
                      {l.label}
                    </Link>
                  ))}
                  <div className="mt-2 mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Servizi
                  </div>
                  {SERVIZI_LINKS.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-primary-soft hover:text-primary focus-visible:bg-primary-soft focus-visible:text-primary focus-visible:outline-none"
                    >
                      {l.label}
                    </Link>
                  ))}
                  {NAV_LINKS.slice(2).map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none mt-1"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border p-4 space-y-2">
                  <Button
                    asChild
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to="/registrati" onClick={() => setOpen(false)}>
                      Registrati
                    </Link>
                  </Button>
                  <a
                    href={SITE.phone.href}
                    className="flex items-center justify-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Phone className="h-4 w-4" /> {SITE.phone.display}
                  </a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
