// full-report.js — Last updated: 2025-06-02 19:25 ET

document.addEventListener('DOMContentLoaded', () => {
  const url = new URLSearchParams(window.location.search).get('url');
  const resultUrl = document.getElementById('fullResultUrl');
  const scoreEl = document.getElementById('fullScore');
  const superpowersList = document.getElementById('fullSuperpowers');
  const opportunitiesList = document.getElementById('fullOpportunities');
  const insightsList = document.getElementById('fullInsights');
  const contactForm = document.getElementById('fullContactForm');

  if (!url) {
    resultUrl.textContent = 'No URL provided.';
    return;
  }

  fetch(`/api/full?url=${encodeURIComponent(url)}`)
    .then(res => res.json())
    .then(data => {
      resultUrl.textContent = `Analyzed URL: ${data.url || url}`;
      scoreEl.textContent = `Overall Score: ${data.score ?? 'N/A'}/100`;

      superpowersList.innerHTML = '';
      (data.superpowers || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        superpowersList.appendChild(li);
      });

      opportunitiesList.innerHTML = '';
      (data.opportunities || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        opportunitiesList.appendChild(li);
      });

      insightsList.innerHTML = '';
      (data.insights || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        insightsList.appendChild(li);
      });

      contactForm.classList.remove('hidden');
    })
    .catch(err => {
      console.error('Failed to load full report:', err);
      resultUrl.textContent = 'Error fetching report. Please try again.';
    });
});

