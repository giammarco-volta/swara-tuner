export function shiftHzByCents(baseHz: number, cents: number): number {
  return baseHz * Math.pow(2, cents / 1200);
}

// per ora versione 12-TET, utile per sbloccare subito la UI
export function c4ToA3Hz(c4Hz: number): number {
  return shiftHzByCents(c4Hz, -300); // A3 è 300 cents sotto C4
}

export function a3ToC4Hz(a3Hz: number): number {
  return shiftHzByCents(a3Hz, 300);
}