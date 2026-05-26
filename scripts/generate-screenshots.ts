import { existsSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

import { launch, type Page } from 'puppeteer-core';

const REPO_ROOT = resolve(__dirname, '..');
const DESIGN_DIR = resolve(REPO_ROOT, '.claude/design/collecta/project');
const MOCKUP_HTML = resolve(DESIGN_DIR, 'Collecta.html');
const OUT_DIR = resolve(REPO_ROOT, 'screenshots');

type Preset = {
  name: string;
  width: number;
  height: number;
};

// App Store (6.7") and Play Store (phone) target sizes.
// Play Store has a different aspect ratio than the iOS frame — content is
// centred with letterboxing, which Play accepts for marketing screenshots.
const PRESETS: Preset[] = [
  { name: 'ios-67', width: 1290, height: 2796 },
  { name: 'android-phone', width: 1080, height: 1920 },
];

const SCREENS = ['feed', 'map', 'collections', 'profile'] as const;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

function locateChrome(): string {
  for (const path of CHROME_CANDIDATES) {
    try {
      if (statSync(path).isFile()) return path;
    } catch {
      // try next
    }
  }
  throw new Error(
    `Chrome not found. Set CHROME_PATH or install Chrome / Chromium. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}`
  );
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

// Mockup uses <script type="text/babel" src="*.jsx"> which XHR-fetches under
// the hood. file:// → file:// XHR is CORS-blocked, so we serve from localhost.
function startDesignServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolveFn, rejectFn) => {
    const server = createServer((req, res) => {
      const url = (req.url ?? '/').split('?')[0];
      const safe = normalize(url).replace(/^[/\\]+/, '');
      const filePath = join(DESIGN_DIR, safe || 'Collecta.html');
      if (!filePath.startsWith(DESIGN_DIR)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      try {
        const body = readFileSync(filePath);
        const ext = extname(filePath).toLowerCase();
        res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.once('error', rejectFn);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        rejectFn(new Error('server bind failed'));
        return;
      }
      resolveFn({ server, port: addr.port });
    });
  });
}

// The mockup ships an iPhone-shaped IOSDevice frame at fixed 402x874 CSS px.
// We scale the document so the frame fills the target viewport.
async function injectScalingStyles(page: Page, preset: Preset): Promise<void> {
  const frameW = 402;
  const frameH = 874;
  const scale = Math.min(preset.width / frameW, preset.height / frameH);

  await page.addStyleTag({
    content: `
      html, body { background: #000 !important; overflow: hidden !important; }
      #root {
        position: fixed !important;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(${scale}) !important;
        transform-origin: center center !important;
      }
    `,
  });
}

async function waitForMockupReady(page: Page): Promise<void> {
  // App() renders the IOSDevice once babel finishes compiling every jsx.
  await page.waitForFunction(() => (document.getElementById('root')?.children.length ?? 0) > 0, {
    timeout: 15_000,
  });
  // Let layout settle once after first paint.
  await new Promise((r) => setTimeout(r, 400));
}

async function renderScreen(
  page: Page,
  preset: Preset,
  screen: string,
  baseUrl: string
): Promise<void> {
  await page.setViewport({
    width: preset.width,
    height: preset.height,
    deviceScaleFactor: 1,
  });

  // Seed localStorage before boot so initial useState picks up the target screen.
  await page.evaluateOnNewDocument((s: string) => {
    localStorage.setItem('collecta.screen', s);
    localStorage.setItem('collecta.auth', 'done');
    localStorage.setItem('collecta.theme', 'midnight');
  }, screen);

  await page.goto(`${baseUrl}/Collecta.html`, { waitUntil: 'load', timeout: 30_000 });
  await waitForMockupReady(page);
  await injectScalingStyles(page, preset);

  const outDir = resolve(OUT_DIR, preset.name);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${screen}.png`);

  await page.screenshot({ path: outPath, type: 'png', fullPage: false });
  console.log(`  ✓ ${preset.name}/${screen}.png`);
}

async function main(): Promise<void> {
  if (!existsSync(MOCKUP_HTML)) {
    console.error(`Mockup not found at ${MOCKUP_HTML}`);
    process.exit(1);
  }

  const executablePath = locateChrome();
  console.log(`Using Chrome at: ${executablePath}`);

  const { server, port } = await startDesignServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Serving ${DESIGN_DIR} at ${baseUrl}`);

  const browser = await launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    for (const preset of PRESETS) {
      console.log(`\n${preset.name} (${preset.width}x${preset.height}):`);
      for (const screen of SCREENS) {
        await renderScreen(page, preset, screen, baseUrl);
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((r) => server.close(() => r()));
  }

  console.log(`\nDone. Output: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
