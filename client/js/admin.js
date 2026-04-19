let users = [];
let reports = [];
let activityChart;
let roleChart;
let reportChart;
let isEditing = false;

function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem('optiAdmin') || 'null');
  } catch (error) {
    sessionStorage.removeItem('optiAdmin');
    return null;
  }
}

function requireAdminSession() {
  const admin = getAdminSession();
  if (!admin || !admin.email) {
    window.location.href = '/login';
    return null;
  }
  return admin;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function authHeaders() {
  const admin = requireAdminSession();
  return admin ? { 'x-admin-email': admin.email } : {};
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function normaliseLabel(value) {
  return (value || '').replace(/^\w/, char => char.toUpperCase());
}

function renderUsers(list) {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
    return;
  }

  list.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.fullName || user.name || 'Unnamed User'}</td>
      <td>${user.email}</td>
      <td><span class="badge role-${user.role}">${normaliseLabel(user.role)}</span></td>
      <td><span class="badge status-${user.status}">${normaliseLabel(user.status)}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="mini-btn" data-action="edit" data-id="${user.id}">Edit</button>
          <button class="mini-btn danger" data-action="delete" data-id="${user.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterUsers() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = users.filter(user => {
    const matchesQuery = !query || [user.fullName, user.name, user.email].some(value => String(value || '').toLowerCase().includes(query));
    const matchesRole = !role || user.role === role;
    const matchesStatus = !status || user.status === status;
    return matchesQuery && matchesRole && matchesStatus;
  });

  renderUsers(filtered);
}

function buildMonthlyCounts(items, key) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const counts = new Map();

  items.forEach(item => {
    const date = new Date(item[key]);
    if (Number.isNaN(date.getTime())) return;
    const monthIndex = date.getMonth();
    counts.set(monthIndex, (counts.get(monthIndex) || 0) + 1);
  });

  return {
    labels: Array.from({ length: 12 }, (_, index) => formatter.format(new Date(2026, index, 1))),
    values: Array.from({ length: 12 }, (_, index) => counts.get(index) || 0)
  };
}

function renderCharts() {
  const userCounts = buildMonthlyCounts(users, 'createdAt');
  const reportCounts = buildMonthlyCounts(reports, 'created_at');
  const roles = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});

  if (activityChart) activityChart.destroy();
  if (roleChart) roleChart.destroy();
  if (reportChart) reportChart.destroy();

  activityChart = new Chart(document.getElementById('userActivityChart'), {
    type: 'line',
    data: {
      labels: userCounts.labels,
      datasets: [{
        label: 'New users',
        data: userCounts.values,
        borderColor: '#0b7adf',
        backgroundColor: 'rgba(11, 122, 223, 0.15)',
        tension: 0.35,
        fill: true
      }]
    }
  });

  roleChart = new Chart(document.getElementById('roleDistributionChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(roles).map(normaliseLabel),
      datasets: [{
        data: Object.values(roles),
        backgroundColor: ['#0b7adf', '#1f9d68', '#d64545']
      }]
    }
  });

  reportChart = new Chart(document.getElementById('reportActivityChart'), {
    type: 'bar',
    data: {
      labels: reportCounts.labels,
      datasets: [{
        label: 'Generated reports',
        data: reportCounts.values,
        backgroundColor: '#153860'
      }]
    }
  });
}

async function fetchUsers() {
  const res = await fetch('/api/admin/users', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.message || 'Failed to fetch users.');
  users = data.users;
  filterUsers();
}

async function fetchStats() {
  const res = await fetch('/api/admin/stats', { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.message || 'Failed to fetch stats.');
  reports = data.reports || [];
  renderCharts();
}

function openDialog(user = null) {
  isEditing = !!user;
  document.getElementById('dialogTitle').textContent = user ? 'Edit User' : 'Add User';
  document.getElementById('saveUserBtn').textContent = user ? 'Update User' : 'Save User';
  document.getElementById('userId').value = user?.id || '';
  document.getElementById('userFullName').value = user?.fullName || user?.name || '';
  document.getElementById('userDisplayName').value = user?.displayName || '';
  document.getElementById('userEmail').value = user?.email || '';
  document.getElementById('userRole').value = user?.role || 'user';
  document.getElementById('userStatus').value = user?.status || 'active';
  document.getElementById('userPassword').value = 'ChangeMe123!';
  document.getElementById('passwordField').style.display = user ? 'none' : 'grid';
  document.getElementById('userDialog').showModal();
}

function closeDialog() {
  document.getElementById('userDialog').close();
}

async function submitUserForm(event) {
  event.preventDefault();

  const id = document.getElementById('userId').value;
  const payload = {
    fullName: document.getElementById('userFullName').value.trim(),
    displayName: document.getElementById('userDisplayName').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    role: document.getElementById('userRole').value,
    status: document.getElementById('userStatus').value
  };

  if (!payload.fullName || !payload.email) {
    showToast('Name and email are required.');
    return;
  }

  if (!isEditing) {
    payload.password = document.getElementById('userPassword').value.trim() || 'ChangeMe123!';
  }

  const res = await fetch(isEditing ? `/api/admin/users/${id}` : '/api/admin/users', {
    method: isEditing ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (!res.ok || !data.ok) {
    showToast(data.message || 'Failed to save user.');
    return;
  }

  closeDialog();
  showToast(data.message || 'User saved.');
  await refreshAdminData();
}

async function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const user = users.find(item => item.id === Number(button.dataset.id));
  if (!user) return;

  if (button.dataset.action === 'edit') {
    openDialog(user);
    return;
  }

  if (button.dataset.action === 'delete') {
    const confirmed = window.confirm(`Delete ${user.fullName || user.email}? This cannot be undone.`);
    if (!confirmed) return;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast(data.message || 'Failed to delete user.');
      return;
    }

    showToast(data.message || 'User deleted.');
    await refreshAdminData();
  }
}

async function refreshAdminData() {
  await fetchUsers();
  await fetchStats();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.id === tabId));
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
}

function initAdminMeta() {
  const admin = requireAdminSession();
  if (!admin) return;

  const name = admin.fullName || admin.name || 'Admin';
  document.getElementById('adminName').textContent = name;
  document.getElementById('adminEmail').textContent = admin.email;
  document.getElementById('adminAvatar').textContent = name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

document.querySelectorAll('.nav-btn').forEach(button => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

document.getElementById('searchInput').addEventListener('input', filterUsers);
document.getElementById('roleFilter').addEventListener('change', filterUsers);
document.getElementById('statusFilter').addEventListener('change', filterUsers);
document.getElementById('addUserBtn').addEventListener('click', () => openDialog());
document.getElementById('closeDialogBtn').addEventListener('click', closeDialog);
document.getElementById('cancelDialogBtn').addEventListener('click', closeDialog);
document.getElementById('userForm').addEventListener('submit', submitUserForm);
document.querySelector('#userTable tbody').addEventListener('click', handleTableClick);
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('optiAdmin');
  window.location.href = '/login';
});

initAdminMeta();
refreshAdminData().catch(error => {
  console.error(error);
  showToast(error.message || 'Could not load admin dashboard.');
});
