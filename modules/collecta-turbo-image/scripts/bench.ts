/**
 * On-device bench harness. Drop into a debug screen during dev builds to compare
 * collecta-turbo-image vs expo-image-manipulator for the 8MB → 500KB pipeline.
 * Not run in CI (requires a real device + native modules).
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { compressImage } from 'collecta-turbo-image';

interface Sample {
  durationMs: number;
  outSize: number;
}

interface Stats {
  median: number;
  mean: number;
  min: number;
  max: number;
}

function stats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    median: sorted[Math.floor(sorted.length / 2)],
    mean: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

async function benchTurbo(uri: string, runs: number): Promise<Sample[]> {
  const samples: Sample[] = [];
  for (let i = 0; i < runs; i += 1) {
    const result = await compressImage({
      uri,
      maxWidth: 1920,
      quality: 0.7,
      stripExif: true,
      format: 'jpeg',
    });
    samples.push({ durationMs: result.durationMs, outSize: result.size });
  }
  return samples;
}

async function benchExpoManipulator(uri: string, runs: number): Promise<Sample[]> {
  const samples: Sample[] = [];
  for (let i = 0; i < runs; i += 1) {
    const startedAt = Date.now();
    const out = await manipulateAsync(uri, [{ resize: { width: 1920 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    const durationMs = Date.now() - startedAt;
    const info = await FileSystem.getInfoAsync(out.uri);
    samples.push({
      durationMs,
      outSize: 'size' in info && typeof info.size === 'number' ? info.size : 0,
    });
  }
  return samples;
}

export async function runBench(uri: string, runs = 10): Promise<void> {
  const turbo = await benchTurbo(uri, runs);
  const manip = await benchExpoManipulator(uri, runs);

  const turboDur = stats(turbo.map((s) => s.durationMs));
  const manipDur = stats(manip.map((s) => s.durationMs));
  const speedup = manipDur.median / turboDur.median;

  console.log('=== collecta-turbo-image bench ===', {
    runs,
    turbo: { ...turboDur, outSizeKB: Math.round(turbo[0].outSize / 1024) },
    expoImageManipulator: { ...manipDur, outSizeKB: Math.round(manip[0].outSize / 1024) },
    speedupVsManipulator: speedup.toFixed(2) + 'x',
  });
}
