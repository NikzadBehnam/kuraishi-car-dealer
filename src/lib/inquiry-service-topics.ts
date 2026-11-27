import { z } from "zod";

export const inquiryServiceTopics = {
  inzahlungnahme: {
    title: "Inzahlungnahme",
    appointmentType: "Fahrzeugbewertung",
  },
  fahrzeugankauf: {
    title: "Fahrzeugankauf",
    appointmentType: "Fahrzeugbewertung",
  },
  garantie: { title: "Garantie", appointmentType: "Beratung" },
  versicherung: { title: "Versicherung", appointmentType: "Beratung" },
  zulassungsservice: {
    title: "Zulassungsservice",
    appointmentType: "Beratung",
  },
  werkstatt: { title: "Werkstatt", appointmentType: "Werkstatt" },
} as const;

export type InquiryServiceTopic = keyof typeof inquiryServiceTopics;

export const inquiryServiceTopicSchema = z.custom<InquiryServiceTopic>(
  (value) =>
    typeof value === "string" && Object.hasOwn(inquiryServiceTopics, value),
  "Bitte wählen Sie ein gültiges Servicethema.",
);
