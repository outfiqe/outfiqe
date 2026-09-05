const PREVIEW_PORT = 3100;

const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm exec next start --port ${PREVIEW_PORT}`,
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 120000,
      url: [`${PREVIEW_URL}/offline`],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "unminified-javascript": ["error", { minScore: 1 }],
        "unminified-css": ["error", { minScore: 1 }],
        "uses-text-compression": ["warn", { minScore: 1 }],
        "total-byte-weight": ["warn", { maxNumericValue: 1200000 }],
        "errors-in-console": ["warn", { minScore: 1 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
