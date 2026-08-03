"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { siteConfig } from "@/config/site.config";

const qrValue = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  `FN:${siteConfig.name}`,
  `ORG:${siteConfig.name}`,
  `TEL:${siteConfig.contact.phone}`,
  `EMAIL:${siteConfig.contact.email}`,
  `ADR:;;${siteConfig.address.street};${siteConfig.address.city};;${siteConfig.address.postalCode};${siteConfig.address.country}`,
  `URL:${siteConfig.url}`,
  "END:VCARD",
].join("\n");

export function DealershipQrCode() {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
        <QrCode className="text-accent size-4" aria-hidden="true" />
        Kontakt speichern
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="footer-qr relative shrink-0 overflow-hidden rounded-sm bg-white p-2">
          <QRCodeSVG
            value={qrValue}
            size={112}
            level="M"
            bgColor="#ffffff"
            fgColor="#10213b"
            title="Kontaktdaten von Kuraishi Autohandel"
          />
          <span className="footer-qr-scan" aria-hidden="true" />
        </div>
        <p className="max-w-36 text-xs leading-5 text-[#aebbc9]">
          QR-Code scannen und alle Kontaktdaten direkt speichern.
        </p>
      </div>
    </div>
  );
}
