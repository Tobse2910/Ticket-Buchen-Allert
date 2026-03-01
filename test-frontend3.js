const { chromium } = require('playwright');
(async () => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        
        page.on('response', response => {
            if (response.url().includes('/api/monitors')) {
                console.log('API RESPONSE [', response.status(), ']', response.url());
            }
        });
        
        await page.goto('http://localhost:8080');
        await page.waitForTimeout(1000);
        
        await page.click('text=Neues Event');
        await page.waitForTimeout(1000);
        
        await page.fill('input[type="text"]', 'Docker Test');
        await page.fill('input[type="url"]', 'https://www.ticketmaster.de/artist/test2');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        const isDashboard = await page.locator('text=Übersicht').isVisible();
        console.log('--- TEST RESULTS ---');
        console.log('Switched to dashboard?', isDashboard);
        const errText = await page.locator('.text-red-500').isVisible() ? await page.locator('.text-red-500').textContent() : null;
        console.log('Error banner text?', errText);
        
        await browser.close();
    } catch(e) { console.error('Test script bug:', e) }
})();