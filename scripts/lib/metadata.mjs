import { titleSimilarity } from './parse.mjs';

const CONTACT = 'literature-delivery-skill (https://github.com/)';
const UA = `literature-delivery-skill/0.1 (${CONTACT})`;

export function normalizeDoi(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[)\].,;]+$/, '');
}

async function fetchJson(url, { timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function dateParts(value) {
  const parts = value?.['date-parts']?.[0];
  return Array.isArray(parts) ? parts : [];
}

function yearOf(work) {
  return (
    dateParts(work?.published)?.[0] ??
    dateParts(work?.['published-print'])?.[0] ??
    dateParts(work?.['published-online'])?.[0] ??
    dateParts(work?.issued)?.[0] ??
    null
  );
}

export function summarizeCrossref(work) {
  if (!work) return null;
  return {
    doi: normalizeDoi(work.DOI),
    title: Array.isArray(work.title) ? work.title[0] : work.title || '',
    authors: (work.author || []).map((a) =>
      [a.given, a.family].filter(Boolean).join(' ').trim() || a.name || '',
    ),
    container: Array.isArray(work['container-title'])
      ? work['container-title'][0]
      : work['container-title'] || '',
    year: yearOf(work),
    volume: work.volume || '',
    issue: work.issue || '',
    pages: work.page || work['article-number'] || '',
    publisher: work.publisher || '',
    type: work.type || '',
    publisherUrl: work.URL || (work.DOI ? `https://doi.org/${normalizeDoi(work.DOI)}` : ''),
    crossrefPdf: (work.link || []).find((l) => /pdf/i.test(l['content-type'] || '') || /pdf/i.test(l.URL || ''))?.URL || null,
  };
}

export async function resolveDoi(doi) {
  const clean = normalizeDoi(doi);
  if (!clean) throw new Error('A DOI is required');
  const work = await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(clean)}`);
  return summarizeCrossref(work.message);
}

export async function searchCrossref(title, rows = 5) {
  const query = String(title || '').trim();
  if (!query) throw new Error('A title is required');
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.bibliographic', query);
  url.searchParams.set('rows', String(rows));
  url.searchParams.set('select', 'DOI,title,author,container-title,issued,published,published-print,published-online,volume,issue,page,article-number,publisher,type,URL,link');
  const data = await fetchJson(url);
  return (data.message?.items || []).map(summarizeCrossref);
}

export async function openAccessForDoi(doi) {
  const clean = normalizeDoi(doi);
  if (!clean) return null;
  try {
    const work = await fetchJson(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(clean)}`);
    const locations = (work.locations || []).map((loc) => ({
      isOa: Boolean(loc.is_oa),
      landingPageUrl: loc.landing_page_url || '',
      pdfUrl: loc.pdf_url || '',
      version: loc.version || '',
      license: loc.license || '',
      source: loc.source?.display_name || '',
    }));
    return {
      isOa: Boolean(work.open_access?.is_oa),
      status: work.open_access?.oa_status || 'unknown',
      oaUrl: work.open_access?.oa_url || '',
      bestOaUrl: work.best_oa_location?.landing_page_url || work.best_oa_location?.pdf_url || '',
      bestOaPdf: work.best_oa_location?.pdf_url || '',
      locations,
    };
  } catch (error) {
    return { error: error.message };
  }
}

function typeRank(type) {
  switch (type) {
    case 'journal-article': return 2;
    case 'proceedings-article': return 1.8;
    case 'book-chapter': return 1.5;
    case 'posted-content': return 0.2;
    default: return 0.5;
  }
}

function rankCandidates(title, candidates) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      similarity: titleSimilarity(title, candidate.title),
      typeRank: typeRank(candidate.type),
    }))
    .sort((left, right) => {
      const score = (c) => c.similarity + c.typeRank * 0.25 + (c.container ? 0.08 : 0);
      return score(right) - score(left);
    });
}

export async function resolveByTitle(title) {
  const candidates = rankCandidates(title, await searchCrossref(title, 10));
  if (candidates.length === 0) return { query: title, candidates: [] };
  const primary = candidates[0];
  const oa = primary.doi ? await openAccessForDoi(primary.doi) : null;
  return {
    query: title,
    ...primary,
    openAccess: oa,
    candidates,
  };
}

export async function resolveByDoi(doi) {
  const primary = await resolveDoi(doi);
  const oa = await openAccessForDoi(primary.doi);
  return { ...primary, openAccess: oa };
}
