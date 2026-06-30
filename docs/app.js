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
const requestPreview = document.getElementById('requestPreview');
const resultCount = document.getElementById('resultCount');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const providerConfig = {
  openrouter: {
    name: 'OpenRouter',
    models: [
      'anthropic/claude-opus-4.1',
      'openai/gpt-4o',
      'x-ai/grok-2',
      'google/gemini-2.5-flash',
    ],
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyHint: 'OPENROUTER_API_KEY',
  },
};

let csvRows = [];
let csvHeaders = [];

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', normalized === 'dark');
  // Show the current theme as a short label for clarity, keep aria-label describing the action
  themeToggleBtn.textContent = normalized === 'dark' ? 'Dark' : 'Light';
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
  alert('OpenRouter API key saved locally.');
}

function clearSavedKey() {
  const provider = providerSelect.value;
  window.localStorage.removeItem(`ai-tester-key-${provider}`);
  apiKeyInput.value = '';
  alert('Saved OpenRouter API key removed.');
}

function normalizeHeader(header) {
  const cleaned = header.trim();
  if (/^q#$/i.test(cleaned)) return 'qnum';
  if (/^question$/i.test(cleaned)) return 'question';
  if (/^category$/i.test(cleaned)) return 'category';
  if (/^difficulty$/i.test(cleaned)) return 'difficulty';
  return cleaned.toLowerCase().replace(/\s+/g, '_') || 'column';
}

function getRowField(row, normalized, raw) {
  return row[normalized] || row[raw] || '';
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

  const rawHeaders = parseLine(lines[0]).map(header => header.trim());
  const headers = rawHeaders.map(normalizeHeader);
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;
    const row = {};
    headers.forEach((normalizedHeader, index) => {
      const value = values[index] ? values[index].trim() : '';
      row[normalizedHeader] = value;
      if (rawHeaders[index] && rawHeaders[index] !== normalizedHeader) {
        row[rawHeaders[index]] = value;
      }
    });
    rows.push(row);
  }
  csvHeaders = rawHeaders;
  return rows;
}

function renderCsvPreview() {
  if (!csvRows.length) {
    csvPreview.textContent = 'No CSV uploaded yet.';
    return;
  }

  const validRows = csvRows.filter((row) => getRowField(row, 'question', 'Question').trim() !== '');
  const previewCount = Math.min(Number(resultCount.value) || 5, validRows.length);
  const shownRows = validRows.slice(0, previewCount);
  const preview = [csvHeaders.join(', '), ...shownRows.map(row => csvHeaders.map(key => row[key] || '').join(', '))].join('\n');
  csvPreview.textContent = preview;
}

function buildPrompt(questionText) {
  const template = promptTemplate.value.trim();
  return template.replace(/\{\{\s*question\s*\}\}/gi, questionText);
}

function buildBatchPrompt(rows) {
  if (!rows || !rows.length) return '';
  if (rows.length === 1) return rows[0].prompt;

  const questionBlocks = rows.map((row, index) => {
    const qnum = row.qnum || row['Q#'] || `Q${index + 1}`;
    const questionText = row.question || '';
    const category = row.category || row.Category || '';
    const difficulty = row.difficulty || row.Difficulty || '';
    const lines = [`${qnum}: ${questionText}`];
    if (category) lines.push(`Category: ${category}`);
    if (difficulty) lines.push(`Difficulty: ${difficulty}`);
    return lines.join('\n');
  });

  return `${promptTemplate.value.trim() || 'Use the provided questions and create answers in a concise format.'}\n\n${questionBlocks.join('\n\n')}`;
}

function buildPayload(limitRows = null) {
  const provider = providerSelect.value;
  const model = modelSelect.value;
  if (!csvRows.length) {
    alert('Upload a CSV before building the payload.');
    return null;
  }

  const validRows = csvRows.filter((row) => {
    const questionText = getRowField(row, 'question', 'Question').trim();
    return questionText !== '';
  });

  const selectedRows = Number.isNaN(limitRows)
    ? validRows
    : validRows.slice(0, Math.max(0, Number(limitRows)));

  const questions = selectedRows.map((row, index) => {
    const questionText = getRowField(row, 'question', 'Question').trim();
    const metadata = {};
    csvHeaders.forEach((header) => {
      if (!header) return;
      const normalizedHeader = normalizeHeader(header);
      const value = getRowField(row, normalizedHeader, header).trim();
      if (value) {
        metadata[header] = value;
      }
    });
    return {
      index: index + 1,
      qnum: getRowField(row, 'qnum', 'Q#'),
      question: questionText,
      category: getRowField(row, 'category', 'Category'),
      difficulty: getRowField(row, 'difficulty', 'Difficulty'),
      prompt: buildPrompt(questionText),
      metadata,
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
  const limit = Number(resultCount.value);
  const payload = buildPayload(Number.isNaN(limit) ? null : limit);
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

function makeOpenRouterPayload(row) {
  return {
    model: modelSelect.value,
    temperature: 0.0,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: 'You are a helpful model providing answers to evaluation questions.' },
      { role: 'user', content: row.prompt },
    ],
  };
}

function saveSampleResults(data) {
  window.sessionStorage.setItem('mcgregor-sample-results', JSON.stringify(data));
  window.location.href = 'results.html';
}

function buildSampleRequest(row, apiKey) {
  return {
    url: providerConfig.openrouter.endpoint,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(makeOpenRouterPayload(row)),
    },
    requestBody: makeOpenRouterPayload(row),
    requestDescription: 'OpenRouter Chat Completions request',
  };
}

async function runSampleRequest() {
  const limit = Number(resultCount.value);
  const payload = buildPayload(Number.isNaN(limit) ? null : limit);
  if (!payload) return;

  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim() || window.localStorage.getItem(`ai-tester-key-${provider}`);
  if (!apiKey) {
    alert('Save or enter an API key before running a sample request.');
    return;
  }

  const selectedRows = payload.rows;
  if (!selectedRows.length) {
    alert('No valid rows available for a sample request.');
    return;
  }

  const sampleRow = {
    ...selectedRows[0],
    prompt: buildBatchPrompt(selectedRows),
  };

  const sampleRequest = buildSampleRequest(sampleRow, apiKey);
  const elapsedStart = performance.now();

  if (!sampleRequest) {
    const elapsedMs = performance.now() - elapsedStart;
    saveSampleResults({
      providerName: providerConfig[provider].name,
      provider,
      model: modelSelect.value,
      runTimestamp: new Date().toISOString(),
      selectedQuestionCount: selectedRows.length,
      payloadRowCount: payload.rows.length,
      requestDescription: '',
      requestUrl: '',
      requestHeaders: {},
      requestBody: null,
      selectedQuestions: selectedRows.map((row) => ({ qnum: row.qnum || row['Q#'], question: row.question })),
      responseBody: null,
      status: null,
      error: `Sample request is not supported for ${providerConfig[provider].name}.`,
      elapsedMs,
    });
    return;
  }

  requestPreview.textContent = JSON.stringify(
    {
      provider: providerConfig[provider].name,
      selectedRowCount: selectedRows.length,
      request: {
        description: sampleRequest.requestDescription,
        url: sampleRequest.url,
        headers: sampleRequest.options.headers,
        body: sampleRequest.requestBody,
      },
    },
    null,
    2,
  );

  try {
    const response = await fetch(sampleRequest.url, sampleRequest.options);
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    const elapsedMs = performance.now() - elapsedStart;

    saveSampleResults({
      providerName: providerConfig[provider].name,
      provider,
      model: modelSelect.value,
      runTimestamp: new Date().toISOString(),
      selectedQuestionCount: selectedRows.length,
      payloadRowCount: payload.rows.length,
      requestDescription: sampleRequest.requestDescription,
      requestUrl: sampleRequest.url,
      requestHeaders: sampleRequest.options.headers,
      requestBody: sampleRequest.requestBody,
      selectedQuestions: selectedRows.map((row) => ({ qnum: row.qnum || row['Q#'], question: row.question })),
      responseBody: data,
      status: response.status,
      error: null,
      elapsedMs,
    });
  } catch (error) {
    const elapsedMs = performance.now() - elapsedStart;
    saveSampleResults({
      providerName: providerConfig[provider].name,
      provider,
      model: modelSelect.value,
      runTimestamp: new Date().toISOString(),
      selectedQuestionCount: selectedRows.length,
      payloadRowCount: payload.rows.length,
      requestDescription: sampleRequest.requestDescription,
      requestUrl: sampleRequest.url,
      requestHeaders: sampleRequest.options.headers,
      requestBody: sampleRequest.requestBody,
      selectedQuestions: selectedRows.map((row) => ({ qnum: row.qnum || row['Q#'], question: row.question })),
      responseBody: null,
      status: null,
      error: error.message,
      elapsedMs,
    });
  }
}

function init() {
  loadTheme();
  populateProviders();
  populateModels();
  loadSavedApiKey();
  csvPreview.textContent = 'No CSV uploaded yet.';
  payloadOutput.textContent = 'Build payload to see preview.';
  requestPreview.textContent = 'Request preview appears here after you run a sample request.';
  responseOutput.textContent = 'Run a sample request to see the OpenRouter response here.';
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
