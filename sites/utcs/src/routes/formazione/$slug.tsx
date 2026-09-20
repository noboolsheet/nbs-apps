import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { FORMAZIONE_TYPES, getFormazioneType } from "@/lib/formazione";
import { canonical, ogUrl } from "@/lib/seo";

export const Route = createFileRoute("/formazione/$slug")({
  head: ({ params }) => {
    const t = getFormazioneType(params.slug);
    return {
      meta: [
        { title: t ? `${t.title} – Formazione UAI-UTCS` : "Formazione – UAI-UTCS" },
        { name: "description", content: t?.text ?? "Modalità formative dell'ecosistema UAI-UTCS." },
        ogUrl(`/formazione/${params.slug}`),
      ],
      links: [canonical(`/formazione/${params.slug}`)],
    };
  },
  component: FormazioneDettaglioPage,
});

function FormazioneDettaglioPage() {
  const { slug } = Route.useParams();
  const type = getFormazioneType(slug);

  if (!type) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-24 lg:px-8 text-center">
        <h1 className="text-3xl font-bold">Tipo di formazione non trovato</h1>
        <p className="mt-4 text-muted-foreground">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <Button asChild className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/formazione">Torna alla formazione</Link>
        </Button>
      </section>
    );
  }

  const Icon = type.icon;
  const idx = FORMAZIONE_TYPES.findIndex((t) => t.slug === type.slug);
  const prev = idx > 0 ? FORMAZIONE_TYPES[idx - 1] : undefined;
  const next = idx < FORMAZIONE_TYPES.length - 1 ? FORMAZIONE_TYPES[idx + 1] : undefined;

  return (
    <>
      <PageHero eyebrow="Formazione" title={type.title} description={type.text}>
        <Button asChild variant="ghost" className="px-0 hover:bg-transparent hover:text-primary">
          <Link to="/formazione">
            <ArrowLeft className="mr-1 h-4 w-4" /> Torna alla formazione
          </Link>
        </Button>
      </PageHero>

      <section className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="h-7 w-7" />
        </div>

        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          {type.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {type.highlights.length > 0 && (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {type.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{h}</span>
              </li>
            ))}
          </ul>
        )}

        {type.sections && type.sections.length > 0 && (
          <div className="mt-14 space-y-12">
            {type.sections.map((s, si) => (
              <div key={si}>
                {s.title && (
                  <h2 className="font-display text-2xl font-semibold text-foreground">{s.title}</h2>
                )}
                {s.paragraphs?.map((p, pi) => (
                  <p key={pi} className="mt-4 text-muted-foreground leading-relaxed">
                    {p}
                  </p>
                ))}
                {s.items && s.items.length > 0 && (
                  <ul className="mt-6 space-y-3">
                    {s.items.map((it, ii) => (
                      <li
                        key={ii}
                        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                      >
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm leading-relaxed">
                          {it.label && (
                            <strong className="font-semibold text-foreground">{it.label}: </strong>
                          )}
                          <span className="text-muted-foreground">{it.text}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {type.documents && type.documents.length > 0 && (
          <div className="mt-10 space-y-2">
            {type.documents.map((d) => (
              <a
                key={d.href}
                href={d.href}
                target="_blank"
                rel="noreferrer"
                className="tap-44 flex w-fit items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                <Download className="h-4 w-4 shrink-0" /> {d.label}
              </a>
            ))}
          </div>
        )}

        {(prev || next) && (
          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-8">
            {prev && (
              <Button asChild variant="outline">
                <Link to="/formazione/$slug" params={{ slug: prev.slug }}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> {prev.title}
                </Link>
              </Button>
            )}
            {next && (
              <Button asChild variant="outline" className="ml-auto">
                <Link to="/formazione/$slug" params={{ slug: next.slug }}>
                  {next.title} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
