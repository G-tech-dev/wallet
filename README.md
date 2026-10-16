# Wallet AI Browser Extension

Wallet AI is a Chrome/Edge extension that reads a webpage only after you click an action, then sends the relevant text to a hosted AI backend for analysis, questions, and suggested answers. The extension is installed locally with **Load unpacked**; a Chrome Web Store developer account is not needed for personal installation.

## Architecture

- Browser extension: runs on your computer.
- Backend: Vercel serverless function at `/api/analyze`.
- AI provider: OpenRouter's free-model router (`openrouter/free`), subject to model availability and provider limits.
- The OpenRouter API key stays in the backend environment and is never placed in extension files.
- Page text is sent online when you click Analyze, Suggest answers, or Ask AI. Do not send passwords, financial data, private messages, or other sensitive content.

OpenRouter currently lists a free tier with 50 requests/day and free models; limits and model availability can change. See https://openrouter.ai/pricing and https://openrouter.ai/docs/api-reference/limits.

## 1. Deploy backend from GitHub to Vercel

1. Sign in to Vercel and import `https://github.com/G-tech-dev/wallet` as a project.
2. Keep the project root as the repository root. Vercel should detect the Node.js serverless function at `api/analyze.js`.
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `OPENROUTER_API_KEY`: your key from https://openrouter.ai/keys
   - `WALLET_ACCESS_CODE`: create a long random passphrase for your personal use
   - `EXTENSION_ORIGIN`: the extension origin described in section 3, for example `chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef`
4. Apply the variables to Production (and Preview if you use previews), then redeploy.
5. Your endpoint will be `https://YOUR-PROJECT.vercel.app/api/analyze`.

Never commit the OpenRouter key or the access code to GitHub. Do not expose the OpenRouter key in the extension.

## 2. Install extension locally (no developer account)

1. Download the repository as ZIP from GitHub and extract it, or clone it with Git.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Turn on **Developer mode**, choose **Load unpacked**, and select the extracted `wallet` folder (the folder containing `manifest.json`).
4. Copy the extension ID shown on the extension card. Its origin is `chrome-extension://YOUR_EXTENSION_ID`.
5. In Vercel, set `EXTENSION_ORIGIN` to that exact origin, save, and redeploy the backend.

If you load the unpacked extension from a different browser profile or computer, its extension ID may differ; configure a matching origin for that installation.

## 3. Configure the extension

1. Open Wallet AI's popup.
2. Enter the deployed URL ending in `/api/analyze`.
3. Enter the same `WALLET_ACCESS_CODE` value you set in Vercel.
4. Click **Save settings**, then open a normal webpage and try an action.

## 4. Backend behavior and safety

- Accepts only POST requests from the exact configured extension origin.
- Requires the configured access code.
- Limits the context to 18,000 characters, the task to 2,000 characters, and AI output to 900 tokens.
- Sends the API key only from the server to OpenRouter.
- Does not auto-submit forms, click answers, or store webpage contents on purpose.
- Returns clear errors when free-provider limits are reached.

Important: CORS and an access code are useful safeguards, not strong user authentication. Anyone who can inspect a locally installed extension can discover the access code saved in it, and a public endpoint can still be targeted. Keep the code private, use this setup for personal use, rotate it if exposed, and monitor provider usage. For a public multi-user release, add proper user authentication and robust rate limiting before sharing the endpoint.

## Project structure

```
wallet/
├── api/
│   └── analyze.js    # Vercel serverless API; calls OpenRouter
├── manifest.json    # Manifest V3 extension config
├── package.json     # Node runtime metadata
├── popup.html       # Extension popup interface
├── popup.css        # Popup styling
├── popup.js         # Page extraction and backend request
└── README.md
```

## Local install commands (Windows)

```powershell
git clone https://github.com/G-tech-dev/wallet.git
cd wallet
```

After future changes, update the folder with:

```powershell
git pull origin main
```
