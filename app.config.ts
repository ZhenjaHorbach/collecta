import type { ExpoConfig } from 'expo/config';

import baseConfig from './app.json';

const base = baseConfig.expo as ExpoConfig;
const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

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
  extra: {
    ...base.extra,
    googleMapsApiKey: mapsKey,
  },
});
