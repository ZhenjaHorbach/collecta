import type { ExpoConfig } from 'expo/config';

import baseConfig from './app.json';

const base = baseConfig.expo as ExpoConfig;
// EXPO_PUBLIC_* prefix marks this key as one that ships into the client
// bundle — required for the web map (@vis.gl/react-google-maps reads it
// via `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) and read by the same
// process here for native config blocks. Single source of truth.
// Defence in depth: HTTP referrer restrictions on the key in Google Cloud
// Console scope it to our origins.
const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default (): ExpoConfig => ({
  ...base,
  ios: {
    ...base.ios,
    config: { ...base.ios?.config, googleMapsApiKey: mapsKey },
  },
  android: {
    ...base.android,
    config: { ...base.android?.config, googleMaps: { apiKey: mapsKey } },
  },
});
