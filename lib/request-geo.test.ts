import { describe, expect, it } from "vitest";
import { getGeo } from "./request-geo";

const requestWith = (headers: Record<string, string>): Request =>
  new Request("http://localhost/", { headers });

describe("getGeo", () => {
  it("reads GCP App Engine geo headers", () => {
    const geo = getGeo(
      requestWith({
        "x-appengine-country": "GB",
        "x-appengine-city": "london",
        "x-appengine-citylatlong": "51.5074,-0.1278",
      })
    );

    expect(geo).toEqual({
      country: "GB",
      city: "london",
      latitude: "51.5074",
      longitude: "-0.1278",
    });
  });

  it("returns an empty geo when no headers are present", () => {
    const geo = getGeo(requestWith({}));
    expect(geo).toEqual({
      latitude: undefined,
      longitude: undefined,
      city: undefined,
      country: undefined,
    });
  });
});
