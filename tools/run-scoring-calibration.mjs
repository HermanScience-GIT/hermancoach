import fs from "node:fs/promises";
import path from "node:path";
import { scorePrompt } from "../server/scoring.js";

const outputDir = path.resolve("outputs/scoring-audit");
const outputPath = path.join(outputDir, "hermancoach_scoring_calibration_loops.json");

const families = [
  {
    type: "Customer support",
    light: ["Reply to this upset customer about a billing mistake.", 48],
    medium: ["Draft a warmer support reply for a customer who cannot access their account. Include apology, next step, and timing.", 68],
    strong:
      [
        "Act as a customer support lead. Draft a reply to a frustrated admin whose team lost access after an SSO change. Context: engineering is investigating and there is no confirmed ETA. Use a calm, accountable tone. Include apology, status, workaround, escalation path, and closing.",
        84,
      ],
  },
  {
    type: "Strategy",
    light: ["Help me choose the best market for an AI coaching offer.", 54],
    medium: ["Compare two go-to-market options for a prompt coaching app and recommend the better first wedge.", 66],
    strong:
      [
        "You are a market strategy consultant. Compare three entry options for a prompt coaching product: HR teams, sales enablement, and professional services firms. Evaluate buyer urgency, budget owner, sales cycle, compliance risk, and proof needed. Recommend one wedge and explain the tradeoff.",
        86,
      ],
  },
  {
    type: "Product requirements",
    light: ["Write a PRD for a leaderboard feature.", 52],
    medium: ["Create product requirements for a dashboard where admins review prompt contest entries and draw a winner.", 70],
    strong:
      [
        "Act as a senior product manager. Create a PRD for an admin dashboard that lets contest managers review submissions, disqualify entries, draw a random weekly winner, and export entries. Include user stories, functional requirements, edge cases, audit events, metrics, and open questions.",
        90,
      ],
  },
  {
    type: "Meeting agenda",
    light: ["Make an agenda for a kickoff meeting.", 42],
    medium: ["Create a 60-minute agenda for a customer kickoff about AI training. Include objectives, topics, decisions, and next steps.", 70],
    strong:
      [
        "Create a 75-minute agenda for a leadership team meeting about improving AI adoption. Audience: CEO, COO, HR lead, and department heads. Include objectives, timing, discussion prompts, decisions needed, pre-read, owner for each section, and follow-up actions.",
        84,
      ],
  },
  {
    type: "Image prompt",
    light: ["Make an image about confident AI users.", 44],
    medium: ["Create an image prompt for a clean office scene showing employees learning AI together. No text in the image.", 66],
    strong:
      [
        "Create an image prompt for a realistic editorial photo of a manager learning to write better AI prompts. Show laptop, notes, confident expression, diverse coworkers, clean modern workspace, natural daylight, no text, and an optimistic professional mood.",
        74,
      ],
  },
  {
    type: "Financial analysis",
    light: ["Tell me if this forecast makes sense.", 50],
    medium: ["Review this SaaS forecast and identify the biggest risks in revenue, churn, gross margin, and sales hiring.", 68],
    strong:
      [
        "You are a finance analyst. Review this SaaS forecast for revenue, gross margin, CAC payback, burn, runway, expansion revenue, and churn. Identify the three biggest assumptions to validate. Return a table with metric, concern, evidence needed, recommendation, and owner.",
        86,
      ],
  },
  {
    type: "HR policy",
    light: ["Create a policy for using AI at work.", 46],
    medium: ["Draft an employee AI use policy for consultants. Include disclosure, privacy, prohibited uses, and manager approval.", 70],
    strong:
      [
        "Act as an HR policy partner. Draft a simple employee policy for when consultants should disclose AI use in client work. Audience: consultants and managers. Include scope, examples, approval process, privacy expectations, prohibited uses, review cadence, and practical tone.",
        86,
      ],
  },
  {
    type: "Interview questions",
    light: ["Give me interview questions for a sales role.", 44],
    medium: ["Create 8 interview questions for a customer success manager role and include what good answers show.", 66],
    strong:
      [
        "Act as a hiring manager. Create 10 interview questions for a senior product marketer. Focus on positioning, launch planning, sales enablement, customer insight, and executive communication. For each question, include what a strong answer would demonstrate.",
        80,
      ],
  },
  {
    type: "Ops checklist",
    light: ["Make a checklist for onboarding.", 42],
    medium: ["Build a checklist for launching a new workflow. Include planning, launch day, follow-up, owner, and dependency.", 68],
    strong:
      [
        "You are an operations manager. Build a launch checklist for rolling out a new CRM workflow to a sales team. Organize it into before launch, launch day, and first week. Include owner, dependency, due date, risk, and success signal for each item.",
        84,
      ],
  },
  {
    type: "Research design",
    light: ["Make a few research questions about AI at work.", 48],
    medium: ["Design a short study to learn why managers avoid using AI tools. Include goals and interview questions.", 68],
    strong:
      [
        "Act as a UX researcher. Design a study to learn why managers avoid using AI tools for feedback coaching. Include research goals, participant criteria, 8 interview questions, analysis themes, and what each theme should reveal.",
        88,
      ],
  },
  {
    type: "Procurement",
    light: ["Help me compare two software vendors.", 50],
    medium: ["Create a vendor comparison rubric for choosing an AI training partner. Include criteria, weights, and reviewer notes.", 72],
    strong:
      [
        "You are a procurement advisor. Create a weighted scoring rubric for choosing an AI enablement vendor. Criteria: security, integrations, training quality, reporting, admin controls, customer references, and implementation support. Include scoring guidance and notes for reviewers.",
        84,
      ],
  },
  {
    type: "Change management",
    light: ["Make a plan for AI adoption at work.", 52],
    medium: ["Build a 45-day AI adoption plan for managers. Include communications, training, risks, owners, and success metrics.", 74],
    strong:
      [
        "Act as a change management consultant. Build a 60-day adoption plan for introducing AI assistants to a 500-person company. Segment by executives, managers, and individual contributors. Include communications, training, risks, metrics, owner roles, and reinforcement.",
        90,
      ],
  },
  {
    type: "Creative brief",
    light: ["Write a campaign brief for an AI workshop.", 48],
    medium: ["Write a campaign brief for a prompt confidence quiz. Include audience, objective, key message, tone, and deliverables.", 72],
    strong:
      [
        "You are a creative director. Write a campaign brief for HermanScience promoting personalized AI confidence training. Audience: HR leaders. Include campaign objective, audience insight, key message, emotional tone, proof points, deliverables, and constraints to avoid generic AI hype.",
        86,
      ],
  },
  {
    type: "Prompt coaching",
    light: ["Improve this prompt and tell me what you changed.", 45],
    medium: ["Review this prompt for role, task, context, and output format. Return three gaps and a revised version.", 70],
    strong:
      [
        "Act as a prompt coach. Review this prompt for role, task, context, constraints, and output format. Identify the three biggest gaps, then return a revised prompt and a brief explanation of what changed.",
        82,
      ],
  },
  {
    type: "Business email",
    light: ["Write a follow-up email after the demo.", 42],
    medium: ["Draft a follow-up email for an HR leader after an AI workshop demo. Include subject line and next step.", 70],
    strong:
      [
        "Act as an executive communications coach. Draft an email from the CEO announcing a new AI learning initiative. Context: employees are excited but unsure how it affects their work. Include subject line, opening, three key points, reassurance, and next step.",
        86,
      ],
  },
  {
    type: "Data analysis",
    light: ["Analyze this sales data and tell me what matters.", 46],
    medium: ["Analyze a CSV of pipeline data and identify stuck opportunities. Return a ranked table and manager recommendations.", 74],
    strong:
      [
        "You are a sales operations analyst. I have a CSV with rep, stage, deal size, next step date, close date, and forecast category. Identify stuck opportunities, calculate stage aging, return a ranked table, and recommend three manager actions.",
        88,
      ],
  },
  {
    type: "Translation",
    light: ["Translate this into French.", 42],
    medium: ["Translate this renewal reminder into Spanish for an executive buyer. Preserve dates, links, and product names.", 62],
    strong:
      [
        "Translate this customer support reply into Spanish for a nontechnical customer. Keep the tone warm, professional, and simple. Preserve product names, dates, and links. Do not add promises or change the meaning.",
        72,
      ],
  },
  {
    type: "SQL",
    light: ["Write a SQL query for active users.", 48],
    medium: ["Write a PostgreSQL query using users and events to find active accounts. Return SQL and explain the filters.", 72],
    strong:
      [
        "You are a data engineer. Write a PostgreSQL query using contacts, submissions, and winners. Find confirmed contacts with eligible submissions who have never won. Return the SQL and explain each join and filter.",
        86,
      ],
  },
  {
    type: "Creative writing",
    light: ["Write a story about teamwork.", 36],
    medium: ["Write a 350-word workplace scene about a team learning from a vague AI prompt. Make it lightly funny.", 62],
    strong:
      [
        "Write a 500-word opening scene for a workplace story about a team discovering that their AI assistant misunderstood a vague prompt. Make it restrained, lightly funny, practical, and end with a useful lesson for managers.",
        70,
      ],
  },
  {
    type: "Learning design",
    light: ["Make a lesson about better prompting.", 42],
    medium: ["Create a 30-minute lesson plan on prompting for managers. Include objectives, agenda, activity, and reflection question.", 76],
    strong:
      [
        "You are an instructional designer. Create a 60-minute workshop plan on writing better AI prompts for customer success managers. Include learning objectives, agenda, facilitator notes, practice activity, debrief, and reflection question.",
        88,
      ],
  },
  {
    type: "Medical",
    light: ["Why does my wrist hurt after typing?", 34],
    medium:
      [
        "Explain common causes of mild wrist pain after typing, warning signs that should prompt urgent care, and what information to share with a clinician. Do not diagnose me or recommend medication.",
        48,
      ],
    strong:
      [
        "Explain common non-diagnostic causes of mild wrist pain after typing, warning signs that should prompt urgent care, and the information a clinician may ask for. Use plain language, avoid diagnosis, and return a short checklist.",
        58,
      ],
  },
];

const qualityCycle = ["strong", "light", "medium", "strong", "medium", "light", "strong", "medium"];

function pickCases(pass) {
  const rows = [];
  for (let i = 0; i < 40; i += 1) {
    const family = families[(i + pass * 7) % families.length];
    const quality = qualityCycle[(i + pass * 3) % qualityCycle.length];
    const [prompt, expectedScore] = family[quality];
    rows.push({
      id: pass * 100 + i + 1,
      pass,
      type: family.type,
      quality,
      expectedScore,
      description: `${quality[0].toUpperCase()}${quality.slice(1)} ${family.type.toLowerCase()} prompt`,
      prompt,
    });
  }
  return rows;
}

function missPercent(actual, expected) {
  return expected ? Math.round((Math.abs(actual - expected) / expected) * 1000) / 10 : 0;
}

function recommendation(row, result) {
  const delta = result.overallScore - row.expectedScore;
  if (Math.abs(delta) <= 8 || missPercent(result.overallScore, row.expectedScore) < 10) {
    return {
      rootCause: "Within tolerance for this calibration pass.",
      specificRule: "No rule update recommended from this case.",
    };
  }
  if (delta > 0) {
    return {
      rootCause: "Heuristic score is above expected.",
      specificRule:
        "Consider a cap or missing-input penalty if this prompt lacks source material, audience detail, constraints, or output shape for its task family.",
    };
  }
  return {
    rootCause: "Heuristic score is below expected.",
    specificRule:
      "Add bounded partial credit for the task family signals present here: action verb, domain object, audience/use case, constraints, and requested output shape. Avoid lifting prompts that have only a verb plus generic topic.",
  };
}

function analyzeRows(rows) {
  return rows.map((row) => {
    const result = scorePrompt(row.prompt);
    const delta = result.overallScore - row.expectedScore;
    const absDelta = Math.abs(delta);
    const miss = missPercent(result.overallScore, row.expectedScore);
    return {
      ...row,
      heuristicScore: result.overallScore,
      delta,
      absDelta,
      miss,
      who: result.whoScore,
      task: result.taskScore,
      context: result.contextScore,
      output: result.outputScore,
      status: miss >= 15 ? "Review" : "OK",
      ...recommendation(row, result),
    };
  });
}

function stats(rows) {
  const avg = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const missValues = rows.map((row) => row.miss);
  const avgMiss = avg(missValues);
  const maxMiss = Math.max(...missValues);
  const minMiss = Math.min(...missValues);
  const variance = avg(missValues.map((value) => (value - avgMiss) ** 2));
  return {
    count: rows.length,
    avgMiss: Math.round(avgMiss * 100) / 100,
    maxMiss: Math.round(maxMiss * 100) / 100,
    minMiss: Math.round(minMiss * 100) / 100,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    avgAbsDelta: Math.round(avg(rows.map((row) => row.absDelta)) * 100) / 100,
    reviewCount: rows.filter((row) => row.status === "Review").length,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const passes = Array.from({ length: 8 }, (_, index) => index + 1);
  const allRows = passes.flatMap((pass) => analyzeRows(pickCases(pass)));
  const summaryRows = passes.map((pass) => ({ pass, ...stats(allRows.filter((row) => row.pass === pass)) }));
  const combinedStats = stats(allRows);

  const payload = {
    outputPath,
    combinedStats,
    passStats: summaryRows,
    rows: allRows,
    highMisses: allRows
      .filter((row) => row.status === "Review")
      .sort((a, b) => b.miss - a.miss)
      .slice(0, 12)
      .map((row) => ({
        id: row.id,
        pass: row.pass,
        type: row.type,
        quality: row.quality,
        heuristic: row.heuristicScore,
        expected: row.expectedScore,
        miss: row.miss,
        prompt: row.prompt,
      })),
  };
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

await main();
