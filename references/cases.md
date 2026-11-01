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
