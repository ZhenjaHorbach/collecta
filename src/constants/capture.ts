// Image compression presets used by `useCapture` before upload. Two profiles:
//   - standard: balanced for typical phone uploads on cellular
//   - hi-res:   roughly 4× the file size; opt-in via SettingsScreen toggle
//
// `maxWidth` is the longest-edge cap (compressImage preserves aspect ratio).
// `quality` is the JPEG factor (0–1). Numbers tuned empirically against the
// Vision-validate pipeline — going lower than 0.7 starts losing fine detail
// the model relies on, going higher than 0.92 has diminishing returns.

export const CAPTURE_IMAGE_STANDARD = {
  maxWidth: 1920,
  quality: 0.7,
} as const;

export const CAPTURE_IMAGE_HI_RES = {
  maxWidth: 3200,
  quality: 0.92,
} as const;
