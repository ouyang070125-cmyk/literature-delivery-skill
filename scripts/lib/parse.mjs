export function parseOrderNumber(text) {
  const match = String(text || '').match(/订单号[：:]\s*([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

export function parseEta(text) {
  const value = String(text || '').replace(/\s+/g, ' ');
  const match = value.match(/预计[^。\n]{0,80}?(?:工作日|天|小时|分钟)(?:内)?(?:发送)?/);
  return match ? match[0].trim() : null;
}

export function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
    .trim();
}

export function titleSimilarity(left, right) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const bigrams = (s) => {
    const out = new Set();
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
    return out;
  };
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (ba.size === 0 || bb.size === 0) return 0;
  let overlap = 0;
  for (const gram of ba) if (bb.has(gram)) overlap += 1;
  return (2 * overlap) / (ba.size + bb.size);
}

export function extractDoi(text) {
  const match = String(text || '').match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match ? match[0].replace(/[)\].,;]+$/, '') : null;
}
