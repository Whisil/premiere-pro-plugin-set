declare module "world-atlas/countries-110m.json" {
  const value: any;
  export default value;
}

declare module "world-countries" {
  interface CountryRecord {
    cca3: string;
    ccn3?: string;
    name: { common: string };
    latlng?: [number, number];
  }
  const countries: CountryRecord[];
  export default countries;
}
