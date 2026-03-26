// Simple API helper for your 3 pages.
// Change API_BASE if your backend runs on a different port.
const API_BASE = "http://localhost:5000/api";

function getToken() {
  // Your teammate can set this after login.
  // For now, this demo works without auth.
  return localStorage.getItem("token");
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  });
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: JSON.stringify(data || {})
  });
  return res.json();
}

async function apiUpload(path, file) {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: form
  });
  return res.json();
}
