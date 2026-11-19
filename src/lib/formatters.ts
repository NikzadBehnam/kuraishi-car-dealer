const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("de-DE");
export const formatCurrency = (value: number | string) => {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    throw new TypeError("Currency value must be finite.");
  }
  return currency.format(amount);
};
export const formatMileage = (value: number) => `${integer.format(value)} km`;
export const formatPower = (kw: number, ps: number) => `${kw} kW (${ps} PS)`;
export const formatRegistration = (value: string) => {
  const [year, month] = value.split("-");
  return `${month}/${year}`;
};
export const formatFuelType = (value: string) =>
  ({
    petrol: "Benzin",
    diesel: "Diesel",
    electric: "Elektro",
    hybrid: "Hybrid",
  })[value] ?? value;
export const formatTransmission = (value: string) =>
  value === "automatic" ? "Automatik" : "Manuell";
export const formatBodyType = (value: string) =>
  ({
    suv: "SUV",
    compact: "Kleinwagen",
    sedan: "Limousine",
    wagon: "Kombi",
    van: "Transporter",
    sports: "Sportwagen",
  })[value] ?? value;
