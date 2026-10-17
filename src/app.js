let dataset = null;
let employees = [];

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function countBy(list, field) {
  return list.reduce((acc, item) => {
    const key = String(item[field] || 'Not specified').trim() || 'Not specified';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortedEntries(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

function isActive(status) {
  const s = String(status || '').trim().toLowerCase();
  return ['active', 'employed', 'current', 'working', 'permanent', 'probation'].includes(s) || !s;
}

function calculateAverageTenure(list) {
  const today = new Date();
  const years = list.map(e => {
    const d = new Date(e.joinDate);
    if (Number.isNaN(d.getTime()) || d > today) return null;
    return (today - d) / (365.25 * 24 * 60 * 60 * 1000);
  }).filter(v => v !== null);
  if (!years.length) return 0;
  return years.reduce((a, b) => a + b, 0) / years.length;
}

function renderBars(elementId, entries, maxItems = 8) {
  const el = $(elementId);
  const shown = entries.slice(0, maxItems);
  const max = shown.length ? Math.max(...shown.map(x => x[1])) : 1;
  el.innerHTML = shown.length ? shown.map(([label, value]) => `
    <div class="bar-row">
      <span title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (value / max) * 100)}%"></div></div>
      <strong>${value}</strong>
    </div>`).join('') : '<p>No data available.</p>';
}

function renderSummary(elementId, entries) {
  const el = $(elementId);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  el.innerHTML = entries.length ? entries.map(([label, value]) => `
    <div class="summary-row">
      <div class="summary-label"><span class="dot"></span><span>${escapeHtml(label)}</span></div>
      <strong>${value} <small>(${Math.round(value / total * 100)}%)</small></strong>
    </div>`).join('') : '<p>No data available.</p>';
}

function renderDashboard() {
  const active = employees.filter(e => isActive(e.status));
  const departments = Object.keys(countBy(employees, 'department')).filter(x => x !== 'Not specified');

  $('kpiTotal').textContent = employees.length;
  $('kpiActive').textContent = active.length;
  $('kpiDepartments').textContent = departments.length;
  $('kpiTenure').textContent = `${calculateAverageTenure(employees).toFixed(1)} yrs`;
  $('sourceFile').textContent = dataset?.sourceFile || 'Local data';
  $('importedAt').textContent = dataset?.importedAt ? new Date(dataset.importedAt).toLocaleString() : '—';

  renderBars('departmentChart', sortedEntries(countBy(employees, 'department')));
  renderSummary('statusSummary', sortedEntries(countBy(employees, 'status')));
  renderSummary('genderSummary', sortedEntries(countBy(employees, 'gender')));

  const joinersByYear = {};
  employees.forEach(e => {
    const d = new Date(e.joinDate);
    if (!Number.isNaN(d.getTime())) {
      const y = String(d.getFullYear());
      joinersByYear[y] = (joinersByYear[y] || 0) + 1;
    }
  });
  renderBars('joinerChart', Object.entries(joinersByYear).sort((a, b) => Number(a[0]) - Number(b[0])), 12);

  $('snapshotTableBody').innerHTML = employees.slice(0, 8).map(employeeRowCompact).join('');
}

function statusBadge(status) {
  const cls = isActive(status) ? 'badge active' : 'badge';
  return `<span class="${cls}">${escapeHtml(status || 'Not specified')}</span>`;
}

function employeeRowCompact(e) {
  return `<tr>
    <td>${escapeHtml(e.employeeId)}</td>
    <td><strong>${escapeHtml(e.name)}</strong></td>
    <td>${escapeHtml(e.department)}</td>
    <td>${escapeHtml(e.designation)}</td>
    <td>${statusBadge(e.status)}</td>
    <td>${escapeHtml(e.location)}</td>
  </tr>`;
}

function employeeRowFull(e) {
  return `<tr>
    <td>${escapeHtml(e.employeeId)}</td>
    <td><strong>${escapeHtml(e.name)}</strong></td>
    <td>${escapeHtml(e.department)}</td>
    <td>${escapeHtml(e.designation)}</td>
    <td>${escapeHtml(e.joinDate)}</td>
    <td>${statusBadge(e.status)}</td>
    <td>${escapeHtml(e.location)}</td>
    <td>${escapeHtml(e.manager)}</td>
    <td>${escapeHtml(e.email)}</td>
  </tr>`;
}

function uniqueValues(field) {
  return [...new Set(employees.map(e => String(e[field] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  const setOptions = (id, values, label) => {
    const select = $(id);
    select.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  };
  setOptions('departmentFilter', uniqueValues('department'), 'All departments');
  setOptions('statusFilter', uniqueValues('status'), 'All statuses');
  setOptions('locationFilter', uniqueValues('location'), 'All locations');
}

function renderEmployees() {
  const search = $('employeeSearch').value.trim().toLowerCase();
  const dept = $('departmentFilter').value;
  const status = $('statusFilter').value;
  const location = $('locationFilter').value;

  const filtered = employees.filter(e => {
    const haystack = [e.employeeId, e.name, e.department, e.designation, e.email, e.manager, e.location].join(' ').toLowerCase();
    return (!search || haystack.includes(search)) &&
      (!dept || e.department === dept) &&
      (!status || e.status === status) &&
      (!location || e.location === location);
  });

  $('resultCount').textContent = `${filtered.length} employee${filtered.length === 1 ? '' : 's'}`;
  $('employeeTableBody').innerHTML = filtered.map(employeeRowFull).join('');
}

function switchView(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  const target = view === 'employees' ? $('employeesView') : $('dashboardView');
  target.classList.add('active-view');
  $('pageTitle').textContent = view === 'employees' ? 'Employees' : 'HR Overview';
  $('pageSubtitle').textContent = view === 'employees'
    ? 'Search and filter the employee directory.'
    : 'Workforce metrics generated from your imported HR data.';
  if (view === 'employees') renderEmployees();
}

function applyDataset(data) {
  dataset = data;
  employees = Array.isArray(data?.employees) ? data.employees : [];
  const hasData = employees.length > 0;
  $('emptyState').classList.toggle('hidden', hasData);
  $('appContent').classList.toggle('hidden', !hasData);
  if (hasData) {
    renderDashboard();
    populateFilters();
    renderEmployees();
  }
}

async function importData() {
  const result = await window.hrAPI.importFile();
  if (!result || result.canceled) return;
  if (result.error) {
    showToast(`Import failed: ${result.error}`);
    return;
  }
  applyDataset(result);
  switchView('dashboard');
  showToast(`Imported ${result.employees.length} employee records.`);
}

async function clearData() {
  if (!dataset || !employees.length) return;
  if (!confirm('Clear the locally stored HR dataset from this PC?')) return;
  const result = await window.hrAPI.clearLocalData();
  if (result.success) {
    dataset = null;
    employees = [];
    applyDataset(null);
    showToast('Local HR data cleared.');
  } else {
    showToast(`Could not clear data: ${result.error || 'Unknown error'}`);
  }
}

$('importBtn').addEventListener('click', importData);
$('emptyImportBtn').addEventListener('click', importData);
$('clearDataBtn').addEventListener('click', clearData);
$('showAllEmployeesBtn').addEventListener('click', () => switchView('employees'));

document.querySelectorAll('.nav-item[data-view]').forEach(button => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

['employeeSearch', 'departmentFilter', 'statusFilter', 'locationFilter'].forEach(id => {
  $(id).addEventListener(id === 'employeeSearch' ? 'input' : 'change', renderEmployees);
});

(async function init() {
  const local = await window.hrAPI.loadLocalData();
  if (local && !local.error && Array.isArray(local.employees) && local.employees.length) {
    applyDataset(local);
  } else {
    applyDataset(null);
  }
})();
