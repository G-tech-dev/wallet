const DEFAULT_API_URL = "";
const MAX_PAGE_CHARS = 18000;

const apiUrlInput = document.getElementById("apiUrl");
const accessCodeInput = document.getElementById("accessCode");
const questionInput = document.getElementById("question");
const statusBox = document.getElementById("status");
const resultBox = document.getElementById("result");
const answerBox = document.getElementById("answer");
const actionButtons = [
  document.getElementById("analyze"),
  document.getElementById("suggest"),
  document.getElementById("ask"),
  document.getElementById("saveSettings")
];

function setStatus(message, kind = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (kind ? " " + kind : "");
}
function setBusy(busy) {
  actionButtons.forEach((button) => { button.disabled = busy; });
}

async function loadSettings() {
  const saved = await chrome.storage.local.get({
    apiUrl: DEFAULT_API_URL,
    accessCode: ""
  });
  apiUrlInput.value = saved.apiUrl || "";
  accessCodeInput.value = saved.accessCode || "";
}

function validApiUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.replace(/\/$/, "").endsWith("/api/analyze");
  } catch {
    return false;
  }
}

async function saveSettings() {
  const apiUrl = apiUrlInput.value.trim().replace(/\/$/, "");
  const accessCode = accessCodeInput.value.trim();
  if (!validApiUrl(apiUrl)) {
    setStatus("Enter your HTTPS backend URL ending in /api/analyze.", "error");
    return false;
  }
  if (!accessCode || accessCode.length > 200) {
    setStatus("Enter the Wallet AI access code you configured on the backend.", "error");
    return false;
  }
  await chrome.storage.local.set({ apiUrl, accessCode });
  setStatus("Backend settings saved on this computer.", "success");
  return true;
}

async function getActivePage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error("No active browser tab was found.");
  if (!tab.url || /^(chrome|edge|about|chrome-extension|edge-extension):\/\//i.test(tab.url)) {
    throw new Error("This browser page cannot be read. Open a regular website and try again.");
  }
  const injected = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
      const title = document.title || "";
      const url = location.href;
      const pageText = document.body ? document.body.innerText : "";
      const fields = Array.from(document.querySelectorAll("input, textarea, select, [role='radio'], [role='checkbox']"))
        .filter((el) => {
          const style = getComputedStyle(el);
          const visible = style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
          return visible && !el.disabled && el.type !== "password" && el.type !== "hidden";
        })
        .slice(0, 80)
        .map((el, index) => {
          const labelById = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
          const parentLabel = el.closest("label");
          const label = labelById?.innerText || parentLabel?.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || el.type || el.tagName.toLowerCase();
          const options = el.tagName === "SELECT"
            ? Array.from(el.options).map((option) => clean(option.textContent)).filter(Boolean)
            : [];
          return {
            number: index + 1,
            type: el.type || el.getAttribute("role") || el.tagName.toLowerCase(),
            label: clean(label).slice(0, 240),
            value: el.type === "password" ? "[hidden]" : clean(el.value).slice(0, 200),
            options: options.slice(0, 40)
          };
        });
      return {
        title,
        url,
        text: pageText.slice(0, 18000),
        fields,
        selectedText: clean(window.getSelection()?.toString() || "")
      };
    }
  });
  const page = injected?.[0]?.result;
  if (!page) throw new Error("Could not read this page. Refresh it and reopen the extension.");
  return page;
}

function buildContext(page) {
  return [
    "PAGE TITLE: " + page.title,
    "PAGE URL: " + page.url,
    "SELECTED TEXT: " + (page.selectedText || "(none)"),
    "VISIBLE FORM FIELDS AND OPTIONS: " + JSON.stringify(page.fields, null, 2),
    "VISIBLE PAGE TEXT (truncated if long):\n" + page.text.slice(0, MAX_PAGE_CHARS)
  ].join("\n\n");
}

async function askOnlineAI(task) {
  const saved = await chrome.storage.local.get({ apiUrl: "", accessCode: "" });
  const apiUrl = (apiUrlInput.value.trim() || saved.apiUrl || "").replace(/\/$/, "");
  const accessCode = accessCodeInput.value.trim() || saved.accessCode || "";
  if (!validApiUrl(apiUrl)) throw new Error("Save your HTTPS backend URL first.");
  if (!accessCode) throw new Error("Enter and save your backend access code first.");

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Wallet-Access-Code": accessCode
      },
      body: JSON.stringify({
        prompt: task.prompt,
        context: task.context || ""
      })
    });
  } catch {
    throw new Error("Could not reach the backend. Check the URL, deployment, and extension origin setting.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || ("Backend returned HTTP " + response.status + "."));
  if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("The backend returned an empty answer.");
  return data.answer.trim();
}

async function runTask(mode) {
  setBusy(true);
  resultBox.hidden = true;
  setStatus("Reading the current page…");
  try {
    const page = await getActivePage();
    const context = buildContext(page);
    let prompt;
    if (mode === "analyze") {
      prompt = "Summarize this webpage. Identify its purpose, key facts, important details, and caveats. If it contains questions or a form, point them out. Use headings and concise bullet points.";
    } else if (mode === "suggest") {
      prompt = "Find visible questions, quiz items, multiple-choice questions, and form fields in the supplied page context. Suggest likely answers only when context supports them, briefly explain the evidence, and mark uncertainty. Do not invent options. If no questions are visible, say so.";
    } else {
      const question = questionInput.value.trim();
      if (!question) throw new Error("Type a question first.");
      prompt = question + "\nAnswer using the page context when relevant. If the answer is not present, distinguish general knowledge from what the page says.";
    }
    setStatus("Sending page context to online AI. Do not include passwords or sensitive information…");
    const answer = await askOnlineAI({ prompt, context });
    answerBox.textContent = answer;
    resultBox.hidden = false;
    setStatus("Response ready. Online AI processed the selected page text; verify important answers.", "success");
  } catch (error) {
    setStatus(error?.message || "Something went wrong.", "error");
  } finally {
    setBusy(false);
  }
}

document.getElementById("analyze").addEventListener("click", () => runTask("analyze"));
document.getElementById("suggest").addEventListener("click", () => runTask("suggest"));
document.getElementById("ask").addEventListener("click", () => runTask("ask"));
document.getElementById("saveSettings").addEventListener("click", async () => {
  try { await saveSettings(); }
  catch { setStatus("Could not save settings.", "error"); }
});
document.getElementById("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(answerBox.textContent || "");
    setStatus("Answer copied to clipboard.", "success");
  } catch {
    setStatus("Could not access the clipboard. Select the answer and copy it manually.", "error");
  }
});
loadSettings().catch(() => setStatus("Could not load settings.", "error"));
