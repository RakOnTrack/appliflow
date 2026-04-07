// contentScript.js

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'GET_JOB_INFO') {
    const info = { title: '', company: '', description: '' };

    // LinkedIn
    if (window.location.hostname.includes('linkedin.com')) {
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title h1')
        || document.querySelector('.jobs-unified-top-card__job-title')
        || document.querySelector('.t-24.job-details-jobs-unified-top-card__job-title');
      const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a')
        || document.querySelector('.jobs-unified-top-card__company-name a')
        || document.querySelector('.job-details-jobs-unified-top-card__company-name');
      const descEl = document.querySelector('.jobs-description__content')
        || document.querySelector('.jobs-description-content__text')
        || document.querySelector('.jobs-box__html-content');

      if (titleEl) info.title = titleEl.innerText.trim();
      if (companyEl) info.company = companyEl.innerText.trim();
      if (descEl) info.description = descEl.innerText.trim();
    }

    // Workday
    else if (window.location.hostname.includes('workday.com')) {
      const titleEl = document.querySelector('[data-automation-id="jobPostingHeader"]')
        || document.querySelector('h2');
      const companyEl = document.querySelector('[data-automation-id="company"]');
      const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');

      if (titleEl) info.title = titleEl.innerText.trim();
      if (companyEl) info.company = companyEl.innerText.trim();
      if (descEl) info.description = descEl.innerText.trim();
    }

    // Generic fallback
    else {
      const h1 = document.querySelector('h1');
      if (h1) info.title = h1.innerText.trim();

      // Try common selectors
      const selectors = ['.job-description', '[class*="job-description"]', '[class*="jobDescription"]', 'article'];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 20) {
          info.description = el.innerText.trim();
          break;
        }
      }
    }

    respond(info);
    return true;
  }

  if (msg.type === 'GET_JOB_DESC') {
    // Legacy support
    const selectors = [
      '.jobs-description__content', '.jobs-description-content__text', '.jobs-box__html-content',
      '[data-automation-id="jobPostingDescription"]',
      '.job-description', '[class*="job-description"]', '[class*="jobDescription"]', 'article'
    ];
    let text = '';
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 20) {
        text = el.innerText.trim();
        break;
      }
    }
    if (!text) {
      const main = document.querySelector('main') || document.body;
      text = main.innerText.trim().substring(0, 5000);
    }
    respond({ description: text });
    return true;
  }
});
