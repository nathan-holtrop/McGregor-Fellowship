const providerSelect = document.getElementById('providerSelect');
const modelSelect = document.getElementById('modelSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const clearKeyBtn = document.getElementById('clearKeyBtn');
const csvUpload = document.getElementById('csvUpload');
const csvPreview = document.getElementById('csvPreview');
const promptTemplate = document.getElementById('promptTemplate');
const showPayloadBtn = document.getElementById('showPayloadBtn');
const downloadPayloadBtn = document.getElementById('downloadPayloadBtn');
const payloadOutput = document.getElementById('payloadOutput');
const runSampleBtn = document.getElementById('runSampleBtn');
const responseOutput = document.getElementById('responseOutput');
const resultCount = document.getElementById('resultCount');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const providerConfig = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    keyHint: 'OPENAI_API_KEY',
  },
  claude: {
    name: 'Anthropic Claude',
    models: ['claude-4o', 'claude-4.1', 'claude-3.5', 'claude-instant'],
    endpoint: 'https://api.anthropic.com/v1/complete',
    keyHint: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5', 'gemini-1.5-mini'],
    endpoint: 'https://generativeai.googleapis.com/v1beta2/models',
    keyHint: 'GOOGLE_API_KEY',
  },
  grok: {
    name: 'Grok (xAI)',
    models: ['grok-2', 'grok-1'],
    endpoint: 'https://api.x.ai/v1/engines',
    keyHint: 'GROK_API_KEY',
  },
};

let csvRows = [];
let csvHeaders = [];

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', normalized === 'dark');
  themeToggleBtn.textContent = normalized === 'dark' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label', normalized === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  window.localStorage.setItem('mcgregor-theme', normalized);
}

function loadTheme() {
  const saved = window.localStorage.getItem('mcgregor-theme');
  if (saved) {
    applyTheme(saved);
    return;
  }

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

function toggleTheme() {
  const current = document.body.classList.contains('dark') ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function populateProviders() {
  Object.entries(providerConfig).forEach(([key, provider]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = provider.name;
    providerSelect.appendChild(option);
  });
}

function populateModels() {
  const provider = providerSelect.value;
  const models = providerConfig[provider].models;
  modelSelect.innerHTML = '';
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  updateModelListNote(provider);
}

function updateModelListNote(provider) {
  const note = document.getElementById('modelListNote');
  const models = providerConfig[provider].models;
  note.textContent = `Supported models for ${providerConfig[provider].name}: ${models.join(', ')}.`;
}

function loadSavedApiKey() {
  const provider = providerSelect.value;
  const saved = window.localStorage.getItem(`ai-tester-key-${provider}`);
  apiKeyInput.value = saved || '';
}

function saveApiKey() {
  const provider = providerSelect.value;
  const key = apiKeyInput.value.trim();
  if (!key) {
    alert('Enter a valid API key before saving.');
    return;
  }
  window.localStorage.setItem(`ai-tester-key-${provider}`, key);
  alert('API key saved locally for this provider.');
}

function clearSavedKey() {
  const provider = providerSelect.value;
  window.localStorage.removeItem(`ai-tester-key-${provider}`);
  apiKeyInput.value = '';
  alert('Saved API key removed.');
}

function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (!lines.length) return rows;

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headerRow = parseLine(lines[0]);
  const headers = headerRow.map(header => header.trim() || 'column');
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : '';
    });
    rows.push(row);
  }
  csvHeaders = headers;
  return rows;
}

function renderCsvPreview() {
  if (!csvRows.length) {
    csvPreview.textContent = 'No CSV uploaded yet.';
    return;
  }

  const previewCount = Math.min(Number(resultCount.value) || 5, csvRows.length);
  const shownRows = csvRows.slice(0, previewCount);
  const preview = [csvHeaders.join(', '), ...shownRows.map(row => csvHeaders.map(key => row[key] || '').join(', '))].join('\n');
  csvPreview.textContent = preview;
}

function buildPrompt(questionText) {
  const template = promptTemplate.value.trim();
  return template.replace(/\{\{\s*question\s*\}\}/gi, questionText);
}

function buildPayload() {
  const provider = providerSelect.value;
  const model = modelSelect.value;
  if (!csvRows.length) {
    alert('Upload a CSV before building the payload.');
    return null;
  }
  const questions = csvRows.map((row, index) => {
    const questionText = row.question || row.prompt || Object.values(row).join(' ');
    return {
      index: index + 1,
      question: questionText,
      answer: row.answer || '',
      prompt: buildPrompt(questionText),
      metadata: row,
    };
  });

  return {
    provider,
    model,
    rows: questions,
    generatedAt: new Date().toISOString(),
    summary: `Prepared ${questions.length} question items for ${provider} / ${model}`,
  };
}

function showPayload() {
  const payload = buildPayload();
  if (!payload) return;
  payloadOutput.textContent = JSON.stringify(payload, null, 2);
}

function downloadPayload() {
  const payload = buildPayload();
  if (!payload) return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mcgregor-question-bank-payload.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function makeOpenAIPayload(row) {
  return {
    model: modelSelect.value,
    messages: [
      { role: 'system', content: 'You are a helpful model providing answers to evaluation questions.' },
      { role: 'user', content: row.prompt },
    ],
    temperature: 0.0,
    max_tokens: 512,
  };
}

async function runSampleRequest() {
  const payload = buildPayload();
  if (!payload) return;
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim() || window.localStorage.getItem(`ai-tester-key-${provider}`);
  if (!apiKey) {
    alert('Save or enter an API key before running a sample request.');
    return;
  }

  const sampleRow = payload.rows[0];
  const samplePrompt = sampleRow.prompt;
  responseOutput.textContent = 'Sending sample request...';

  try {
    if (provider === 'openai') {
      const response = await fetch(providerConfig.openai.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(makeOpenAIPayload(sampleRow)),
      });
      const data = await response.json();
      responseOutput.textContent = JSON.stringify({ request: makeOpenAIPayload(sampleRow), response: data }, null, 2);
      return;
    }

    responseOutput.textContent = `Sample request is not implemented for ${providerConfig[provider].name} in this static demo. Use the payload preview or add your own request logic.`;
  } catch (error) {
    responseOutput.textContent = `Request failed: ${error.message}`;
  }
}

function init() {
  loadTheme();
  populateProviders();
  populateModels();
  loadSavedApiKey();
  csvPreview.textContent = 'No CSV uploaded yet.';
  payloadOutput.textContent = 'Build payload to see preview.';
  responseOutput.textContent = 'Run a sample request to see the provider response here.';
}

providerSelect.addEventListener('change', () => {
  populateModels();
  loadSavedApiKey();
});

saveKeyBtn.addEventListener('click', saveApiKey);
clearKeyBtn.addEventListener('click', clearSavedKey);
csvUpload.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) {
    csvRows = [];
    renderCsvPreview();
    return;
  }

  const text = await file.text();
  csvRows = parseCsv(text);
  if (!csvRows.length) {
    csvPreview.textContent = 'CSV could not be parsed or is empty.';
    return;
  }
  renderCsvPreview();
});
showPayloadBtn.addEventListener('click', showPayload);
downloadPayloadBtn.addEventListener('click', downloadPayload);
runSampleBtn.addEventListener('click', runSampleRequest);
resultCount.addEventListener('change', renderCsvPreview);
themeToggleBtn.addEventListener('click', toggleTheme);

init();
