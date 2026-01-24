/**
 * PINNACLE – Single Profile Puppeteer Engine
 * Node.js >= 18
 */

import fs from "fs";
import puppeteer from "puppeteer";

/* ─────────────────────────────
   CONFIG
───────────────────────────── */

const PROFILE_PATH = "./env/profile.env";
const COOKIE_PATH = "./env/cookies.json";
const LOG_PATH = "./env/sessions.log";

/* ─────────────────────────────
   UTILITIES
───────────────────────────── */

function log(event, data = "") {
  fs.appendFileSync(
    LOG_PATH,
    `[${new Date().toISOString()}] ${event} ${data}\n`
  );
}

function parseEnv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (let line of raw.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    const [key, ...rest] = line.split("=");
    let value = rest.join("=").trim();

    if (value.startsWith("{")) {
      value = JSON.parse(value);
    }

    env[key] = value;
  }

  return env;
}

/* ─────────────────────────────
   BROWSER LAUNCH
───────────────────────────── */

async function launchBrowser(profile) {
  log("LAUNCH_BROWSER");

  return puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1280,800",
      `--lang=${profile.LANGUAGE}`
    ]
  });
}

/* ─────────────────────────────
   FINGERPRINT INJECTION
───────────────────────────── */

async function injectFingerprint(page, fp) {
  await page.evaluateOnNewDocument(fp => {
    Object.defineProperty(navigator, "platform", { get: () => fp.platform });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => fp.hardwareConcurrency });
    Object.defineProperty(navigator, "deviceMemory", { get: () => fp.deviceMemory });

    // Canvas noise
    const orig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function () {
      const ctx = this.getContext("2d");
      ctx.fillStyle = "rgba(1,1,1,0.01)";
      ctx.fillRect(0, 0, 1, 1);
      return orig.apply(this, arguments);
    };

    // WebGL spoof
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return fp.webgl_vendor;
      if (param === 37446) return fp.webgl_renderer;
      return getParam.call(this, param);
    };
  }, fp);

  log("FINGERPRINT_APPLIED");
}

/* ─────────────────────────────
   HEADERS / UA / REFERER
───────────────────────────── */

async function applyHeaders(page, profile) {
  await page.setUserAgent(profile.USER_AGENT);

  await page.setExtraHTTPHeaders({
    ...profile.HEADERS,
    referer: profile.REFERER
  });

  log("HEADERS_APPLIED");
}

/* ─────────────────────────────
   COOKIES
───────────────────────────── */

async function loadCookies(page) {
  if (!fs.existsSync(COOKIE_PATH)) return;

  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH));
  await page.setCookie(...cookies);

  log("COOKIES_LOADED", cookies.length);
}

/* ─────────────────────────────
   AUTOMATION
───────────────────────────── */

async function runTask(page, task) {
  log("TASK", task.type);

  if (task.type === "navigate") {
    await page.goto(task.url, { waitUntil: "networkidle2" });
  }

  if (task.type === "click") {
    await page.click(task.selector);
  }

  if (task.type === "type") {
    await page.type(task.selector, task.text, { delay: 50 });
  }
}

/* ─────────────────────────────
   SESSION
───────────────────────────── */

export async function startSession() {
  const profile = parseEnv(PROFILE_PATH);

  const browser = await launchBrowser(profile);
  const page = await browser.newPage();

  // ⚠️ ORDER MATTERS
  await injectFingerprint(page, profile.FINGERPRINT);
  await applyHeaders(page, profile);
  await loadCookies(page);

  await page.goto(profile.START_URL, { waitUntil: "networkidle2" });

  log("SESSION_STARTED");

  return {
    page,
    run: task => runTask(page, task),
    stop: async () => {
      await browser.close();
      log("SESSION_STOPPED");
    }
  };
}
