const screens = Array.from(document.querySelectorAll("[data-screen]"));
const promptForm = document.querySelector("#prompt-form");
const contactForm = document.querySelector("#contact-form");
const promptInput = document.querySelector("#prompt-input");
const charCount = document.querySelector("#char-count");
const backResultsButton = document.querySelector("#back-results");
const copyPromptButton = document.querySelector("#copy-prompt");
const draftInput = document.querySelector("#draft-input");
const toast = document.querySelector("#toast");
const scoreScreen = document.querySelector('[data-screen="score"]');
const coachScreen = document.querySelector('[data-screen="coach"]');
const scoreHero = document.querySelector(".score-hero");
const scoreDimensionPanel = document.querySelector(".score-right .dimension-panel");
const coachScorePanel = document.querySelector(".coach-score-panel");
const firstNameInput = document.querySelector("#first-name-input");
const lastNameInput = document.querySelector("#last-name-input");
const emailInput = document.querySelector("#email-input");

const demoToken = "hsc-7f4a9d2b81";
let currentPromptText = promptInput.value.trim();
let currentScore = null;

function showScreen(name, options = {}) {
  screens.forEach((screen) => {
    screen.classList.toggle("hidden", screen.dataset.screen !== name);
  });

  if (name === "coach" && !options.skipHistory) {
    const coachUrl = options.coachUrl || `/u/${demoToken}`;
    history.pushState({ screen: "coach" }, "", coachUrl);
  } else if (name === "score" && !options.skipHistory) {
    history.pushState({ screen: "score" }, "", `/#score`);
  }

  if (!options.skipScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateCount() {
  charCount.textContent = String(promptInput.value.length);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1800);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Something went wrong");
  }
  return payload;
}

function setButtonLoading(button, label) {
  const original = button.textContent;
  button.textContent = label;
  button.disabled = true;
  return () => {
    button.textContent = original;
    button.disabled = false;
  };
}

function applyScore(score) {
  currentScore = score;
  document.querySelector("#overall-score").textContent = String(score.overallScore);
  if (scoreHero) {
    const heading = scoreHero.querySelector("h2");
    const body = scoreHero.querySelector("p:last-child");
    if (heading) heading.textContent = score.headline;
    if (body) body.textContent = score.feedbackSummary;
  }
  updateScorePanel(scoreDimensionPanel, score);
  updateScorePanel(coachScorePanel, score);
}

function updateScorePanel(panel, score) {
  if (!panel) return;
  const rows = panel.querySelectorAll(".dimension-row");
  const values = [score.whoScore, score.taskScore, score.contextScore, score.outputScore];
  rows.forEach((row, index) => {
    const value = values[index];
    const bar = row.querySelector(".bar i");
    const label = row.querySelector("strong");
    if (bar) {
      bar.style.width = `${value}%`;
      bar.style.setProperty("--score-width", String(value));
    }
    if (label) label.textContent = String(value);
  });
}

function tokenFromPath() {
  if (!window.location.pathname.startsWith("/u/")) {
    return "";
  }
  return decodeURIComponent(window.location.pathname.slice(3));
}

async function loadCoachSession() {
  const token = tokenFromPath();
  if (!token || token === demoToken) {
    return;
  }
  try {
    const payload = await apiFetch(`/api/coach/session?token=${encodeURIComponent(token)}`);
    if (payload.coachSession?.currentPrompt) {
      draftInput.value = payload.coachSession.currentPrompt;
    }
    if (payload.score) {
      applyScore(payload.score);
    }
    if (payload.sharingNotice) {
      showToast("This personal coach link may be shared. Get your own link from the challenge page.");
    }
  } catch (error) {
    showToast(error.message);
  }
}

promptInput.addEventListener("input", updateCount);
updateCount();

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (prompt.length < 20) {
    showToast("Add a little more prompt detail first");
    promptInput.focus();
    return;
  }
  const finishLoading = setButtonLoading(promptForm.querySelector("button"), "Scoring...");
  try {
    const payload = await apiFetch("/api/score-preview", {
      method: "POST",
      body: JSON.stringify({ promptText: prompt }),
    });
    currentPromptText = prompt;
    applyScore(payload.score);
    showScreen("score");
  } catch (error) {
    showToast(error.message);
  } finally {
    finishLoading();
  }
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentPromptText) {
    showToast("Score a prompt first");
    showScreen("challenge");
    return;
  }
  const finishLoading = setButtonLoading(contactForm.querySelector("button"), "Opening...");
  try {
    const payload = await apiFetch("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        email: emailInput.value,
        promptText: currentPromptText,
        score: currentScore,
        contestAgreement: contactForm.querySelector('input[type="checkbox"]').checked,
      }),
    });
    if (!payload.coachUrl) {
      showToast(payload.message || "We will resend your existing coach link.");
      return;
    }
    window.location.assign(payload.coachUrl);
  } catch (error) {
    showToast(error.message);
  } finally {
    finishLoading();
  }
});

if (backResultsButton) {
  backResultsButton.addEventListener("click", () => {
    showScreen("score");
  });
}

copyPromptButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(draftInput.value);
    showToast("Copied prompt to clipboard");
  } catch {
    showToast("Copy unavailable in this browser");
  }
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.jump;
    if (target === "challenge") {
      history.pushState({ screen: "challenge" }, "", "./");
      showScreen("challenge");
      return;
    }
    showScreen("coach");
  });
});

window.addEventListener("popstate", () => {
  if (window.location.pathname.startsWith("/u/")) {
    showScreen("coach", { skipScroll: true, skipHistory: true });
    loadCoachSession();
  } else if (window.location.hash === "#score") {
    showScreen("score", { skipScroll: true, skipHistory: true });
  } else {
    showScreen("challenge", { skipScroll: true });
  }
});

if (window.location.pathname.startsWith("/u/")) {
  showScreen("coach", { skipScroll: true, skipHistory: true });
  loadCoachSession();
} else if (window.location.hash === "#score") {
  showScreen("score");
}
