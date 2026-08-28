const loginCard = document.querySelector("#login-card");
const codeCard = document.querySelector("#code-card");
const adminApp = document.querySelector("#admin-app");
const loginForm = document.querySelector("#login-form");
const codeForm = document.querySelector("#code-form");
const periodForm = document.querySelector("#period-form");
const logoutButton = document.querySelector("#logout-button");
const adminSession = document.querySelector("#admin-session");
const adminIdentity = document.querySelector("#admin-identity");
const drawButton = document.querySelector("#draw-button");
const downloadLink = document.querySelector("#download-link");
const statusLine = document.querySelector("#status-line");
const entriesList = document.querySelector("#entries-list");
const winnerOutput = document.querySelector("#winner-output");
const adminTabs = document.querySelector(".admin-tabs");
const contestPanel = document.querySelector("#contest-panel");
const adminsPanel = document.querySelector("#admins-panel");
const requiredPasswordNotice = document.querySelector("#required-password-notice");
const superAdminTools = document.querySelector("#super-admin-tools");
const adminList = document.querySelector("#admin-list");
const changePasswordForm = document.querySelector("#change-password-form");
const addAdminForm = document.querySelector("#add-admin-form");

const adminEmailInput = document.querySelector("#admin-email");
const adminPasswordInput = document.querySelector("#admin-password");
const adminCodeInput = document.querySelector("#admin-code");
const startDateInput = document.querySelector("#start-date");
const endDateInput = document.querySelector("#end-date");
const currentPasswordInput = document.querySelector("#current-password");
const newPasswordInput = document.querySelector("#new-password");
const confirmPasswordInput = document.querySelector("#confirm-password");
const newAdminEmailInput = document.querySelector("#new-admin-email");
const temporaryPasswordInput = document.querySelector("#temporary-password");
const newAdminSuperInput = document.querySelector("#new-admin-super");

let pendingEmail = "";
let currentAdmin = null;

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

function showApp(admin) {
  currentAdmin = admin;
  loginCard.hidden = true;
  codeCard.hidden = true;
  adminApp.hidden = false;
  adminSession.hidden = false;
  adminIdentity.textContent = `${admin.email}${admin.isSuperAdmin ? " · Super admin" : ""}`;
  requiredPasswordNotice.hidden = !admin.mustChangePassword;
  superAdminTools.hidden = !admin.isSuperAdmin || admin.mustChangePassword;
  const contestTab = adminTabs.querySelector('[data-panel="contest-panel"]');
  contestTab.disabled = admin.mustChangePassword;
  if (admin.mustChangePassword) {
    switchPanel("admins-panel");
  } else {
    switchPanel("contest-panel");
  }
}

function showLogin() {
  currentAdmin = null;
  loginCard.hidden = false;
  codeCard.hidden = true;
  adminApp.hidden = true;
  adminSession.hidden = true;
}

function switchPanel(panelId) {
  if (panelId === "contest-panel" && currentAdmin?.mustChangePassword) {
    setStatus("Change your temporary password to continue.");
    return;
  }
  contestPanel.hidden = panelId !== "contest-panel";
  adminsPanel.hidden = panelId !== "admins-panel";
  adminTabs.querySelectorAll("[data-panel]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panelId);
  });
  if (panelId === "admins-panel" && currentAdmin?.isSuperAdmin && !currentAdmin.mustChangePassword) {
    setStatus("");
    loadAdmins().catch((error) => setStatus(error.message));
  }
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
    const payload = await api("/api/admin/verify", {
      method: "POST",
      body: JSON.stringify({
        email: pendingEmail || adminEmailInput.value,
        code: adminCodeInput.value,
      }),
    });
    showApp(payload.admin);
    if (!payload.admin.mustChangePassword) {
      await loadEntries();
    } else {
      setStatus("Change your temporary password to continue.");
    }
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

adminTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-panel]");
  if (button) {
    switchPanel(button.dataset.panel);
  }
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

changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (newPasswordInput.value !== confirmPasswordInput.value) {
    setStatus("New password and confirmation do not match.");
    return;
  }
  const button = changePasswordForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus("Changing password...");
  try {
    const payload = await api("/api/admin/password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: currentPasswordInput.value,
        newPassword: newPasswordInput.value,
      }),
    });
    changePasswordForm.reset();
    showApp(payload.admin);
    switchPanel("admins-panel");
    setStatus("Password changed successfully.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

addAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = addAdminForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus("Adding administrator...");
  try {
    await api("/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({
        email: newAdminEmailInput.value,
        temporaryPassword: temporaryPasswordInput.value,
        isSuperAdmin: newAdminSuperInput.checked,
      }),
    });
    addAdminForm.reset();
    await loadAdmins();
    setStatus("Administrator added. Share the temporary password securely.");
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

adminList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-admin-action]");
  if (!button) {
    return;
  }
  const adminId = button.dataset.adminId;
  const action = button.dataset.adminAction;
  button.disabled = true;
  try {
    if (action === "role") {
      await api(`/api/admin/accounts/${adminId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ isSuperAdmin: button.dataset.superAdmin === "true" }),
      });
      setStatus("Super admin designation updated.");
    } else if (action === "remove") {
      const email = button.dataset.adminEmail;
      if (!window.confirm(`Remove administrator access for ${email}?`)) {
        return;
      }
      await api(`/api/admin/accounts/${adminId}`, { method: "DELETE" });
      setStatus(`${email} was removed.`);
    }
    await loadAdmins();
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});

async function loadAdmins() {
  const payload = await api("/api/admin/accounts");
  renderAdmins(payload.admins);
}

function renderAdmins(admins) {
  adminList.innerHTML = admins
    .map((admin) => {
      const isCurrent = admin.id === currentAdmin.id;
      const labels = [
        admin.isSuperAdmin ? '<span class="pill success">Super admin</span>' : '<span class="pill">Admin</span>',
        admin.isPermanent ? '<span class="pill success">Permanent</span>' : "",
        admin.mustChangePassword ? '<span class="pill">Temporary password</span>' : "",
      ].join("");
      const actions =
        admin.isPermanent || isCurrent
          ? ""
          : `<div class="admin-account-actions">
              <button
                class="ghost-button"
                data-admin-action="role"
                data-admin-id="${admin.id}"
                data-super-admin="${!admin.isSuperAdmin}"
                type="button"
              >${admin.isSuperAdmin ? "Remove super admin" : "Make super admin"}</button>
              <button
                class="danger-button"
                data-admin-action="remove"
                data-admin-id="${admin.id}"
                data-admin-email="${escapeHtml(admin.email)}"
                type="button"
              >Remove</button>
            </div>`;
      return `<article class="admin-account">
        <div>
          <strong>${escapeHtml(admin.email)}${isCurrent ? " (you)" : ""}</strong>
          <div class="pill-row">${labels}</div>
          <small>Added ${new Date(admin.createdAt).toLocaleDateString()}${
            admin.lastLoginAt ? ` · Last login ${new Date(admin.lastLoginAt).toLocaleString()}` : " · Never logged in"
          }</small>
        </div>
        ${actions}
      </article>`;
    })
    .join("");
}

api("/api/admin/me")
  .then(async (payload) => {
    showApp(payload.admin);
    if (!payload.admin.mustChangePassword) {
      await loadEntries();
    }
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
