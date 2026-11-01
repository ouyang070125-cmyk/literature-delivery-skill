#!/usr/bin/env node
import { resolveByDoi, resolveByTitle } from './lib/metadata.mjs';
import { titleSimilarity } from './lib/parse.mjs';

function usage() {
  console.error(`Usage:
  node scripts/resolve.mjs --doi 10.1146/annurev-fluid-120710-101234
  node scripts/resolve.mjs --title "Exact paper title"

Outputs JSON with Crossref metadata and OpenAlex open-access locations.`);
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

try {
  if (args.includes('--doi')) {
    const doi = readFlag(args, '--doi');
    if (!doi) throw new Error('--doi needs a value');
    const result = await resolveByDoi(doi);
    console.log(JSON.stringify(result, null, 2));
  } else if (args.includes('--title')) {
    const title = readFlag(args, '--title');
    if (!title) throw new Error('--title needs a value');
    const result = await resolveByTitle(title);
    const best = result.candidates[0];
    const warnings = [];
    if (best && titleSimilarity(title, best.title) < 0.8) {
      warnings.push('Top Crossref candidate is not a close title match; review all candidates before requesting delivery.');
    }
    if (best?.type === 'posted-content') {
      warnings.push('Top candidate is a preprint; check for a published journal version before delivery.');
    }
    console.log(JSON.stringify({ ...result, matchWarning: warnings.length ? warnings.join(' ') : null }, null, 2));
  } else {
    usage();
    process.exit(2);
  }
} catch (error) {
  console.error(`resolve: ${error.message}`);
  process.exit(1);
}
