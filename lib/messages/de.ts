import type { QuoteRequestState } from "@/features/quote-requests/quote-request-module";
import type { ApiErrorCode } from "@/lib/api-errors";

/**
 * Functional copy: the interface words around editorial content, owned by
 * code, not Sanity (ADR 0007). German defines the shape; every other locale
 * must match it exactly or the build fails.
 *
 * Headlines mark their one serif word with asterisks, as editorial headlines
 * do (`lib/emphasis.ts`). Functions take plain strings or numbers only.
 */
export const de = {
  header: {
    home: "rotpunkt Signature Startseite",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    language: "Sprache",
    currentLanguage: (name: string) => `Sprache: ${name}`
  },
  preview: {
    exit: "Vorschau beenden"
  },
  blocks: {
    moreAbout: (name: string) => `Mehr zu ${name}`,
    includedAsStandard: "In der Grundausstattung enthalten",
    surcharge: (price: string) => `Aufpreis ${price} inkl. MwSt.`,
    indicativePrice: "Richtpreis",
    indicativePriceStandard: "Richtpreis der Grundausstattung, inkl. MwSt.",
    indicativePricePreset: "Richtpreis dieser Ausstattung, inkl. MwSt.",
    decisions: (count: number) => `Die ${["", "eine", "zwei", "drei", "vier", "fünf"][count] ?? count} Entscheidungen`,
    configureNow: "Jetzt konfigurieren"
  },
  common: {
    close: "Schließen",
    cancel: "Abbrechen",
    discard: "Verwerfen",
    retry: "Erneut versuchen",
    reload: "Neu laden",
    loading: "Lädt …",
    download: "Herunterladen",
    account: "Mein Bereich",
    indicativePrice: "Richtpreis",
    priceUnavailable: "Preis nicht verfügbar",
    connectionLost: "Die Verbindung wurde unterbrochen.",
    connectionLostRetry: "Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut.",
    connectionLostLoading: "Die Verbindung wurde beim Nachladen unterbrochen.",
    /** A clock time as it is said: "14:05 Uhr". */
    clockTime: (time: string) => `${time} Uhr`
  },
  meta: {
    siteDescription:
      "Modulare Signature-Küchen: in 3D geplant, in Deutschland gefertigt, als Projekt gespeichert.",
    configureTitle: "3D Konfigurator | rotpunkt Signature",
    configureDescription: "Konfiguriere die erste rotpunkt Signature Küche als 3D-Prototyp.",
    accountTitle: "Mein Bereich | rotpunkt Signature",
    accountDescription: "Anmelden und private Küchenprojekte weiterplanen.",
    requestTitle: "Anfrage | rotpunkt Signature",
    requestDescription: "Eine gespeicherte Küchenplanung unverbindlich zur Prüfung anfragen.",
    sharedTitle: "Geteilter Küchenstand | rotpunkt Signature",
    sharedDescription: "Read-only Ansicht eines freigegebenen Küchenstands."
  },
  notFound: {
    title: "Diese Seite gibt es *nicht*.",
    body: "Vielleicht wurde sie verschoben, oder der Link ist nicht mehr gültig.",
    home: "Zur Startseite"
  },
  appHeader: {
    toConfigurator: "Zum Konfigurator",
    toConfiguration: "Zur Konfiguration"
  },
  configurator: {
    productName: "Signature Küche",
    panelTitle: "Signature *Küche*.",
    stages: {
      label: "Planungsschritte",
      material: "Material",
      layout: "Aufbau",
      review: "Prüfen"
    },
    views: {
      label: "Ansicht",
      studio: "Studio",
      apartment: "Appartement",
      loft: "Loft"
    },
    outlooks: {
      label: "Aussicht",
      street: "Straße",
      skyline: "Skyline"
    },
    cameras: {
      label: "Kamera",
      signature: "Raum",
      front: "Front",
      detail: "Detail"
    },
    edit: "Bearbeiten",
    editModules: "Module bearbeiten",
    photo: "Foto",
    createPhoto: "Foto erzeugen",
    datasheet: "Datenblatt",
    sharedContext: "Geteilter Stand",
    sharedDescription: "Geteilter, unveränderlicher Küchenstand ohne private Projektdaten.",
    validUntil: "Gültig bis",
    request: "Konfiguration anfragen",
    requestShort: "Anfragen",
    configureOwn: "Eigene Küche konfigurieren",
    configureOwnShort: "Selbst planen",
    sceneUpdating: "Szene wird aktualisiert.",
    attachLeft: "Links anfügen",
    attachRight: "Rechts anfügen",
    versionsAndLinks: "Versionen & Freigaben",
    versionsAndLinksSummary: (versions: number, links: number) =>
      `${versions} · ${links} ${links === 1 ? "Link" : "Links"}`,
    projectGalleryEmpty: "Noch keine Visualisierung für dieses Projekt.",
    saveAndShare: "Speichern & Teilen",
    guest: "Gast",
    guestNote:
      "Ihre Konfiguration wird in der URL gespeichert. Als Projekt bleibt sie mit Versionen, Fotos und Anfragen bei Ihrem Konto.",
    saveAsProject: "Als Projekt speichern",
    copyLink: "Link kopieren",
    linkCopied: "Link kopiert",
    reset: "Zurücksetzen",
    loadingLabel: "Visualisierung",
    loadingTitle: "Appartement wird *geladen*.",
    loadingBody: "Raum, Materialien und Licht werden vorbereitet.",
    loadingFooter: "3D Konfigurator",
    loadingScene: "Appartement"
  },
  datasheet: {
    /** The summary row's label; its column is 72 px wide. */
    layoutRow: "Aufbau",
    layout: "Aufbau",
    island: "Insel",
    cabinet: "Korpus",
    front: "Front",
    material: "Material",
    pricing: "Aufstellung",
    modules: (count: number, width: string) => `${count} Module · ${width}`,
    expand: "Datenblatt vergrößern",
    shrink: "Datenblatt verkleinern",
    hide: "Datenblatt ausblenden",
    allSurfaces: "Alle Oberflächen",
    allSurfacesFull: "Alle Oberflächen in voller Größe",
    editingHint:
      "Ziehen zum Umsortieren, antippen für Typ oder Entfernen — in der Leiste unter der Szene. Übernommen wird erst mit „Fertig“.",
    layoutHint:
      "Schränke in der Szene verschieben, ergänzen oder tauschen. Der Richtpreis folgt jeder Änderung; übernommen wird erst mit „Fertig“.",
    priceLines: (count: number) => `${count} Preispositionen`,
    indicativePriceNonBinding: "Richtpreis inkl. MwSt., unverbindlich"
  },
  /** Island sizes by module count; 2 and 6 stay for stored configurations. */
  islandSizes: {
    0: "Ohne",
    2: "Klein",
    4: "Insel",
    5: "Große Insel",
    6: "Groß"
  },
  finishMaterials: {
    matte: "matt",
    satin: "seidenmatt",
    structured: "strukturiert"
  },
  priceLines: {
    cabinetFinish: "Korpus-Finish",
    frontFinish: "Front-Finish",
    taxIncluded: (rate: string) => `darin enthaltene MwSt. (${rate})`
  },
  editor: {
    addLeft: "Modul links hinzufügen",
    addRight: "Modul rechts hinzufügen",
    position: (label: string, position: number) => `${label}, Position ${position}`,
    moveLeft: "Nach links schieben",
    moveRight: "Nach rechts schieben",
    remove: "Modul entfernen",
    hint: "Module ziehen zum Umsortieren · antippen für Typ, Position oder Entfernen.",
    island: "Insel",
    done: "Fertig"
  },
  palette: {
    hint: "Ein Element in die Szene ziehen — es stellt sich links oder rechts an die Zeile. Antippen fügt es rechts an.",
    label: "Elemente",
    add: (label: string) => `${label} hinzufügen`
  },
  materialOverlay: {
    label: "Material",
    title: "Die *Front*.",
    intro: (count: number) => `${count} Oberflächen, alle grifflos. Die Wahl wirkt sofort in der Szene.`,
    texture: (finish: string) => `Struktur, ${finish}`,
    lacquer: (finish: string) => `Lack, ${finish}`,
    priceUnchanged: "Richtpreis unverändert",
    apply: "Übernehmen"
  },
  autosave: {
    saving: "speichert …",
    pending: "Änderung erkannt …",
    saved: (time: string) => `gespeichert ${time}`,
    notSaved: "nicht gespeichert",
    draftWaiting: "Entwurf wartet",
    recoveryTitle: "Lokaler Entwurf gefunden.",
    recoveryBody: (time: string) =>
      `Eine noch nicht bestätigte Änderung aus diesem Browser wartet seit ${time} Uhr auf Sie.`,
    restoreDraft: "Entwurf wiederherstellen",
    staleTitle: "Älterer lokaler Entwurf gefunden.",
    staleBody:
      "Das Projekt wurde seitdem geändert. Der lokale Entwurf kann deshalb nur als neues Projekt gesichert oder verworfen werden.",
    saveAsNew: "Als neues Projekt",
    conflictTitle: "Neuere Projektversion gefunden.",
    conflictBody:
      "Ihre Änderung wurde nicht überschrieben. Laden Sie den neuesten Stand oder sichern Sie diese Variante als neues Projekt.",
    loadLatest: "Neueste Version laden",
    errorTitle: "Nicht gespeichert.",
    signInAgain: "Erneut anmelden",
    saveAgain: "Erneut speichern",
    failed: "Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    offline:
      "Die Verbindung wurde unterbrochen. Ihre Änderung bleibt im Browser und kann erneut gespeichert werden.",
    corruptDraft: "Der lokale Entwurf ist beschädigt und konnte nicht wiederhergestellt werden."
  },
  photo: {
    label: "KI-Foto",
    title: "Ihre Küche als *Foto*.",
    project: "Projekt",
    defaultProjectName: "Meine Signature Küche",
    nameIntro:
      "Ein Foto gehört zu einem gespeicherten Projekt. Wir legen es jetzt für Sie an — Versionen, Fotos und Anfragen bleiben dann zusammen.",
    projectName: "Name des Projekts",
    createAndShoot: "Projekt anlegen und Foto aufnehmen",
    creating: "Ihr Projekt wird angelegt …",
    guestBlocked:
      "Visualisierungen gehören zu einem gespeicherten Projekt. Sichern Sie Ihre Konfiguration, dann bleibt jedes Foto dauerhaft bei ihr.",
    notYetSaved:
      "Ihr aktueller Stand wird gerade gespeichert. Sobald das erledigt ist, kann das Foto zu genau diesem Stand erzeugt werden.",
    chooseScene:
      "Wählen Sie eine Szene. Die aktuelle Konfiguration wird fotografiert und von der KI in ein realistisches Foto verwandelt.",
    scene: "Szene",
    shoot: "Foto aufnehmen",
    uploading: "Die Aufnahme wird übertragen und geprüft …",
    generating: "Ihr Foto entsteht … das dauert etwa 10–30 Sekunden.",
    capturedAlt: "Aufgenommene Szene",
    resultAlt: "KI-generiertes Küchenfoto",
    keptWithProject: "Sie liegt jetzt bei Ihrem Projekt.",
    newPhoto: "Neues Foto aufnehmen",
    again: "Nochmal",
    downloadFilename: "visualisierung.jpg",
    captureFailed: "Die Szene konnte nicht aufgenommen werden. Bitte versuchen Sie es erneut.",
    requestFailed: "Die Visualisierung konnte nicht angefordert werden.",
    uploadFailed: "Die Aufnahme konnte nicht übertragen werden.",
    captureRejected: "Die Aufnahme wurde abgelehnt. Bitte versuchen Sie es erneut.",
    startFailed: "Die Erzeugung konnte nicht gestartet werden.",
    projectFailed: "Das Projekt konnte nicht angelegt werden.",
    slow: "Die Erzeugung dauert länger als erwartet. Das Foto erscheint in der Galerie des Projekts, sobald es fertig ist.",
    notRetrievable: "Das Foto wurde erstellt, ist aber gerade nicht abrufbar.",
    unavailable: "Die Fotoerzeugung ist derzeit nicht verfügbar.",
    timedOut: "Die Erzeugung hat zu lange gedauert und wurde abgebrochen.",
    rateLimited: "Der Dienst ist gerade ausgelastet. Bitte versuchen Sie es in Kürze erneut.",
    canceled: "Die Erzeugung wurde abgebrochen.",
    failed: "Das Foto konnte nicht erstellt werden."
  },
  visualFallback: {
    alt: "Signature Küche in Graphit und Porzellan, fotografiert im Studio.",
    webgl: "Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar.",
    asset: "Die 3D-Ansicht konnte nicht geladen werden.",
    error: "Die 3D-Ansicht ist vorübergehend nicht verfügbar.",
    note: "Ihre Konfiguration bleibt vollständig nutzbar. Die Abbildung ist illustrativ und zeigt nicht Ihre exakte Auswahl."
  },
  versions: {
    heading: "Versionen",
    save: "Version speichern",
    saving: "Speichert …",
    waitForAutosave: "Warten Sie, bis der aktuelle Arbeitsstand automatisch gespeichert ist.",
    count: (count: number) => (count === 1 ? "1 gespeicherte Version" : `${count} gespeicherte Versionen`),
    empty: "Noch keine feste Version. Autosaves bleiben davon getrennt.",
    unnamed: "Gespeicherte Version",
    restore: "Wiederherstellen",
    noSnapshot: "Historischer Stand ohne aktuelle Anzeigeinformationen.",
    restoreNote: "Der aktuelle Arbeitsstand wird vorher automatisch als Sicherheitsversion festgehalten.",
    restoreNow: "Jetzt wiederherstellen",
    restoring: "Stellt wieder her …",
    loadMore: "Weitere Versionen laden",
    saved: "Version dauerhaft gespeichert.",
    alreadySaved: "Dieser Stand war bereits als Version gespeichert.",
    alreadyActive: "Diese Version ist bereits aktiv.",
    saveFailed: "Die Version konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    saveOffline: "Die Verbindung wurde unterbrochen. Sie können dieselbe Speicheranfrage erneut senden.",
    loadMoreFailed: "Weitere Versionen konnten nicht geladen werden.",
    restoreFailed: "Die Version konnte nicht wiederhergestellt werden. Bitte versuchen Sie es erneut.",
    restoreOffline: "Die Verbindung wurde unterbrochen. Der aktuelle Arbeitsstand wurde nicht ersetzt."
  },
  projectName: {
    rename: "Projekt umbenennen",
    label: "Name des Projekts",
    save: "Namen speichern",
    cancel: "Umbenennen abbrechen",
    failed: "Der Name konnte nicht gespeichert werden."
  },
  shareLinks: {
    heading: "Sicher teilen",
    note: "Fixiert diesen Stand für 90 Tage.",
    create: "Link erstellen",
    creating: "Erstellt …",
    waitForAutosave: "Der Link kann erstellt werden, sobald der Arbeitsstand gespeichert ist.",
    keepNow: "Diesen Link jetzt sichern",
    copy: "Link kopieren",
    secretNote: "Der geheime Teil wird nicht gespeichert und kann später nicht erneut angezeigt werden.",
    count: (count: number) => (count === 1 ? "1 geteilter Stand" : `${count} geteilte Stände`),
    active: "Aktiv",
    revoked: "Widerrufen",
    expired: "Abgelaufen",
    until: (date: string) => `Bis ${date}`,
    revoke: "Widerrufen",
    revokeNote: "Der Link funktioniert danach sofort und dauerhaft nicht mehr.",
    revokeNow: "Jetzt widerrufen",
    revoking: "Widerruft …",
    copied: "Sicherer Link kopiert.",
    copyBlocked: "Automatisches Kopieren ist blockiert. Markieren Sie den Link im Feld.",
    createFailed: "Der sichere Link konnte nicht erstellt werden.",
    createOffline: "Die Verbindung wurde unterbrochen. Dieselbe Teilen-Anfrage kann erneut gesendet werden.",
    revokeFailed: "Der Link konnte nicht widerrufen werden.",
    revokedDone: "Der Link wurde dauerhaft widerrufen.",
    revokeOffline: "Die Verbindung wurde beim Widerrufen unterbrochen."
  },
  sharedView: {
    label: "Geteilter Stand",
    loadingTitle: "Ein *Küchenstand*, festgehalten.",
    loadingBody: "Der unveränderliche Stand wird sicher geladen.",
    unavailableTitle: "Link nicht *verfügbar*.",
    footer: "rotpunkt Signature · Geteilte Ansicht ohne Projektdaten",
    brokenSecret: "Der sichere Teil dieses Links fehlt oder ist beschädigt.",
    gone: "Dieser geteilte Stand ist nicht mehr verfügbar."
  },
  gallery: {
    heading: "Visualisierungen",
    empty: "Noch keine Visualisierung. Erzeugte Ansichten sammeln sich hier.",
    accountEmpty:
      "Noch keine Visualisierung. Ansichten, die Sie im Konfigurator erzeugen, sammeln sich hier über alle Projekte hinweg.",
    count: (count: number) => (count === 1 ? "1 Ansicht" : `${count} Ansichten`),
    enlarge: (project: string, date: string) => `${project}, ${date} — größer anzeigen`,
    alt: (project: string) => `Visualisierung ${project}`,
    dialog: "Visualisierung",
    revisionFallback: "Stand",
    disclosure: "Illustrative KI-Ansicht. Sie kann keine Produktwahrheit begründen.",
    loadMore: "Weitere Ansichten laden",
    delete: "Löschen",
    deleteNote: "Diese Visualisierung wird dauerhaft gelöscht. Ihre Konfiguration und deren Versionen bleiben unverändert.",
    deleteForever: "Endgültig löschen",
    deleting: "Löscht …",
    loadFailed: "Die Visualisierungen konnten nicht geladen werden.",
    loadMoreFailed: "Weitere Visualisierungen konnten nicht geladen werden.",
    downloadFailed: "Der Download konnte nicht vorbereitet werden.",
    deleteFailed: "Die Visualisierung konnte nicht gelöscht werden."
  },
  request: {
    label: "Anfrage",
    title: "Planung *anfragen*.",
    intro: (project: string) =>
      `Sie senden „${project}“ in genau diesem Stand an rotpunkt. Die Anfrage ist unverbindlich und noch kein Angebot.`,
    name: "Name",
    email: "E-Mail-Adresse",
    phone: "Telefon",
    note: "Notiz zur Planung",
    optional: "optional",
    notePlaceholder: "Raummaße, Wünsche, ein passender Zeitraum …",
    consent:
      "Ich bin damit einverstanden, dass rotpunkt meine Angaben und diese Konfiguration zur Bearbeitung meiner Anfrage verarbeitet und mich dazu kontaktiert. Die Anfrage ist unverbindlich.",
    submit: "Anfrage senden",
    submitting: "Anfrage wird gesendet …",
    failed: "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    sessionExpired: "Ihre Sitzung ist abgelaufen.",
    signInAgain: "Erneut anmelden",
    conflict: "Dieses Projekt wurde inzwischen an anderer Stelle geändert.",
    loadLatest: "Aktuellen Stand laden",
    receivedLabel: "Anfrage eingegangen",
    savedLabel: "Anfrage gespeichert",
    /** Followed by the person's name and a full stop. */
    thanks: "Vielen *Dank*,",
    receivedBody: (project: string) =>
      `Ihre Anfrage für „${project}“ ist bei rotpunkt eingegangen. Wir melden uns bei Ihnen unter`,
    savedBody: (project: string) => `Ihre Anfrage für „${project}“ ist mit genau diesem Planungsstand gespeichert.`,
    notDeliveredNote:
      "Hinweis: Neue Anfragen erreichen rotpunkt noch nicht automatisch. Bis das eingerichtet ist, meldet sich niemand von selbst.",
    reference: "Referenz",
    received: "Eingegangen",
    keptNote:
      "Die Anfrage bleibt mit genau diesem Planungsstand in Ihrem Bereich hinterlegt. Sie können Ihr Projekt weiter verändern, ohne die Anfrage zu berühren.",
    toRequests: "Zu meinen Anfragen",
    toProject: "Zum Projekt",
    saveFirstTitle: "Zuerst als *Projekt* speichern.",
    saveFirstBody:
      "Eine Anfrage bezieht sich immer auf einen festgehaltenen Planungsstand eines Projekts. Speichern Sie Ihre Konfiguration, dann fragen Sie sie direkt aus dem Projekt heraus an.",
    missingTitle: "Hier fehlt noch das *Projekt*.",
    missingBody: "Das Projekt wurde nicht gefunden oder kann nicht angefragt werden.",
    retiredProduct:
      "Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion. Öffnen Sie das Projekt im Konfigurator, um sie zu aktualisieren.",
    toProjects: "Zu meinen Projekten"
  },
  requestSummary: {
    heading: "Ihre Konfiguration",
    product: "Produkt",
    layout: "Aufbau",
    cabinet: "Korpus",
    front: "Front",
    disclaimer:
      "Unverbindliche Preisindikation zum Zeitpunkt der Anfrage. Sie ist noch kein Angebot."
  },
  requestList: {
    heading: "Anfragen",
    count: (count: number) => (count === 1 ? "1 Anfrage" : `${count} Anfragen`),
    empty:
      "Noch keine Anfrage. Wenn ein Projekt so weit ist, fragen Sie es direkt aus dem Konfigurator an – der Stand bleibt dabei festgehalten.",
    price: (price: string) => `Richtpreis ${price}`,
    older: "Ältere Anfragen werden hier bald nachgeladen.",
    states: {
      submitted: "Eingegangen",
      "in-review": "In Prüfung",
      answered: "Beantwortet",
      withdrawn: "Zurückgezogen"
    } satisfies Record<QuoteRequestState, string>
  },
  /** The layout line of a configuration as a request or version describes it. */
  snapshot: {
    layout: (modules: number, island: string) => `Küchenzeile, ${modules} Module · ${island}`,
    straightLine: "Küchenzeile, gerade",
    islands: {
      0: "ohne Insel",
      2: "Insel klein",
      4: "Insel standard",
      5: "Insel groß",
      6: "Insel extra groß"
    }
  },
  account: {
    intro: "Eine Küche entsteht nicht in einem Moment. Ihr Planungsstand wartet dort, wo Sie ihn verlassen haben.",
    signInTitle: "Planung *fortsetzen*.",
    signInBody:
      "Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen einmaligen Code – ohne Passwort und ohne neues Kontoformular.",
    email: "E-Mail-Adresse",
    emailPlaceholder: "name@beispiel.de",
    requestCode: "Code anfordern",
    preparingCode: "Code wird vorbereitet …",
    signInNote:
      "Mit dem Code melden Sie sich an oder erstellen beim ersten Mal automatisch Ihren privaten Planungsbereich.",
    changeEmail: "E-Mail-Adresse ändern",
    codeTitle: "Sechs *Ziffern*.",
    codeSentBefore: "Wir haben den Code an ",
    codeSentAfter: " gesendet. Er ist fünf Minuten gültig.",
    code: "Einmaliger Code",
    signIn: "Sicher anmelden",
    signingIn: "Anmeldung läuft …",
    developmentOnly: "Nur in Entwicklungs- und Testumgebungen",
    insertCode: "zum Einsetzen",
    tooManyAttempts: "Zu viele Versuche. Bitte warten Sie einige Minuten und versuchen Sie es dann erneut.",
    signInFailed: "Das hat noch nicht funktioniert. Prüfen Sie Ihre Eingabe und versuchen Sie es erneut.",
    title: "Mein *Bereich*.",
    body: "Ihre Projekte, Versionen und späteren Anfragen bleiben hier privat zusammen.",
    signOut: "Abmelden",
    signingOut: "Abmeldung …",
    importing: "Konfiguration wird als privates Projekt gespeichert …",
    importFailed: "Das Projekt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    saveAgain: "Erneut speichern",
    projects: "Projekte",
    projectCount: (count: number) => (count === 1 ? "1 Projekt" : `${count} Projekte`),
    noProjects:
      "Noch ist hier alles offen. Starten Sie im Konfigurator und speichern Sie Ihren Entwurf als privates Projekt.",
    configure: "Küche konfigurieren",
    lastChanged: (date: string) => `Zuletzt geändert am ${date}`,
    open: "Öffnen",
    sessionUntil: (dateTime: string) => `Sitzung geschützt bis ${dateTime} Uhr.`,
    signedInAs: (email: string) => `Angemeldet als ${email}`,
    sectionsLabel: "Bereiche",
    newProject: "Neues Projekt",
    finishes: (cabinet: string, front: string) => `Korpus ${cabinet} · Front ${front}`,
    profile: "Profil",
    profileBody: "Was Sie hier eintragen, setzen wir in Ihre Anfragen ein. Alle Angaben sind freiwillig.",
    name: "Name",
    phone: "Telefon",
    postalCode: "Postleitzahl",
    postalCodeHint: "für Ihre Planungsregion",
    optional: "optional",
    saveProfile: "Profil speichern",
    savingProfile: "Wird gespeichert …",
    profileSaved: "Gespeichert.",
    profileFailed: "Das Profil konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    projectActions: (name: string) => `Aktionen für ${name}`,
    duplicate: "Duplizieren",
    archive: "Archivieren",
    moveToTrash: "In den Papierkorb",
    trashWarning: "Freigabelinks dieses Projekts werden dabei dauerhaft widerrufen.",
    confirmTrash: "Ja, in den Papierkorb",
    cancel: "Abbrechen",
    restore: "Wiederherstellen",
    archived: "Archiv",
    archivedBody: "Archivierte Projekte ruhen, bis Sie sie wiederherstellen. Ihre Freigabelinks bleiben gültig.",
    trash: "Papierkorb",
    trashBody: "Projekte im Papierkorb bleiben, bis Sie sie wiederherstellen oder endgültig löschen. Ihre Freigabelinks sind bereits widerrufen.",
    inTrashSince: (date: string) => `Im Papierkorb seit ${date}`,
    deleteForGood: "Endgültig löschen",
    deleteForGoodWarning: "Projekt, Versionen und Bilder werden gelöscht. Das lässt sich nicht rückgängig machen.",
    confirmDelete: "Ja, endgültig löschen",
    dataSection: "Daten & Konto",
    dataBody: "Ihre Daten gehören Ihnen: Laden Sie sie herunter oder löschen Sie Ihr Konto.",
    exportData: "Meine Daten herunterladen",
    exportHint: "Eine JSON-Datei mit Profil, Projekten, Versionen, Freigaben, Anfragen und der Liste Ihrer Bilder.",
    deleteAccount: "Konto löschen",
    deleteAccountBody:
      "Löscht Ihr Konto mit Profil, Projekten, Versionen, Freigabelinks und Bildern. Gespeicherte Bilder verschwinden 30 Tage später auch aus dem Speicher.",
    deleteAccountWarning: "Das lässt sich nicht rückgängig machen.",
    confirmDeleteAccount: "Ja, Konto endgültig löschen",
    deletingAccount: "Konto wird gelöscht …",
    accountHasRequests:
      "Ihr Konto enthält Anfragen. Damit rotpunkt sie bearbeiten kann, löschen wir es nicht hier: Schreiben Sie uns, dann löschen wir es von Hand.",
    reauthRequired:
      "Zur Sicherheit braucht das Löschen eine frische Anmeldung. Melden Sie sich ab und wieder an und löschen Sie das Konto dann innerhalb von 15 Minuten.",
    signOutToConfirm: "Abmelden und neu anmelden",
    accountDeleteFailed: "Das Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
    copyName: (name: string) => `${name} (Kopie)`,
    actionFailed: "Das hat nicht funktioniert. Bitte versuchen Sie es erneut."
  },
  apiErrors: {
    "session-expired": "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    "signed-out": "Nicht angemeldet.",
    "sign-in-to-save": "Bitte melden Sie sich an, um ein Projekt zu speichern.",
    "invalid-request": "Die Anfrage ist ungültig.",
    "invalid-cursor": "Der Seitenzeiger ist ungültig.",
    "invalid-project": "Das Projekt ist ungültig.",
    "invalid-project-request": "Die Projektanfrage ist ungültig.",
    "invalid-save-request": "Die Speicheranfrage ist ungültig.",
    "invalid-project-name": "Ein Projektname hat 1 bis 120 Zeichen.",
    "invalid-name": "Der neue Name ist ungültig.",
    "project-not-trashed": "Nur Projekte im Papierkorb lassen sich endgültig löschen.",
    "project-has-requests": "Projekte mit Anfragen bleiben erhalten. Wenden Sie sich an rotpunkt, wenn eines gelöscht werden soll.",
    "project-lifecycle-conflict": "Das Projekt hat sich inzwischen geändert. Laden Sie die Seite neu und versuchen Sie es erneut.",
    "invalid-profile":
      "Bitte prüfen Sie Ihre Angaben: Telefon mit 3 bis 40 Zeichen, Postleitzahl mit 3 bis 10 Buchstaben oder Ziffern.",
    "invalid-revision": "Die Version ist ungültig.",
    "invalid-link": "Der Link ist ungültig.",
    "invalid-job": "Der Auftrag ist ungültig.",
    "invalid-photo": "Das Bild ist ungültig.",
    "invalid-delivery": "Ungültige Zustellung.",
    "email-required": "Eine gültige E-Mail-Adresse ist erforderlich.",
    "not-found": "Nicht gefunden.",
    "photo-not-found": "Das Bild wurde nicht gefunden.",
    "link-not-found": "Der Link wurde nicht gefunden.",
    "quote-request-not-found": "Die Anfrage wurde nicht gefunden.",
    "project-not-editable": "Das Projekt wurde nicht gefunden oder kann nicht bearbeitet werden.",
    "project-not-shareable": "Das Projekt wurde nicht gefunden oder kann nicht geteilt werden.",
    "project-not-requestable": "Das Projekt wurde nicht gefunden oder kann nicht angefragt werden.",
    "project-conflict": "Dieses Projekt wurde inzwischen an anderer Stelle geändert.",
    "unreadable-configuration": "Die Konfiguration konnte nicht gelesen werden.",
    "product-version-retired": "Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion.",
    "working-version-retired": "Der aktuelle Arbeitsstand verwendet eine nicht mehr verfügbare Produktversion.",
    "product-version-not-shareable": "Diese Produktversion kann derzeit nicht geteilt werden.",
    "historical-version-unavailable": "Diese historische Produktversion kann derzeit nicht angezeigt werden.",
    "historical-version-not-restorable":
      "Diese historische Produktversion kann mit dem aktuellen Konfigurator nicht geöffnet werden.",
    "revision-not-usable": "Die Version wurde nicht gefunden oder kann nicht verwendet werden.",
    "save-key-reused": "Diese Speicheranfrage wurde bereits mit anderen Daten verwendet.",
    "share-key-reused": "Diese Teilen-Anfrage wurde bereits mit anderen Daten verwendet.",
    "request-key-reused": "Diese Anfrage wurde bereits mit anderen Daten verwendet.",
    "quote-key-reused": "Diese Anfrage wurde bereits mit anderen Angaben gesendet.",
    "token-conflict": "Der sichere Link konnte nicht erzeugt werden. Bitte erneut versuchen.",
    "shared-revision-unavailable": "Dieser geteilte Stand ist nicht verfügbar.",
    "shared-revision-gone": "Dieser geteilte Stand ist nicht mehr verfügbar.",
    "quote-details-required":
      "Bitte prüfen Sie Ihre Angaben. Name, E-Mail-Adresse und Einwilligung sind erforderlich.",
    "quote-daily-limit": "Das Tageslimit für Anfragen ist erreicht. Bitte versuchen Sie es später erneut.",
    "photo-daily-limit": "Das Tageslimit für Visualisierungen ist erreicht.",
    "photo-budget-exhausted":
      "Das Kontingent für Visualisierungen ist heute ausgeschöpft. Bitte versuchen Sie es später erneut.",
    "scene-not-offered": "Diese Szene steht nicht zur Auswahl.",
    "capture-rejected": "Die Aufnahme wurde abgelehnt.",
    "job-not-ready": "Der Auftrag ist nicht startbereit.",
    "generation-not-started": "Die Erzeugung konnte nicht gestartet werden."
  } satisfies Record<ApiErrorCode, string>,
  /** The sign-in code email, in the language of the page it was asked for on. */
  authenticationEmail: {
    subjects: {
      "sign-in": "Ihr Anmeldecode für rotpunkt Signature",
      "email-verification": "Bestätigen Sie Ihre E-Mail-Adresse",
      "forget-password": "Ihr Sicherheitscode für rotpunkt Signature",
      "change-email": "Bestätigen Sie die Änderung Ihrer E-Mail-Adresse"
    },
    purposes: {
      "sign-in": "Anmeldung",
      "email-verification": "Bestätigung Ihrer E-Mail-Adresse",
      "forget-password": "Wiederherstellung Ihres Zugangs",
      "change-email": "Änderung Ihrer E-Mail-Adresse"
    },
    codeIs: (purpose: string) => `Ihr Code für die ${purpose} lautet:`,
    validity: "Der Code ist fünf Minuten gültig und kann einmal verwendet werden.",
    ignore: "Wenn Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren."
  }
};

export type Messages = typeof de;
