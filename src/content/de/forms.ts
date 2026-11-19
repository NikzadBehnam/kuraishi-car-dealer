import { inquiryPrivacyNotice } from "./inquiry-privacy.ts";

export const formContent = {
  required: "Dieses Feld ist erforderlich.",
  invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  consent: inquiryPrivacyNotice.text,
  unavailable:
    "Online-Anfragen sind derzeit noch nicht verfügbar. Bitte kontaktieren Sie uns telefonisch oder per E-Mail. Ein Wunschtermin ist keine bestätigte Buchung.",
  successTitle: "Vielen Dank!",
  successDescription:
    "Ihre Anfrage ist bei uns eingegangen. Wir melden uns persönlich bei Ihnen.",
  name: "Vor- und Nachname",
  email: "E-Mail",
  phone: "Telefon (optional)",
  message: "Nachricht",
  appointmentType: "Terminart",
  preferredDate: "Wunschtermin (optional)",
};
