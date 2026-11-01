# Wanfang Foreign Literature Service — runbook

This is the concrete channel used by the reference implementation. It was validated against the Kunming University of Science and Technology (KUST) library proxy in November 2026. Other libraries may expose the same Wanfang product through a different proxy origin; the UI and selectors are the same.

## 1. Entry points

KUST:

- Library home: `https://lib.kust.edu.cn/`
- Remote access: `https://w.libvpn.kust.edu.cn/`
- ERMS resource page for "外文文献保障服务（万方）": `https://erms.cwkeji.cn/ermsClient/eresourceInfo.do?rid=854`
- ERMS access link: `https://erms.cwkeji.cn/entry.do?rid=854&uid=642`
- Direct Wanfang product: `https://for.wanfangdata.com.cn/`

The ERMS entry redirects to a per-session proxy host such as:

```
https://<random>.erms.cwkeji.cn/
```

That origin is temporary. Do not hard-code it. Operate on the tab the user already authenticated, or read the current origin from the tab.

## 2. Authentication

1. Open the ERMS entry or direct Wanfang product in a visible Chrome.
2. If Wanfang shows `万方登录` / `机构用户登录`, choose the institution's remote-access route.
3. The user completes the university login. The agent never types the password or scans the QR code.
4. After login, the page header should show the institution name, e.g. `昆明理工大学`.
5. If the library does not subscribe, Wanfang may still show the search UI but requests can fail. Verify with one dry run before submitting.

## 3. Search

The search page has a single visible input:

```css
input[placeholder="请输入检索词"]
```

Fill the **exact title**, press Enter, and wait for the result count text (`找到 N 条结果`). Results are cards:

```css
.normal-list
.normal-list a.title
.normal-list .authors
.normal-list .periodical-title
.normal-list .original-button
```

Scope every locator to the card, not the whole page. There are many `原文传递` buttons, one per result. Clicking the first one blindly is the most common failure.

Recommended match:

- normalized title equality or high similarity;
- author surname appears in `.authors`;
- year/journal appears in the card;
- conference paper number or DOI if present.

## 4. Request modal

Clicking `.original-button` opens:

```
请求原文传递
传递方式    邮箱发送
文献题名    <the card's title>
邮箱地址    [input]
取消  确定
```

Assert the modal's `文献题名` matches the requested paper before filling the email. The email input:

```css
input[placeholder="请填写邮箱地址"]
```

Submit with the visible `确定` button inside the modal. Do not click a global `确定` from a previous modal.

Success text:

```
您的文献原文传递请求已提交成功！
订单号：<hex>
查询进度
由国家科技图书文献中心提供文献传递服务，预计会在 1个工作日内发送，请注意查看邮箱。
```

Parse the order number with:

```js
/订单号[：:]\s*([A-Za-z0-9]+)/
```

## 5. Recovery

### Modal from an earlier request is open

If a modal with `请求原文传递` is already open, click `取消` before searching again. If it is a success modal, click `确定`.

### Wrong result clicked

If the modal title is not the intended paper, click `取消`, then re-scope the result card by author/year. Do not submit and hope.

### Cloudflare / security check

Wanfang itself is usually not behind Cloudflare; the publisher pages are. Do not try to solve a publisher Cloudflare challenge in a headless browser. Use a visible browser, wait for the interstitial to clear, or fall back to delivery.

### Search returns no result

- Remove quotes and punctuation; the service does not always honor phrase syntax.
- Search a distinctive title fragment.
- Search author + year + journal.
- Search the conference paper number.
- If the service truly does not index it, use CALIS or NSTL directly.

### Request submitted but no email

Wait for the quoted ETA (often 1 business day). Check spam. Contact the library with the order number. Do not immediately submit a duplicate.

## 6. Supplement trap

Wanfang's form has only a title and an email. It cannot express "send the supplement only" or "include Figs S1–S4 and ANN weights". If the user needs supplementary material:

1. Check the publisher article page for a visible `Supplementary Material` link.
2. If the link is absent/hidden, report that the publisher does not expose it (or it is behind the same paywall).
3. Do not resubmit the main article if the user already has it.
4. Offer author/publisher contact as the next step.

## 7. What to record

For every request:

```json
{
  "title": "...",
  "authors": ["..."],
  "source": "...",
  "year": 2024,
  "doi": "10....",
  "service": "wanfang-nstl",
  "email": "you@example.com",
  "orderNumber": "...",
  "eta": "1 business day",
  "submittedAt": "2026-11-01T22:00:00+08:00",
  "status": "submitted"
}
```

Use `scripts/receipt.mjs` to render a Markdown receipt. Keep the raw JSON private if it contains a personal email.
