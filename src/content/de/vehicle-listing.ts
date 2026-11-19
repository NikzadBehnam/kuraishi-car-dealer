export const vehicleListingContent = {
  title: "Fahrzeuge entdecken",
  description: "Geprüfte Qualität. Transparent beschrieben. Sofort verfügbar.",
  search: "Fahrzeuge durchsuchen",
  searchPlaceholder: "Marke, Modell oder Stichwort suchen",
  clearSearch: "Suche zurücksetzen",
  resultCount: (count: number) =>
    `${count} ${count === 1 ? "Fahrzeug" : "Fahrzeuge"} gefunden`,
  noResults: "Keine passenden Fahrzeuge gefunden",
  noResultsHint:
    "Ändern Sie Ihren Suchbegriff oder setzen Sie die Suche zurück.",
  emptyCatalog: "Aktuell sind keine Fahrzeuge verfügbar",
  emptyCatalogHint:
    "Bitte schauen Sie später wieder vorbei oder lassen Sie sich persönlich beraten.",
  invalidSearch: "Ungültige Suchanfrage",
  invalidSearchHint:
    "Suchbegriff oder Seitenzahl sind ungültig. Bitte starten Sie die Suche neu.",
  pageUnavailable: "Auf dieser Seite gibt es keine Fahrzeuge.",
  pageLabel: (page: number, totalPages: number) =>
    `Seite ${page} von ${totalPages}`,
  previousPage: "Vorherige Seite",
  nextPage: "Nächste Seite",
};
