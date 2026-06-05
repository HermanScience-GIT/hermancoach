const loginCard = document.querySelector("#login-card");
const codeCard = document.querySelector("#code-card");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const codeForm = document.querySelector("#code-form");
const periodForm = document.querySelector("#period-form");
const logoutButton = document.querySelector("#logout-button");
const drawButton = document.querySelector("#draw-button");
const downloadLink = document.querySelector("#download-link");
const statusLine = document.querySelector("#status-line");
const entriesList = document.querySelector("#entries-list");
const winnerOutput = document.querySelector("#winner-output");

const adminEmailInput = document.querySelector("#admin-email");
const adminPasswordInput = document.querySelector("#admin-password");
const adminCodeInput = document.querySelector("#admin-code");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");

let pendingEmail = "";

function setStatus(message) {
  statusLine.textContent = message || "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }
  return payload;
}

function showApp() {
  loginCard.hidden = true;
  codeCard.hidden = true;
  adminApp.hidden = false;
  logoutButton.hidden = false;
}

function showLogin() {
  loginCard.hidden = false;
  codeCard.hidden = true;
  adminApp.hidden = true;
  logoutButton.hidden = true;
}

function queryString() {
  const params = new URLSearchParams();
  if (startDateInput.value) {
    params.set("startDate", startDateInput.value);
  }
  if (endDateInput.value) {
    params.set("endDate", endDateInput.value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function loadEntries() {
  setStatus("Loading entries...");
  const query = queryString();
  downloadLink.href = `/api/admin/entries.csv${query}`;
  const payload = await api(`/api/admin/entries${query}`);
  renderStats(payload.stats);
  renderEntries(payload.entries);
  setStatus(`Loaded ${payload.stats.total} entries.`);
}

function renderStats(stats) {
  document.querySelector("#stat-total").textContent = stats.total;
  document.querySelector("#stat-confirmed").textContent = stats.confirmed;
  document.querySelector("#stat-eligible").textContent = stats.eligible;
  document.querySelector("#stat-winners").textContent = stats.winners;
}

function renderEntries(entries) {
  if (!entries.length) {
    entriesList.innerHTML = `<article class="entry-card"><p class="prompt-text">No entries found for this period.</p></article>`;
    return;
  }
  entriesList.innerHTML = entries.map(renderEntry).join("");
}

function renderEntry(entry) {
  const name = `${escapeHtml(entry.contact.firstName)} ${escapeHtml(entry.contact.lastName)}`;
  const statusClass = entry.status === "eligible" ? "success" : "danger";
  const confirmationClass = entry.emailConfirmed ? "success" : "danger";
  const winnerPill = entry.winnerSelectedAt ? `<span class="pill success">Winner</span>` : "";
  const actionButton =
    entry.status === "eligible"
      ? `<button class="danger-button" data-action="disqualify" data-id="${entry.id}" type="button">Disqualify</button>`
      : `<button data-action="requalify" data-id="${entry.id}" type="button">Requalify</button>`;

  return `
    <article class="entry-card">
      <div class="entry-meta">
        <strong>${entry.overallScore}/100</strong>
        <span>${name}</span>
        <span>${escapeHtml(entry.contact.email)}</span>
        <span>${new Date(entry.createdAt).toLocaleString()}</span>
        <div class="pill-row">
          <span class="pill ${statusClass}">${entry.status}</span>
          <span class="pill ${confirmationClass}">${entry.emailConfirmed ? "Confirmed" : "Unconfirmed"}</span>
          ${entry.canWin ? `<span class="pill success">Can win</span>` : ""}
          ${winnerPill}
        </div>
      </div>
      <p class="prompt-text">${escapeHtml(entry.promptText)}</p>
      <div class="entry-actions">
        <textarea data-reason="${entry.id}" placeholder="Disqualification reason">${escapeHtml(
          entry.disqualifiedReason || "",
        )}</textarea>
        ${actionButton}
      </div>
    </article>
  `;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  button.disabled = true;
  setStatus("Sending login code...");
  try {
    const payload = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        email: adminEmailInput.value,
        password: adminPasswordInput.value,
      }),
    });
    pendingEmail = payload.email;
    loginCard.hidden = true;
    codeCard.hidden = false;
    adminCodeInput.focus();
    setStatus("Check email for the admin code.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

codeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = codeForm.querySelector("button");
  button.disabled = true;
  setStatus("Verifying code...");
  try {
    await api("/api/admin/verify", {
      method: "POST",
      body: JSON.stringify({
        email: pendingEmail || adminEmailInput.value,
        code: adminCodeInput.value,
      }),
    });
    showApp();
    await loadEntries();
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

periodForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadEntries().catch((error) => setStatus(error.message));
});

logoutButton.addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" }).catch(() => {});
  showLogin();
  setStatus("Logged out.");
});

drawButton.addEventListener("click", async () => {
  drawButton.disabled = true;
  setStatus("Drawing winner...");
  try {
    const winner = await api("/api/admin/draw-winner", {
      method: "POST",
      body: JSON.stringify({
        startDate: startDateInput.value,
        endDate: endDateInput.value,
      }),
    });
    winnerOutput.textContent = `${winner.winner.contact.firstName} ${winner.winner.contact.lastName} (${winner.winner.contact.email}) won from ${winner.eligibleCount} eligible entries.`;
    await loadEntries();
  } catch (error) {
    setStatus(error.message);
  } finally {
    drawButton.disabled = false;
  }
});

entriesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const submissionId = button.dataset.id;
  const action = button.dataset.action;
  const reason = document.querySelector(`[data-reason="${submissionId}"]`)?.value || "";
  button.disabled = true;
  try {
    await api(`/api/admin/submissions/${submissionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: action === "disqualify" ? "disqualified" : "eligible",
        reason,
      }),
    });
    await loadEntries();
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

api("/api/admin/me")
  .then(async () => {
    showApp();
    await loadEntries();
  })
  .catch(() => {
    showLogin();
  });

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
