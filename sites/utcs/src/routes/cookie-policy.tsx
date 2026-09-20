import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy – UAI-UTCS Unione Turismo Commercio Servizi" },
      {
        name: "description",
        content:
          "Informativa sull'uso dei cookie e delle tecnologie simili sul sito UAI-UTCS, ai sensi del Regolamento (UE) 2016/679 e delle linee guida del Garante.",
      },
    ],
    links: [canonical("/cookie-policy")],
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Note Legali"
        title="Cookie Policy"
        description="Informativa sull'uso dei cookie e delle tecnologie simili su questo sito."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              1. Cosa sono i cookie
            </h2>
            <p className="mt-3">
              I cookie sono piccoli file di testo che i siti visitati inviano al dispositivo
              dell'utente, dove vengono memorizzati per essere ritrasmessi agli stessi siti alla
              visita successiva. Tecnologie simili (ad esempio il local storage) possono essere
              utilizzate per finalità analoghe.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              2. Tipologie di cookie utilizzati
            </h2>
            <p className="mt-3">
              <strong>Cookie tecnici</strong> — necessari al corretto funzionamento del sito e alla
              fruizione dei suoi servizi; non richiedono il consenso dell'utente.
            </p>
            <p className="mt-3">
              <strong>Cookie analitici</strong> — utilizzati per raccogliere informazioni in forma
              aggregata sul numero di visitatori e su come navigano il sito. Quando non resi
              anonimi, sono installati solo previo consenso. Questo sito utilizza{" "}
              <strong>Google Analytics 4</strong> (Google Ireland Ltd.) in modalità{" "}
              <em>Consent Mode</em>: nessun cookie analitico viene installato finché non si presta il
              consenso tramite il banner. Per maggiori informazioni si rimanda alla{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy di Google
              </a>
              .
            </p>
            <p className="mt-3">
              <strong>Cookie di terze parti</strong> — alcune funzionalità (ad esempio la mappa
              interattiva o i contenuti incorporati) possono installare cookie gestiti da soggetti
              terzi, secondo le rispettive informative.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              3. Gestione del consenso
            </h2>
            <p className="mt-3">
              Al primo accesso al sito viene mostrato un banner che consente di accettare o rifiutare
              i cookie non tecnici. Le preferenze possono essere modificate in qualsiasi momento.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              4. Come disabilitare i cookie dal browser
            </h2>
            <p className="mt-3">
              È possibile gestire o eliminare i cookie tramite le impostazioni del proprio browser.
              La disabilitazione dei cookie tecnici potrebbe compromettere alcune funzionalità del
              sito.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">5. Contatti</h2>
            <p className="mt-3">
              Per qualsiasi informazione relativa all'uso dei cookie e al trattamento dei dati è
              possibile scrivere a{" "}
              <a href="mailto:demo@example.com" className="text-primary hover:underline">
                demo@example.com
              </a>
              . Per maggiori dettagli sul trattamento dei dati personali consulta la nostra Privacy
              Policy.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
