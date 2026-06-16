/**
 * Request geolocation, replacing @vercel/functions' `geolocation`/`Geo`.
 *
 * Vercel injected geo headers at its edge; Cloud Run does not on its own. When
 * fronted by a Google load balancer / App Engine, GCP sets `X-AppEngine-*`
 * geo headers, which we read here. With no such headers the geo is simply
 * empty (every field undefined): geo is best-effort context for the prompt,
 * never required, so its absence degrades gracefully rather than failing.
 */
export type Geo = {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
};

export function getGeo(request: Request): Geo {
  const headers = request.headers;
  const country = headers.get("x-appengine-country") ?? undefined;
  const city = headers.get("x-appengine-city") ?? undefined;

  // "lat,long" when present.
  const cityLatLong = headers.get("x-appengine-citylatlong");
  let latitude: string | undefined;
  let longitude: string | undefined;
  if (cityLatLong) {
    const [lat, long] = cityLatLong.split(",");
    latitude = lat?.trim() || undefined;
    longitude = long?.trim() || undefined;
  }

  return { latitude, longitude, city, country };
}
