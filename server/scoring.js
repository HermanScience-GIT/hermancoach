const dimensionWeights = {
  who: 0.24,
  task: 0.3,
  context: 0.24,
  output: 0.22,
};

const roleTerms = [
  "you are",
  "act as",
  "role",
  "expert",
  "coach",
  "advisor",
  "analyst",
  "teacher",
  "audience",
  "customer",
  "team",
];

const taskTerms = [
  "write",
  "create",
  "draft",
  "summarize",
  "analyze",
  "compare",
  "explain",
  "recommend",
  "build",
  "generate",
  "help me",
  "evaluate",
];

const contextTerms = [
  "context",
  "background",
  "for",
  "because",
  "constraint",
  "goal",
  "audience",
  "situation",
  "using",
  "based on",
  "assume",
  "include",
];

const outputTerms = [
  "format",
  "bullet",
  "table",
  "json",
  "markdown",
  "tone",
  "length",
  "step",
  "example",
  "return",
  "output",
  "structure",
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(text, terms) {
  return terms.reduce((count, term) => (text.includes(term) ? count + 1 : count), 0);
}

function punctuationSignal(rawPrompt) {
  return /[:;?]/.test(rawPrompt) ? 6 : 0;
}

function lengthSignal(words) {
  if (words >= 80) return 18;
  if (words >= 45) return 13;
  if (words >= 24) return 8;
  if (words >= 12) return 4;
  return 0;
}

function scoreDimension({ rawPrompt, text, words, terms, base }) {
  return clampScore(base + countMatches(text, terms) * 8 + lengthSignal(words) + punctuationSignal(rawPrompt));
}

export function scorePrompt(promptText) {
  const rawPrompt = String(promptText || "").trim();
  const text = rawPrompt.toLowerCase();
  const words = rawPrompt.split(/\s+/).filter(Boolean).length;

  const whoScore = scoreDimension({
    rawPrompt,
    text,
    words,
    terms: roleTerms,
    base: 28,
  });
  const taskScore = scoreDimension({
    rawPrompt,
    text,
    words,
    terms: taskTerms,
    base: 34,
  });
  const contextScore = scoreDimension({
    rawPrompt,
    text,
    words,
    terms: contextTerms,
    base: 24,
  });
  const outputScore = scoreDimension({
    rawPrompt,
    text,
    words,
    terms: outputTerms,
    base: 26,
  });

  const overallScore = clampScore(
    whoScore * dimensionWeights.who +
      taskScore * dimensionWeights.task +
      contextScore * dimensionWeights.context +
      outputScore * dimensionWeights.output,
  );

  return {
    overallScore,
    whoScore,
    taskScore,
    contextScore,
    outputScore,
    feedbackSummary: feedbackFor(overallScore),
    headline: headlineFor(overallScore),
    weakestDimension: weakestDimension({ whoScore, taskScore, contextScore, outputScore }),
    coachingSuggestion: coachingSuggestionFor(
      weakestDimension({ whoScore, taskScore, contextScore, outputScore }),
    ),
  };
}

export function scoreNarrative(overallScore) {
  return {
    headline: headlineFor(overallScore),
    feedbackSummary: feedbackFor(overallScore),
  };
}

export function coachingSuggestionFor(dimension) {
  const suggestions = {
    who: {
      title: "Define who the model should be",
      body: "Add a role or audience signal so the model knows the perspective it should use.",
      example: "Example: You are an experienced sales enablement coach helping a frontline manager.",
    },
    task: {
      title: "Make the task more specific",
      body: "State the exact action you want the model to take and what success looks like.",
      example: "Example: Create a 5-step action plan that a manager can use this week.",
    },
    context: {
      title: "Add stronger context",
      body: "Include the situation, audience, constraints, or decision the model should keep in mind.",
      example: "Example: This is for a sales leader preparing Q3 planning with a new team.",
    },
    output: {
      title: "Specify the output format",
      body: "Tell the model what shape the answer should take so the result is easier to use.",
      example: "Example: Return a table with columns for owner, action, timing, and success criteria.",
    },
  };
  return suggestions[dimension] || suggestions.context;
}

function headlineFor(score) {
  if (score >= 85) {
    return "Excellent structure. Your prompt gives the model a strong path.";
  }
  if (score >= 70) {
    return "Strong start. Your structure is doing real work.";
  }
  if (score >= 50) {
    return "Good foundation. A few specifics would raise the quality.";
  }
  return "Useful start. The model needs more direction to perform well.";
}

function feedbackFor(score) {
  if (score >= 85) {
    return "Your prompt gives the model role, task, context, and output direction. A little more precision could make the result even easier to trust.";
  }
  if (score >= 70) {
    return "Your prompt gives the model a useful direction, but clearer context and output expectations would make the response easier to trust and act on.";
  }
  if (score >= 50) {
    return "Your prompt has a recognizable task, but adding a clearer role, more context, and a target output format would make the answer more useful.";
  }
  return "Your prompt is likely to produce a generic answer. Add who the model should be, what you need, relevant context, and what the output should look like.";
}

function weakestDimension(scores) {
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0].replace("Score", "");
}
