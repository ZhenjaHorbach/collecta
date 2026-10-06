# 7. EXIF / GPS before upload, and the privacy policy — verification

Started as verify-only. After review the owner approved fixing what was
found — see "Follow-up fixes (approved)" at the end. Still no change to
bucket visibility, auth or native code.

## Question 1 — is EXIF GPS stripped before a photo is uploaded / sent to Vision?

### Find photos (the only photos sent to Claude Vision): **yes**

Path: `CameraScreen` (camera shot **or** gallery pick, both call
`captureWithMode` → `useCapture.capture`) → `compressImage({ …, stripExif:
true, format: 'jpeg' })` (`src/hooks/useCapture.ts:111-117`) →
`uploadFindPhoto(compressed.uri)` (`:121`) → public URL → `validate-find`.
The raw file is never uploaded.

`compressImage` is the local native module `modules/collecta-turbo-image`:

| Platform | How metadata is dropped                                                                                                                                                                                                                                           | Evidence                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| iOS      | Decode to `UIImage` → resize via `UIGraphicsImageRenderer` (bitmap only) → `CGImageDestination` written with **only** `kCGImageDestinationLossyCompressionQuality`. No source properties are copied, so no EXIF/GPS/TIFF. `stripExif` flag is ignored on purpose. | `ios/CollectaTurboImageImpl.swift:102-110` (comment explains why passing `NSNull` keys broke encoding) |
| Android  | Decode to `Bitmap` → `Bitmap.compress(JPEG)` (writes pixels only) → additionally clears GPS lat/lng/alt/timestamps, DateTime\*, Make, Model, Software, UserComment via `ExifInterface`.                                                                           | `android/.../CollectaTurboImageModule.kt:36-55, 117-137`                                               |
| Web      | `<canvas>` re-encode; `stripExif` unused because canvas output has no EXIF.                                                                                                                                                                                       | `src/NativeCollectaTurboImage.web.ts:46-72`                                                            |

Location the user **chose** to attach is separate: `CameraScreen` reads GPS
from the picked asset's EXIF (`exif: true`, `extractGpsFromExif`, gated by
the `autoTagLocation` setting) and stores it as `finds` lat/lng columns. It
is not in the image and not in the `validate-find` request body.

**Test added** (`src/hooks/__tests__/useCapture.test.ts`): asserts
`compressImage` is called with the raw URI and `stripExif: true, format:
'jpeg'`, and that the raw URI is never uploaded. The native encoders can't
run under Jest — that part is code-reading evidence only.

**Drift found:** `modules/collecta-turbo-image/README.md:41` says iOS sets
`kCGImagePropertyExif/GPS/TIFF/IPTC` to `NSNull`. The code deliberately
does not (that broke encoding); README is stale. Not edited here.

### Collection item photos (not sent to Vision): **not verified — possible leak**

Path: `CreateCollectionScreen.tsx:374-391` →
`ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true })`
→ `uploadCollectionItemPhoto(picked.uri)`
(`src/services/collection-item-photo.service.ts:7-20`) uploads the picker's
bytes **as-is** to the **public** `collection-item-images` bucket
(migration 020). No `compressImage` call.

Whether GPS survives depends on `expo-image-picker`'s re-encode on each
platform (crop + quality < 1 usually re-encodes, but that's library
behaviour, not something this repo guarantees). Can't be confirmed from
the code.

**Proposed smallest fix (not implemented):** in
`uploadCollectionItemPhoto` (native + `.web.ts`), run
`compressImage({ uri, maxWidth: CAPTURE_IMAGE_STANDARD.maxWidth, quality:
CAPTURE_IMAGE_STANDARD.quality, stripExif: true, format: 'jpeg' })` before
`readBytes`, and upload the compressed URI. ~6 lines per file + one test
assertion; no bucket/auth change.

## Question 2 — does `docs/privacy-policy.md` mention the model provider?

**Yes, for photo validation.** §2 "To validate finds with AI" (line 36):
photo + collection criteria go to Anthropic's Claude Vision API, not used
for training, can be disabled in Settings → Capture → AI verification. §3
table lists Anthropic as a recipient (line 44). §8 mentions US transfers.

**Not mentioned** (report only, legal text not edited):

- **AI collection generator** — the user's free-text prompt (≤500 chars)
  is sent to Anthropic (`generate-collection`).
- **XP agent** — `award-xp` sends the user's id and gamification stats
  (XP, level, streak, counts) to Anthropic on every find / reaction.
- How the photo reaches Anthropic: as a **public URL** that Anthropic
  fetches (`validate-find` uses `source: { type: 'url' }`); the bucket is
  public (migration 005), consistent with §1 "visible to other users".
- EXIF stripping isn't stated (a plus that could be documented).

## Follow-up fixes (approved by the owner after the report)

1. **Collection item photos now strip EXIF.** `uploadCollectionItemPhoto`
   (`src/services/collection-item-photo.service.ts`) runs
   `compressImage({ stripExif: true, format: 'jpeg' })` with
   `CAPTURE_IMAGE_STANDARD` before upload and uploads the compressed file.
   The `.web.ts` variant still throws (upload is native-only), so no change
   there. Side effects: PNG picks become JPEG (no transparency), and large
   picks are downscaled to 1920 px. Test added in
   `collection-item-photo.service.test.ts`.
2. **README drift fixed** — `modules/collecta-turbo-image/README.md` now
   describes the real iOS behaviour (no `NSNull` keys, and why).
3. **Privacy policy updated** (`docs/privacy-policy.md`, "Last updated"
   2026-10-06) — **needs legal review before publishing**:
   - §1 Photos: collection photos included; EXIF/GPS removed before upload.
   - §2: photo reaches Anthropic as a link the API fetches; new bullets for
     the AI collection generator (prompt text) and XP/achievements (account
     ID + gamification stats, no photos or text).
   - §3 table: Anthropic row covers all three uses.
