// popup.js

let token = '';
let resumeText = '';

const API_URL = 'http://localhost:3000/api';

// -- Utilities --

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function showSection(id) {
  ['login-ui', 'job-ui', 'fallback-ui'].forEach(sec => {
    document.getElementById(sec).hidden = (sec !== id);
  });
}

function setStatus(elementId, text, isError) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = text;
    el.style.color = isError ? 'red' : '#555';
  }
}

// -- PDF Parsing --

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText.trim();
}

// -- Init --

window.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['token', 'resumeText']);
  token = stored.token || '';
  resumeText = stored.resumeText || '';

  if (!token) {
    showSection('login-ui');
    setupLogin();
  } else {
    await routeToUI();
  }

});

// -- Login --

function setupLogin() {
  document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    document.getElementById('login-error').textContent = '';

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.msg || 'Login failed');
      }
      const data = await res.json();
      token = data.token;
      await chrome.storage.local.set({ token });
      await routeToUI();
    } catch (err) {
      document.getElementById('login-error').textContent = err.message;
    }
  };
}

// -- Routing --

async function routeToUI() {
  const tab = await getActiveTab();
  showSection('job-ui');
  setupJobUI(tab);
}

// -- Job UI --

async function setupJobUI(tab) {
  document.getElementById('job-link').value = tab?.url || '';

  if (resumeText) {
    setStatus('resume-status', `Resume loaded (${resumeText.length} chars)`);
  }

  // Try to scrape job title & company from the page
  if (tab) {
    try {
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['contentScript.js']
        });
        response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' });
      }
      if (response?.title) document.getElementById('job-title').value = response.title;
      if (response?.company) document.getElementById('job-company').value = response.company;
      if (response?.description) document.getElementById('job-desc').value = response.description;
    } catch {
      // User can fill manually
    }
  }

  // -- Resume Upload --
  document.getElementById('btn-upload-resume').onclick = async () => {
    const fileInput = document.getElementById('resume-upload');
    const file = fileInput.files[0];
    if (!file) {
      setStatus('resume-status', 'Please select a file first.', true);
      return;
    }

    setStatus('resume-status', 'Parsing file...');
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        resumeText = await extractTextFromPDF(file);
      } else {
        resumeText = await file.text();
      }
      await chrome.storage.local.set({ resumeText });
      setStatus('resume-status', `Resume loaded (${resumeText.length} chars)`);
    } catch (err) {
      setStatus('resume-status', `Failed to parse: ${err.message}`, true);
    }
  };

  // -- Save Job --
  document.getElementById('btn-save-job').onclick = async () => {
    const title = document.getElementById('job-title').value.trim();
    const company = document.getElementById('job-company').value.trim();
    const postingLink = document.getElementById('job-link').value.trim();
    const status = document.getElementById('job-status').value;
    const jobDescription = document.getElementById('job-desc').value.trim();

    if (!title || !company) {
      setStatus('job-status-msg', 'Title and Company are required.', true);
      return;
    }

    setStatus('job-status-msg', 'Saving job...');

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          company,
          postingLink,
          status,
          jobDescription,
          appliedDate: new Date().toISOString()
        })
      });

      if (res.status === 401) {
        token = '';
        await chrome.storage.local.remove('token');
        showSection('login-ui');
        setupLogin();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.msg || 'Failed to save job');

      setStatus('job-status-msg', `Saved: ${data.title} at ${data.company}`);
    } catch (err) {
      setStatus('job-status-msg', `Error: ${err.message}`, true);
    }
  };
}
