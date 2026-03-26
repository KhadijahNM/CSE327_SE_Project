async function loadDashboard() {
  const me = await apiGet("/me");
  document.getElementById("hello").innerText = `Hello, ${me.name || "User"}`;

  const latest = await apiGet("/scans/latest");
  const latestBadge = document.getElementById("latestBadge");
  const riskText = document.getElementById("riskText");
  const riskNote = document.getElementById("riskNote");

  if (!latest || !latest.risk_label) {
    latestBadge.innerText = "No scans";
    riskText.innerText = "No scan yet";
    riskNote.innerText = "Go to Diagnostics to run your first scan.";
  } else {
    latestBadge.innerText = latest.risk_label;
    riskText.innerText = `${latest.risk_score}%`;
    riskNote.innerText = `Test: ${latest.disease}. This is a screening score, not a diagnosis.`;
  }

  const usage = await apiGet("/usage/today");
  const usageBadge = document.getElementById("usageBadge");
  const usageText = document.getElementById("usageText");

  if (usage && typeof usage.minutes === "number") {
    const h = Math.floor(usage.minutes / 60);
    const m = usage.minutes % 60;
    usageBadge.innerText = "Today";
    usageText.innerText = `${h}h ${m}m`;
  } else {
    usageBadge.innerText = "—";
    usageText.innerText = "No data";
  }

  const reports = await apiGet("/scans/recent");
  const wrap = document.getElementById("reports");

  // Keep header row, then add rows.
  const header = wrap.querySelector(".row.header");
  wrap.innerHTML = "";
  wrap.appendChild(header);

  if (!reports || reports.length === 0) {
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML = `<div class="muted">No reports yet</div><div></div><div></div>`;
    wrap.appendChild(r);
    return;
  }

  reports.forEach(rep => {
    const row = document.createElement("div");
    row.className = "row";
    const date = new Date(rep.created_at || Date.now()).toLocaleString();
    row.innerHTML = `<div>${date}</div><div>${rep.disease}</div><div><b>${rep.risk_score}%</b> (${rep.risk_label})</div>`;
    wrap.appendChild(row);
  });
}

document.getElementById("takeBreakBtn").onclick = async () => {
  alert("20-20-20 reminder: Look 20 feet away for 20 seconds 🌿");
  await apiPost("/usage/break", { type: "20-20-20" });
};

document.getElementById("logoutBtn").onclick = () => {
  // Demo logout. Your teammate can replace this with real flow.
  localStorage.removeItem("token");
  alert("Demo logout: token removed from localStorage.");
};

loadDashboard();
