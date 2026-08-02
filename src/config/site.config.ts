export const siteConfig = {
  name: "Autowelt Rhein",
  shortName: "Autowelt",
  tagline: "Ihr Fahrzeug. Ihre Entscheidung.",
  description:
    "Geprüfte Fahrzeuge, transparente Angebote und persönliche Beratung in Düsseldorf.",
  contact: { phone: "+49 211 879 42 100", email: "beratung@autowelt-rhein.de" },
  address: {
    street: "Kaiserswerther Straße 215",
    postalCode: "40474",
    city: "Düsseldorf",
    country: "Deutschland",
  },
  openingHours: ["Mo–Fr 08:00–19:00", "Sa 09:00–16:00"],
} as const;
