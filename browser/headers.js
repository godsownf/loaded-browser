export async function applyHeaders(page, profile) {
  await page.setUserAgent(profile.USER_AGENT);

  await page.setExtraHTTPHeaders({
    ...profile.HEADERS,
    referer: profile.REFERER
  });
}
