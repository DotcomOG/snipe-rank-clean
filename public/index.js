document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('urlInputModal');
  const urlInput = document.getElementById('urlInput');
  const submitBtn = document.getElementById('submitBtn');
  const loadingMessage = document.getElementById('loadingMessage');
  const resultContainer = document.getElementById('resultContainer');
  const contactForm = document.getElementById('contactForm');
  const fullReportForm = document.getElementById('fullReportForm');
  const fullReportContainer = document.getElementById('fullReportContainer');

  let currentURL = '';

  submitBtn.addEventListener('click', handleAnalyze);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  });

  function handleAnalyze() {
    const url = urlInput.value.trim();
    if (!url) return alert('Please enter a valid URL.');

    currentURL = url;

    modal.classList.add('hidden');
    loadingMessage.textContent = 'SnipeRank is analyzing. It may take up to a minute.';

    fetch(`/api/friendly?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        console.log('Analysis result:', data);
        renderReport(data);
      })
      .catch(err => {
        console.error('Error fetching analysis:', err);
        loadingMessage.textContent = 'Something went wrong. Please try again.';
      });
  }

  function renderReport(data) {
    loadingMessage.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    document.getElementById('resultUrl').textContent = `Analyzed URL: ${data.url || 'N/A'}`;
    document.getElementById('scoreValue').textContent = data.score ?? 'N/A';

    const superpowersList = document.getElementById('superpowersList');
    superpowersList.innerHTML = '';
    (data.superpowers || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      superpowersList.appendChild(li);
    });

    const opportunitiesList = document.getElementById('opportunitiesList');
    opportunitiesList.innerHTML = '';
    (data.opportunities || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      opportunitiesList.appendChild(li);
    });

    const aiInsightsList = document.getElementById('aiInsightsList');
    aiInsightsList.innerHTML = '';
    (data.insights || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      aiInsightsList.appendChild(li);
    });

    contactForm.classList.remove('hidden');
  }

  fullReportForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentURL) {
      alert('Please analyze a URL first.');
      return;
    }

    fullReportContainer.classList.remove('hidden');
    fullReportContainer.innerHTML = 'Loading full report...';

    fetch(`/api/full?url=${encodeURIComponent(currentURL)}`)
      .then(res => res.json())
      .then(data => {
        console.log('Full report:', data);
        displayFullReport(data);
      })
      .catch(err => {
        console.error('Error fetching full report:', err);
        fullReportContainer.innerHTML = 'There was a problem retrieving the full report.';
      });
  });

  function displayFullReport(data) {
    fullReportContainer.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">Full AI SEO Report</h2>
      <p class="mb-2"><strong>Score:</strong> ${data.score ?? 'N/A'}/100</p>
      <div class="mb-4">
        <h3 class="text-xl font-semibold mb-1">AI Superpowers</h3>
        <ul class="list-disc list-inside space-y-2">
          ${(data.superpowers || []).map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      <div class="mb-4">
        <h3 class="text-xl font-semibold mb-1">AI SEO Opportunities</h3>
        <ul class="list-disc list-inside space-y-2">
          ${(data.opportunities || []).map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      <div>
        <h3 class="text-xl font-semibold mb-1">AI Engine Insights</h3>
        <ul class="list-disc list-inside space-y-2">
          ${(data.insights || []).map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }
});
