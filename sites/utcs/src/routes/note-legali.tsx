import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/note-legali")({
  head: () => ({
    meta: [
      { title: "Note Legali – UAI-UTCS Unione Turismo Commercio Servizi" },
      {
        name: "description",
        content:
          "Note legali e condizioni di utilizzo del sito UAI-UTCS: titolarità, proprietà intellettuale e limitazioni di responsabilità.",
      },
    ],
    links: [canonical("/note-legali")],
  }),
  component: NoteLegaliPage,
});

function NoteLegaliPage() {
  return (
    <>
      <PageHero
        eyebrow="Note Legali"
        title="Note Legali"
        description="Condizioni di utilizzo del sito, titolarità dei contenuti e limitazioni di responsabilità."
      />

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8 lg:py-20">
        <div className="space-y-10 text-muted-foreground leading-relaxed">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              1. Titolarità del sito
            </h2>
            <p className="mt-3">
              Il presente sito è di titolarità di UAI-UTCS – Unione Turismo Commercio e Servizi, con sede
              in Via Roma 1, 00100 Roma (Italia). Per ogni comunicazione è
              possibile scrivere a{" "}
              <a href="mailto:demo@example.com" className="text-primary hover:underline">
                demo@example.com
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              2. Proprietà intellettuale
            </h2>
            <p className="mt-3">
              I contenuti del sito (testi, immagini, loghi, marchi, grafica e codice) sono protetti
              dalle norme in materia di proprietà intellettuale e industriale e appartengono a UAI-UTCS o
              ai rispettivi titolari. È vietata la riproduzione, distribuzione o modifica, anche
              parziale, senza autorizzazione scritta. I loghi dei partner sono utilizzati con il
              consenso dei rispettivi titolari e restano di loro proprietà.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              3. Limitazione di responsabilità
            </h2>
            <p className="mt-3">
              UAI-UTCS si impegna affinché i contenuti del sito siano accurati e aggiornati, ma non
              garantisce l'assenza di errori o omissioni. Le informazioni hanno carattere generale e
              non sostituiscono la consulenza professionale. UAI-UTCS non è responsabile per eventuali
              danni derivanti dall'uso del sito o dall'impossibilità di accedervi.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              4. Collegamenti a siti terzi
            </h2>
            <p className="mt-3">
              Il sito può contenere collegamenti a siti web di terzi (ad esempio i partner della
              rete). UAI-UTCS non esercita alcun controllo su tali siti e non è responsabile dei loro
              contenuti né delle loro politiche di trattamento dei dati.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              5. Legge applicabile
            </h2>
            <p className="mt-3">
              L'utilizzo del sito è regolato dalla legge italiana. Per qualsiasi controversia è
              competente il foro del luogo in cui ha sede il Titolare, salvo diversa previsione
              inderogabile di legge.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
