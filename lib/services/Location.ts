import type {
  AddressComponent,
  DirectionsRequest,
  PlaceDetailsRequest
} from '@googlemaps/google-maps-services-js';
import {
  Client,
  Language,
  PlaceType2,
  TravelMode,
  UnitSystem
} from '@googlemaps/google-maps-services-js';

type userLocation = {
  longitude: number,
  latitude: number
};

export class LocationService {
  private static googleMapsClient = new Client();

  static async getPlaceDetails(placeId: string) {
    try {
      const placeDetailsRequest: PlaceDetailsRequest = {
        params: {
          key: process.env.GOOGLE_MAPS_API_KEY || '',
          place_id: placeId,
          language: Language.en,
          region: 'ca',
          fields: [
            'address_components',
            'formatted_address',
            'geometry',
            'url',
            'name',
          ],
        }
      };

      const {
        data: { result },
      } = await this.googleMapsClient.placeDetails(placeDetailsRequest);

      if (!result) return {};
      const {
        postalCode,
        countryShortName,
        countryLongName,
        provinceShortName,
        provinceLongName,
      } = this.decodeAddressComponents(result.address_components!);

      return {
        address: result.formatted_address,
        longitude: result.geometry?.location.lng,
        latitude: result.geometry?.location.lat,
        url: result.url,
        name: result.name,
        postalCode,
        countryShortName,
        countryLongName,
        provinceShortName,
        provinceLongName,
      };
    } catch (error) {
      console.error('getPlaceDetails-error', error);
      throw error;
    }
  }

  private static decodeAddressComponents(addressComponents: AddressComponent[]) {
    let postalCode = null;
    let countryShortName = null;
    let countryLongName = null;
    let provinceShortName = null;
    let provinceLongName = null;

    for (const component of addressComponents) {
      if (component.types.includes(PlaceType2.postal_code))
        postalCode = component.short_name;


      if (component.types.includes(PlaceType2.country)) {
        countryShortName = component.short_name;
        countryLongName = component.long_name;
      }

      if (component.types.includes(PlaceType2.administrative_area_level_1)) {
        provinceShortName = component.short_name;
        provinceLongName = component.long_name;
      }
    }

    return {
      postalCode,
      countryShortName,
      countryLongName,
      provinceShortName,
      provinceLongName,
    };
  }

  static async getStoreDistance(userLocation: userLocation, storeLocation: string) {
    try {
      const directionRequest: DirectionsRequest = {
        params: {
          key: process.env.GOOGLE_MAPS_ROUTES_API_KEY || '',
          origin: {
            longitude: userLocation.longitude,
            latitude: userLocation.latitude
          },
          destination: `place_id:${storeLocation}`,
          mode: TravelMode.walking,
          language: Language.en,
          units: UnitSystem.metric,
          region: 'ca',
        }
      };
      const response = await this.googleMapsClient.directions(directionRequest);

      if (response.data.status !== 'OK')
        throw new Error(`Directions request failed with status: ${response.data.status}`);


      return response.data.routes[0].legs[0].distance.value;
    } catch (error) {
      console.error('getStoreDistance-error', error);
      throw error;
    }

  }
}

