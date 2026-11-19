export interface PublicDealershipDTO {
  name: string;
  shortName: string;
  tagline: string;
  websiteUrl: string;
  description: string;
  phone: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  mapUrl: string;
}

export interface AdminDealershipSettingsDTO extends PublicDealershipDTO {
  version: number;
}
