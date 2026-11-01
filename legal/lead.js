(() => {
  const form = document.querySelector('form[data-lead-form], form.contact-grid');
  if (!form) return;

  form.setAttribute('action', '/api/lead');
  form.setAttribute('method', 'post');
  form.removeAttribute('enctype');

  const addHidden = (name, value) => {
    if (!value || form.elements.namedItem(name)) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  addHidden('source_url', location.href);
  addHidden('referrer', document.referrer);
  const query = new URLSearchParams(location.search);
  const serviceMap = {
    'AC-100': 'Contabilitate',
    'TX-200': 'Conformitate fiscală',
    'PR-300': 'Salarizare',
    'HR-310': 'HR administrare',
    'AD-400': 'Consultanță fiscală',
    'HR-500': 'Recrutare finance',
    'CF-600': 'CFO part-time'
  };
  const requestedService = serviceMap[query.get('serviciu')];
  const serviceSelect = form.elements.namedItem('Serviciu');
  if (requestedService && serviceSelect) serviceSelect.value = requestedService;
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    addHidden(key, query.get(key));
  });

  form.addEventListener('submit', () => {
    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.dataset.originalLabel = button.textContent;
      button.textContent = 'Se trimite…';
    }
  });
})();
