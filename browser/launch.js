import puppeteer from "puppeteer";

export async function launchBrowser(profile) {
  return puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1280,800",
      `--lang=${profile.LANGUAGE}`
    ],
    defaultViewport: null
  });
}
