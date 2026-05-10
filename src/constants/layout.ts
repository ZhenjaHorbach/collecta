// Cap on screen content width on tablets / desktop web. Below this the
// viewport drives the layout; above it, content centres so cards and
// readable text don't stretch into banners. Pair the numeric value with
// the matching NativeWind class so JSX and dynamic math stay in sync.
export const MAX_CONTENT_WIDTH = 1080;
export const MAX_CONTENT_CLASS = 'self-center w-full max-w-[1080px]';
