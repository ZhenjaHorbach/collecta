// expo-image-picker returns GPS as decimal degrees (positive) plus a Ref
// ('N'/'S' for latitude, 'E'/'W' for longitude). Older formats may return
// arrays of [deg, min, sec]; handle both defensively.

type ExifValue = number | string | number[] | undefined;

interface ExifGpsFields {
  GPSLatitude?: ExifValue;
  GPSLongitude?: ExifValue;
  GPSLatitudeRef?: string;
  GPSLongitudeRef?: string;
}

function toDecimal(value: ExifValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(value) && value.length === 3) {
    const [d, m, s] = value;
    if ([d, m, s].every((v) => typeof v === 'number' && Number.isFinite(v))) {
      return d + m / 60 + s / 3600;
    }
  }
  return null;
}

export function extractGpsFromExif(
  exif: Record<string, unknown> | null | undefined
): { lat: number; lng: number } | null {
  if (!exif) return null;
  const e = exif as ExifGpsFields;

  const lat = toDecimal(e.GPSLatitude);
  const lng = toDecimal(e.GPSLongitude);
  if (lat === null || lng === null) return null;

  const signedLat = e.GPSLatitudeRef === 'S' ? -Math.abs(lat) : Math.abs(lat);
  const signedLng = e.GPSLongitudeRef === 'W' ? -Math.abs(lng) : Math.abs(lng);

  if (signedLat < -90 || signedLat > 90 || signedLng < -180 || signedLng > 180) {
    return null;
  }
  return { lat: signedLat, lng: signedLng };
}
