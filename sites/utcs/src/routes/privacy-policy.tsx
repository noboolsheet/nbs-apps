import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy – UAI-UTCS Unione Turismo Commercio Servizi" },
      {
        name: "description",
        content:
          "Informativa sul trattamento dei dati personali di UAI-UTCS ai sensi del Regolamento (UE) 2016/679 (GDPR).",
      },
    ],
    links: [canonical("/privacy-policy")],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Note Legali"
        title="Privacy Policy"
        description="Informativa sul trattamento dei dati personali ai sensi del Regolamento (UE) 2016/679 (GDPR)."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              1. Titolare del trattamento
            </h2>
            <p className="mt-3">
              Il Titolare del trattamento dei dati è UAI-UTCS – Unione Turismo Commercio e Servizi, con
              sede in Via Roma 1, 00100 Roma (Italia). Per ogni questione relativa
              al trattamento dei dati personali è possibile scrivere all'indirizzo{" "}
              <a href="mailto:demo@example.com" className="text-primary hover:underline">
                demo@example.com
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              2. Dati personali trattati
            </h2>
            <p className="mt-3">
              Trattiamo i dati che ci fornisci volontariamente compilando i moduli del sito (ad
              esempio nome, cognome, email, numero di telefono e il contenuto dei messaggi), nonché
              i dati di navigazione raccolti automaticamente dai sistemi informatici (indirizzo IP,
              tipo di browser, pagine visitate). Per i servizi associativi, di CAF, Patronato e
              formazione possono essere trattati ulteriori dati necessari all'erogazione del
              servizio richiesto.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              3. Finalità e base giuridica
            </h2>
            <p className="mt-3">
              I dati sono trattati per: rispondere alle richieste inviate tramite i moduli di
              contatto; gestire l'adesione e l'erogazione dei servizi; adempiere a obblighi di legge
              e contrattuali. La base giuridica è, a seconda dei casi, il consenso dell'interessato,
              l'esecuzione di un contratto o di misure precontrattuali, l'adempimento di obblighi di
              legge e il legittimo interesse del Titolare.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              4. Modalità e conservazione
            </h2>
            <p className="mt-3">
              I dati sono trattati con strumenti informatici e cartacei, adottando misure di
              sicurezza adeguate a prevenire la perdita, l'uso illecito o non corretto e l'accesso
              non autorizzato. I dati sono conservati per il tempo strettamente necessario alle
              finalità per cui sono stati raccolti e nel rispetto dei termini di legge.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              5. Comunicazione dei dati
            </h2>
            <p className="mt-3">
              I dati possono essere comunicati a soggetti che svolgono attività strumentali per
              conto del Titolare (fornitori di servizi informatici, consulenti, partner della rete
              UAI-UTCS) e ad autorità pubbliche quando previsto dalla legge. I dati non sono diffusi né
              trasferiti a Paesi terzi senza idonee garanzie.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              6. Diritti dell'interessato
            </h2>
            <p className="mt-3">
              In qualunque momento puoi esercitare i diritti previsti dagli artt. 15–22 del GDPR:
              accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al
              trattamento, oltre alla revoca del consenso. Hai inoltre diritto di proporre reclamo
              al Garante per la protezione dei dati personali. Per esercitare i tuoi diritti scrivi
              a{" "}
              <a href="mailto:demo@example.com" className="text-primary hover:underline">
                demo@example.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
