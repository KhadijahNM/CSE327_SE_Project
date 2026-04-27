/* ── Session ── */
function getSessionUser() {
  try { return JSON.parse(sessionStorage.getItem('optiUser') || 'null'); }
  catch { sessionStorage.removeItem('optiUser'); return null; }
}

function requireSessionUser() {
  const user = getSessionUser();
  if (!user || !user.email) { window.location.href = '/login'; return null; }
  return user;
}

let allReports = [];

/* ── Load Reports ── */
async function loadReports() {
  const user = requireSessionUser();
  if (!user) return;

  try {
    const res = await fetch(`/api/scans/recent?email=${encodeURIComponent(user.email)}`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();

    allReports = (data || []).map(r => ({
      date: r.created_at || new Date().toISOString(),
      risk: r.risk_score || 0,
      status: r.risk_label || "Low",
      disease: r.disease || ""
    }));

    updateStats(allReports);
    createChart(allReports);
    showReports(allReports.slice(0, 5));

  } catch (err) {
    console.error(err);
  }
}

/* ── Stats ── */
function updateStats(data) {
  if (!data.length) return;
  const avg = (data.reduce((s, r) => s + r.risk, 0) / data.length).toFixed(1);
  document.getElementById("avgRisk").innerText = avg + "%";
  document.getElementById("totalScans").innerText = data.length;

  if (data.length >= 2) {
    const last = data[0].risk, prev = data[1].risk;
    document.getElementById("trendText").innerText =
      last > prev ? "↑ Rising" : last < prev ? "↓ Falling" : "→ Stable";
  }
}

/* ── Chart ── */
function createChart(data) {
  if (!data.length) return;
  const labels = data.map(r => new Date(r.date).toLocaleDateString());
  const risks  = data.map(r => r.risk);

  new Chart(document.getElementById("riskChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: risks,
        backgroundColor: risks.map(r => r >= 60 ? '#fde8e8' : r >= 35 ? '#fef3e2' : '#e8f8f0'),
        borderColor:     risks.map(r => r >= 60 ? '#e74c3c' : r >= 35 ? '#f39c12' : '#27ae60'),
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}

/* ── Show Reports ── */
function showReports(data) {
  const container = document.getElementById("reportsContainer");
  if (!data.length) {
    container.innerHTML = '<div class="no-reports">No scan reports yet.</div>';
    return;
  }

  container.innerHTML = data.map(r => {
    const level = (r.status || "low").toLowerCase();
    const badgeClass = level === "high" ? "badge-high" : level === "medium" ? "badge-medium" : "badge-low";
    const itemClass  = level === "high" ? "risk-high"  : level === "medium" ? "risk-medium"  : "risk-low";
    return `
      <div class="report-item ${itemClass}">
        <div class="report-left">
          <div class="report-disease">${r.disease || "Eye Scan"}</div>
          <div class="report-date">${new Date(r.date).toLocaleString()}</div>
        </div>
        <div class="report-right">
          <div class="risk-score">${r.risk}%</div>
          <span class="risk-badge ${badgeClass}">${r.status} Risk</span>
        </div>
      </div>`;
  }).join("");
}

document.getElementById("viewAllBtn").onclick = function() {
  showReports(allReports);
  this.style.display = "none";
};

requireSessionUser();
loadReports();

/* ── Chatbot ── */
function addMessage(text, type) {
  const log = document.getElementById('chatLog');
  const isBot = type === 'bot';
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;

  const formatted = isBot
    ? text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n/g, '<br>')
    : text;

  div.innerHTML = `
    <div class="chat-avatar">${isBot ? '👁' : 'U'}</div>
    <div class="chat-bubble">${formatted}</div>
  `;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function addTyping() {
  const log = document.getElementById('chatLog');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-avatar">👁</div>
    <div class="chat-bubble"><div class="typing"><span></span><span></span><span></span></div></div>
  `;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  addMessage(msg, 'user');
  input.value = '';
  document.getElementById('chatSend').disabled = true;
  addTyping();

  try {
    const res = await fetch('/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    const result = await res.json();
    document.getElementById('typingIndicator')?.remove();
    addMessage(result.reply || 'Sorry, I could not respond.', 'bot');
  } catch(e) {
    document.getElementById('typingIndicator')?.remove();
    addMessage('Connection error. Please try again.', 'bot');
  } finally {
    document.getElementById('chatSend').disabled = false;
  }
}

document.getElementById('chatSend').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChat();
});

// Initial bot message
addMessage("Hi! I'm OptiGuard's AI assistant. Ask me anything about your eye health or scan results.", 'bot');
