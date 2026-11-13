"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { siteConfig } from "@/config/site.config";

const qrValue = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `FN:${siteConfig.name}`,
  `ORG:${siteConfig.name}`,
  ...[siteConfig.contact.phone, ...siteConfig.contact.additionalPhones].map(
    (phone) => `TEL:${phone.replace(/\s/g, "")}`,
  ),
  `EMAIL:${siteConfig.contact.email}`,
  `ADR:;;${siteConfig.address.street};${siteConfig.address.city};;${siteConfig.address.postalCode};${siteConfig.address.country}`,
  `URL:${siteConfig.url}`,
  "END:VCARD",
].join("\n");

export function DealershipQrCode() {
  return (
    <section className="h-fit min-w-0 rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
        <QrCode className="text-accent size-4" aria-hidden="true" />
        Kontakt speichern
      </h2>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="footer-qr relative shrink-0 overflow-hidden rounded-sm bg-white p-2">
          <QRCodeSVG
            value={qrValue}
            size={104}
            level="M"
            bgColor="#ffffff"
            fgColor="#10213b"
            title="Kontaktdaten von Kuraishi Autohandel"
          />
          <span className="footer-qr-scan" aria-hidden="true" />
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-bold text-white">
            Alle Kontaktdaten auf einen Blick
          </p>
          <p className="max-w-48 text-xs leading-5 text-[#aebbc9]">
            QR-Code scannen und die Kontaktdaten direkt im Adressbuch speichern.
          </p>
        </div>
      </div>
    </section>
  );
}
