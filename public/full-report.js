document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url');
  const name = params.get('name');
  const email = params.get('email');

  const reportContent = document.getElementById('reportContent');
  const loadingMessage = document.getElementById('loadingMessage');

  const resultUrl = document.getElementById('fullResultUrl');
  const scoreEl = document.getElementById('fullScore');
  const superpowersList = document.getElementById('fullSuperpowers');
  const opportunitiesList = document.getElementById('fullOpportunities');
  const insightsList = document.getElementById('fullInsights');

  const nameInput = document.getElementById('followupName');
  const emailInput = document.getElementById('followupEmail');

  if (nameInput) nameInput.value = name || '';
  if (emailInput) emailInput.value = email || '';

  if (!url) {
    loadingMessage.textContent = 'Error: No URL provided.';
    return;
  }

  fetch(`/api/full?url=${encodeURIComponent(url)}`)
    .then(res => res.json())
    .then(data => {
      loadingMessage.classList.add('hidden');
      reportContent.classList.remove('hidden');

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
    })
    .catch(err => {
      console.error('Error fetching full report:', err);
      loadingMessage.textContent = 'There was a problem retrieving the full report.';
    });
});
