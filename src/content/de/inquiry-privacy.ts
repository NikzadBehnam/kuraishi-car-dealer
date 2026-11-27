import { inquiryPrivacyAcknowledgement } from "./inquiry-privacy-acknowledgement.ts";

export const inquiryPrivacyNotice = {
  ...inquiryPrivacyAcknowledgement,
  controller: {
    name: "Kuraishi Autohandel e.U.",
    address: "Treustraße 57/4/3, 1200 Wien, Österreich",
    email: "ali.shawkat2014@yahoo.com",
  },
  sections: [
    {
      title: "Website, Fahrzeugvergleich und geschützter Arbeitsbereich",
      paragraphs: [
        "Beim Aufruf der Website werden technische Verbindungs- und Anfragedaten verarbeitet, etwa IP-Adresse, Zeitpunkt, angeforderter Pfad und Browserinformationen. Dies dient der Auslieferung, Fehlersuche und Sicherheit. Als Rechtsgrundlage wird Art. 6 Abs. 1 lit. f DSGVO mit dem Interesse an einem sicheren und funktionsfähigen Angebot vorgeschlagen. Die tatsächliche Laufzeit und der Zugriff auf technische Protokolle müssen vor Freigabe bestätigt werden.",
        "Wenn Sie den Fahrzeugvergleich nutzen, merkt sich Ihr Browser ausgewählte Fahrzeugkennungen im lokalen Speicher. Diese Auswahl können Sie im Vergleich ändern oder über die Website-Daten Ihres Browsers löschen. Bei externen Links, etwa zum Routenplaner oder zu sozialen Netzwerken, gelten nach dem Aufruf die Datenschutzhinweise des jeweiligen Dienstes.",
        "Der geschützte Arbeitsbereich verwendet Sitzungs-Cookies für die Anmeldung berechtigter Beschäftigter. Für den Kontozugriff werden u. a. Name, dienstlich verwendete E-Mail-Adresse, Rolle, Anmeldedaten in geschützter Form und Sitzungsinformationen verarbeitet. Die Rechtsgrundlage und Aufbewahrung für Beschäftigtendaten und lokale Speicherung sind getrennt zu prüfen.",
      ],
    },
    {
      title: "Kontakt- und Terminanfragen",
      paragraphs: [
        "Wir verwenden Ihre Angaben, um Ihre Anfrage zu bearbeiten, Sie persönlich per Telefon oder E-Mail zu kontaktieren und die Bearbeitung intern zu dokumentieren. Ein Wunschtermin ist keine Buchung. Es gibt keine automatisierte Entscheidung über Ihre Anfrage, keinen automatischen E-Mail-Versand und keine Verwendung Ihrer Anfrage für einen Newsletter.",
        "Für das Online-Formular sind Name, E-Mail-Adresse, Anfrageart und die Bestätigung der Kenntnisnahme erforderlich. Telefonnummer, Wunschtermin und Nachricht sind freiwillig. Je nach Einstieg erfassen wir auch das Servicethema und das ausgewählte Fahrzeug. Ohne Pflichtangaben kann das Formular nicht gesendet werden; Sie können uns auch per Telefon oder E-Mail kontaktieren. Bitte geben Sie keine Ausweisdaten, Gesundheitsdaten oder andere sensible Informationen im Freitext an.",
        "Zur Bearbeitung speichern wir außerdem den Eingangszeitpunkt, den Bearbeitungsstatus und gegebenenfalls interne Notizen. Wir dokumentieren die Fassung und den Wortlaut der Kenntnisnahme und deren Zeitpunkt. Ein Anfrageschlüssel und ein mit einem geheimen Schlüssel erzeugter Prüfwert helfen, versehentliche Mehrfachübermittlungen zu vermeiden.",
      ],
    },
    {
      title: "Zwecke und vorgeschlagene Rechtsgrundlagen",
      paragraphs: [
        "Für von Ihnen angefragte vorvertragliche Maßnahmen, etwa zu einem konkreten Fahrzeugkauf, kommt Art. 6 Abs. 1 lit. b DSGVO in Betracht. Für allgemeine Anfragen ohne solchen Bezug schlagen wir Art. 6 Abs. 1 lit. f DSGVO vor. Das zu prüfende berechtigte Interesse ist die Bearbeitung Ihrer Nachricht und die Dokumentation der notwendigen Rückfragen.",
        "Für den sicheren Betrieb und die Missbrauchsabwehr schlagen wir Art. 6 Abs. 1 lit. f DSGVO vor. Beim Absenden verarbeiten wir die vom Hostingdienst übermittelte IP-Adresse und speichern zur Begrenzung der Anfragen einen pseudonymisierten Prüfwert in der Anwendung. Die Bestätigung im Formular ist eine Kenntnisnahme und keine Einwilligung in Werbung oder andere zusätzliche Zwecke.",
      ],
    },
    {
      title: "Empfänger und mögliche Verarbeitung außerhalb des EWR",
      paragraphs: [
        "Zugriff auf Anfragen haben die für die Bearbeitung berechtigten Beschäftigten des Autohauses und, soweit für Betrieb oder Support erforderlich, dazu befugte technische Stellen. Vercel stellt das Hosting und die Ausführung der Webanwendung bereit. Neon betreibt die Datenbank und Wiederherstellungskopien; die Produktionsdatenbank liegt in Frankfurt am Main. Bei persönlichen Antworten per E-Mail werden Informationen auch durch die beteiligten E-Mail-Dienste verarbeitet. Der Dienst für simulierte Testbenachrichtigungen erhält keine echten Formularanfragen.",
        "Die überprüfte Vercel-Bereitstellung führt Anwendungsfunktionen in den USA aus. Hostingdienste können technische Anfragedaten wie IP-Adresse, Zeitpunkt und Pfad verarbeiten. Welche Anbieter und Unterauftragnehmer als Auftragsverarbeiter eingesetzt werden, welche Drittlandzugriffe stattfinden, welche Garantien gelten und wie diese eingesehen werden können, muss vor der Freigabe bestätigt und hier konkret ergänzt werden.",
      ],
    },
    {
      title: "Speicherdauer und Löschung",
      paragraphs: [
        "Vorgesehen ist, Anfragen nur so lange personenbezogen zu speichern, wie sie zur Bearbeitung erforderlich sind. Offene Anfragen werden regelmäßig geprüft; abgeschlossene Anfragen werden nach den freigegebenen Kriterien gelöscht. Eine längere Speicherung kommt nur in Betracht, soweit ein dokumentierter Grund besteht, etwa eine gesetzliche Pflicht oder die Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen. Die konkreten Prüf- und Löschfristen sind vor der Freigabe zu bestätigen.",
        "Bei der Löschung aus der aktiven Datenbank entfallen auch zugehörige Notizen und etwaige technische Benachrichtigungseinträge. E-Mail-Kopien und Wiederherstellungskopien folgen eigenen Lösch- und Ablaufregeln. Bei einer Wiederherstellung müssen bereits bearbeitete Löschungen vor der erneuten Nutzung der Daten berücksichtigt werden. Ein Kontingent für den Missbrauchsschutz läuft nach 15 Minuten ab; technische Einträge werden anschließend bei der Bereinigung entfernt.",
      ],
    },
    {
      title: "Ihre Rechte und Beschwerden",
      paragraphs: [
        "Nach Maßgabe der DSGVO haben Sie das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung sowie gegebenenfalls auf Datenübertragbarkeit. Einer Verarbeitung auf Grundlage berechtigter Interessen können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, widersprechen. Richten Sie Anträge, auch auf Löschung, an die oben angegebene Kontaktadresse. Wir können erforderlichenfalls Angaben zur Identitätsprüfung erfragen.",
        "Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere bei der Österreichischen Datenschutzbehörde. Weitere Informationen sowie aktuelle Kontaktmöglichkeiten finden Sie auf dsb.gv.at.",
      ],
    },
  ],
} as const;

const inquiryPrivacyNotices = {
  [inquiryPrivacyNotice.version]: inquiryPrivacyNotice,
} as const;

export function getInquiryPrivacyNotice(version?: string) {
  if (version === undefined) return inquiryPrivacyNotice;
  return Object.values(inquiryPrivacyNotices).find(
    (notice) => notice.version === version,
  );
}
