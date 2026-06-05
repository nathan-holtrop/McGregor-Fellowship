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

function makeAnthropicPayload(row) {
  return {
    model: modelSelect.value,
    prompt: `\n\nHuman: ${row.prompt}\n\nAssistant:`,
    max_tokens_to_sample: 512,
    temperature: 0.0,
    stop_sequences: ['\n\nHuman:'],
  };
}

function makeGeminiPayload(row) {
  return {
    prompt: row.prompt,
    temperature: 0.0,
    max_output_tokens: 512,
    candidate_count: 1,
  };
}

function makeGrokPayload(row) {
  return {
    model: modelSelect.value,
    prompt: row.prompt,
    max_tokens: 512,
    temperature: 0.0,
  };
}

function buildSampleRequest(row, apiKey) {
  const provider = providerSelect.value;
  if (provider === 'openai') {
    return {
      url: providerConfig.openai.endpoint,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(makeOpenAIPayload(row)),
      },
      requestBody: makeOpenAIPayload(row),
      requestDescription: 'OpenAI Chat Completions request',
    };
  }

  if (provider === 'claude') {
    return {
      url: providerConfig.claude.endpoint,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(makeAnthropicPayload(row)),
      },
      requestBody: makeAnthropicPayload(row),
      requestDescription: 'Anthropic completion request',
    };
  }

  if (provider === 'gemini') {
    const url = `https://generativeai.googleapis.com/v1beta2/models/${encodeURIComponent(modelSelect.value)}:generateText?key=${encodeURIComponent(apiKey)}`;
    return {
      url,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makeGeminiPayload(row)),
      },
      requestBody: makeGeminiPayload(row),
      requestDescription: 'Google Gemini generateText request',
    };
  }

  if (provider === 'grok') {
    const url = `https://api.x.ai/v1/engines/${encodeURIComponent(modelSelect.value)}/completions`;
    return {
      url,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(makeGrokPayload(row)),
      },
      requestBody: makeGrokPayload(row),
      requestDescription: 'Grok completion request',
    };
  }

  return null;
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

  responseOutput.textContent = 'Building sample request...';
  const sampleRequest = buildSampleRequest(sampleRow, apiKey);
  if (!sampleRequest) {
    responseOutput.textContent = `Sample request is not supported for ${providerConfig[provider].name}.`;
    return;
  }

  try {
    const response = await fetch(sampleRequest.url, sampleRequest.options);
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    responseOutput.textContent = JSON.stringify(
      {
        provider: providerConfig[provider].name,
        request: {
          description: sampleRequest.requestDescription,
          url: sampleRequest.url,
          headers: sampleRequest.options.headers,
          body: sampleRequest.requestBody,
        },
        selectedRowCount: selectedRows.length,
        selectedQuestions: selectedRows.map((row) => ({ qnum: row.qnum || row['Q#'], question: row.question })),
        response: data,
        status: response.status,
      },
      null,
      2,
    );
  } catch (error) {
    responseOutput.textContent = JSON.stringify(
      {
        provider: providerConfig[provider].name,
        request: {
          description: sampleRequest.requestDescription,
          url: sampleRequest.url,
          headers: sampleRequest.options.headers,
          body: sampleRequest.requestBody,
        },
        selectedRowCount: selectedRows.length,
        selectedQuestions: selectedRows.map((row) => ({ qnum: row.qnum || row['Q#'], question: row.question })),
        error: error.message,
      },
      null,
      2,
    );
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
