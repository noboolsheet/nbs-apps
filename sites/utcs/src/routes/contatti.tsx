import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { canonical, ogUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { sendContact } from "@/lib/api/contact.functions";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Contatti – UAI-UTCS" },
      { name: "description", content: "Contatta UAI-UTCS: telefono +39 000 000 000, email demo@example.com, WhatsApp +39 000 000 000 o tramite il modulo online." },
      { property: "og:title", content: "Contatti – UAI-UTCS" },
      { property: "og:description", content: "Siamo a tua disposizione per consulenza e informazioni." },
      ogUrl("/contatti"),
    ],
    links: [canonical("/contatti")],
  }),
  component: ContattiPage,
});

function ContattiPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await sendContact({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""), // honeypot
        },
      });
      form.reset();
      setConsent(false);
      setSent(true);
    } catch {
      setError("Non è stato possibile inviare il messaggio. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contatti"
        title="Parliamo della tua impresa"
        description="Scrivici o passa a trovarci in sede: il nostro team è a disposizione per offrirti consulenza dedicata."
      />

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8 grid gap-12 lg:grid-cols-5">
        <aside className="lg:col-span-2 space-y-4">
          <InfoRow icon={Phone} label="Telefono">
            <a href={SITE.phone.href} className="hover:text-primary">{SITE.phone.display}</a>
          </InfoRow>
          <InfoRow icon={Mail} label="Email">
            <a href={SITE.emailHref} className="hover:text-primary">{SITE.email}</a>
          </InfoRow>
          <InfoRow icon={MessageCircle} label="WhatsApp">
            <a href={SITE.whatsapp.href} target="_blank" rel="noreferrer" className="hover:text-primary">
              {SITE.whatsapp.display}
            </a>
          </InfoRow>
          <InfoRow icon={MapPin} label="Indirizzo">
            {SITE.address.full}
          </InfoRow>
          <InfoRow icon={Clock} label="Orari di apertura">
            {SITE.hoursDays}<br />{SITE.hoursRange}
          </InfoRow>
        </aside>

        <div className="lg:col-span-3">
          {sent ? (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold">Messaggio inviato!</h2>
              <p className="mt-2 text-muted-foreground">
                Grazie per averci contattato. Ti risponderemo al più presto.
              </p>
              <Button onClick={() => setSent(false)} className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
                Invia un altro messaggio
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-border bg-background p-8 lg:p-10 shadow-[var(--shadow-soft)] space-y-5"
            >
              <h3 className="font-display text-xl font-semibold">Inviaci un messaggio</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome e cognome" required>
                  <input name="name" required maxLength={200} className="input-style" />
                </Field>
                <Field label="Email" required>
                  <input name="email" type="email" required maxLength={200} className="input-style" />
                </Field>
              </div>
              <Field label="Telefono (facoltativo)">
                <input name="phone" type="tel" maxLength={60} className="input-style" />
              </Field>
              <Field label="Messaggio" required>
                <textarea name="message" required maxLength={5000} rows={6} className="input-style resize-none" placeholder="Come possiamo aiutarti?" />
              </Field>
              {/* Honeypot anti-spam: oculto para humanos, los bots lo rellenan. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
              />
              <label className="flex items-start gap-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                Acconsento al trattamento dei dati personali ai sensi del GDPR.
              </label>
              {error && (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !consent}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Invio in corso…" : "Invia messaggio"}
              </Button>
            </form>
          )}
        </div>
      </section>

      <style>{`
        .input-style {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--input);
          background: var(--background);
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-style:focus { border-color: var(--primary); }
      `}</style>
    </>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-1 font-medium text-foreground leading-snug">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-accent">*</span>}
      </span>
      {children}
    </label>
  );
}