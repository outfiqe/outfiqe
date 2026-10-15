import { describe, expect, it } from "vitest";

import type { PickupLocation } from "../api/pickupLocationSchemas";
import {
  formatMapPin,
  googleMapsLinkFor,
  parseMapPin,
  toPickupLocationFormValues,
  toPickupLocationRequestBody,
} from "./pickupLocationForm.utils";

const pickupLocation: PickupLocation = {
  id: "location-1",
  label: "Studio",
  contactName: "Studio Manager",
  contactPhone: "+9779812345678",
  address: "Jhamsikhel Road",
  landmark: null,
  city: "Lalitpur",
  countryCode: "NP",
  latitude: 27.6766,
  longitude: 85.3132,
  openingNote: null,
  isDefault: true,
  isCoveredByOutfiqePickup: true,
};

describe("parseMapPin", () => {
  it("reads a pasted latitude, longitude pair", () => {
    expect(parseMapPin(" 27.6766 , 85.3132 ")).toEqual({ latitude: 27.6766, longitude: 85.3132 });
  });

  it("rejects text that isn't a coordinate pair", () => {
    expect(parseMapPin("Jhamsikhel")).toBeNull();
  });

  it("rejects a pin off the map", () => {
    expect(parseMapPin("97.1, 85.3")).toBeNull();
  });
});

describe("pickup location form conversion", () => {
  it("fills the form from a saved location, including its pin", () => {
    expect(toPickupLocationFormValues(pickupLocation)).toMatchObject({
      label: "Studio",
      landmark: "",
      mapPin: "27.6766, 85.3132",
      openingNote: "",
    });
  });

  it("starts empty for a new location", () => {
    expect(toPickupLocationFormValues(undefined).mapPin).toBe("");
  });

  it("sends empty optional fields as null and splits the pin", () => {
    expect(
      toPickupLocationRequestBody({
        label: "Studio",
        contactName: "Studio Manager",
        contactPhone: "9812345678",
        address: "Jhamsikhel Road",
        city: "Lalitpur",
        landmark: "",
        mapPin: "27.6766, 85.3132",
        openingNote: "",
      }),
    ).toEqual({
      label: "Studio",
      contactName: "Studio Manager",
      contactPhone: "9812345678",
      address: "Jhamsikhel Road",
      city: "Lalitpur",
      landmark: null,
      openingNote: null,
      latitude: 27.6766,
      longitude: 85.3132,
    });
  });

  it("leaves the pin empty when the location has none", () => {
    expect(formatMapPin({ latitude: null, longitude: null })).toBe("");
  });

  it("links a pin to Google Maps", () => {
    expect(googleMapsLinkFor({ latitude: 27.6766, longitude: 85.3132 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=27.6766,85.3132",
    );
  });
});
