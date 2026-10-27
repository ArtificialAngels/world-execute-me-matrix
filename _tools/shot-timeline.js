'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
  await page.goto('file:///' + path.resolve(__dirname, '..', 'timeline', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const rows = await page.locator('.row').count();
  await page.locator('.row').nth(3).click();
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => ({
    t: +document.getElementById('au').currentTime.toFixed(2),
    paused: document.getElementById('au').paused,
    clock: document.getElementById('clock').textContent,
    now: document.getElementById('now').textContent.slice(0, 80),
    rows: document.querySelectorAll('.row').length
  }));
  console.log(JSON.stringify({ rows, st, errors }));
  await page.screenshot({ path: path.resolve('frames', 'timeline-nav.png') });
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
