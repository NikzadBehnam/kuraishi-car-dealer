import { inquiryPrivacyAcknowledgement } from "./inquiry-privacy-acknowledgement.ts";

export const formContent = {
  required: "Dieses Feld ist erforderlich.",
  invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  consent: inquiryPrivacyAcknowledgement.text,
  unavailable:
    "Online-Anfragen sind derzeit noch nicht verfügbar. Bitte kontaktieren Sie uns telefonisch oder per E-Mail. Ein Wunschtermin ist keine bestätigte Buchung.",
  successTitle: "Ihre Anfrage ist eingegangen.",
  successDescription: "Wir melden uns persönlich bei Ihnen.",
  name: "Vor- und Nachname",
  email: "E-Mail",
  phone: "Telefon (optional)",
  message: "Nachricht (optional)",
  appointmentType: "Terminart",
  preferredDate: "Wunschtermin (optional)",
};
