#!/usr/bin/env node
import { writeReceipt } from './lib/receipt.mjs';

function readFlag(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

const args = process.argv.slice(2);
if (hasFlag(args, '--help') || args.length === 0) {
  console.error(`Usage:
  node scripts/receipt.mjs --title "..." --authors "..." --source "..." --doi "..." \\
    --service "wanfang-nstl" --email "you@example.com" --order "..." --eta "1 business day" \\
    [--out receipts/name.md] [--redact-email]

If --out is omitted, a filename is derived from the order number.`);
  process.exit(args.length === 0 ? 1 : 0);
}

const title = readFlag(args, '--title');
if (!title) {
  console.error('receipt: --title is required');
  process.exit(2);
}

const out = readFlag(args, '--out', '');
const written = await writeReceipt({
  title,
  authors: readFlag(args, '--authors'),
  source: readFlag(args, '--source'),
  year: readFlag(args, '--year'),
  doi: readFlag(args, '--doi'),
  service: readFlag(args, '--service'),
  email: readFlag(args, '--email'),
  order: readFlag(args, '--order'),
  eta: readFlag(args, '--eta'),
  status: readFlag(args, '--status', 'submitted'),
  note: readFlag(args, '--note'),
  redactEmail: hasFlag(args, '--redact-email'),
}, out || undefined);

console.log(written);
