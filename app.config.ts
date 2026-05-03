import type { ExpoConfig } from 'expo/config';

import baseConfig from './app.json';

const base = baseConfig.expo as ExpoConfig;

export default (): ExpoConfig => ({
  ...base,
  ios: {
    ...base.ios,
    config: {
      ...base.ios?.config,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
    },
  },
  android: {
    ...base.android,
    config: {
      ...base.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID ?? '',
      },
    },
  },
});
