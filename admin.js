let users = [];

// Switch tabs
function showTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');

  if (tabId === 'reportsTab') {
    renderCharts();
  }
}

// Render user table
function renderUsers(list) {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
    return;
  }
  list.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.status}</td>
      <td>
        <button onclick="editUser(${user.id})">Edit</button>
        <button onclick="deleteUser(${user.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Add user (calls backend)
async function openAddUserForm() {
  const name = prompt("Enter name:");
  const email = prompt("Enter email:");
  const role = prompt("Enter role (Admin/User):");
  const status = prompt("Enter status (Active/Inactive):");
  if (name && email) {
    await fetch("http://localhost:5000/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, status })
    });
    fetchUsers(); // reload from DB
  }
}

// Edit user (calls backend)
async function editUser(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;
  const name = prompt("Enter new name:", user.name) || user.name;
  const email = prompt("Enter new email:", user.email) || user.email;
  const role = prompt("Enter new role:", user.role) || user.role;
  const status = prompt("Enter new status:", user.status) || user.status;

  await fetch(`http://localhost:5000/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, role, status })
  });
  fetchUsers();
}

// Delete user (calls backend)
async function deleteUser(id) {
  await fetch(`http://localhost:5000/api/users/${id}`, { method: "DELETE" });
  fetchUsers();
}

// Apply filters
function applyFilters() {
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;

  let filtered = users;
  if (role) filtered = filtered.filter(u => u.role === role);
  if (status) filtered = filtered.filter(u => u.status === status);

  renderUsers(filtered);
}

// --- Reports Charts ---
let statsChart;
let activityChart;

function renderCharts() {
  const actx = document.getElementById('userActivityChart')?.getContext('2d');
  if (actx) {
    if (activityChart) activityChart.destroy();
    activityChart = new Chart(actx, {
      type: 'line',
      data: {
        labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        datasets: [{
          label: 'User Activity',
          data: [5, 10, 7, 12, 8, 15, 9, 11, 14, 6, 13, 10], // placeholder
          borderColor: '#007bff'
        }]
      }
    });
  }

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  const ctx = document.getElementById('roleDistributionChart')?.getContext('2d');
  if (ctx) {
    if (statsChart) statsChart.destroy();
    statsChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(roleCounts),
        datasets: [{
          data: Object.values(roleCounts),
          backgroundColor: ['#007bff','#28a745','#ffc107']
        }]
      }
    });
  }
}

// Fetch users from backend
async function fetchUsers() {
  const res = await fetch("http://localhost:5000/api/users");
  users = await res.json();
  renderUsers(users);
  renderCharts();
}

// Initialize
window.onload = fetchUsers;
