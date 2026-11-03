#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  extractDoi,
  normalizeTitle,
  parseEta,
  parseOrderNumber,
  titleSimilarity,
} from './lib/parse.mjs';
import { writeReceipt } from './lib/receipt.mjs';

function readFlag(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

function usage() {
  console.error(`Usage:
  node scripts/wanfang-deliver.mjs --title "Exact title" --email you@example.com [options]

Options:
  --author NAME       Require/prefer an author surname in the result card.
  --expect-doi DOI    Prefer a result whose card contains this DOI.
  --cdp URL           Chrome DevTools endpoint (default http://127.0.0.1:9222).
  --config FILE       JSON config; CLI flags override it.
  --dry-run           Search and verify only; do not submit.
  --no-receipt        Do not write a Markdown receipt.
  --receipt-dir DIR   Receipt directory (default receipts).
  --timeout MS        Navigation/action timeout (default 20000).

The browser must already be logged in to the library's Wanfang proxy.
Always run with --dry-run first.`);
}

const args = process.argv.slice(2);
if (hasFlag(args, '--help') || hasFlag(args, '-h') || args.length === 0) {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

const configPath = readFlag(args, '--config', '');
const config = configPath ? JSON.parse(await readFile(configPath, 'utf8')) : {};

const title = readFlag(args, '--title');
const author = readFlag(args, '--author', '');
const expectDoi = readFlag(args, '--expect-doi', '');
const email = readFlag(args, '--email', config.email || '');
const cdp = readFlag(args, '--cdp', config.cdp || process.env.CDP_URL || 'http://127.0.0.1:9222');
const dryRun = hasFlag(args, '--dry-run');
const noReceipt = hasFlag(args, '--no-receipt');
const receiptDir = readFlag(args, '--receipt-dir', config.receiptDir || 'receipts');
const timeout = Number(readFlag(args, '--timeout', '20000'));

if (!title) {
  console.error('wanfang: --title is required');
  process.exit(2);
}
if (!email && !dryRun) {
  console.error('wanfang: --email is required unless --dry-run is used');
  process.exit(2);
}

function fail(message, code = 1) {
  console.error(`wanfang: ${message}`);
  process.exit(code);
}

const browser = await chromium.connectOverCDP(cdp);
const context = browser.contexts()[0];
if (!context) fail('No browser context found. Start Chrome with scripts/launch-chrome.ps1.', 3);

const pages = context.pages();
let page = pages.find((p) => /erms\.cwkeji\.cn|for\.wanfangdata\.com\.cn|wanfangdata\.com\.cn/i.test(p.url()));
if (!page) {
  fail('No authenticated Wanfang tab found. Open the library delivery entry and log in first.', 3);
}
await page.bringToFront();

async function closeBlockingModal() {
  const modal = page.locator('.ivu-modal-wrap').filter({ hasText: '请求原文传递' }).last();
  if ((await modal.count()) === 0) return;
  if (!(await modal.isVisible().catch(() => false))) return;
  const text = await modal.innerText().catch(() => '');
  const label = /提交成功|订单号/.test(text) ? /^确定$/ : /^取消$/;
  const button = modal.locator('button').filter({ hasText: label }).last();
  if ((await button.count()) > 0) {
    await button.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

await closeBlockingModal();

// Normalize to the Wanfang search page while preserving the authenticated proxy origin.
if (!/\/search\/paper/i.test(page.url())) {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout }).catch(() => {});
  await page.waitForTimeout(2500);
}

const bodyText = await page.locator('body').innerText().catch(() => '');
if (/万方登录|机构用户登录|请登录有权限的账号/.test(bodyText)) {
  fail('Wanfang is asking for login. Log in in the visible Chrome window, then rerun.', 4);
}

const search = page.locator('input[placeholder="请输入检索词"]').first();
try {
  await search.waitFor({ state: 'visible', timeout });
} catch {
  fail(`Wanfang search box not found at ${page.url()}. Open the service entry and log in first.`, 5);
}

await search.fill(title);
await search.press('Enter');

try {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return text.includes('找到') || text.includes('条结果') || text.includes('暂无文献检索结果');
    },
    { timeout },
  );
} catch {
  fail('Timed out waiting for Wanfang search results.', 6);
}
// The Vue app sometimes paints the result count before the cards. Wait for
// the cards themselves instead of trusting a single 1s delay.
for (let attempt = 0; attempt < 20; attempt += 1) {
  if ((await page.locator('.normal-list').count()) > 0) break;
  const text = await page.locator('body').innerText().catch(() => '');
  if (text.includes('暂无文献检索结果')) break;
  await page.waitForTimeout(500);
}

const cards = page.locator('.normal-list');
const count = await cards.count();
if (count === 0) {
  const text = await page.locator('body').innerText().catch(() => '');
  fail(`No result cards. Page says: ${text.slice(0, 300).replace(/\s+/g, ' ')}`, 6);
}

const candidates = [];
for (let index = 0; index < count; index += 1) {
  const card = cards.nth(index);
  const cardText = await card.innerText().catch(() => '');
  const resultTitle = await card.locator('a.title').innerText().catch(() => '');
  const authors = await card.locator('.authors').innerText().catch(() => '');
  const source = await card.locator('.periodical-title').innerText().catch(() => '');
  const doi = extractDoi(cardText);
  const similarity = titleSimilarity(resultTitle || cardText, title);
  // Some conference-paper cards do not use .authors/.periodical-title; fall back
  // to the whole card so an author surname can still be verified.
  const authorHaystack = authors || cardText;
  const authorOk = !author || normalizeTitle(authorHaystack).includes(normalizeTitle(author));
  const doiOk = !expectDoi || (doi && doi.toLowerCase() === String(expectDoi).toLowerCase());
  candidates.push({ index, title: resultTitle, authors, source, doi, similarity, authorOk, doiOk });
}

const eligible = candidates
  .filter((c) => c.similarity >= 0.72)
  .filter((c) => !author || c.authorOk || c.similarity >= 0.94)
  .filter((c) => !expectDoi || !c.doi || c.doiOk);

if (eligible.length === 0) {
  console.error(JSON.stringify({ status: 'no_match', title, candidates }, null, 2));
  fail('No result passed title/author matching. Review candidates before retrying.', 7);
}

eligible.sort((a, b) => {
  const score = (c) => c.similarity + (c.authorOk ? 0.15 : 0) + (c.doiOk ? 0.2 : 0);
  return score(b) - score(a);
});
const best = eligible[0];
const matched = {
  status: 'matched',
  title: best.title,
  authors: best.authors,
  source: best.source,
  doi: best.doi,
  similarity: Number(best.similarity.toFixed(3)),
  authorOk: best.authorOk,
  doiOk: best.doiOk,
  query: title,
  index: best.index,
};

if (dryRun) {
  console.log(JSON.stringify({ ...matched, dryRun: true, candidates }, null, 2));
  await browser.close();
  process.exit(0);
}

const card = cards.nth(best.index);
await card.locator('.original-button').first().click({ timeout: 10000 }).catch((error) => {
  fail(`Could not open the delivery modal: ${error.message.split('\n')[0]}`, 8);
});

const modal = page.locator('.ivu-modal-wrap').filter({ hasText: '请求原文传递' }).last();
try {
  await modal.waitFor({ state: 'visible', timeout: 10000 });
} catch {
  fail('Delivery modal did not appear. The UI may have changed; inspect the page before retrying.', 8);
}

const modalText = await modal.innerText();
const lines = modalText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const titleIndex = lines.indexOf('文献题名');
const echoTitle = titleIndex >= 0 ? lines[titleIndex + 1] || '' : '';
if (echoTitle && titleSimilarity(echoTitle, title) < 0.8) {
  await modal.locator('button').filter({ hasText: /^取消$/ }).last().click().catch(() => {});
  fail(`Modal title does not match the request. Got: ${echoTitle}`, 8);
}

const emailInput = modal.locator('input[placeholder="请填写邮箱地址"]').first();
if ((await emailInput.count()) === 0) {
  fail('Email field not found in the delivery modal.', 8);
}
await emailInput.fill(email);

const confirm = modal.locator('button').filter({ hasText: /^确定$/ }).last();
if ((await confirm.count()) === 0) {
  fail('Confirm button not found in the delivery modal.', 8);
}
await confirm.click({ timeout: 10000 });

try {
  await page.waitForFunction(
    () => /提交成功|订单号/.test(document.body.innerText),
    { timeout },
  );
} catch {
  const text = await page.locator('body').innerText().catch(() => '');
  fail(`No success confirmation. Page says: ${text.slice(-300).replace(/\s+/g, ' ')}`, 9);
}

const successText = await page.locator('body').innerText().catch(() => '');
const orderNumber = parseOrderNumber(successText);
const eta = parseEta(successText);
if (!orderNumber) {
  fail('Success text appeared but no order number could be parsed. Inspect the confirmation modal.', 9);
}

const submittedAt = new Date().toISOString();
let receiptPath = null;
if (!noReceipt) {
  receiptPath = await writeReceipt({
    title: best.title,
    authors: best.authors,
    source: best.source,
    doi: best.doi || expectDoi || '',
    service: 'wanfang-nstl',
    email,
    order: orderNumber,
    eta,
    status: 'submitted',
    submittedAt,
  }, join(receiptDir, `${submittedAt.slice(0, 10)}-${orderNumber}.md`));
}

console.log(JSON.stringify({
  status: 'submitted',
  title: best.title,
  authors: best.authors,
  source: best.source,
  doi: best.doi || expectDoi || '',
  email,
  orderNumber,
  eta,
  submittedAt,
  receiptPath,
}, null, 2));

await browser.close();
