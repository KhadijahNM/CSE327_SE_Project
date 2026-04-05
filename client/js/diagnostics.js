const resultBox = document.getElementById("resultBox");

document.getElementById("uploadBtn").onclick = async () => {
  const file = document.getElementById("fileInput").files[0];
  const test = document.getElementById("testSelect").value;

  if (!file) {
    alert("Please select an image first.");
    return;
  }

  resultBox.innerHTML = "Scanning…";

  const res = await apiUpload(`/scans/upload?test=${encodeURIComponent(test)}`, file);

  if (!res.ok) {
    resultBox.innerHTML = `<b>Error:</b> ${res.error || "Unknown error"}`;
    return;
  }

  resultBox.innerHTML = `
    <h4 style="margin:0 0 8px 0;">Result</h4>
    <div><b>Test:</b> ${res.disease}</div>
    <div><b>Risk Score:</b> ${res.risk_score}%</div>
    <div><b>Risk Level:</b> ${res.risk_label}</div>
    
  `;
};

// Demo chatbot
document.getElementById("chatSend").onclick = async () => {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;

  addChat("You", msg);
  input.value = "";

  const res = await apiPost("/agents/chat", { message: msg });
  addChat("OptiGuard", res.reply || "Sorry, I couldn't answer.");
};

function addChat(who, text) {
  const log = document.getElementById("chatLog");
  const div = document.createElement("div");
  div.className = "chatmsg";
  div.innerHTML = `<b>${who}:</b> ${escapeHtml(text)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
