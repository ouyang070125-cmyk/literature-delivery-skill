#!/usr/bin/env node
import { chromium } from 'playwright-core';

function readFlag(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const args = process.argv.slice(2);
const cdp = readFlag(args, '--cdp', process.env.CDP_URL || 'http://127.0.0.1:9222');
const screenshot = readFlag(args, '--screenshot', null);

const browser = await chromium.connectOverCDP(cdp);
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  if (pages.length === 0) {
    console.log(JSON.stringify({ cdp, pages: [] }, null, 2));
  } else {
    const output = [];
    for (const page of pages) {
      const title = await page.title().catch(() => '');
      const text = await page.locator('body').innerText().catch(() => '');
      output.push({
        url: page.url(),
        title,
        text: text.slice(0, 600),
      });
    }
    console.log(JSON.stringify({ cdp, pages: output }, null, 2));
    if (screenshot) {
      await pages[0].screenshot({ path: screenshot, fullPage: false });
      console.error(`Screenshot: ${screenshot}`);
    }
  }
} finally {
  await browser.close();
}
