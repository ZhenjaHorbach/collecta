# collecta-turbo-image

Native image compression and EXIF-stripping TurboModule for Collecta. Replaces the JS-bridge `expo-image-manipulator` hop on the camera capture path.

## Why

Photos arrive from the camera at ~8MB. Pushing that through the JS bridge for resize/compress costs ~800ms on mid-range devices. We need:

1. Sub-100ms compression so capture flow feels instant.
2. **EXIF strip** before upload — drops GPS/device tags from photos that get published. Privacy-by-default, not opt-in.

A pure-native TurboModule (JSI, no bridge serialization) does both.

## API

```ts
import { compressImage } from 'collecta-turbo-image';

const out = await compressImage({
  uri: rawPhotoUri,
  maxWidth: 1920,
  quality: 0.7,
  stripExif: true,
  format: 'jpeg',
});
// → { uri, size, width, height, durationMs }
```

## Benchmark (Pixel 7 / iPhone 14, debug build)

| Method                             | 8MB → 500KB | Strip EXIF |
| ---------------------------------- | ----------- | ---------- |
| expo-image-manipulator (JS bridge) | ~800ms      | no         |
| collecta-turbo-image (native)      | ~90ms       | yes        |
| Difference                         | 9× faster   | ✅         |

Reproduce: `modules/collecta-turbo-image/scripts/bench.ts` — drop `runBench(uri)` into a debug screen with an 8MB JPEG fixture and look at the console.

## Implementation

- **iOS** (`ios/CollectaTurboImageImpl.swift`): `UIImage` decode → `UIGraphicsImageRenderer` resize → `CGImageDestination` write with `kCGImagePropertyExif/GPS/TIFF/IPTC` set to `NSNull` to strip metadata. The `.mm` shim wires the Swift impl into the TurboModule (JSI binding requires Objective-C++).
- **Android** (`android/.../CollectaTurboImageModule.kt`): `BitmapFactory` with `inSampleSize` for fast downscale → `Bitmap.compress` (JPEG/PNG/WEBP) → `androidx.exifinterface` to clear GPS/DateTime/Make/Model/Software/UserComment tags. Coroutine-based, runs on `Dispatchers.IO`.

## Codegen

Spec: `src/NativeCollectaTurboImage.ts`. The TS interface drives codegen for both platforms — see `package.json` `codegenConfig`. Native classes (`NativeCollectaTurboImageSpec` on Android, `NativeCollectaTurboImageSpecJSI` on iOS) are auto-generated at build time.

## Requirements

- React Native New Architecture (`newArchEnabled: true` in `app.json`) — already on for Collecta.
- Custom dev build (Expo Go cannot load custom native modules) — Collecta already runs custom builds because of PowerSync.
