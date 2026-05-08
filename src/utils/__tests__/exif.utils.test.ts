// extractGpsFromExif sits between expo-image-picker (which returns GPS in
// either decimal-degrees-plus-Ref or DMS-array form) and the rest of the app
// (which expects signed decimal degrees, or null if EXIF is unusable). The
// branches are tricky to eyeball in production — most test value is in
// pinning each branch.

import { extractGpsFromExif } from '../exif.utils';

describe('extractGpsFromExif', () => {
  it('returns null for missing exif', () => {
    expect(extractGpsFromExif(null)).toBeNull();
    expect(extractGpsFromExif(undefined)).toBeNull();
    expect(extractGpsFromExif({})).toBeNull();
  });

  it('reads numeric decimal degrees with N/E refs as positive', () => {
    const out = extractGpsFromExif({
      GPSLatitude: 52.23,
      GPSLongitude: 21.01,
      GPSLatitudeRef: 'N',
      GPSLongitudeRef: 'E',
    });
    expect(out).toEqual({ lat: 52.23, lng: 21.01 });
  });

  it('flips sign for S latitude and W longitude', () => {
    const out = extractGpsFromExif({
      GPSLatitude: 33.86,
      GPSLongitude: 151.21,
      GPSLatitudeRef: 'S',
      GPSLongitudeRef: 'W',
    });
    expect(out).toEqual({ lat: -33.86, lng: -151.21 });
  });

  it('forces magnitude when ref disagrees with sign already on the value', () => {
    // expo-image-picker normalises to positive + Ref, but a misbehaving
    // platform might hand us a signed value. Ref is the source of truth.
    const out = extractGpsFromExif({
      GPSLatitude: -52.23,
      GPSLongitude: -21.01,
      GPSLatitudeRef: 'N',
      GPSLongitudeRef: 'E',
    });
    expect(out).toEqual({ lat: 52.23, lng: 21.01 });
  });

  it('parses DMS arrays [deg, min, sec]', () => {
    // 52° 13' 48" → 52 + 13/60 + 48/3600 = 52.23
    const out = extractGpsFromExif({
      GPSLatitude: [52, 13, 48],
      GPSLongitude: [21, 0, 36],
      GPSLatitudeRef: 'N',
      GPSLongitudeRef: 'E',
    });
    expect(out?.lat).toBeCloseTo(52.23, 3);
    expect(out?.lng).toBeCloseTo(21.01, 3);
  });

  it('parses string-numeric values', () => {
    const out = extractGpsFromExif({
      GPSLatitude: '52.23',
      GPSLongitude: '21.01',
      GPSLatitudeRef: 'N',
      GPSLongitudeRef: 'E',
    });
    expect(out).toEqual({ lat: 52.23, lng: 21.01 });
  });

  it('returns null for non-numeric strings', () => {
    expect(
      extractGpsFromExif({
        GPSLatitude: 'not-a-number',
        GPSLongitude: 21.01,
      })
    ).toBeNull();
  });

  it('returns null for malformed DMS arrays', () => {
    expect(
      extractGpsFromExif({
        GPSLatitude: [52, 13], // length 2
        GPSLongitude: [21, 0, 36],
      })
    ).toBeNull();
    expect(
      extractGpsFromExif({
        GPSLatitude: [52, 'oops', 48], // non-numeric component
        GPSLongitude: [21, 0, 36],
      })
    ).toBeNull();
  });

  it('rejects out-of-range coordinates', () => {
    expect(
      extractGpsFromExif({
        GPSLatitude: 95,
        GPSLongitude: 21.01,
        GPSLatitudeRef: 'N',
        GPSLongitudeRef: 'E',
      })
    ).toBeNull();
    expect(
      extractGpsFromExif({
        GPSLatitude: 52.23,
        GPSLongitude: 200,
        GPSLatitudeRef: 'N',
        GPSLongitudeRef: 'E',
      })
    ).toBeNull();
  });

  it('returns null when one of the two coords is unusable', () => {
    expect(
      extractGpsFromExif({
        GPSLatitude: 52.23,
        // GPSLongitude missing
      })
    ).toBeNull();
  });

  it('treats ref absence as positive (matches expo-image-picker default)', () => {
    const out = extractGpsFromExif({
      GPSLatitude: 52.23,
      GPSLongitude: 21.01,
    });
    expect(out).toEqual({ lat: 52.23, lng: 21.01 });
  });
});
