const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.ticketmaster.de/artist/nfl-tickets/912252');
  console.log(await page.title());
  await page.screenshot({ path: 'tm.png' });
  await browser.close();
})();
