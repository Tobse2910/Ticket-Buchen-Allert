const { chromium } = require('playwright');
(async () => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        
        let errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', error => errors.push(error.message));
        
        await page.goto('http://localhost:8080');
        await page.waitForTimeout(1000);
        
        await page.click('text=Neues Event');
        await page.waitForTimeout(1000);
        
        await page.fill('input[type="text"]', 'Dashboard Switch Test');
        await page.fill('input[type="url"]', 'https://www.ticketmaster.de/artist/test');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        const isDashboard = await page.locator('text=Übersicht').isVisible();
        console.log('--- TEST RESULTS ---');
        console.log('Switched to dashboard?', isDashboard);
        console.log('Errors caught:', errors);
        
        await browser.close();
    } catch(e) { console.error('Test script bug:', e) }
})();