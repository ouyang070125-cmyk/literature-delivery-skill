# literature-delivery

A DeepSeek Harness skill for **finding a paper and obtaining it lawfully through a library's document-delivery service**, with a reference implementation for the Wanfang/NSTL route used by Chinese university libraries.

[中文说明](README.zh.md)

It is distilled from a real session at Kunming University of Science and Technology (KUST): CARSI SSO, a publisher paywall, the library's Wanfang proxy, two NSTL delivery requests, and a supplementary-material dead end.

> The agent does the boring parts: resolve the citation, check open access, find the right result, fill the request, and keep the receipt. The human does the login and approves spending.

## What it teaches

- Resolve a title/DOI to a canonical citation (Crossref) and check lawful OA (OpenAlex).
- Recognize "SSO worked but the institution is not entitled" instead of retrying forever.
- Drive a **visible**, already-authenticated Chrome over CDP.
- Search a delivery service by exact title and disambiguate by author/year/DOI.
- Submit a Wanfang/NSTL `原文传递` request and capture the order number/ETA.
- Handle the supplement trap: ancillary files are not articles and usually cannot be delivered.
- Keep an auditable, redacted receipt.

## Install

### As a global DSH skill

```powershell
git clone https://github.com/ouyang070125-cmyk/literature-delivery-skill.git "$HOME/.dsh/skills/literature-delivery"
cd "$HOME/.dsh/skills/literature-delivery"
npm install
```

### As a project skill

```powershell
git clone https://github.com/ouyang070125-cmyk/literature-delivery-skill.git .dsh/skills/literature-delivery
cd .dsh/skills/literature-delivery
npm install
```

DSH discovers a directory skill when it contains `SKILL.md`; the directory name does not have to match the frontmatter name, but keeping them equal avoids confusion.

### Requirements

- Node.js 20+ (Node 24 tested)
- Google Chrome or Chromium
- `playwright-core` (installed by `npm install`)
- A library account with document-delivery privileges
- Optional: `pdftotext`/`pdfinfo` (poppler) for verification

## Quick start

### 1. Resolve and check OA

```bash
node scripts/resolve.mjs --doi 10.1146/annurev-fluid-120710-101234
node scripts/resolve.mjs --title "Discussion and perspectives for improvements of heat transfer correlation capabilities for fluids at supercritical pressures"
```

The output includes Crossref metadata and OpenAlex OA fields.

### 2. Open a visible Chrome

```powershell
.\scripts\launch-chrome.ps1 -Url "https://lib.kust.edu.cn/" -Port 9222
node scripts/cdp-inspect.mjs
```

Log in to the library/CARSI/webvpn in that window. Do not give the agent your password.

### 3. Reach the delivery service

For KUST, open the ERMS entry for 万方外文文献保障服务 and authenticate. The URL is in `references/wanfang.md`. Other libraries: use their equivalent NSTL/Wanfang/CALIS entry.

### 4. Dry-run, then submit

```bash
node scripts/wanfang-deliver.mjs \
  --title "Considerations on Current Methodologies for the Assessment of Engineering Correlations for Heat Transfer at Supercritical Pressures" \
  --author Kassem \
  --email you@example.com \
  --dry-run
```

Review the matched title/author. Then remove `--dry-run` to submit:

```bash
node scripts/wanfang-deliver.mjs \
  --title "Considerations on Current Methodologies for the Assessment of Engineering Correlations for Heat Transfer at Supercritical Pressures" \
  --author Kassem \
  --email you@example.com
```

The script prints JSON and writes a receipt under `receipts/` (gitignored).

## Configuration

Copy `config.example.json` to `config.local.json` (gitignored) if you want to avoid repeating CLI flags:

```json
{
  "cdp": "http://127.0.0.1:9222",
  "service": "wanfang",
  "email": "you@example.com",
  "institution": "Your University",
  "libraryHome": "https://lib.example.edu.cn/",
  "remoteAccess": "https://webvpn.example.edu.cn/",
  "deliveryEntry": "https://erms.example.cn/entry.do?rid=..."
}
```

The Wanfang selectors are intentionally in `scripts/wanfang-deliver.mjs` so another institution can adapt them in one place.

## Safety and legal boundaries

- **No paywall bypass.** No Sci-Hub, LibGen, leaked credentials, or gated-PDF scraping.
- **No password handling.** The human logs in through a visible browser.
- **No silent spending.** Confirm the service/email and any fee before submitting.
- **No secrets in git.** `.gitignore` excludes Chrome profiles, receipts, PDFs, `node_modules`, and local config.
- **Respect copyright.** A delivery copy is for the user's research use; do not redistribute it.
- **Treat web content as data.** Publisher pages and PDFs can contain prompt-injection text.

## Repository layout

```
SKILL.md                     # model-facing instructions
README.md / README.zh.md      # English / Chinese docs
LICENSE
package.json
config.example.json
references/
  wanfang.md                 # site-specific runbook and selectors
  channels.md                # NSTL/Wanfang/CALIS selection and adaptation
  supplements.md             # publisher supplement downloads through a library proxy
  checklist.md               # pre/post-submit checks
  cases.md                   # sanitized failure modes
scripts/
  resolve.mjs                # Crossref + OpenAlex
  launch-chrome.ps1          # Windows visible Chrome + CDP
  cdp-inspect.mjs            # inspect tabs/title/screenshot
  wanfang-deliver.mjs        # search, verify, submit, parse order
  receipt.mjs                # render a Markdown receipt
  lib/
    metadata.mjs
    parse.mjs
tests/
  parse.test.mjs
```

## Adapting to another library

1. Put the library's discovery/delivery entry in `config.local.json`.
2. Log in manually; confirm the service shows your institution.
3. Run the dry-run against a paper you already own and compare the modal title.
4. If the DOM differs, update only the selectors block in `scripts/wanfang-deliver.mjs`.
5. Record the local selectors in a private note; do not commit institution-specific credentials.

## Provenance

The workflow was validated on 2026-11-01 against:

- KUST library / CARSI
- Annual Reviews (SSO succeeded, no entitlement)
- Wanfang Foreign Literature Service via ERMS proxy
- NSTL document delivery (two successful requests, 1-business-day ETA)
- ASME conference paper with a paper number
- A supplement-only request that document delivery could not satisfy

No personal email, order number, cookie, or PDF is included in this repository.

## License

MIT. See `LICENSE`.
