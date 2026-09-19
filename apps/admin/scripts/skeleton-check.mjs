import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../web/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = "http://outfiqe.local:5173/admin";
const OUT = process.argv[2];
const ONLY = process.argv[3];
const ROUTES = [
  "/",
  "/announcements",
  "/categories",
  "/collections",
  "/commissions",
  "/content-browser",
  "/content-reports",
  "/coupons",
  "/creators",
  "/crm",
  "/crm/audit",
  "/crm/billing",
  "/crm/contacts",
  "/crm/customers",
  "/crm/partners",
  "/crm/pipeline",
  "/crm/reports",
  "/crm/roles",
  "/crm/support",
  "/crm/tasks",
  "/delivery-zones",
  "/financial-rollup",
  "/gamification",
  "/gamification/badges",
  "/gamification/badges/new",
  "/gamification/leaderboards",
  "/gamification/manual-actions",
  "/gamification/xp-levels",
  "/hero-slides",
  "/orders",
  "/organizations",
  "/platform",
  "/platform-commission",
  "/platform/brand-applications",
  "/platform/features",
  "/platform/impersonation",
  "/platform/metrics",
  "/platform/nav-access",
  "/product-reviews",
  "/product-types",
  "/products",
  "/profile",
  "/size-options",
  "/support",
  "/tag-reports",
  "/tag-reviews",
  "/team",
  "/trending",
  "/users",
  "/withdraw-policy",
  "/withdraw-requests",
].filter((route) => !ONLY || route.includes(ONLY));

const NON_GATED = /\/api\/(auth|socket)|socket\.io/;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--host-resolver-rules=MAP outfiqe.local 127.0.0.1"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const login = await context.request.post("http://outfiqe.local:5173/api/auth/login", {
  data: {
    email: process.env.SKELETON_CHECK_EMAIL ?? "admin@outfiqe.local",
    password: process.env.SKELETON_CHECK_PASSWORD ?? "admin-password-123",
  },
});
if (!login.ok()) throw new Error("login failed " + login.status());
await page.goto(BASE + (process.env.SKELETON_CHECK_START_ROUTE ?? "/profile"), {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector("aside, nav", { timeout: 30000 });
await page.waitForTimeout(1500);

const measure = () =>
  page.evaluate(() => {
    const main = globalThis.document.querySelector("main") ?? globalThis.document.body;
    return { height: Math.round(main.scrollHeight), text: main.innerText.trim().length };
  });

const report = [];
for (const route of ROUTES) {
  const slug = route === "/" ? "home" : route.slice(1).replace(/\//g, "_");
  const held = [];
  let holding = true;
  const handler = async (routeCall) => {
    if (!holding || NON_GATED.test(routeCall.request().url())) return routeCall.continue();
    held.push(routeCall);
  };
  await page.route("**/api/**", handler);
  try {
    await page.evaluate(
      (url) => {
        globalThis.history.pushState({}, "", url);
        globalThis.dispatchEvent(new globalThis.PopStateEvent("popstate"));
      },
      `/admin${route === "/" ? "/" : route}`,
    );
    await page.waitForTimeout(2500);
    const skeleton = await measure();
    await page.screenshot({ path: `${OUT}/${slug}.skeleton.png`, fullPage: true });
    holding = false;
    for (const routeCall of held) await routeCall.continue().catch(() => undefined);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(500);
    await page.waitForTimeout(800);
    const loaded = await measure();
    await page.screenshot({ path: `${OUT}/${slug}.loaded.png`, fullPage: true });
    report.push({
      route,
      held: held.length,
      skeleton,
      loaded,
      delta: loaded.height - skeleton.height,
    });
  } catch (error) {
    report.push({ route, error: String(error).slice(0, 160) });
  }
  await page.unroute("**/api/**", handler);
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
for (const row of report) {
  console.warn(
    row.error
      ? `${row.route} ERROR ${row.error}`
      : `${row.route.padEnd(32)} held=${String(row.held).padStart(2)} skeleton=${row.skeleton.height} loaded=${row.loaded.height} delta=${row.delta}`,
  );
}
await browser.close();
