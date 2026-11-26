import type { PublicDealershipDTO } from "../types/dealership-settings.ts";

export function getDealershipPhones({
  phone,
  phone2,
  phone3,
}: Pick<PublicDealershipDTO, "phone" | "phone2" | "phone3">) {
  const seen = new Set<string>();
  return [phone, phone2, phone3].flatMap((label) => {
    if (!label) return [];
    const number = label.replace(/[^\d+]/g, "");
    if (seen.has(number)) return [];
    seen.add(number);
    return [{ label, number }];
  });
}
