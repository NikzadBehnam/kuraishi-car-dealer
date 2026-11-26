"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { getDealershipPhones } from "@/lib/dealership-phones";
import type { PublicDealershipDTO } from "@/types/dealership-settings";

function getQrValue(settings: PublicDealershipDTO) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${settings.name}`,
    `ORG:${settings.name}`,
    ...getDealershipPhones(settings).map(({ number }) => `TEL:${number}`),
    `EMAIL:${settings.email}`,
    `ADR:;;${settings.street};${settings.city};;${settings.postalCode};${settings.country}`,
    `URL:${settings.websiteUrl}`,
    "END:VCARD",
  ].join("\n");
}

export function DealershipQrCode({
  settings,
}: {
  settings: PublicDealershipDTO;
}) {
  return (
    <section className="h-fit min-w-0 rounded-[var(--radius-sm)] border border-white/10 bg-white/[0.04] p-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-white">
        <QrCode className="text-accent size-4" aria-hidden="true" />
        Kontakt speichern
      </h2>
      <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="footer-qr relative shrink-0 overflow-hidden rounded-sm bg-white p-2">
          <QRCodeSVG
            value={getQrValue(settings)}
            size={104}
            level="M"
            bgColor="#ffffff"
            fgColor="#10213b"
            title={`Kontaktdaten von ${settings.name}`}
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
