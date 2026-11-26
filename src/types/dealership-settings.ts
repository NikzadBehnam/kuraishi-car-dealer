export interface PublicDealershipDTO {
  name: string;
  shortName: string;
  tagline: string;
  websiteUrl: string;
  description: string;
  phone: string;
  phone2: string | null;
  phone3: string | null;
  legalForm: string | null;
  businessActivity: string | null;
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
