import fs from "fs";

export async function loadCookies(page, profileName) {
  const path = `backend/cookies/${profileName}.json`;
  if (!fs.existsSync(path)) return;

  const cookies = JSON.parse(fs.readFileSync(path));
  await page.setCookie(...cookies);
}
