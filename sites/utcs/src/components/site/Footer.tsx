import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/logo-utcs.png"
                alt="UAI-UTCS"
                className="h-12 w-auto bg-background/5 rounded-md p-1"
              />
              <div>
                <div className="font-display text-lg font-bold">UAI-UTCS</div>
                <div className="text-[10px] uppercase tracking-widest text-background/70">
                  Unione Turismo Commercio Servizi
                </div>
              </div>
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              L'Associazione dove la tutela diventa vicinanza, e i servizi diventano opportunità reali.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest mb-4 text-background">
              Associazione
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li>
                <Link to="/chi-siamo" className="hover:text-background transition-colors">
                  Chi Siamo
                </Link>
              </li>
              <li>
                <Link to="/registrati" className="hover:text-background transition-colors">
                  Registrati
                </Link>
              </li>
              <li>
                <Link to="/convenzioni" className="hover:text-background transition-colors">
                  Convenzioni
                </Link>
              </li>
              <li>
                <Link to="/notizie" className="hover:text-background transition-colors">
                  Notizie e Bandi
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest mb-4 text-background">
              Servizi
            </h3>
            <ul className="space-y-2.5 text-sm text-background/70">
              <li>
                <Link to="/servizi" className="hover:text-background transition-colors">
                  Aree di Servizio
                </Link>
              </li>
              <li>
                <Link to="/apl" className="hover:text-background transition-colors">
                  Agenzia per il Lavoro
                </Link>
              </li>
              <li>
                <Link
                  to="/apl"
                  hash="sportello"
                  className="hover:text-background transition-colors"
                >
                  Apri la tua APL
                </Link>
              </li>
              <li>
                <Link to="/caf-patronato" className="hover:text-background transition-colors">
                  CAF & Patronato
                </Link>
              </li>
              <li>
                <Link to="/formazione" className="hover:text-background transition-colors">
                  Formazione
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest mb-4 text-background">
              Contatti
            </h3>
            <ul className="space-y-3 text-sm text-background/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-background/50" />
                <span>
                  Sede Nazionale UAI-UTCS
                  <br />
                  {SITE.address.street}
                  <br />
                  {SITE.address.cap} {SITE.address.city}, {SITE.address.country}
                </span>
              </li>
              <li>
                <a
                  href={SITE.phone.href}
                  className="flex items-center gap-2.5 hover:text-background transition-colors"
                >
                  <Phone className="h-4 w-4 text-background/50" /> {SITE.phone.display}
                </a>
              </li>
              <li>
                <a
                  href={SITE.emailHref}
                  className="flex items-center gap-2.5 hover:text-background transition-colors"
                >
                  <Mail className="h-4 w-4 text-background/50" /> {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 hover:text-background transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-background/50" /> {SITE.whatsapp.display}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/50">
          <div>
            © {new Date().getFullYear()} UAI-UTCS – Unione Turismo Commercio e Servizi. Tutti i diritti
            riservati.
          </div>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-background transition-colors">
              Privacy Policy
            </Link>
            <Link to="/cookie-policy" className="hover:text-background transition-colors">
              Cookie Policy
            </Link>
            <Link to="/note-legali" className="hover:text-background transition-colors">
              Note Legali
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
