# Choosing a delivery channel

| Channel | Best for | Typical turnaround | Notes |
|---|---|---|---|
| Wanfang Foreign Literature Service | foreign journal and conference papers | ~1 business day | Reference implementation; NSTL supplies the scan/delivery |
| NSTL direct | foreign science/technology articles, conferences, reports | ~1 business day | May require an account or library mediation |
| CALIS | books, chapters, theses, older material | 3–5 business days | Registration + library approval; fees/subsidy vary |
| CASHL | humanities/social-science books and articles | days | Separate account; often shared across universities |
| Publisher pay-per-view | urgent, budget approved | minutes | Usually expensive; get explicit consent |
| Author/repository | OA or accepted manuscript | minutes | Check version and license |

## How to inspect an unfamiliar library portal

1. Find the library's **database list** and search for the publisher or product.
2. Open the product's detail page; look for `校外访问` / `远程访问` / `CARSI` / `webvpn`.
3. Log in through the institution's IdP in a visible browser.
4. Check whether the product itself offers `原文传递`, `文献传递`, `邮箱接收全文`, or `馆际互借`.
5. If the product is only a discovery layer, follow its `获取全文` / `文献传递` link to the actual supplier.
6. Record the exact entry URL, the supplier name, and the ETA in a local (gitignored) config.

## Common Chinese portal vocabulary

| UI text | Meaning |
|---|---|
| `原文传递` | document delivery / article request |
| `文献传递` | document delivery (broader) |
| `馆际互借` | interlibrary loan |
| `邮箱接收全文` | receive full text by email |
| `校外访问` | off-campus access |
| `统一身份认证` | unified identity provider (SSO) |
| `机构用户登录` | institutional login |
| `订单号` | order number |
| `工作日` | business day |

## What not to do

- Do not choose a channel that requires payment without telling the user.
- Do not submit to multiple channels for the same item "to be safe"; this creates duplicate orders and may consume quota.
- Do not use a discovery-layer `全文` link that points to a shadow library. Check the destination domain.
