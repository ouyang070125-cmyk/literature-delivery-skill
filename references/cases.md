# Sanitized cases

These cases illustrate the failure modes the skill is designed to avoid. Personal data, order numbers, and downloaded files have been removed.

## Case A — SSO succeeds, entitlement does not

A review article in *Annual Review of Fluid Mechanics* was requested. The university's CARSI login completed and returned to the publisher article page, but the page still showed `Get Access`; the PDF URL redirected back to the abstract.

Diagnosis: the institution is not subscribed to that publisher. Repeating SSO cannot fix it.

Action: use the library's document-delivery service. Do not keep retrying the publisher.

## Case B — The delivery service is behind a library proxy

The library exposed Wanfang's foreign-literature product through a per-session ERMS proxy. The proxy origin was random, and the page required the institution's unified login. After the user logged in, the header showed the institution name.

Action: drive the authenticated tab. Do not hard-code the proxy origin. The request form accepted only the paper title and an email; the success message returned an order number and a one-business-day ETA.

## Case C — Supplement is not a paper

A request row named `N03-S/B` referred to `Supplemental Material: Figs S1–S4 and ANN weights/bias` for a main article. The main article was already obtained. The publisher page showed `Available to Purchase`; its `Supplementary Material` menu item was hidden, and the delivery service had no field for ancillary files.

Action: do not submit the main article again. Report that the supplement cannot be requested through this channel, and offer author/publisher contact.

## Case D — Publisher 403 but the paper is OA

A journal article returned `403` at the publisher. OpenAlex reported `is_oa: true` with a CC BY-NC-ND license and a university repository copy.

Action: check the repository before assuming the paper is closed. Tell the user which version (published vs accepted manuscript) is being provided.

## Case E — Conference paper with a paper number

An ASME conference paper had a DOI and a paper number (`ICONE31-135167`). The delivery service indexed it as a conference paper with slightly different capitalization and an author-name typo.

Action: search the exact title, then confirm the year/venue/paper number. Scope the result card by author before clicking `原文传递`.

## Case F — Publisher PDF bot check, OA HTML still available

A CC BY article page was readable, but its `View PDF` URL hit an endless "Are you a robot?" challenge on the PDF CDN. The article HTML exposed the full text, figures, and references.

Action: do not bypass the challenge. If the article is OA and the HTML is complete, save a print-to-PDF copy and label it clearly as an HTML-derived full text, not the publisher's typeset PDF. If the user needs the publisher PDF, use document delivery or ask the user to download it manually.

## Case G — No subscription and no delivery index

A 2026 AIAA conference paper showed `No Access`; the library's AIAA access was an expired trial, and the delivery service had no record of the paper.

Action: report the exact blocker and do not invent a download. Offer interlibrary loan/purchase or author contact. A "download everything" request can legitimately end with one unavailable item.

## Case H — The PDF already exists under a useless filename

A local file was named `thermal length in supercritical.pdf`; the paper's DOI appeared only inside the first page. Filename matching alone would have missed it.

Action: scan PDF text/metadata with `scripts/scan-local-pdfs.py` before requesting a duplicate. Report the existing path and only fetch the missing items.
