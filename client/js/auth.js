/* ============================================
   OptiGuard AI — Shared Auth Helper
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Get user from session
  const raw  = sessionStorage.getItem('optiUser');
  const user = raw ? JSON.parse(raw) : null;

  // If not logged in, redirect to login
  if (!user) {
    window.location.href = '/login';
    return;
  }

  // Expose globally
  window.optiUser = user;

  const name     = user.name  || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Sidebar avatar & name
  const avatarEl = document.getElementById('sidebarAvatar');
  const nameEl   = document.getElementById('sidebarName');
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl)   nameEl.textContent   = name;

  // Greeting on dashboard
  const helloEl = document.getElementById('hello');
  if (helloEl) {
    const hour  = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    helloEl.textContent = `${greet}, ${name.split(' ')[0]}! 👋`;
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('optiUser');
      window.location.href = '/login';
    });
  }

});