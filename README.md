# Wallet AI Browser Extension

A local-first AI assistant for Google Chrome and Microsoft Edge. It analyzes the current webpage, answers questions using page context, suggests likely answers for quizzes and multiple-choice questions, and helps understand form fields.

## Privacy and safety

- Page content is sent only to the local Ollama service at `http://127.0.0.1:11434`.
- No cloud AI API, tracking, analytics, or account is required.
- The extension reads a page only after you click **Analyze this page** or **Ask AI**.
- It does not automatically submit forms or click answers.
- Never use it to bypass proctoring, access controls, or assessment rules. Follow the rules of your school or website.
- The AI can be wrong. Verify important answers.

## 1. Install Ollama

Install Ollama from https://ollama.com/download and start it.

In Windows Terminal, download a small model:
```powershell
ollama pull qwen2.5:3b
```

Confirm the model is available:
```powershell
ollama list
```

The extension uses Ollama's local API at `http://127.0.0.1:11434/api/chat`. It does not require an API key. If your Ollama setup does not accept requests from the extension, check that Ollama is running and that its local API is available.

## 2. Install the extension in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository folder containing `manifest.json`.

## 3. Install in Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the same folder.

## 4. Use it

1. Open a normal webpage (browser internal pages such as `chrome://` cannot be analyzed).
2. Click the Wallet AI extension icon.
3. Choose **Analyze this page** for a summary and page-specific insights.
4. Enter a question or choose **Suggest answers** to identify visible questions and likely answers.
5. Review the explanation and verify the answer yourself.

## Project structure

```
wallet/
├── manifest.json  # Manifest V3 configuration and minimal permissions
├── popup.html     # Extension popup interface
├── popup.css      # Popup styling
├── popup.js       # Page extraction and local Ollama requests
└── README.md      # Setup and privacy instructions
```

## Configuration

The popup lets you change the local Ollama model name. The default is `qwen2.5:3b`. Install the chosen model first with `ollama pull MODEL_NAME`.

The extension uses the local API only. Do not change the endpoint to a public server unless you understand the privacy implications.
