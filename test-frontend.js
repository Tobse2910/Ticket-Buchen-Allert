const { chromium } = require('playwright');
(async () => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error));
        
        await page.goto('http://localhost:8080');
        console.log('Page loaded', await page.title());
        await page.waitForTimeout(1000);
        
        console.log('Clicking Neues Event tab');
        await page.click('text=Neues Event');
        await page.waitForTimeout(1000);
        
        console.log('Filling form');
        // Select input where ID or type is text
        await page.fill('input[type="text"]', 'Test Event');
        await page.fill('input[type="url"]', 'https://www.ticketmaster.de/artist/test');
        
        console.log('Clicking submit');
        await page.click('button[type="submit"]');
        
        console.log('Clicked submit. Waiting for redirect... 3s');
        await page.waitForTimeout(3000);
        
        console.log('Checks complete. Current URL/Title:', await page.title());
        await browser.close();
    } catch(e) {
        console.error("Test failed", e);
    }
})();