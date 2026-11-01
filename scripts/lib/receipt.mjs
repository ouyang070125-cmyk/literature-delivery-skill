import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export function renderReceipt(input) {
  const {
    title,
    authors = '',
    source = '',
    year = '',
    doi = '',
    service = 'unknown',
    email = '',
    order = '',
    eta = '',
    status = 'submitted',
    note = '',
    submittedAt = new Date().toISOString(),
    redactEmail = false,
  } = input;

  return [
    '# Literature delivery receipt',
    '',
    `- **Title:** ${title}`,
    authors ? `- **Authors:** ${authors}` : null,
    source ? `- **Source:** ${source}` : null,
    year ? `- **Year:** ${year}` : null,
    doi ? `- **DOI:** ${doi}` : null,
    `- **Service:** ${service}`,
    email ? `- **Recipient:** ${redactEmail ? 'redacted' : email}` : null,
    order ? `- **Order number:** ${order}` : null,
    `- **Submitted at:** ${submittedAt}`,
    eta ? `- **Quoted ETA:** ${eta}` : null,
    `- **Status:** ${status}`,
    note ? `- **Note:** ${note}` : null,
    '',
    '## Follow-up',
    '',
    '- Check spam/quarantine after the quoted ETA.',
    '- Contact the library with the order number; do not submit a duplicate.',
    '- Verify title, authors, and page range when the PDF arrives.',
    '',
  ].filter((line) => line !== null).join('\n');
}

export async function writeReceipt(input, outPath) {
  const target = outPath || join('receipts', `${new Date().toISOString().slice(0, 10)}-${input.order || 'no-order'}.md`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderReceipt(input), 'utf8');
  return target;
}
