// "Moje relacije" — same matching rule as backend services/notifications.py::corridor_matches.
export interface Corridor {
  id?: number;
  origin_country: string | null;
  destination_country: string | null;
  both_directions: boolean;
}

const norm = (c?: string | null) => (c || '').trim().toUpperCase();

export function corridorMatches(c: Corridor, origin?: string | null, destination?: string | null): boolean {
  const o = norm(origin);
  const d = norm(destination);
  const co = norm(c.origin_country);
  const cd = norm(c.destination_country);
  const fits = (a: string, b: string) => (!co || co === a) && (!cd || cd === b);
  return fits(o, d) || (c.both_directions && fits(d, o));
}

/** No corridors set = every new request counts (the whole board). */
export function requestMatchesAny(corridors: Corridor[], req: any): boolean {
  if (!corridors.length) return true;
  return corridors.some((c) => corridorMatches(c, req?.origin_country, req?.destination_country));
}
