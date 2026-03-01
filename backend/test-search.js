const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.ticketmaster.de/search?q=adele', { waitUntil: 'domcontentloaded' });
    
    // Warten auf Search Results
    await page.waitForTimeout(3000);
    
    const results = await page.evaluate(() => {
        const resultItems = Array.from(document.querySelectorAll('a'));
        const unique = [];
        const seen = new Set();
        resultItems.forEach(l => {
            const url = l.href;
            const text = l.innerText ? l.innerText.replace(/\n/g, ' ').trim() : '';
            if(text.length > 2 && url && (url.includes('/artist/') || url.includes('/event/')) && !seen.has(url)) {
                seen.add(url);
                unique.push({ name: text, url: url });
            }
        });
        return unique;
    });
    
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
})();