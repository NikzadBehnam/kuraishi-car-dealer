import type {
  VehicleBodyType,
  VehicleCondition,
  VehicleFuelType,
  VehicleTransmissionType,
} from "@/features/vehicles/constants";

export type FuelType = VehicleFuelType;
export type TransmissionType = VehicleTransmissionType;
export type BodyType = VehicleBodyType;
export interface Vehicle {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string;
  price: number;
  firstRegistration: string;
  mileage: number;
  fuelType: FuelType;
  transmissionType: TransmissionType;
  powerKw: number;
  powerPs: number;
  bodyType: BodyType;
  exteriorColor: string;
  consumption?: number;
  co2Emission?: number;
  condition: VehicleCondition;
  features: string[];
  description: string;
  images: string[];
  dealerId: string;
  location: string;
  isFeatured: boolean;
  isAvailable: boolean;
  labels: string[];
}
