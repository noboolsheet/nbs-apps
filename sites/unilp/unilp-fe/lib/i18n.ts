export const languages = {
  it: 'Italiano',
  es: 'Español',
  en: 'English'
} as const

export type Language = keyof typeof languages

type LegalSection = {
  heading: string
  paragraphs?: string[]
  items?: string[]
}

type LegalDocument = {
  title: string
  lastUpdatedLabel: string
  sections: LegalSection[]
}

export const translations = {
  it: {
    metadata: {
      title: 'U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati',
      description: 'Organizzazione sindacale nazionale unitaria, democratica ed autonoma che promuove la libera associazione e l\'autotutela solidale e collettiva degli iscritti.'
    },
    common: {
      openMenu: 'Apri menu',
      closeMenu: 'Chiudi menu',
      close: 'Chiudi',
      prevImage: 'Immagine precedente',
      nextImage: 'Immagine successiva',
      goToSlide: 'Vai alla slide {n}',
      openInMaps: 'Apri in Google Maps',
      visitSite: 'Visita il sito',
      skipToContent: 'Salta al contenuto',
      mainNavigation: 'Navigazione principale',
      toggleTheme: 'Cambia tema',
      lightMode: 'Tema chiaro',
      darkMode: 'Tema scuro'
    },
    nav: {
      home: 'Home',
      chiSiamo: 'Chi Siamo',
      servizi: 'I Nostri Servizi',
      lavoratori: 'I Nostri Lavoratori',
      iscrizione: 'Modulo Iscrizione',
      contatti: 'Contatti'
    },
    hero: {
      label: 'Unione Nazionale Italiana Lavoratori e Pensionati',
      headline: 'Difendiamo i diritti dei lavoratori e dei pensionati italiani, in Italia e all\'estero.',
      lede: 'Pratiche pensionistiche, 730, ISEE, assistenza contrattuale. Servizi concreti per chi lavora e per chi ha lavorato.',
      primaryCta: 'Diventa socio',
      secondaryCta: 'Contattaci',
      imageAlt: 'Lavoratori impegnati nella loro attività'
    },
    chiSiamoSection: {
      paragraph1: 'L\'U.N.I.L.P. è una Confederazione Sindacale inserita in un network di relazioni internazionali, nata per rappresentare e tutelare gli interessi di tutti i lavoratori e le lavoratrici dipendenti, di ogni categoria e con qualsiasi tipologia contrattuale, sia in Italia sia in Europa. La Confederazione si propone, inoltre, di rappresentare i diritti e le rivendicazioni di tutti i pensionati, di qualsiasi nazionalità, che ne condividano e rispettino lo Statuto.',
      button: 'Scopri di più su di noi'
    },
    chiSiamo: {
      title: 'Chi Siamo',
      kicker: 'L\'organizzazione',
      subtitle: 'La nostra storia e i nostri valori',
      imageAlt: 'Il team U.N.I.L.P. al servizio dei lavoratori',
      description: 'L\'U.N.I.L.P. è una Confederazione Sindacale nazionale, unitaria, democratica e autonoma. Operando all\'interno di un consolidato network di relazioni internazionali, l\'unione si configura come un soggetto sociale in forte crescita, guidato da un progetto moderno e pronto a rispondere alle sfide del nuovo secolo. In quanto associazione senza fini di lucro, l\'U.N.I.L.P. promuove la libera associazione e l\'autotutela solidale e collettiva dei propri iscritti, ponendo sempre al centro il rispetto dei valori della persona e della dignità umana.',
      values: {
        title: 'I Nostri Valori',
        kicker: 'Valori',
        items: [
          { title: 'Pace e Solidarietà', description: 'Consideriamo la pace il bene supremo dell\'umanità e affermiamo il valore della solidarietà all\'interno di una società sempre più plurietnica, equa e priva di discriminazioni.'},
          { title: 'Pluralismo e Democrazia', description: 'Sosteniamo la necessità di regole certe che garantiscano la libera circolazione delle idee, il rispetto delle minoranze e il confronto sereno e democratico.' },
          { title: 'Partecipazione Attiva', description: 'La vita democratica della nostra Confederazione si fonda sul coinvolgimento diretto di ogni iscritto, garantendo a tutti pari opportunità e uguali diritti.' }
        ]
      },
      mission: {
        title: 'La Nostra Missione',
        kicker: 'Missione',
        imageAlt: 'Operatrice U.N.I.L.P. che assiste un iscritto al telefono',
        description: 'La nostra priorità è la rappresentanza e la cura degli interessi di tutti i lavoratori e le lavoratrici dipendenti, in Italia e in Europa, appartenenti a qualsiasi categoria e con ogni tipologia contrattuale. Al contempo, tuteliamo i diritti e le rivendicazioni di tutti i pensionati, di qualsiasi nazionalità, che ne rispettino lo Statuto. Ci impegniamo quotidianamente a trattare con le controparti tutto ciò che riguarda il trattamento economico e previdenziale dei lavoratori e dei pensionati, vigilando sulle loro condizioni di vita e sul loro benessere complessivo. Inoltre, l\'U.N.I.L.P. si batte fermamente contro ogni forma de sfruttamento e di lavoro clandestino o minorile, promuovendo la piena dignità professionale e sostenendo politiche attive volte al raggiungimento della piena occupazione.'
      }
    },
    servicesList: {
      title: 'I Nostri Servizi',
      subtitle: 'Scopri tutti i servizi che offriamo ai nostri iscritti per supportarli nel mondo del lavoro',
      viewAll: 'Scopri tutti i servizi',
      items: [
        'Formazione Finanziata',
        'Assistenza Welfare',
        'Ass. fiscale e previdenziale',
        'Dimissioni telematiche',
        'Sicurezza sul lavoro',
        'Conciliazioni',
        'Contratti aziendali',
        'Servizi di Patronato'
      ]
    },
    partners: {
      title: 'I Nostri Partner',
      subtitle: 'Collaboriamo con organizzazioni di eccellenza per offrire i migliori servizi ai nostri iscritti',
      items: [
        {
          id: 'efesto',
          name: 'EFESTO',
          fullName: 'Ente di Formazione Europeo Settori Tecnici e Orientamento',
          description: 'Offre corsi di formazione, eventi, webinar e stage aziendali rivolti a tutti coloro che desiderano apprendere nuove competenze in campo imprenditoriale.'
        }
      ]
    },
    map: {
      title: 'Dove Siamo',
      subtitle: 'Vieni a trovarci nella nostra sede o contattaci per un appuntamento',
      addressLabel: 'Indirizzo',
      address: 'Via Roma 1, 00100 - Roma, Italia',
      phoneLabel: 'Telefono',
      phone: '+39 000 000 000',
      hoursTitle: 'Orari di Apertura',
      iframeTitle: 'Mappa sede U.N.I.L.P. - Via Roma 1, Roma',
      hours: [
        { day: 'Lunedì - Venerdì', time: '09:00 - 13:00 / 14:30 - 18:30' },
        { day: 'Sabato', time: 'Chiuso' },
        { day: 'Domenica', time: 'Chiuso' }
      ],
      closed: 'Chiuso',
      consent: {
        message: 'Per mostrare la mappa interattiva carichiamo Google Maps, che imposta dei cookie. Caricala qui sotto oppure aprila in una nuova scheda.',
        action: 'Carica la mappa'
      }
    },
    faq: {
      title: 'Hai delle domande?',
      subtitle: 'Consulta le risposte alle domande frequenti e, se hai ancora dubbi, non esitare a contattarci.',
      items: [
        {
          question: 'Cos\'è la conciliazione in sede sindacale e come funziona?',
          answer: 'È un canale di mediazione che permette di risolvere una controversia tra lavoratore e datore di lavoro senza ricorrere al giudice. Oggetto della disputa possono essere tutte le questioni legate al rapporto di lavoro, come differenze retributive, passaggi di livello o contestazioni disciplinari. L\'obiettivo finale è il raggiungimento di un accordo transattivo, tutelato dal sindacato, che soddisfi entrambe le parti, solitamente attraverso una compensazione economica.'
        },
        {
          question: 'Quali sono i requisiti per iscriversi all\'Ente?',
          answer: 'Come associazione senza fini di lucro, promuove la libera associazione e l\'autotutela solidale e collettiva dei propri iscritti. Per iscriversi all\'U.N.I.L.P. è necessario essere un lavoratore dipendente, un pensionato o un lavoratore autonomo ed è sufficiente compilare il modulo di iscrizione disponibile nella sezione dedicata del sito e consegnarlo presso la nostra sede o inviarlo via email.'
        },
        {
          question: 'Quali sono i requisiti standard per andare in pensione?',
          answer: 'In Italia è possibile accedere al pensionamento generalmente tramite la pensione di vecchiaia e la pensione anticipata. La pensione di vecchiaia si raggiunge con almeno 20 anni di contributi all\'età di 67 anni. La pensione anticipata non dipende dall\'età ma dai contributi: gli uomini hanno la possibilità di andare in pensione con 42 anni e 10 mesi di contributi a qualsiasi età ; le donne invece con 41 anni e 10 mesi di contributi a qualsiasi età.'
        },
        {
          question: 'Quali sono i vantaggi del welfare aziendale?',
          answer: 'Introdotto dalla Legge di Stabilità 2016, questo strumento consente al lavoratore di convertire il premio di risultato (o la partecipazione agli utili) in beni e servizi di welfare, beneficiando di un\'importante agevolazione fiscale e contributiva. Un piano di welfare aziendale, infatti, riduce efficacemente il cuneo fiscale sia per l\'azienda sia per il dipendente. Da un lato aumenta il potere d\'acquisto del lavoratore, dall\'altro migliora il clima aziendale e la conciliazione vita-lavoro (work-life balance), generando un impatto positivo e misurabile sulla produttività dell \'intera impresa.'
        }
      ]
    },
    servicesPage: {
      hero: {
        title: 'I Nostri Servizi',
        kicker: 'I Nostri Servizi',
        subtitle: 'Supporto completo per lavoratori, pensionati e aziende'
      },
      items: [
        {
          id: 'formazione-finanziata',
          title: 'Formazione Finanziata',
          description: 'La formazione continua è uno strumento fondamentale per garantire l\'occupabilità e accrescere la professionalità delle persone, favorendo l\'adattamento a un mercato del lavoro in costante evoluzione. Questo sistema, rivolto anche ai lavoratori già occupati, punta all\'aggiornamento e allo sviluppo di competenze e conoscenze strategiche. L\'obiettivo è rispondere efficacemente alle innovazioni tecnologiche, ai modelli organizzativi emergenti del sistema produttivo e a tutti i cambiamenti che interessano lo scenario lavorativo attuale.'
        },
        {
          id: 'assistenza-welfare',
          title: 'Assistenza Welfare',
          description: 'Il welfare aziendale è un sistema di benefit e soluzioni promosso dal datore di lavoro per incrementare il benessere del dipendente e della sua famiglia. Questo termine include sia le iniziative nate dalla contrattazione collettiva sia le misure adottate unilateralmente dall\'azienda. Tali interventi possono tradursi in una più efficiente ottimizzazione della retribuzione, nell\'erogazione di bonus economici o, più frequentemente, nell\'offerta di beni e servizi specifici (come sanità integrativa, previdenza, istruzione e tempo libero).'
        },
        {
          id: 'assistenza-fiscale',
          title: 'Assistenza Fiscale e Previdenziale',
          description: 'L’assistenza fiscale è un servizio rivolto a dipendenti e pensionati, erogato attraverso i Centri di Assistenza Fiscale (CAF). Questo supporto copre tutti gli adempimenti relativi alla dichiarazione dei redditi (tramite Modello 730 o Modello Redditi PF / ex UNICO) e la compilazione dell\'attestazione ISEE.'
        },
        {
          id: 'dimissioni-telematiche',
          title: 'Dimissioni Telematiche',
          description: 'In Italia, le dimissioni volontarie e la risoluzione consensuale del rapporto di lavoro devono essere presentate esclusivamente per via telematica. Questa procedura online, introdotta per contrastare efficacemente il fenomeno delle "dimissioni in bianco" (a tutela soprattutto delle lavoratrici e dei lavoratori più vulnerabili), si effettua tramite il portale del Ministero del Lavoro e delle Politiche Sociali. Presso le nostre sedi, offriamo il supporto necessario per inviare la comunicazione in modo corretto, sicuro e guidato.'
        },
        {
          id: 'sicurezza-lavoro',
          title: 'Sicurezza sul Lavoro',
          description: 'Il D.Lgs. 81/2008 è il testo normativo di riferimento che regolamenta la sicurezza e la salute nei luoghi di lavoro. La sua applicazione si estende a tutti i settori di attività, sia privati sia pubblici, e tutela tutti i lavoratori e le lavoratrici (subordinati e autonomi), nonché i soggetti a essi equiparati.'
        },
        {
          id: 'conciliazioni',
          title: 'Conciliazioni',
          description: 'La conciliazione in sede sindacale è una procedura volta a risolvere bonariamente una controversia tra lavoratore e datore di lavoro. Attraverso un accordo transattivo, le parti definiscono la disputa senza ricorrere alla giustizia ordinaria, garantendo al lavoratore un adeguato ristoro economico a fronte della rinuncia a far valere ulteriori pretese sui diritti oggetto dell\'accordo.'
        },
        {
          id: 'contratti-aziendali',
          title: 'Contratti Aziendali',
          description: 'Il contratto collettivo aziendale è l\'accordo stipulato tra un singolo datore di lavoro (eventualmente assistito dalla propria associazione datoriale) e una rappresentanza dei lavoratori. In assenza di una disciplina legislativa rigida sui soggetti abilitati alla contrattazione, vige il principio della libertà di coalizione: la rappresentanza può essere costituita da qualsiasi aggregazione di lavoratori, anche non formalmente strutturata in modo stabile. Il requisito essenziale è che tale rappresentanza persegua l\'obiettivo di tutelare l\'interesse collettivo di tutto il personale dell\'azienda, presente e futuro.'
        },
        {
          id: 'servizi-patronato',
          title: 'Servizi di Patronato',
          description: 'Il patronato si propone come uno strumento sociale di informazione, assistenza e tutela in favore di lavoratori autonomi o dipendenti, pensionati e singoli cittadini (italiani, stranieri e apolidi) residenti nel territorio dello Stato. Hanno anche poteri di rappresentanza ed operano senza scopo di lucro. La nostra attività di consulenza, di assistenza e di tutela, per il conseguimento delle prestazioni in materia previdenziale, per l\'ottenimento delle prestazioni erogate dal Servizio sanitario nazionale e per le prestazioni di carattere socio-assistenziale, riguarda: Pensioni lavoratori dipendenti ed autonomi, Fondi speciali di previdenza, Pensioni in convenzione internazionale, Pensioni pubblici dipendenti, Contribuzione, Altri enti previdenziali, Le prestazioni a sostegno del reddito, La disoccupazione, Infortunistica e altre prestazioni.'
        }
      ],
      cta: {
        title: 'Hai bisogno di uno dei nostri servizi?',
        subtitle: 'Contattaci per maggiori informazioni o per fissare un appuntamento con i nostri esperti',
        kicker: 'Adesione',
        contact: 'Contattaci',
        register: 'Iscriviti ora'
      }
    },
    lavoratori: {
      title: 'I Nostri Lavoratori',
      kicker: 'Lavoratori',
      subtitle: 'Risorse e supporto per i nostri iscritti',
      description: 'Offriamo una vasta gamma di servizi e risorse per supportare i lavoratori e i pensionati iscritti alla nostra organizzazione.',
      intro: 'L\'U.N.I.L.P. esercita una costante attività di tutela dei lavoratori attraverso una presenza attiva in ogni fase della vita professionale. La nostra azione sindacale si concretizza nella stipula dei Contratti Collettivi Nazionali di Lavoro (CCNL), nell\'organizzazione di assemblee e nello sviluppo della contrattazione territoriale e aziendale, garantendo inoltre un\'attenta gestione dei fondi previdenziali di categoria.',
      benefits: {
        title: 'Offriamo supporto specialistico e assistenza personalizzata per una vasta gamma di esigenze, tra cui:',
        kicker: 'Vantaggi',
        items: [
          'Consulenza Contrattuale',
          'Controllo Buste Paga',
          'Gestione del Rapporto di Lavoro',
          'Licenziamento',
          'Sostegno al Reddito',
          'Assistenza Pensionistica',
          'Vertenze e Supporto Legale',          
          'Domande per indennità di disoccupazione'
        ]
      },
      categories: {
        title: 'Categorie Rappresentate',
        kicker: 'Settori',
        items: [
          { id: 'commercio', title: 'Commercio', description: 'Tutela dei lavoratori del settore commerciale, dalla grande distribuzione ai negozi al dettaglio, garantendo diritti contrattuali e condizioni di lavoro eque.' },
          { id: 'agricoltura', title: 'Agricoltura Innovativa', description: 'Supporto ai lavoratori dell\'agricoltura moderna e sostenibile, promuovendo l\'innovazione tecnologica e la tutela dei diritti nel settore primario.' },
          { id: 'enti-scuole', title: 'Enti e Scuole', description: 'Assistenza al personale scolastico e degli enti pubblici, dalla tutela contrattuale alla gestione delle pratiche amministrative e previdenziali.' },
          { id: 'edilizia', title: 'Edilizia e Artigianato', description: 'Rappresentanza dei lavoratori edili e artigiani, con particolare attenzione alla sicurezza sul lavoro e alla formazione professionale continua.' },
          { id: 'terziario', title: 'Terziario Avanzato', description: 'Tutela dei professionisti del terziario avanzato, dai servizi finanziari alla consulenza, garantendo contratti adeguati alle nuove forme di lavoro.' },
          { id: 'servizi', title: 'Servizi Avanzati', description: 'Supporto ai lavoratori del settore tecnologico e dei servizi digitali, affrontando le sfide dello smart working e delle nuove professioni digitali.' },
          { id: 'pubblici-esercizi', title: 'Pubblici Esercizi', description: 'Assistenza ai lavoratori di bar, ristoranti e strutture ricettive, tutelando i diritti in un settore caratterizzato da orari flessibili e stagionalità.' },
          { id: 'sanita', title: 'Sanità Privata', description: 'Rappresentanza del personale sanitario delle strutture private, garantendo condizioni di lavoro adeguate e tutela professionale.' }
        ]
      },
      cta: {
        title: 'Vuoi far parte della nostra organizzazione?',
        subtitle: 'Iscriviti oggi e inizia a beneficiare di tutti i nostri servizi',
        kicker: 'Adesione',
        button: 'Iscriviti Ora'
      }
    },
    iscrizione: {
      title: 'Modulo di Iscrizione',
      kicker: 'Adesione',
      subtitle: 'Unisciti a noi',
      description: 'Per iscriverti all\'U.N.I.L.P., scarica il modulo di iscrizione, compilalo e invialo alla nostra sede tramite e-mail.',
      download: 'Scarica il Modulo',
      documentTitle: 'Modulo di Iscrizione U.N.I.L.P.',
      documentSubtitle: 'PDF - Documento ufficiale per l\'iscrizione',
      instructions: {
        title: 'Istruzioni per l\'Iscrizione',
        kicker: 'Procedura',
        steps: [
          'Scarica il modulo di iscrizione cliccando sul pulsante sopra',
          'Stampa il modulo e compilalo in tutte le sue parti',
          'Firma il modulo nei campi indicati',
          'Inviaci il modulo compilato tramite e-mail: demo@example.com'
        ]
      }
    },
    contatti: {
      title: 'Contattaci',
      kicker: 'Contatti',
      subtitle: 'Siamo qui per aiutarti',
      description: 'Compila il modulo sottostante per inviarci un messaggio. Ti risponderemo il prima possibile.',
      form: {
        name: 'Nome e Cognome',
        email: 'Email',
        message: 'Messaggio',
        submit: 'Invia Messaggio',
        submitting: 'Invio in corso...',
        success: 'Messaggio inviato con successo! Ti risponderemo al più presto.',
        error: 'Si è verificato un errore durante l\'invio. Riprova più tardi.',
        sendAnother: 'Invia un altro messaggio',
        namePlaceholder: 'Inserisci il tuo nome',
        emailPlaceholder: 'Inserisci la tua email',
        messagePlaceholder: 'Scrivi il tuo messaggio...',
        privacyConsentPrefix: 'Ho letto e accetto la ',
        privacyConsentLink: 'Privacy Policy',
        privacyConsentSuffix: ' e acconsento al trattamento dei miei dati personali.',
        errors: {
          name: 'Inserisci il tuo nome completo.',
          email: 'Inserisci un\'email valida.',
          message: 'Il messaggio deve avere almeno 10 caratteri.',
          privacyConsent: 'Devi accettare l\'informativa sulla privacy per procedere.'
        }
      },
      info: {
        title: 'Informazioni di Contatto',
        emailLabel: 'Email',
        phoneLabel: 'Telefono',
        whatsappLabel: 'WhatsApp',
        websiteLabel: 'Sito web',
        email: 'demo@example.com',
        phone: '+39 000 000 000',
        whatsapp: '+39 000 000 000',
        website: 'unilp.noboolsheet.local'
      }
    },
    footer: {
      description: 'Organizzazione sindacale nazionale unitaria, democratica ed autonoma che promuove la libera associazione e l\'autotutela solidale e collettiva degli iscritti.',
      links: 'Link Utili',
      legal: 'Informazioni Legali',
      privacy: 'Privacy Policy',
      cookies: 'Cookie Policy',
      terms: 'Note Legali',
      partners: 'I Nostri Partner Istituzionali',
      rights: 'Tutti i diritti riservati.'
    },
    cookies: {
      message: 'Utilizziamo i cookie per migliorare la tua esperienza di navigazione. Continuando a utilizzare il nostro sito, accetti l\'uso dei cookie.',
      accept: 'Accetta',
      decline: 'Rifiuta',
      learnMore: 'Scopri di più'
    },
    chat: {
      launcher: 'Apri la chat di assistenza',
      title: 'Assistente Virtuale',
      close: 'Chiudi la chat',
      greeting: 'Ciao, sono Marco, il tuo assistente virtuale di Intelligenza Artificiale e sono qui per tutto ciò di cui hai bisogno. Come posso aiutarti oggi?',
      placeholder: 'Scrivi la tua domanda...',
      send: 'Invia',
      sending: 'Sto scrivendo...',
      error: 'Si è verificato un errore. Riprova più tardi.',
      unavailable: 'Il servizio di chat non è al momento disponibile.'
    },
    notFound: {
      title: 'Pagina non trovata',
      description: 'La pagina che stai cercando non esiste o è stata spostata.',
      action: 'Torna alla home'
    },
    error: {
      title: 'Si è verificato un errore',
      description: 'Qualcosa è andato storto. Riprova oppure torna alla home.',
      retry: 'Riprova',
      action: 'Torna alla home'
    },
    legal: {
      privacy: {
        title: 'Privacy Policy',
        lastUpdatedLabel: 'Ultimo aggiornamento',
        sections: [
          {
            heading: '1. Titolare del Trattamento',
            paragraphs: ['Il Titolare del trattamento dei dati personali è U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati.']
          },
          {
            heading: '2. Tipologie di Dati Raccolti',
            paragraphs: ['I dati personali raccolti da questo sito web includono: nome, cognome, indirizzo email e qualsiasi altra informazione fornita volontariamente dall\'utente attraverso i moduli di contatto.']
          },
          {
            heading: '3. Finalità del Trattamento',
            paragraphs: ['I dati personali degli utenti sono raccolti per le seguenti finalità:'],
            items: [
              'Rispondere alle richieste di informazioni',
              'Gestire le iscrizioni all\'organizzazione',
              'Inviare comunicazioni relative ai servizi offerti'
            ]
          },
          {
            heading: '4. Base Giuridica del Trattamento',
            paragraphs: ['Il trattamento dei dati personali si basa sul consenso dell\'interessato ai sensi dell\'art. 6, par. 1, lett. a) del Regolamento UE 679/2016 (GDPR).']
          },
          {
            heading: '5. Diritti dell\'Interessato',
            paragraphs: ['Ai sensi degli articoli 15-22 del GDPR, l\'interessato ha il diritto di:'],
            items: [
              'Accedere ai propri dati personali',
              'Richiedere la rettifica dei dati inesatti',
              'Richiedere la cancellazione dei dati',
              'Richiedere la limitazione del trattamento',
              'Opporsi al trattamento',
              'Richiedere la portabilità dei dati'
            ]
          },
          {
            heading: '6. Contatti',
            paragraphs: ['Per esercitare i propri diritti o per qualsiasi informazione relativa al trattamento dei dati personali, è possibile contattare il Titolare all\'indirizzo email: demo@example.com']
          }
        ]
      } as LegalDocument,
      cookies: {
        title: 'Cookie Policy',
        lastUpdatedLabel: 'Ultimo aggiornamento',
        sections: [
          {
            heading: '1. Cosa sono i Cookie',
            paragraphs: ['I cookie sono piccoli file di testo che vengono memorizzati sul dispositivo dell\'utente quando visita un sito web. Vengono utilizzati per migliorare l\'esperienza di navigazione e per raccogliere informazioni sull\'utilizzo del sito.']
          },
          {
            heading: '2. Cookie Tecnici',
            paragraphs: ['Questi cookie sono essenziali per il corretto funzionamento del sito web e non possono essere disattivati. Includono cookie di sessione e cookie per memorizzare le preferenze dell\'utente.']
          },
          {
            heading: '3. Cookie Analitici',
            paragraphs: ['Questi cookie ci permettono di contare le visite e le fonti di traffico per poter misurare e migliorare le prestazioni del nostro sito.']
          },
          {
            heading: '4. Gestione dei Cookie',
            paragraphs: ['L\'utente può gestire le preferenze relative ai cookie attraverso il banner di consenso che appare alla prima visita del sito, oppure attraverso le impostazioni del proprio browser.']
          },
          {
            heading: '5. Disattivazione dei Cookie',
            paragraphs: ['La maggior parte dei browser accetta automaticamente i cookie, ma l\'utente può modificare le impostazioni del browser per rifiutarli. La disattivazione dei cookie potrebbe influire sulla funzionalità di alcune parti del sito.']
          },
          {
            heading: '6. Contatti',
            paragraphs: ['Per qualsiasi domanda relativa all\'utilizzo dei cookie su questo sito, è possibile contattarci all\'indirizzo email: demo@example.com']
          }
        ]
      } as LegalDocument,
      avisoLegal: {
        title: 'Note Legali',
        lastUpdatedLabel: 'Ultimo aggiornamento',
        sections: [
          {
            heading: '1. Identificazione',
            paragraphs: ['In conformità con la normativa vigente, si comunicano i seguenti dati identificativi del titolare di questo sito web:'],
            items: [
              'Denominazione: U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati',
              'Email: demo@example.com',
              'Sito web: unilp.noboolsheet.local'
            ]
          },
          {
            heading: '2. Proprietà Intellettuale',
            paragraphs: [
              'Tutti i contenuti presenti su questo sito web, inclusi testi, immagini, grafiche, loghi e qualsiasi altro materiale, sono di proprietà di U.N.I.L.P. o dei rispettivi titolari dei diritti e sono protetti dalla normativa sulla proprietà intellettuale.',
              'È vietata la riproduzione, distribuzione, trasformazione o comunicazione pubblica dei contenuti senza l\'autorizzazione scritta del titolare.'
            ]
          },
          {
            heading: '3. Responsabilità',
            paragraphs: ['U.N.I.L.P. non si assume alcuna responsabilità derivante dall\'uso improprio dei contenuti presenti su questo sito web. L\'organizzazione si riserva il diritto di modificare, aggiornare o eliminare in qualsiasi momento i contenuti del sito senza preavviso.']
          },
          {
            heading: '4. Collegamenti Esterni',
            paragraphs: ['Questo sito web può contenere collegamenti a siti esterni. U.N.I.L.P. non è responsabile dei contenuti, delle politiche sulla privacy o delle pratiche di tali siti web esterni.']
          },
          {
            heading: '5. Legislazione Applicabile',
            paragraphs: ['Il presente avviso legale è regolato dalla legislazione italiana. Per qualsiasi controversia derivante dall\'interpretazione o dall\'applicazione di questo avviso legale, saranno competenti i tribunali italiani.']
          },
          {
            heading: '6. Contatti',
            paragraphs: ['Per qualsiasi domanda relativa a questo avviso legale, è possibile contattarci all\'indirizzo email: demo@example.com']
          }
        ]
      } as LegalDocument
    }
  },

  es: {
    metadata: {
      title: 'U.N.I.L.P. - Unión Nacional Italiana de Trabajadores y Pensionistas',
      description: 'Organización sindical nacional unitaria, democrática y autónoma que promueve la libre asociación y la autoprotección solidaria y colectiva de los afiliados.'
    },
    common: {
      openMenu: 'Abrir menú',
      closeMenu: 'Cerrar menú',
      close: 'Cerrar',
      prevImage: 'Imagen anterior',
      nextImage: 'Imagen siguiente',
      goToSlide: 'Ir a la diapositiva {n}',
      openInMaps: 'Abrir en Google Maps',
      visitSite: 'Visita el sitio',
      skipToContent: 'Saltar al contenido',
      mainNavigation: 'Navegación principal',
      toggleTheme: 'Cambiar tema',
      lightMode: 'Tema claro',
      darkMode: 'Tema oscuro'
    },
    nav: {
      home: 'Inicio',
      chiSiamo: 'Quiénes Somos',
      servizi: 'Nuestros Servicios',
      lavoratori: 'Nuestros Trabajadores',
      iscrizione: 'Formulario de Inscripción',
      contatti: 'Contacto'
    },
    hero: {
      label: 'Unión Nacional Italiana de Trabajadores y Pensionistas',
      headline: 'Defendemos los derechos de los trabajadores y pensionistas italianos, en Italia y en el extranjero.',
      lede: 'Trámites de pensión, 730, ISEE, asistencia contractual. Servicios concretos para quien trabaja y para quien ha trabajado.',
      primaryCta: 'Hazte socio',
      secondaryCta: 'Contáctanos',
      imageAlt: 'Trabajadores en su actividad'
    },
    chiSiamoSection: {
      paragraph1: 'La U.N.I.L.P. es una Confederación Sindical inserta en una red de relaciones internacionales, nacida para representar y tutelar los intereses de todos los trabajadores y trabajadoras dependientes, de cualquier categoría y con cualquier tipología contractual, tanto en Italia como en Europa. La Confederación se propone, además, representar los derechos y las reivindicaciones de todos los pensionistas, de cualquier nacionalidad, que compartan y respeten su Estatuto.',
      button: 'Descubre más sobre nosotros'
    },
    chiSiamo: {
      title: 'Quiénes Somos',
      kicker: 'La organización',
      subtitle: 'Nuestra historia y nuestros valores',
      imageAlt: 'El equipo de U.N.I.L.P. al servicio de los trabajadores',
      description: 'La U.N.I.L.P. es una Confederación Sindical nacional, unitaria, democrática y autónoma. Operando dentro de una consolidada red de relaciones internacionales, la unión se configura como un sujeto social en pleno crecimiento, guiado por un proyecto moderno y preparado para responder a los retos del nuevo siglo. Como asociación sin ánimo de lucro, la U.N.I.L.P. promueve la libre asociación y la autoprotección solidaria y colectiva de sus afiliados, poniendo siempre en el centro el respeto de los valores de la persona y de la dignidad humana.',
      values: {
        title: 'Nuestros Valores',
        kicker: 'Valores',
        items: [
          { title: 'Paz y Solidaridad', description: 'Consideramos la paz el bien supremo de la humanidad y afirmamos el valor de la solidaridad dentro de una sociedad cada vez más pluriétnica, equitativa y libre de discriminaciones.' },
          { title: 'Pluralismo y Democracia', description: 'Sostenemos la necesidad de reglas claras que garanticen la libre circulación de las ideas, el respeto de las minorías y un debate sereno y democrático.' },
          { title: 'Participación Activa', description: 'La vida democrática de nuestra Confederación se basa en la implicación directa de cada afiliado, garantizando a todos las mismas oportunidades y los mismos derechos.' }
        ]
      },
      mission: {
        title: 'Nuestra Misión',
        kicker: 'Misión',
        imageAlt: 'Trabajadora de U.N.I.L.P. atendiendo a un afiliado por teléfono',
        description: 'Nuestra prioridad es la representación y la tutela de los intereses de todos los trabajadores y trabajadoras dependientes, en Italia y en Europa, pertenecientes a cualquier categoría y con cualquier tipología contractual. Al mismo tiempo, defendemos los derechos y las reivindicaciones de todos los pensionistas, de cualquier nacionalidad, que respeten su Estatuto. Nos comprometemos cada día a negociar con las contrapartes todo lo relativo al tratamiento económico y previsional de trabajadores y pensionistas, velando por sus condiciones de vida y por su bienestar global. Además, la U.N.I.L.P. se opone firmemente a cualquier forma de explotación y de trabajo clandestino o infantil, promoviendo la plena dignidad profesional y apoyando políticas activas orientadas al pleno empleo.'
      }
    },
    servicesList: {
      title: 'Nuestros Servicios',
      subtitle: 'Descubre todos los servicios que ofrecemos a nuestros afiliados para apoyarlos en el mundo laboral',
      viewAll: 'Descubre todos los servicios',
      items: [
        'Formación Financiada',
        'Asistencia Welfare',
        'Asist. fiscal y de pensiones',
        'Dimisiones telemáticas',
        'Seguridad laboral',
        'Conciliaciones',
        'Contratos empresariales',
        'Servicios de Patronato'
      ]
    },
    partners: {
      title: 'Nuestros Socios',
      subtitle: 'Colaboramos con organizaciones de excelencia para ofrecer los mejores servicios a nuestros afiliados',
      items: [
        {
          id: 'efesto',
          name: 'EFESTO',
          fullName: 'Ente Europeo de Formación en Sectores Técnicos y Orientación',
          description: 'Ofrece cursos de formación, eventos, webinars y prácticas empresariales dirigidos a todos los que desean aprender nuevas competencias en el ámbito empresarial.'
        }
      ]
    },
    map: {
      title: 'Dónde Estamos',
      subtitle: 'Ven a visitarnos a nuestra sede o contáctanos para concertar una cita',
      addressLabel: 'Dirección',
      address: 'Via Roma 1, 00100 - Roma, Italia',
      phoneLabel: 'Teléfono',
      phone: '+39 000 000 000',
      hoursTitle: 'Horario de Apertura',
      iframeTitle: 'Mapa sede U.N.I.L.P. - Via Roma 1, Roma',
      hours: [
        { day: 'Lunes - Viernes', time: '09:00 - 13:00 / 14:30 - 18:30' },
        { day: 'Sábado', time: 'Cerrado' },
        { day: 'Domingo', time: 'Cerrado' }
      ],
      closed: 'Cerrado',
      consent: {
        message: 'Para mostrar el mapa interactivo cargamos Google Maps, que instala cookies. Cárgalo aquí o ábrelo en una pestaña nueva.',
        action: 'Cargar el mapa'
      }
    },
    faq: {
      title: '¿Tienes dudas?',
      subtitle: 'Consulta las respuestas a las preguntas frecuentes y, si aún tienes dudas, no dudes en contactarnos.',
      items: [
        {
          question: '¿Qué es la conciliación en sede sindical y cómo funciona?',
          answer: 'Es un canal de mediación que permite resolver una controversia entre trabajador y empleador sin recurrir al juez. El objeto de la disputa puede incluir todas las cuestiones relacionadas con la relación laboral, como diferencias salariales, cambios de categoría o sanciones disciplinarias. El objetivo final es alcanzar un acuerdo transaccional, tutelado por el sindicato, que satisfaga a ambas partes, normalmente mediante una compensación económica.'
        },
        {
          question: '¿Cuáles son los requisitos para afiliarse al Ente?',
          answer: 'Como asociación sin ánimo de lucro, promueve la libre asociación y la autoprotección solidaria y colectiva de sus afiliados. Para afiliarse a la U.N.I.L.P. es necesario ser trabajador empleado, pensionista o trabajador autónomo y basta con cumplimentar el formulario de inscripción disponible en la sección dedicada del sitio y entregarlo en nuestra sede o enviarlo por email.'
        },
        {
          question: '¿Cuáles son los requisitos estándar para jubilarse?',
          answer: 'En Italia se puede acceder a la jubilación, en general, a través de la pensión de vejez y la pensión anticipada. La pensión de vejez se obtiene con al menos 20 años de cotización a los 67 años. La pensión anticipada no depende de la edad sino de la cotización: los hombres pueden jubilarse con 42 años y 10 meses de cotización a cualquier edad; las mujeres, con 41 años y 10 meses de cotización a cualquier edad.'
        },
        {
          question: '¿Cuáles son las ventajas del welfare empresarial?',
          answer: 'Introducido por la Ley de Estabilidad de 2016, este instrumento permite al trabajador convertir el premio de resultados (o la participación en beneficios) en bienes y servicios de welfare, beneficiándose de una importante ventaja fiscal y contributiva. Un plan de welfare empresarial reduce eficazmente la cuña fiscal tanto para la empresa como para el trabajador. Por un lado aumenta el poder adquisitivo del trabajador y, por otro, mejora el clima laboral y la conciliación entre vida y trabajo (work-life balance), generando un impacto positivo y medible sobre la productividad de toda la empresa.'
        }
      ]
    },
    servicesPage: {
      hero: {
        title: 'Nuestros Servicios',
        kicker: 'Nuestros Servicios',
        subtitle: 'Apoyo completo para trabajadores, pensionistas y empresas'
      },
      items: [
        {
          id: 'formazione-finanziata',
          title: 'Formación Financiada',
          description: 'La formación continua es un instrumento fundamental para garantizar la empleabilidad y aumentar la profesionalidad de las personas, favoreciendo la adaptación a un mercado laboral en constante evolución. Este sistema, dirigido también a los trabajadores ya empleados, apunta a la actualización y al desarrollo de competencias y conocimientos estratégicos. El objetivo es responder con eficacia a las innovaciones tecnológicas, a los modelos organizativos emergentes del sistema productivo y a todos los cambios que afectan al escenario laboral actual.'
        },
        {
          id: 'assistenza-welfare',
          title: 'Asistencia Welfare',
          description: 'El welfare empresarial es un sistema de prestaciones y soluciones impulsado por el empleador para incrementar el bienestar del trabajador y de su familia. Este término incluye tanto las iniciativas surgidas de la negociación colectiva como las medidas adoptadas unilateralmente por la empresa. Estas intervenciones pueden traducirse en una optimización más eficiente de la retribución, en la entrega de bonificaciones económicas o, con mayor frecuencia, en la oferta de bienes y servicios específicos (como sanidad complementaria, previsión, educación y tiempo libre).'
        },
        {
          id: 'assistenza-fiscale',
          title: 'Asistencia Fiscal y de Pensiones',
          description: 'La asistencia fiscal es un servicio dirigido a empleados y pensionistas, prestado a través de los Centros de Asistencia Fiscal (CAF). Este apoyo abarca todas las gestiones relativas a la declaración de la renta (mediante el Modelo 730 o el Modelo Redditi PF / ex UNICO) y la cumplimentación del certificado ISEE.'
        },
        {
          id: 'dimissioni-telematiche',
          title: 'Dimisiones Telemáticas',
          description: 'En Italia, las dimisiones voluntarias y la resolución consensuada de la relación laboral deben presentarse exclusivamente por vía telemática. Este procedimiento online, introducido para combatir eficazmente el fenómeno de las "dimisiones en blanco" (especialmente en defensa de las trabajadoras y los trabajadores más vulnerables), se realiza a través del portal del Ministerio de Trabajo y Políticas Sociales. En nuestras sedes ofrecemos el apoyo necesario para enviar la comunicación de forma correcta, segura y guiada.'
        },
        {
          id: 'sicurezza-lavoro',
          title: 'Seguridad Laboral',
          description: 'El D.Lgs. 81/2008 es el texto normativo de referencia que regula la seguridad y la salud en los lugares de trabajo. Su aplicación se extiende a todos los sectores de actividad, tanto privados como públicos, y tutela a todos los trabajadores y trabajadoras (subordinados y autónomos), así como a los sujetos asimilados a ellos.'
        },
        {
          id: 'conciliazioni',
          title: 'Conciliaciones',
          description: 'La conciliación en sede sindical es un procedimiento orientado a resolver de forma amistosa una controversia entre trabajador y empleador. Mediante un acuerdo transaccional, las partes definen la disputa sin recurrir a la justicia ordinaria, garantizando al trabajador una compensación económica adecuada a cambio de la renuncia a hacer valer ulteriores pretensiones sobre los derechos objeto del acuerdo.'
        },
        {
          id: 'contratti-aziendali',
          title: 'Contratos Empresariales',
          description: 'El convenio colectivo de empresa es el acuerdo suscrito entre un único empleador (eventualmente asistido por su asociación empresarial) y una representación de los trabajadores. En ausencia de una disciplina legislativa rígida sobre los sujetos habilitados para la negociación, rige el principio de libertad de coalición: la representación puede estar constituida por cualquier agrupación de trabajadores, incluso no estructurada formalmente de manera estable. El requisito esencial es que dicha representación persiga el objetivo de tutelar el interés colectivo de todo el personal de la empresa, presente y futuro.'
        },
        {
          id: 'servizi-patronato',
          title: 'Servicios de Patronato',
          description: 'El patronato se presenta como un instrumento social de información, asistencia y tutela a favor de trabajadores autónomos o dependientes, pensionistas y ciudadanos individuales (italianos, extranjeros y apátridas) residentes en el territorio del Estado. Tienen también poderes de representación y operan sin ánimo de lucro. Nuestra actividad de consultoría, asistencia y tutela, para la obtención de prestaciones en materia previsional, para la obtención de prestaciones ofrecidas por el Servicio Sanitario Nacional y para las prestaciones de carácter socio-asistencial, incluye: pensiones de trabajadores empleados y autónomos, fondos especiales de previsión, pensiones en convención internacional, pensiones de empleados públicos, cotización, otros entes previsionales, prestaciones de apoyo a la renta, desempleo, accidentes laborales y otras prestaciones.'
        }
      ],
      cta: {
        title: '¿Necesitas alguno de nuestros servicios?',
        subtitle: 'Contáctanos para más información o para concertar una cita con nuestros expertos',
        kicker: 'Afiliación',
        contact: 'Contáctanos',
        register: 'Inscríbete ahora'
      }
    },
    lavoratori: {
      title: 'Nuestros Trabajadores',
      kicker: 'Trabajadores',
      subtitle: 'Recursos y apoyo para nuestros afiliados',
      description: 'Ofrecemos una amplia gama de servicios y recursos para apoyar a los trabajadores y pensionistas afiliados a nuestra organización.',
      intro: 'La U.N.I.L.P. desarrolla una constante actividad de tutela de los trabajadores a través de una presencia activa en cada fase de la vida profesional. Nuestra acción sindical se concreta en la firma de los Convenios Colectivos Nacionales de Trabajo (CCNL), en la organización de asambleas y en el desarrollo de la negociación territorial y empresarial, garantizando además una atenta gestión de los fondos previsionales de categoría.',
      benefits: {
        title: 'Ofrecemos apoyo especializado y asistencia personalizada para una amplia gama de necesidades, entre las que se incluyen:',
        kicker: 'Ventajas',
        items: [
          'Asesoramiento Contractual',
          'Revisión de Nóminas',
          'Gestión de la Relación Laboral',
          'Despido',
          'Apoyo a la Renta',
          'Asistencia para Pensiones',
          'Conflictos y Apoyo Legal',
          'Solicitudes de prestaciones por desempleo'
        ]
      },
      categories: {
        title: 'Categorías Representadas',
        kicker: 'Sectores',
        items: [
          { id: 'commercio', title: 'Comercio', description: 'Tutela de los trabajadores del sector comercial, desde la gran distribución hasta los comercios al por menor, garantizando derechos contractuales y condiciones de trabajo justas.' },
          { id: 'agricoltura', title: 'Agricultura Innovadora', description: 'Apoyo a los trabajadores de la agricultura moderna y sostenible, promoviendo la innovación tecnológica y la tutela de los derechos en el sector primario.' },
          { id: 'enti-scuole', title: 'Entes y Escuelas', description: 'Asistencia al personal escolar y de los entes públicos, desde la tutela contractual hasta la gestión de los trámites administrativos y de pensiones.' },
          { id: 'edilizia', title: 'Construcción y Artesanía', description: 'Representación de los trabajadores de la construcción y artesanos, con especial atención a la seguridad laboral y a la formación profesional continua.' },
          { id: 'terziario', title: 'Terciario Avanzado', description: 'Tutela de los profesionales del terciario avanzado, desde los servicios financieros hasta la consultoría, garantizando contratos adecuados a las nuevas formas de trabajo.' },
          { id: 'servizi', title: 'Servicios Avanzados', description: 'Apoyo a los trabajadores del sector tecnológico y de los servicios digitales, afrontando los retos del teletrabajo y de las nuevas profesiones digitales.' },
          { id: 'pubblici-esercizi', title: 'Establecimientos Públicos', description: 'Asistencia a los trabajadores de bares, restaurantes y estructuras de hostelería, tutelando los derechos en un sector caracterizado por horarios flexibles y estacionalidad.' },
          { id: 'sanita', title: 'Sanidad Privada', description: 'Representación del personal sanitario de las estructuras privadas, garantizando condiciones de trabajo adecuadas y tutela profesional.' }
        ]
      },
      cta: {
        title: '¿Quieres formar parte de nuestra organización?',
        subtitle: 'Afíliate hoy y comienza a beneficiarte de todos nuestros servicios',
        kicker: 'Afiliación',
        button: 'Afíliate Ahora'
      }
    },
    iscrizione: {
      title: 'Formulario de Inscripción',
      kicker: 'Afiliación',
      subtitle: 'Únete a nosotros',
      description: 'Para inscribirte en la U.N.I.L.P., descarga el formulario de inscripción, complétalo y envíalo a nuestra sede.',
      download: 'Descargar Formulario',
      documentTitle: 'Formulario de Inscripción U.N.I.L.P.',
      documentSubtitle: 'PDF - Documento oficial para la inscripción',
      instructions: {
        title: 'Instrucciones para la Inscripción',
        kicker: 'Procedimiento',
        steps: [
          'Descarga el formulario de inscripción haciendo clic en el botón de arriba',
          'Imprime el formulario y complétalo en todas sus partes',
          'Firma el formulario en los campos indicados',
          'Envíanos el formulario cumplimentado por e-mail: demo@example.com'
        ]
      }
    },
    contatti: {
      title: 'Contáctanos',
      kicker: 'Contacto',
      subtitle: 'Estamos aquí para ayudarte',
      description: 'Completa el formulario para enviarnos un mensaje. Te responderemos lo antes posible.',
      form: {
        name: 'Nombre y Apellido',
        email: 'Email',
        message: 'Mensaje',
        submit: 'Enviar Mensaje',
        submitting: 'Enviando...',
        success: '¡Mensaje enviado con éxito! Te responderemos lo antes posible.',
        error: 'Se produjo un error al enviar. Inténtalo de nuevo más tarde.',
        sendAnother: 'Enviar otro mensaje',
        namePlaceholder: 'Introduce tu nombre',
        emailPlaceholder: 'Introduce tu email',
        messagePlaceholder: 'Escribe tu mensaje...',
        privacyConsentPrefix: 'He leído y acepto la ',
        privacyConsentLink: 'Política de Privacidad',
        privacyConsentSuffix: ' y consiento el tratamiento de mis datos personales.',
        errors: {
          name: 'Introduce tu nombre completo.',
          email: 'Introduce un correo electrónico válido.',
          message: 'El mensaje debe tener al menos 10 caracteres.',
          privacyConsent: 'Debes aceptar la política de privacidad para continuar.'
        }
      },
      info: {
        title: 'Información de Contacto',
        emailLabel: 'Email',
        phoneLabel: 'Teléfono',
        whatsappLabel: 'WhatsApp',
        websiteLabel: 'Sitio web',
        email: 'demo@example.com',
        phone: '+39 000 000 000',
        whatsapp: '+39 000 000 000',
        website: 'unilp.noboolsheet.local'
      }
    },
    footer: {
      description: 'Organización sindical nacional unitaria, democrática y autónoma que promueve la libre asociación y la autoprotección solidaria y colectiva de los afiliados.',
      links: 'Enlaces Útiles',
      legal: 'Información Legal',
      privacy: 'Política de Privacidad',
      cookies: 'Política de Cookies',
      terms: 'Note Legali',
      partners: 'Nuestros Socios Institucionales',
      rights: 'Todos los derechos reservados.'
    },
    cookies: {
      message: 'Utilizamos cookies para mejorar tu experiencia de navegación. Al continuar utilizando nuestro sitio, aceptas el uso de cookies.',
      accept: 'Aceptar',
      decline: 'Rechazar',
      learnMore: 'Más información'
    },
    chat: {
      launcher: 'Abrir el chat de asistencia',
      title: 'Asistente Virtual',
      close: 'Cerrar el chat',
      greeting: 'Hola, soy Marco, tu asistente virtual de Inteligencia Artificial y estoy aquí para lo que necesites. ¿Cómo puedo ayudarte hoy?',
      placeholder: 'Escribe tu pregunta...',
      send: 'Enviar',
      sending: 'Escribiendo...',
      error: 'Se ha producido un error. Inténtalo de nuevo más tarde.',
      unavailable: 'El servicio de chat no está disponible en este momento.'
    },
    notFound: {
      title: 'Página no encontrada',
      description: 'La página que buscas no existe o ha sido movida.',
      action: 'Volver al inicio'
    },
    error: {
      title: 'Ha ocurrido un error',
      description: 'Algo ha ido mal. Inténtalo de nuevo o vuelve al inicio.',
      retry: 'Reintentar',
      action: 'Volver al inicio'
    },
    legal: {
      privacy: {
        title: 'Política de Privacidad',
        lastUpdatedLabel: 'Última actualización',
        sections: [
          {
            heading: '1. Responsable del Tratamiento',
            paragraphs: ['El Responsable del tratamiento de los datos personales es U.N.I.L.P. - Unión Nacional Italiana de Trabajadores y Pensionistas.']
          },
          {
            heading: '2. Tipos de Datos Recogidos',
            paragraphs: ['Los datos personales recogidos por este sitio web incluyen: nombre, apellido, dirección de email y cualquier otra información proporcionada voluntariamente por el usuario a través de los formularios de contacto.']
          },
          {
            heading: '3. Finalidad del Tratamiento',
            paragraphs: ['Los datos personales de los usuarios se recogen para las siguientes finalidades:'],
            items: [
              'Responder a las solicitudes de información',
              'Gestionar las afiliaciones a la organización',
              'Enviar comunicaciones relativas a los servicios ofrecidos'
            ]
          },
          {
            heading: '4. Base Jurídica del Tratamiento',
            paragraphs: ['El tratamiento de los datos personales se basa en el consentimiento del interesado conforme al art. 6, apartado 1, letra a) del Reglamento UE 679/2016 (RGPD).']
          },
          {
            heading: '5. Derechos del Interesado',
            paragraphs: ['Conforme a los artículos 15-22 del RGPD, el interesado tiene derecho a:'],
            items: [
              'Acceder a sus datos personales',
              'Solicitar la rectificación de los datos inexactos',
              'Solicitar la cancelación de los datos',
              'Solicitar la limitación del tratamiento',
              'Oponerse al tratamiento',
              'Solicitar la portabilidad de los datos'
            ]
          },
          {
            heading: '6. Contacto',
            paragraphs: ['Para ejercer sus derechos o para cualquier información relativa al tratamiento de datos personales, es posible contactar con el Responsable en la dirección de email: demo@example.com']
          }
        ]
      } as LegalDocument,
      cookies: {
        title: 'Política de Cookies',
        lastUpdatedLabel: 'Última actualización',
        sections: [
          {
            heading: '1. Qué son las Cookies',
            paragraphs: ['Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario cuando visita un sitio web. Se utilizan para mejorar la experiencia de navegación y para recoger información sobre el uso del sitio.']
          },
          {
            heading: '2. Cookies Técnicas',
            paragraphs: ['Estas cookies son esenciales para el correcto funcionamiento del sitio web y no pueden ser desactivadas. Incluyen cookies de sesión y cookies para almacenar las preferencias del usuario.']
          },
          {
            heading: '3. Cookies Analíticas',
            paragraphs: ['Estas cookies nos permiten contar las visitas y las fuentes de tráfico para poder medir y mejorar el rendimiento de nuestro sitio.']
          },
          {
            heading: '4. Gestión de las Cookies',
            paragraphs: ['El usuario puede gestionar las preferencias relativas a las cookies a través del banner de consentimiento que aparece en la primera visita al sitio, o a través de la configuración de su navegador.']
          },
          {
            heading: '5. Desactivación de las Cookies',
            paragraphs: ['La mayoría de los navegadores aceptan automáticamente las cookies, pero el usuario puede modificar la configuración del navegador para rechazarlas. La desactivación de las cookies podría afectar a la funcionalidad de algunas partes del sitio.']
          },
          {
            heading: '6. Contacto',
            paragraphs: ['Para cualquier pregunta relativa al uso de cookies en este sitio, es posible contactarnos en la dirección de email: demo@example.com']
          }
        ]
      } as LegalDocument,
      avisoLegal: {
        title: 'Note Legali',
        lastUpdatedLabel: 'Última actualización',
        sections: [
          {
            heading: '1. Identificación',
            paragraphs: ['De conformidad con la normativa vigente, se comunican los siguientes datos identificativos del titular de este sitio web:'],
            items: [
              'Denominación: U.N.I.L.P. - Unión Nacional Italiana de Trabajadores y Pensionistas',
              'Email: demo@example.com',
              'Sitio web: unilp.noboolsheet.local'
            ]
          },
          {
            heading: '2. Propiedad Intelectual',
            paragraphs: [
              'Todos los contenidos presentes en este sitio web, incluidos textos, imágenes, gráficos, logotipos y cualquier otro material, son propiedad de U.N.I.L.P. o de los respectivos titulares de derechos y están protegidos por la normativa sobre propiedad intelectual.',
              'Está prohibida la reproducción, distribución, transformación o comunicación pública de los contenidos sin la autorización escrita del titular.'
            ]
          },
          {
            heading: '3. Responsabilidad',
            paragraphs: ['U.N.I.L.P. no asume ninguna responsabilidad derivada del uso impropio de los contenidos presentes en este sitio web. La organización se reserva el derecho de modificar, actualizar o eliminar en cualquier momento los contenidos del sitio sin previo aviso.']
          },
          {
            heading: '4. Enlaces Externos',
            paragraphs: ['Este sitio web puede contener enlaces a sitios externos. U.N.I.L.P. no es responsable de los contenidos, de las políticas de privacidad o de las prácticas de dichos sitios web externos.']
          },
          {
            heading: '5. Legislación Aplicable',
            paragraphs: ['El presente aviso legal se rige por la legislación italiana. Para cualquier controversia derivada de la interpretación o aplicación de este aviso legal, serán competentes los tribunales italianos.']
          },
          {
            heading: '6. Contacto',
            paragraphs: ['Para cualquier pregunta relativa a este aviso legal, es posible contactarnos en la dirección de email: demo@example.com']
          }
        ]
      } as LegalDocument
    }
  },

  en: {
    metadata: {
      title: 'U.N.I.L.P. - Italian National Union of Workers and Pensioners',
      description: 'United, democratic and autonomous national trade union organization promoting free association and solidarity-based collective self-protection of its members.'
    },
    common: {
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      close: 'Close',
      prevImage: 'Previous image',
      nextImage: 'Next image',
      goToSlide: 'Go to slide {n}',
      openInMaps: 'Open in Google Maps',
      visitSite: 'Visit website',
      skipToContent: 'Skip to content',
      mainNavigation: 'Main navigation',
      toggleTheme: 'Toggle theme',
      lightMode: 'Light mode',
      darkMode: 'Dark mode'
    },
    nav: {
      home: 'Home',
      chiSiamo: 'About Us',
      servizi: 'Our Services',
      lavoratori: 'Our Workers',
      iscrizione: 'Registration Form',
      contatti: 'Contact'
    },
    hero: {
      label: 'Italian National Union of Workers and Pensioners',
      headline: 'We defend the rights of Italian workers and pensioners, in Italy and abroad.',
      lede: 'Pension paperwork, tax returns, ISEE, contract help. Concrete services for the people who work and the people who have worked.',
      primaryCta: 'Become a member',
      secondaryCta: 'Contact us',
      imageAlt: 'Workers engaged in their trade'
    },
    chiSiamoSection: {
      paragraph1: 'U.N.I.L.P. is a Trade Union Confederation embedded in an international network of relations, founded to represent and protect the interests of all employed workers, in every category and under any type of contract, both in Italy and across Europe. The Confederation also aims to represent the rights and claims of all pensioners, of any nationality, who share and respect its Statute.',
      button: 'Learn more about us'
    },
    chiSiamo: {
      title: 'About Us',
      kicker: 'The organisation',
      subtitle: 'Our history and values',
      imageAlt: 'The U.N.I.L.P. team at the service of workers',
      description: 'U.N.I.L.P. is a united, democratic and autonomous national Trade Union Confederation. Operating within a well-established network of international relations, the union is a growing social actor, driven by a modern project ready to respond to the challenges of the new century. As a non-profit association, U.N.I.L.P. promotes free association and solidarity-based collective self-protection of its members, always placing at its core the respect for human values and dignity.',
      values: {
        title: 'Our Values',
        kicker: 'Values',
        items: [
          { title: 'Peace and Solidarity', description: 'We regard peace as humanity\'s supreme good and uphold solidarity within an increasingly multi-ethnic, fair and discrimination-free society.' },
          { title: 'Pluralism and Democracy', description: 'We support the need for clear rules that guarantee the free movement of ideas, respect for minorities and a calm, democratic debate.' },
          { title: 'Active Participation', description: 'The democratic life of our Confederation is built on the direct involvement of every member, ensuring equal opportunities and equal rights for all.' }
        ]
      },
      mission: {
        title: 'Our Mission',
        kicker: 'Mission',
        imageAlt: 'U.N.I.L.P. staff member assisting a member by phone',
        description: 'Our priority is to represent and look after the interests of all employed workers, in Italy and across Europe, belonging to any category and under any type of contract. At the same time, we protect the rights and claims of all pensioners, of any nationality, who respect our Statute. Every day we engage with counterparts on everything concerning the economic and welfare treatment of workers and pensioners, watching over their living conditions and overall well-being. Furthermore, U.N.I.L.P. firmly opposes any form of exploitation and illegal or child labour, promoting full professional dignity and supporting active policies aimed at achieving full employment.'
      }
    },
    servicesList: {
      title: 'Our Services',
      subtitle: 'Discover all the services we offer our members to support them in the world of work',
      viewAll: 'Discover all services',
      items: [
        'Funded Training',
        'Welfare Assistance',
        'Tax & pension assistance',
        'Online resignation',
        'Workplace safety',
        'Conciliations',
        'Company agreements',
        'Patronage Services'
      ]
    },
    partners: {
      title: 'Our Partners',
      subtitle: 'We collaborate with organizations of excellence to offer the best services to our members',
      items: [
        {
          id: 'efesto',
          name: 'EFESTO',
          fullName: 'European Training Body for Technical Sectors and Guidance',
          description: 'Offers training courses, events, webinars and corporate internships for all those who wish to learn new skills in the entrepreneurial field.'
        }
      ]
    },
    map: {
      title: 'Where We Are',
      subtitle: 'Come visit us at our office or contact us for an appointment',
      addressLabel: 'Address',
      address: 'Via Roma 1, 00100 - Roma, Italy',
      phoneLabel: 'Phone',
      phone: '+39 000 000 000',
      hoursTitle: 'Opening Hours',
      iframeTitle: 'U.N.I.L.P. office map - Via Roma 1, Roma',
      hours: [
        { day: 'Monday - Friday', time: '09:00 - 13:00 / 14:30 - 18:30' },
        { day: 'Saturday', time: 'Closed' },
        { day: 'Sunday', time: 'Closed' }
      ],
      closed: 'Closed',
      consent: {
        message: 'To show the interactive map we load Google Maps, which sets cookies. Load it here, or open it in a new tab.',
        action: 'Load map'
      }
    },
    faq: {
      title: 'Have any questions?',
      subtitle: 'Browse the answers to frequently asked questions and, if you still have doubts, do not hesitate to contact us.',
      items: [
        {
          question: 'What is union-based conciliation and how does it work?',
          answer: 'It is a mediation channel that allows a dispute between worker and employer to be resolved without going to court. The dispute can cover all matters related to the employment relationship, such as pay differences, level changes or disciplinary actions. The final goal is to reach a settlement agreement, protected by the union, that satisfies both parties, usually through an economic compensation.'
        },
        {
          question: 'What are the requirements to register with the Body?',
          answer: 'As a non-profit association, it promotes free association and solidarity-based collective self-protection of its members. To register with U.N.I.L.P. you must be an employee, a pensioner or a self-employed worker, and it is enough to fill out the registration form available in the dedicated section of the site and deliver it to our office or send it by email.'
        },
        {
          question: 'What are the standard requirements to retire?',
          answer: 'In Italy retirement is generally accessed via the old-age pension or the early-retirement pension. The old-age pension is granted with at least 20 years of contributions at age 67. Early retirement does not depend on age but on contributions: men can retire with 42 years and 10 months of contributions at any age; women with 41 years and 10 months of contributions at any age.'
        },
        {
          question: 'What are the advantages of corporate welfare?',
          answer: 'Introduced by the 2016 Stability Law, this instrument allows the worker to convert the performance bonus (or profit share) into welfare goods and services, benefiting from significant tax and contribution relief. A corporate welfare plan effectively reduces the tax wedge for both the company and the employee. It increases the worker\'s purchasing power and improves workplace climate and work-life balance, with a positive, measurable impact on the productivity of the entire company.'
        }
      ]
    },
    servicesPage: {
      hero: {
        title: 'Our Services',
        kicker: 'Our Services',
        subtitle: 'Complete support for workers, pensioners and companies'
      },
      items: [
        {
          id: 'formazione-finanziata',
          title: 'Funded Training',
          description: 'Continuous training is a fundamental tool to safeguard employability and grow people\'s professional skills, helping them adapt to a constantly evolving labour market. This system, addressed also to those already employed, aims at the update and development of strategic skills and knowledge. The goal is to respond effectively to technological innovation, to the emerging organisational models of the production system and to all the changes affecting the current work environment.'
        },
        {
          id: 'assistenza-welfare',
          title: 'Welfare Assistance',
          description: 'Corporate welfare is a system of benefits and solutions promoted by the employer to enhance the well-being of the employee and their family. The term includes both initiatives arising from collective bargaining and measures adopted unilaterally by the company. Such interventions may translate into a more efficient optimisation of pay, into the granting of economic bonuses or, more often, into the supply of specific goods and services (such as supplementary healthcare, pensions, education and leisure).'
        },
        {
          id: 'assistenza-fiscale',
          title: 'Tax and Pension Assistance',
          description: 'Tax assistance is a service for employees and pensioners, delivered through Tax Assistance Centres (CAFs). This support covers all duties related to the income tax return (via the 730 form or the Redditi PF / former UNICO form) and the preparation of the ISEE statement.'
        },
        {
          id: 'dimissioni-telematiche',
          title: 'Online Resignation',
          description: 'In Italy, voluntary resignations and the consensual termination of an employment relationship must be submitted exclusively online. This online procedure (introduced to effectively counter the "blank resignation" phenomenon, especially to protect the most vulnerable workers) takes place through the Ministry of Labour and Social Policies portal. At our offices we offer the support needed to submit the communication correctly, safely and step by step.'
        },
        {
          id: 'sicurezza-lavoro',
          title: 'Workplace Safety',
          description: 'Legislative Decree 81/2008 is the reference regulation governing health and safety at work. It applies to every business sector, both private and public, and protects all workers (employed and self-employed) and the persons treated as equivalent to them.'
        },
        {
          id: 'conciliazioni',
          title: 'Conciliations',
          description: 'Union-based conciliation is a procedure aimed at settling amicably a dispute between worker and employer. Through a settlement agreement, the parties resolve the dispute without resorting to ordinary justice, guaranteeing the worker an adequate economic remedy in exchange for renouncing further claims on the rights covered by the agreement.'
        },
        {
          id: 'contratti-aziendali',
          title: 'Company Agreements',
          description: 'The company-level collective agreement is the agreement signed between a single employer (possibly assisted by its employer association) and a workers\' representation. In the absence of a strict legislative framework on who is entitled to negotiate, the principle of freedom of coalition applies: representation can be made up of any group of workers, even if not formally structured on a stable basis. The essential requirement is that such representation pursues the collective interest of all the company\'s personnel, present and future.'
        },
        {
          id: 'servizi-patronato',
          title: 'Patronage Services',
          description: 'The patronage offers a social instrument of information, assistance and protection for self-employed or employed workers, pensioners and individual citizens (Italian, foreign and stateless) residing on Italian territory. It also holds powers of representation and operates without profit aims. Our consulting, assistance and protection work (for the obtainment of welfare benefits, of services provided by the National Health Service and of social-care benefits) covers: pensions for employees and self-employed, special welfare funds, pensions under international agreements, public-sector pensions, contributions, other welfare bodies, income-support benefits, unemployment, workplace injuries and other benefits.'
        }
      ],
      cta: {
        title: 'Do you need one of our services?',
        subtitle: 'Contact us for more information or to schedule an appointment with our experts',
        kicker: 'Membership',
        contact: 'Contact us',
        register: 'Register now'
      }
    },
    lavoratori: {
      title: 'Our Workers',
      kicker: 'Workers',
      subtitle: 'Resources and support for our members',
      description: 'We offer a wide range of services and resources to support workers and pensioners enrolled in our organization.',
      intro: 'U.N.I.L.P. carries out an ongoing protection effort for workers through an active presence at every stage of professional life. Our union action takes shape in the signing of National Collective Labour Agreements (CCNL), in the organisation of assemblies and in the development of territorial and company-level bargaining, while also ensuring careful management of the sector pension funds.',
      benefits: {
        title: 'We offer specialised support and personalised assistance for a wide range of needs, including:',
        kicker: 'Benefits',
        items: [
          'Contractual Advice',
          'Payslip Review',
          'Employment Relationship Management',
          'Dismissal',
          'Income Support',
          'Pension Assistance',
          'Disputes and Legal Support',
          'Unemployment Benefit Claims'
        ]
      },
      categories: {
        title: 'Represented Categories',
        kicker: 'Sectors',
        items: [
          { id: 'commercio', title: 'Commerce', description: 'Protection of workers in the commercial sector, from large-scale distribution to retail stores, ensuring contractual rights and fair working conditions.' },
          { id: 'agricoltura', title: 'Innovative Agriculture', description: 'Support for workers in modern and sustainable agriculture, promoting technological innovation and protection of rights in the primary sector.' },
          { id: 'enti-scuole', title: 'Public Bodies and Schools', description: 'Assistance to school staff and public bodies, from contractual protection to the management of administrative and pension procedures.' },
          { id: 'edilizia', title: 'Construction and Crafts', description: 'Representation of construction workers and artisans, with particular attention to workplace safety and continuous professional training.' },
          { id: 'terziario', title: 'Advanced Tertiary Sector', description: 'Protection of professionals in the advanced tertiary sector, from financial services to consulting, ensuring contracts suited to new forms of work.' },
          { id: 'servizi', title: 'Advanced Services', description: 'Support for workers in the technology sector and digital services, addressing the challenges of smart working and new digital professions.' },
          { id: 'pubblici-esercizi', title: 'Public Establishments', description: 'Assistance to workers in bars, restaurants and accommodation facilities, protecting rights in a sector characterized by flexible hours and seasonality.' },
          { id: 'sanita', title: 'Private Healthcare', description: 'Representation of healthcare personnel in private facilities, ensuring adequate working conditions and professional protection.' }
        ]
      },
      cta: {
        title: 'Want to be part of our organization?',
        subtitle: 'Join today and start benefiting from all our services',
        kicker: 'Membership',
        button: 'Join Now'
      }
    },
    iscrizione: {
      title: 'Registration Form',
      kicker: 'Membership',
      subtitle: 'Join Us',
      description: 'To register with U.N.I.L.P., download the registration form, fill it out, and send it to our headquarters.',
      download: 'Download Form',
      documentTitle: 'U.N.I.L.P. Registration Form',
      documentSubtitle: 'PDF - Official registration document',
      instructions: {
        title: 'Registration Instructions',
        kicker: 'Procedure',
        steps: [
          'Download the registration form by clicking the button above',
          'Print the form and fill it out completely',
          'Sign the form in the indicated fields',
          'Send the completed form to us by e-mail: demo@example.com'
        ]
      }
    },
    contatti: {
      title: 'Contact Us',
      kicker: 'Contact',
      subtitle: 'We are here to help',
      description: 'Fill out the form below to send us a message. We will get back to you as soon as possible.',
      form: {
        name: 'Full Name',
        email: 'Email',
        message: 'Message',
        submit: 'Send Message',
        submitting: 'Sending...',
        success: 'Message sent successfully! We will get back to you as soon as possible.',
        error: 'Something went wrong while sending. Please try again later.',
        sendAnother: 'Send another message',
        namePlaceholder: 'Enter your name',
        emailPlaceholder: 'Enter your email',
        messagePlaceholder: 'Write your message...',
        privacyConsentPrefix: 'I have read and accept the ',
        privacyConsentLink: 'Privacy Policy',
        privacyConsentSuffix: ' and consent to the processing of my personal data.',
        errors: {
          name: 'Enter your full name.',
          email: 'Enter a valid email address.',
          message: 'The message must be at least 10 characters.',
          privacyConsent: 'You must accept the privacy policy to continue.'
        }
      },
      info: {
        title: 'Contact Information',
        emailLabel: 'Email',
        phoneLabel: 'Phone',
        whatsappLabel: 'WhatsApp',
        websiteLabel: 'Website',
        email: 'demo@example.com',
        phone: '+39 000 000 000',
        whatsapp: '+39 000 000 000',
        website: 'unilp.noboolsheet.local'
      }
    },
    footer: {
      description: 'United, democratic and autonomous national trade union organization promoting free association and solidarity-based collective self-protection of its members.',
      links: 'Useful Links',
      legal: 'Legal Information',
      privacy: 'Privacy Policy',
      cookies: 'Cookie Policy',
      terms: 'Legal Notice',
      partners: 'Our Institutional Partners',
      rights: 'All rights reserved.'
    },
    cookies: {
      message: 'We use cookies to improve your browsing experience. By continuing to use our site, you accept the use of cookies.',
      accept: 'Accept',
      decline: 'Decline',
      learnMore: 'Learn More'
    },
    chat: {
      launcher: 'Open the support chat',
      title: 'Virtual Assistant',
      close: 'Close the chat',
      greeting: "Hi, I'm Marco, your virtual Artificial Intelligence assistant and I'm here for whatever you need. How can I help you today?",
      placeholder: 'Type your question...',
      send: 'Send',
      sending: 'Typing...',
      error: 'Something went wrong. Please try again later.',
      unavailable: 'The chat service is currently unavailable.'
    },
    notFound: {
      title: 'Page not found',
      description: 'The page you are looking for does not exist or has been moved.',
      action: 'Back to home'
    },
    error: {
      title: 'Something went wrong',
      description: 'An error occurred. Please try again or go back to the home page.',
      retry: 'Try again',
      action: 'Back to home'
    },
    legal: {
      privacy: {
        title: 'Privacy Policy',
        lastUpdatedLabel: 'Last updated',
        sections: [
          {
            heading: '1. Data Controller',
            paragraphs: ['The Data Controller for the processing of personal data is U.N.I.L.P. - Italian National Union of Workers and Pensioners.']
          },
          {
            heading: '2. Types of Data Collected',
            paragraphs: ['Personal data collected by this website includes: first name, last name, email address and any other information voluntarily provided by the user through the contact forms.']
          },
          {
            heading: '3. Purpose of Processing',
            paragraphs: ['Users\' personal data is collected for the following purposes:'],
            items: [
              'Respond to information requests',
              'Manage organization memberships',
              'Send communications related to the services offered'
            ]
          },
          {
            heading: '4. Legal Basis for Processing',
            paragraphs: ['The processing of personal data is based on the consent of the data subject pursuant to art. 6, par. 1, lett. a) of EU Regulation 679/2016 (GDPR).']
          },
          {
            heading: '5. Rights of the Data Subject',
            paragraphs: ['Pursuant to articles 15-22 of the GDPR, the data subject has the right to:'],
            items: [
              'Access their personal data',
              'Request the rectification of inaccurate data',
              'Request the deletion of data',
              'Request the limitation of processing',
              'Object to the processing',
              'Request the portability of data'
            ]
          },
          {
            heading: '6. Contact',
            paragraphs: ['To exercise your rights or for any information regarding the processing of personal data, you can contact the Controller at the email address: demo@example.com']
          }
        ]
      } as LegalDocument,
      cookies: {
        title: 'Cookie Policy',
        lastUpdatedLabel: 'Last updated',
        sections: [
          {
            heading: '1. What Cookies Are',
            paragraphs: ['Cookies are small text files that are stored on the user\'s device when visiting a website. They are used to improve the browsing experience and to collect information about the use of the site.']
          },
          {
            heading: '2. Technical Cookies',
            paragraphs: ['These cookies are essential for the proper functioning of the website and cannot be disabled. They include session cookies and cookies to store user preferences.']
          },
          {
            heading: '3. Analytical Cookies',
            paragraphs: ['These cookies allow us to count visits and traffic sources in order to measure and improve the performance of our site.']
          },
          {
            heading: '4. Cookie Management',
            paragraphs: ['Users can manage cookie preferences through the consent banner that appears on the first visit to the site, or through their browser settings.']
          },
          {
            heading: '5. Cookie Deactivation',
            paragraphs: ['Most browsers automatically accept cookies, but users can change browser settings to reject them. Deactivating cookies could affect the functionality of some parts of the site.']
          },
          {
            heading: '6. Contact',
            paragraphs: ['For any questions regarding the use of cookies on this site, you can contact us at the email address: demo@example.com']
          }
        ]
      } as LegalDocument,
      avisoLegal: {
        title: 'Legal Notice',
        lastUpdatedLabel: 'Last updated',
        sections: [
          {
            heading: '1. Identification',
            paragraphs: ['In accordance with current regulations, the following identifying data of the owner of this website is communicated:'],
            items: [
              'Name: U.N.I.L.P. - Italian National Union of Workers and Pensioners',
              'Email: demo@example.com',
              'Website: unilp.noboolsheet.local'
            ]
          },
          {
            heading: '2. Intellectual Property',
            paragraphs: [
              'All content on this website, including texts, images, graphics, logos and any other material, is the property of U.N.I.L.P. or the respective rights holders and is protected by intellectual property regulations.',
              'Reproduction, distribution, transformation or public communication of the content without the written authorization of the owner is prohibited.'
            ]
          },
          {
            heading: '3. Liability',
            paragraphs: ['U.N.I.L.P. assumes no responsibility arising from the improper use of the content present on this website. The organization reserves the right to modify, update or delete the contents of the site at any time without notice.']
          },
          {
            heading: '4. External Links',
            paragraphs: ['This website may contain links to external sites. U.N.I.L.P. is not responsible for the content, privacy policies or practices of such external websites.']
          },
          {
            heading: '5. Applicable Legislation',
            paragraphs: ['This legal notice is governed by Italian legislation. For any dispute arising from the interpretation or application of this legal notice, the Italian courts shall have jurisdiction.']
          },
          {
            heading: '6. Contact',
            paragraphs: ['For any questions regarding this legal notice, you can contact us at the email address: demo@example.com']
          }
        ]
      } as LegalDocument
    }
  }
} as const

export type Translations = typeof translations
