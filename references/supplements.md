# Publisher supplements behind a library proxy

Document delivery usually sends the **article**, not its supplementary files. But if the library subscribes to the publisher, the supplement is often downloadable through the library's proxy even when the public publisher page is blocked by Cloudflare.

This was validated with an ASME article whose public page returned a Cloudflare challenge, while the KUST ERMS/ASME proxy showed the full article and a `Supplemental Materials` link.

## Workflow

1. Find the publisher's ERMS/database entry in the library portal (not the public publisher URL).
   - KUST ASME example: `https://erms.cwkeji.cn/ermsClient/eresourceInfo.do?rid=509`
   - Click `访问地址`; the ERMS entry redirects to a per-session proxied publisher origin.
2. Open the article page on the proxied origin.
3. Look for `Supplementary data`, `Supplemental Materials`, `Supporting Information`, or `Supplementary Material`.
4. Inspect the link's `href`:
   - It may be a signed CDN URL such as `.../supplementary_material_<paper>.zip?Expires=...&Signature=...`.
   - Do **not** commit or share the signed URL; it expires and is tied to the session.
5. Download it with the browser context, not a bare HTTP client:

```js
const res = await context.request.get(href);
if (res.ok()) fs.writeFileSync('supplement.zip', await res.body());
```

If the signed URL is refused outside the browser, navigate to it and fetch from the page context:

```js
const b64 = await page.evaluate(async (url) => {
  const r = await fetch(url, { credentials: 'include' });
  const bytes = new Uint8Array(await r.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}, href);
```

6. Verify the archive before declaring success:

```powershell
Expand-Archive supplement.zip -DestinationPath supplement
Get-ChildItem supplement -Recurse -File | Select-Object Name,Length
```

7. Check that the contents match what the paper promises (e.g. Figs S1–S4, ANN weights/bias, CSV/XLSX). A PDF appendix with blank text extraction may still contain image-based tables; inspect it visually.

## What success looks like

A real ASME supplement for paper `HT-21-1358` was an 892 KB zip containing:

- `Supplementary_Material_HT-21-1358.pdf` (3 pages: Figs S1–S4 + Appendix 2 weights/bias)
- four `.tif` figure files

The article page's visible `Supplemental Materials` link was only available through the library proxy; the public ASME page was stuck on a Cloudflare challenge.

## When there is no supplement

- The publisher page may show a hidden/absent `Supplementary Material` menu item.
- Do not submit the main article again just to obtain a supplement.
- Report the absence and offer to contact the corresponding author or publisher.
