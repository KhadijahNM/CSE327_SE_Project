const amountEl = document.getElementById("amount");
const donateMsg = document.getElementById("donateMsg");

document.querySelectorAll("[data-quick]").forEach(btn => {
  btn.addEventListener("click", () => {
    amountEl.value = btn.getAttribute("data-quick");
  });
});

document.getElementById("donateBtn").onclick = async () => {
  const amount = Number(amountEl.value);
  if (!amount || amount <= 0) {
    alert("Enter a valid amount.");
    return;
  }

  donateMsg.innerText = "Saving donation…";

  const res = await apiPost("/donations", { amount, currency: "BDT" });
  if (res.ok) {
    donateMsg.innerText = "Thank you! Donation recorded (demo).";
  } else {
    donateMsg.innerText = `Error: ${res.error || "Could not save donation."}`;
  }
};
