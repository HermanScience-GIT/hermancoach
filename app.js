const screens = Array.from(document.querySelectorAll("[data-screen]"));
const promptForm = document.querySelector("#prompt-form");
const contactForm = document.querySelector("#contact-form");
const promptInput = document.querySelector("#prompt-input");
const charCount = document.querySelector("#char-count");
const backResultsButton = document.querySelector("#back-results");
const copyPromptButton = document.querySelector("#copy-prompt");
const draftInput = document.querySelector("#draft-input");
const toast = document.querySelector("#toast");

const demoToken = "hsc-7f4a9d2b81";

function showScreen(name, options = {}) {
  screens.forEach((screen) => {
    screen.classList.toggle("hidden", screen.dataset.screen !== name);
  });

  if (name === "coach") {
    history.pushState({ screen: "coach" }, "", `/u/${demoToken}`);
  } else if (name === "score") {
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

promptInput.addEventListener("input", updateCount);
updateCount();

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (prompt.length < 20) {
    showToast("Add a little more prompt detail first");
    promptInput.focus();
    return;
  }
  showScreen("score");
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showScreen("coach");
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
    showScreen("coach", { skipScroll: true });
  } else if (window.location.hash === "#score") {
    showScreen("score", { skipScroll: true });
  } else {
    showScreen("challenge", { skipScroll: true });
  }
});

if (window.location.pathname.startsWith("/u/")) {
  showScreen("coach", { skipScroll: true });
} else if (window.location.hash === "#score") {
  showScreen("score");
}
