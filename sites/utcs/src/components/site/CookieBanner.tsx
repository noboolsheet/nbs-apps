import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { type ConsentValue, readConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!readConsent()) setShow(true);
  }, []);

  const set = (value: ConsentValue) => {
    writeConsent(value);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-6 md:bottom-6 md:max-w-md">
      <div className="rounded-xl border border-border bg-popover p-5 shadow-[var(--shadow-elegant)]">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary-soft p-2 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground">Utilizziamo i cookie</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Questo sito utilizza cookie tecnici e, previo consenso, cookie di profilazione per
              migliorare la tua esperienza di navigazione, in conformità al GDPR.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => set("accepted")} className="tap-44 bg-primary text-primary-foreground hover:bg-primary/90">
                Accetta tutti
              </Button>
              <Button size="sm" variant="outline" onClick={() => set("rejected")} className="tap-44">
                Rifiuta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}