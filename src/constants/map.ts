import type { Region } from 'react-native-maps';

// Initial camera position when the user's geolocation is unavailable.
// NYC chosen to match the design's sample data; replace once the app launches
// outside North America.
export const DEFAULT_MAP_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// `react-native-map-clustering` `radius` prop — pixels at zoom level 0.
// 50 keeps clusters readable on a 390pt-wide screen without over-grouping.
export const MAP_CLUSTER_RADIUS = 50;

// Cap on `listFindsForMap` — protects bandwidth and PostgREST response size
// when a user pans into a dense viewport. Tune as data volume grows.
export const MAP_VIEWPORT_LIMIT = 200;

// Debounce window for refetching finds after `onRegionChangeComplete`.
// Shorter than typical pan-and-release cadence; longer would feel laggy.
export const MAP_REGION_DEBOUNCE_MS = 300;
