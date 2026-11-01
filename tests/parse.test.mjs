import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDoi,
  normalizeTitle,
  parseEta,
  parseOrderNumber,
  titleSimilarity,
} from '../scripts/lib/parse.mjs';
import { renderReceipt } from '../scripts/lib/receipt.mjs';

test('parseOrderNumber handles the Wanfang confirmation format', () => {
  const text = '您的文献原文传递请求已提交成功！\n订单号：abc123def456\n查询进度';
  assert.equal(parseOrderNumber(text), 'abc123def456');
});

test('parseOrderNumber handles a colon and whitespace', () => {
  assert.equal(parseOrderNumber('订单号:  fedcba987654 '), 'fedcba987654');
});

test('parseEta extracts the quoted ETA', () => {
  const text = '由国家科技图书文献中心提供文献传递服务，预计会在 1个工作日内发送，请注意查看邮箱。';
  assert.match(parseEta(text), /1个工作日/);
});

test('title normalization ignores punctuation and case', () => {
  assert.equal(normalizeTitle('The Turbulent Flows — of Supercritical Fluids!'), 'theturbulentflowsofsupercriticalfluids');
});

test('title similarity recognizes exact and near matches', () => {
  assert.equal(titleSimilarity('A Study of Things', 'a study of things'), 1);
  assert.ok(titleSimilarity('A Study of Things', 'A Study of Thing') > 0.9);
  assert.ok(titleSimilarity('A Study of Things', 'Completely Different') < 0.3);
});

test('extractDoi trims trailing punctuation', () => {
  assert.equal(extractDoi('DOI:10.1115/ICONE31-135167.'), '10.1115/ICONE31-135167');
  assert.equal(extractDoi('no doi here'), null);
});

test('receipt can redact the recipient email', () => {
  const text = renderReceipt({
    title: 'Example',
    email: 'person@example.com',
    order: 'abc123',
    redactEmail: true,
  });
  assert.match(text, /redacted/);
  assert.doesNotMatch(text, /person@example\.com/);
  assert.match(text, /abc123/);
});
