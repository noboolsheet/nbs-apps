// Dati dei tipi di formazione, condivisi tra l'elenco (`/formazione`) e le
// pagine di dettaglio (`/formazione/$slug`).

import { Monitor, Building2, HandCoins, Wifi, type LucideIcon } from "lucide-react";

export type FormazioneSection = {
  title?: string;
  paragraphs?: string[];
  items?: { label?: string; text: string }[];
};

export type FormazioneDocument = {
  label: string;
  href: string;
};

export type FormazioneType = {
  slug: string;
  icon: LucideIcon;
  title: string;
  text: string;
  body: string[];
  highlights: string[];
  sections?: FormazioneSection[];
  documents?: FormazioneDocument[];
};

export const FORMAZIONE_TYPES: FormazioneType[] = [
  {
    slug: "e-learning",
    icon: Monitor,
    title: "E-learning",
    text: "Corsi online sempre disponibili, fruibili da qualsiasi dispositivo, con attestato finale.",
    body: [
      "La formazione e-learning UAI-UTCS ti permette di seguire i corsi quando e dove vuoi, da computer, tablet o smartphone, senza vincoli di orario. È la soluzione ideale progettata da UAI-UTCS per ridurre i costi aziendali e ottimizzare l'aggiornamento professionale dei dipendenti.",
      "Ogni percorso è strutturato in moduli con materiali didattici multimediali e un approccio pratico ricco di esercitazioni, così da conciliare l'apprendimento con i ritmi di lavoro. Pur studiando a distanza, l'interattività dell'aula virtuale garantisce un costante dialogo con docenti e colleghi.",
      "Che tu sia un imprenditore che deve formare il personale di più sedi, un professionista con poco tempo a disposizione o un docente che vuole trasmettere le proprie competenze, la nostra piattaforma si adatta perfettamente alle tue esigenze specifiche.",
    ],
    highlights: [
      "Accesso 24/7 da qualsiasi dispositivo",
      "Attestato finale al termine del corso",
      "Materiali didattici sempre consultabili",
      "Test di autovalutazione online con webcam",
    ],
    sections: [
      {
        title: "Modalità di erogazione",
        paragraphs: [
          "Per garantire la massima flessibilità, i nostri corsi utilizzano due metodologie di insegnamento complementari. I materiali di entrambe le modalità rimangono sempre disponibili nella tua area riservata e non vengono cancellati:",
        ],
        items: [
          {
            label: "Lezioni in live streaming (in diretta)",
            text: "Interazione in tempo reale tra studenti e docenti, con la stessa efficacia di una lezione frontale, ed esami a distanza in diretta per certificare le competenze acquisite.",
          },
          {
            label: "Lezioni on-demand (pre-registrate)",
            text: "Video lezioni pronte all'uso, ideali per chi ha poco tempo e vuole gestire lo studio in totale autonomia, con contenuti strutturati in modo chiaro e sempre disponibili.",
          },
        ],
      },
      {
        title: "Tipologia dei contenuti",
        items: [
          {
            label: "Contenuti dinamici",
            text: "Video, webinar e conferenze interattive che si aggiornano automaticamente in base al tuo avanzamento.",
          },
          {
            label: "Contenuti statici",
            text: "Documenti di supporto, dispense e file PDF scaricabili per approfondire i concetti studiati.",
          },
        ],
      },
    ],
  },
  {
    slug: "formazione-aziendale",
    icon: Building2,
    title: "Formazione Aziendale",
    text: "Percorsi personalizzati realizzati direttamente presso la tua azienda.",
    body: [
      "UAI-T.C.S. sostiene le imprese analizzando i loro fabbisogni specifici per sviluppare progetti formativi su misura. Identifichiamo lo strumento ideale per accedere ai finanziamenti e realizziamo piani didattici con docenti specializzati, azzerando i costi a carico dell'azienda.",
      "Gestiamo e coordiniamo l'intero percorso organizzando le lezioni presso le sedi dell'associazione o direttamente nei tuoi uffici. Ogni corso è totalmente personalizzabile per singole aziende o gruppi di imprese in termini di contenuti, durata e orari.",
    ],
    highlights: [
      "Analisi dei fabbisogni reali dell'azienda",
      "Finanziamento totale: formazione a costo zero",
      "Corsi in azienda o nelle nostre sedi, orari flessibili",
      "Docenti qualificati e programmi su misura",
    ],
    sections: [
      {
        title: "Sicurezza sul lavoro (D.Lgs. 81/08)",
        paragraphs: [
          "La sicurezza sul lavoro in Italia è regolata dal Testo Unico (D.Lgs. 81/08), che abilita le associazioni sindacali dei datori di lavoro come UAI-T.C.S. alla gestione della sicurezza aziendale. L'obiettivo fondamentale è azzerare o ridurre al minimo i rischi professionali, prevenendo infortuni e incidenti.",
          "La responsabilità della sicurezza è condivisa: il datore di lavoro deve garantire un ambiente conforme, mentre dipendenti e collaboratori sono tenuti a mantenere comportamenti corretti in base alle proprie mansioni.",
          "Gli obblighi principali in sintesi:",
        ],
        items: [
          {
            label: "Valutazione dei rischi (DVR)",
            text: "Analisi preventiva dei rischi aziendali e implementazione delle misure di tutela.",
          },
          {
            label: "Sorveglianza sanitaria",
            text: "Monitoraggio continuo della salute dei lavoratori ove previsto dalla legge.",
          },
          {
            label: "Collaborazione strategica",
            text: "Coordinamento attivo tra Datore di Lavoro, RSPP e RLS.",
          },
          {
            label: "Strumenti e prevenzione",
            text: "Dotazione di accorgimenti e dispositivi di protezione idonei al tipo di attività.",
          },
        ],
      },
    ],
  },
  {
    slug: "formazione-finanziata",
    icon: HandCoins,
    title: "Formazione Finanziata",
    text: "Corsi a costo zero finanziati da Fondo Conoscenza e altri fondi interprofessionali.",
    body: [
      "Il Fondo Conoscenza permette alle imprese di finanziare la formazione continua dei propri dipendenti a costo zero, utilizzando la quota dello 0,30% già versata all'INPS.",
    ],
    highlights: [
      "Corsi a costo zero per l'azienda",
      "Gestione completa della pratica",
      "Adesione al fondo inclusa",
      "Piani formativi su misura",
    ],
    sections: [
      {
        title: "Chi può aderire e chi sono i destinatari?",
        items: [
          {
            label: "Chi può aderire",
            text: "Tutti i datori di lavoro del settore privato e della pubblica amministrazione, indipendentemente dal settore economico o dal comparto produttivo.",
          },
          {
            label: "Destinatari della formazione",
            text: "Tutti i dipendenti per i quali sussiste l'obbligo del contributo integrativo dello 0,30% (art. 25 L. 845/78).",
          },
        ],
      },
      {
        title: "Come aderire (codice fondo: FCON)",
        paragraphs: [
          "L'adesione è gratuita, valida fino a revoca e può essere effettuata in qualsiasi mese dell'anno dal consulente del lavoro (o da chi elabora le buste paga) tramite i canali di comunicazione obbligatoria INPS.",
        ],
        items: [
          {
            label: "Tramite UNIEMENS (aziende in generale)",
            text: "Se non aderisci a nessun fondo: nell'elemento FondoInterprof seleziona Adesione, inserisci il codice FCON e indica il numero dei dipendenti. Se provieni da un altro fondo: seleziona prima Revoca con il codice REVO, poi il codice FCON con il numero dei dipendenti.",
          },
          {
            label: "Tramite DMAG / POSAGRI (aziende agricole)",
            text: "Se non aderisci a nessun fondo: in Gestioni Speciali > Fondi Interprofessionali clicca su «Nuova Adesione» e seleziona il codice FCON. Se provieni da un altro fondo: seleziona prima Revoca e poi inserisci il codice FCON.",
          },
        ],
      },
      {
        title: "Portabilità: passa a Fondo Conoscenza senza perdere i tuoi fondi",
        paragraphs: [
          "Se decidi di trasferire la tua adesione da un altro fondo a Fondo Conoscenza, puoi recuperare e trasferire il 70% delle quote già accantonate, alle seguenti condizioni:",
        ],
        items: [
          {
            text: "L'azienda non deve rientrare nella definizione comunitaria di micro e piccola impresa nei 3 anni precedenti.",
          },
          {
            text: "L'importo da trasferire deve essere di almeno 3.000,00 € (al netto di eventuali finanziamenti già ricevuti per piani formativi).",
          },
          {
            text: "Le quote da trasferire non devono essere antecedenti al 1° gennaio 2009.",
          },
        ],
      },
      {
        paragraphs: [
          "Alla luce del Decreto Direttoriale n. 227 dell'11 maggio 2026, le Aziende che abbiano aderito a Fondo Conoscenza, ai fini della formalizzazione dell'adesione e nel rispetto della normativa vigente, devono trasmettere apposita comunicazione tramite PEC, dall'indirizzo PEC aziendale all'indirizzo demo@example.com, allegando la seguente documentazione:",
        ],
        items: [
          { text: "copia del documento di identità, in corso di validità, del legale rappresentante;" },
          { text: "modello fac-simile;" },
          { text: "copia della denuncia contributiva INPS (UNIEMENS/PosAgri)." },
        ],
      },
      {
        paragraphs: [
          "L'azienda che abbia manifestato la propria adesione ad un fondo interprofessionale non potrà attivare una nuova procedura di adesione o mobilità nei successivi 12 mesi.",
        ],
      },
      {
        paragraphs: [
          "Scarica i seguenti documenti, compilali e inviali alla nostra email:",
        ],
      },
    ],
    documents: [
      {
        label: "Modello di PEC di adesione delle aziende (DOCX)",
        href: "/documents/Modello-di-Pec-di-adesione-delle-aziende.docx",
      },
      {
        label: "Manifestazione di interesse FCON (PDF)",
        href: "/documents/MANIFESTAZIONE_DI_INTERESSE_FCON_EDIT.pdf",
      },
    ],
  },
  {
    slug: "corsi-in-fad",
    icon: Wifi,
    title: "Corsi in FAD",
    text: "Formazione a distanza sincrona con docenti qualificati in aula virtuale.",
    body: [
      "La formazione a distanza (FAD) in modalità sincrona riproduce l'aula tradizionale in un ambiente virtuale, in diretta con il docente.",
      "Puoi interagire, fare domande e confrontarti con gli altri partecipanti in tempo reale, comodamente da remoto.",
      "È la modalità adatta ai corsi che richiedono tracciabilità della presenza e interazione, mantenendo la comodità del collegamento online.",
    ],
    highlights: [
      "Lezioni in diretta con il docente",
      "Interazione in tempo reale",
      "Presenza tracciata a norma",
      "Nessuno spostamento necessario",
    ],
  },
];

export function getFormazioneType(slug: string): FormazioneType | undefined {
  return FORMAZIONE_TYPES.find((t) => t.slug === slug);
}
