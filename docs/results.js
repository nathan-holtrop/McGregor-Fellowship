const themeToggleBtn = document.getElementById('themeToggleBtn');
const summaryBlock = document.getElementById('summaryBlock');
const requestBlock = document.getElementById('requestBlock');
const metricsBlock = document.getElementById('metricsBlock');
const responseBlock = document.getElementById('responseBlock');

function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark', normalized === 'dark');
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}

function renderJson(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return String(value);
  }
}

function renderResults(data) {
  const summaryLines = [
    `Service: ${data.providerName}`,
    `Model: ${data.model}`,
    `Run timestamp: ${data.runTimestamp}`,
    `Selected questions: ${data.selectedQuestionCount}`,
    `Payload row count: ${data.payloadRowCount}`,
    `Status: ${data.status}`,
  ];
  if (data.error) {
    summaryLines.push(`Error: ${data.error}`);
  }
  if (data.elapsedMs != null) {
    summaryLines.push(`Elapsed time: ${data.elapsedMs.toFixed(0)} ms`);
  }
  summaryBlock.textContent = summaryLines.join('\n');

  requestBlock.textContent = renderJson({
    description: data.requestDescription,
    url: data.requestUrl,
    headers: data.requestHeaders,
    body: data.requestBody,
    selectedQuestions: data.selectedQuestions,
  });

  metricsBlock.textContent = renderJson({
    questionCount: data.selectedQuestionCount,
    payloadRowCount: data.payloadRowCount,
    model: data.model,
    provider: data.providerName,
    responseType: data.responseType,
    responseSize: data.responseSize,
    status: data.status,
    error: data.error || null,
  });

  responseBlock.textContent = renderJson(data.responseBody);
}

function loadResults() {
  const raw = window.sessionStorage.getItem('mcgregor-sample-results');
  if (!raw) {
    summaryBlock.textContent = 'No sample results were found. Run the sample request from the tester page first.';
    requestBlock.textContent = '';
    metricsBlock.textContent = '';
    responseBlock.textContent = '';
    return;
  }

  let data = safeJsonParse(raw);
  if (!data || typeof data !== 'object') {
    summaryBlock.textContent = 'Stored results are not valid JSON.';
    return;
  }

  if (data.response && typeof data.response === 'string') {
    try {
      data.responseBody = JSON.parse(data.response);
      data.responseType = 'json';
    } catch {
      data.responseBody = data.response;
      data.responseType = 'text';
    }
  }

  renderResults(data);
}

loadTheme();
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}
loadResults();
