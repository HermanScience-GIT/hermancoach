import fs from "node:fs/promises";
import path from "node:path";
import { scorePrompt } from "../server/scoring.js";

const outputDir = path.resolve("outputs/scoring-audit");
const outputPath = path.join(outputDir, "hermancoach_scoring_confirmation_holdout.json");

const cases = [
  {
    type: "Customer support",
    expectedScore: 50,
    description: "Short support reply with issue context",
    prompt: "Respond to a confused customer whose invoice looks wrong and make the reply clear and reassuring.",
  },
  {
    type: "Customer support",
    expectedScore: 82,
    description: "Structured support reply with status and escalation",
    prompt:
      "Act as a customer success lead. Draft a response to an upset customer whose data import failed twice. Context: support has reproduced the issue and engineering is investigating. Include apology, status, temporary workaround, escalation path, and expected next update.",
  },
  {
    type: "Strategy",
    expectedScore: 56,
    description: "Short strategy choice prompt",
    prompt: "Help me decide which customer segment to target first for an AI training product.",
  },
  {
    type: "Strategy",
    expectedScore: 84,
    description: "Structured strategy tradeoff prompt",
    prompt:
      "You are a growth strategist. Compare three launch channels for a prompt coaching contest: LinkedIn ads, partner webinars, and direct sales outreach. Evaluate speed, cost, audience fit, data quality, and operational effort. Recommend the best first channel and explain the tradeoff.",
  },
  {
    type: "Product requirements",
    expectedScore: 54,
    description: "Light feature requirement prompt",
    prompt: "Write product requirements for a simple email confirmation feature.",
  },
  {
    type: "Product requirements",
    expectedScore: 89,
    description: "Detailed admin feature requirements",
    prompt:
      "Act as a product manager. Create requirements for an admin screen where contest managers can filter entries, mark entries disqualified, view confirmation status, pick a random eligible winner, and export the current drawing. Include user stories, functional requirements, edge cases, metrics, and unresolved questions.",
  },
  {
    type: "Meeting agenda",
    expectedScore: 44,
    description: "Light agenda prompt",
    prompt: "Make a meeting agenda for reviewing the prompt contest launch.",
  },
  {
    type: "Meeting agenda",
    expectedScore: 80,
    description: "Timed agenda with outputs",
    prompt:
      "Create a 50-minute agenda for a cross-functional meeting about the HermanCoach MVP. Audience: marketing, sales, product, and operations. Include objectives, timing, discussion questions, decisions needed, owners, and follow-up actions.",
  },
  {
    type: "Image prompt",
    expectedScore: 45,
    description: "Light image prompt",
    prompt: "Create an image showing people becoming confident with AI at work.",
  },
  {
    type: "Image prompt",
    expectedScore: 73,
    description: "Detailed image prompt",
    prompt:
      "Create an image prompt for a bright realistic photo of professionals practicing AI prompts in a training room. Show laptops, notebooks, facilitator at a whiteboard, diverse adult learners, natural light, no text, polished editorial style, and optimistic mood.",
  },
  {
    type: "Financial analysis",
    expectedScore: 58,
    description: "Light financial review prompt",
    prompt: "Review this revenue forecast for a small SaaS company and tell me the three main risks to check first.",
  },
  {
    type: "Financial analysis",
    expectedScore: 84,
    description: "Detailed SaaS model review",
    prompt:
      "Act as a finance analyst. Review a SaaS model with ARR, churn, expansion revenue, gross margin, CAC, payback period, burn, and hiring plan. Identify the assumptions most likely to break. Return a table with assumption, risk, evidence needed, and recommended next check.",
  },
  {
    type: "HR policy",
    expectedScore: 56,
    description: "Light HR policy prompt",
    prompt: "Draft a simple workplace policy that explains when employees can use AI tools and when they need manager approval.",
  },
  {
    type: "HR policy",
    expectedScore: 84,
    description: "Structured AI policy prompt",
    prompt:
      "Act as an HR communications partner. Draft a one-page policy for employee use of AI tools in client-facing work. Audience: consultants and managers. Include acceptable uses, disclosure expectations, privacy rules, prohibited uses, approval process, examples, and review cadence.",
  },
  {
    type: "Interview questions",
    expectedScore: 54,
    description: "Light interview question prompt",
    prompt: "Give me interview questions for a marketing manager role and include what each question is meant to evaluate.",
  },
  {
    type: "Interview questions",
    expectedScore: 79,
    description: "Detailed interview guide",
    prompt:
      "Act as a hiring manager. Create 8 interview questions for a customer success leader. Focus on renewal strategy, team coaching, executive presence, handling escalations, and change management. For each question, include what a strong answer should demonstrate.",
  },
  {
    type: "Ops checklist",
    expectedScore: 52,
    description: "Light checklist prompt",
    prompt: "Make a checklist for launching a webinar, including preparation, live event tasks, and follow-up.",
  },
  {
    type: "Ops checklist",
    expectedScore: 82,
    description: "Detailed rollout checklist",
    prompt:
      "You are an operations manager. Build a checklist for launching a lead capture contest landing page. Organize into pre-launch, launch day, first week, and post-drawing. Include owner, dependency, risk, deadline, and success signal for each item.",
  },
  {
    type: "Research design",
    expectedScore: 49,
    description: "Light research design prompt",
    prompt: "Write research questions about why employees do or do not use AI.",
  },
  {
    type: "Research design",
    expectedScore: 87,
    description: "Structured research plan",
    prompt:
      "Act as a UX researcher. Design a lightweight study to understand why sales managers avoid using AI coaching tools. Include goals, participant criteria, 10 interview questions, analysis themes, and what decisions the research should inform.",
  },
  {
    type: "Procurement",
    expectedScore: 56,
    description: "Light procurement prompt",
    prompt: "Help me evaluate vendors for an AI training program and compare them on quality, cost, security, and support.",
  },
  {
    type: "Procurement",
    expectedScore: 84,
    description: "Structured procurement rubric",
    prompt:
      "You are a procurement advisor. Build a vendor evaluation rubric for selecting a workplace AI coaching partner. Criteria should include data security, personalization depth, implementation support, reporting, facilitator quality, references, and total cost. Return a weighted scoring table and reviewer notes.",
  },
  {
    type: "Change management",
    expectedScore: 58,
    description: "Light adoption prompt",
    prompt: "Create a practical plan to help managers adopt AI tools at work over the next month.",
  },
  {
    type: "Change management",
    expectedScore: 88,
    description: "Structured adoption plan",
    prompt:
      "Act as a change management consultant. Build a 90-day AI adoption plan for a 300-person services firm. Segment by executives, managers, and individual contributors. Include communications, training, reinforcement, resistance risks, metrics, owner roles, and weekly milestones.",
  },
  {
    type: "Creative brief",
    expectedScore: 58,
    description: "Light creative brief",
    prompt: "Write a campaign brief for a prompt coaching challenge aimed at HR leaders who want better AI results.",
  },
  {
    type: "Creative brief",
    expectedScore: 85,
    description: "Structured creative brief",
    prompt:
      "You are a creative director. Write a campaign brief for a HermanScience prompt challenge that captures leads and introduces personalization. Audience: HR and enablement leaders. Include objective, audience insight, key message, tone, proof points, deliverables, success metrics, and constraints.",
  },
  {
    type: "Prompt coaching",
    expectedScore: 56,
    description: "Light prompt coaching prompt",
    prompt: "Make this prompt stronger by improving the role, task, context, and output format, then explain the edits.",
  },
  {
    type: "Prompt coaching",
    expectedScore: 80,
    description: "Structured prompt coaching prompt",
    prompt:
      "Act as a prompt coach. Review my prompt for who, task, context, constraints, and output format. Identify the four most important gaps, rewrite the prompt, and explain how each change should improve the model response.",
  },
  {
    type: "Business email",
    expectedScore: 44,
    description: "Light email prompt",
    prompt: "Draft an email inviting customers to try the prompt challenge.",
  },
  {
    type: "Business email",
    expectedScore: 84,
    description: "Structured executive email",
    prompt:
      "Act as a B2B marketing communications coach. Draft an email inviting HR leaders to enter a prompt challenge. Context: the goal is lead capture and awareness of personalization. Include subject line, short opening, value proposition, contest mention, privacy reassurance, and clear call to action.",
  },
  {
    type: "Data analysis",
    expectedScore: 47,
    description: "Light data analysis prompt",
    prompt: "Analyze these contest entries and tell me what patterns you see.",
  },
  {
    type: "Data analysis",
    expectedScore: 88,
    description: "Structured analytics prompt",
    prompt:
      "You are a marketing analyst. I have a CSV with entry date, source, score, email domain, confirmed status, and coach usage. Analyze conversion quality by source, calculate confirmation rate and average score, return a ranked table, and recommend three acquisition changes.",
  },
  {
    type: "Translation",
    expectedScore: 50,
    description: "Light translation prompt",
    prompt: "Translate this customer-facing announcement into German and keep the tone clear and professional.",
  },
  {
    type: "Translation",
    expectedScore: 69,
    description: "Structured localization prompt",
    prompt:
      "Translate this contest invitation into Spanish for HR leaders in Mexico. Keep the tone professional and warm. Preserve brand name, dates, URLs, and prize language. Do not add claims or change the call to action.",
  },
  {
    type: "SQL",
    expectedScore: 49,
    description: "Light SQL prompt",
    prompt: "Write SQL to find contest entrants who confirmed their email.",
  },
  {
    type: "SQL",
    expectedScore: 86,
    description: "Structured SQL prompt",
    prompt:
      "You are a data engineer. Write a PostgreSQL query using contacts, submissions, email_confirmations, and winners. Find eligible confirmed contacts from the last 30 days who have not won before. Return the SQL and explain each join, filter, and exclusion.",
  },
  {
    type: "Creative writing",
    expectedScore: 46,
    description: "Light creative writing prompt",
    prompt: "Write a short workplace story about someone learning to write better AI prompts.",
  },
  {
    type: "Creative writing",
    expectedScore: 63,
    description: "Medium creative writing prompt",
    prompt:
      "Write a 400-word workplace story about a manager who learns that better AI results come from clearer prompts and personal communication style. Make it practical, lightly funny, and end with one useful lesson.",
  },
  {
    type: "Learning design",
    expectedScore: 56,
    description: "Light learning prompt",
    prompt: "Create a short lesson about writing useful AI prompts for busy managers.",
  },
  {
    type: "Learning design",
    expectedScore: 87,
    description: "Structured workshop prompt",
    prompt:
      "You are an instructional designer. Create a 45-minute workshop for sales managers learning to write better AI prompts. Include learning objectives, agenda, facilitator notes, practice activity, debrief questions, and a reflection prompt.",
  },
  {
    type: "Medical",
    expectedScore: 42,
    description: "Light medical question",
    prompt: "Explain common reasons someone may feel tired after staring at a screen all day, without diagnosing.",
  },
  {
    type: "Medical",
    expectedScore: 55,
    description: "Safer medical information prompt",
    prompt:
      "Explain common non-diagnostic reasons someone might feel tired after a full day of screen work, warning signs that should prompt medical care, and what information to share with a clinician. Use plain language and do not diagnose.",
  },
];

function missPercent(actual, expected) {
  return expected ? Math.round((Math.abs(actual - expected) / expected) * 1000) / 10 : 0;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stats(rows) {
  const missValues = rows.map((row) => row.miss);
  const avgMiss = average(missValues);
  const variance = average(missValues.map((value) => (value - avgMiss) ** 2));
  return {
    count: rows.length,
    avgMiss: Math.round(avgMiss * 100) / 100,
    maxMiss: Math.round(Math.max(...missValues) * 100) / 100,
    minMiss: Math.round(Math.min(...missValues) * 100) / 100,
    stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
    avgAbsDelta: Math.round(average(rows.map((row) => row.absDelta)) * 100) / 100,
    reviewCount: rows.filter((row) => row.status === "Review").length,
  };
}

function recommendation(row, result) {
  const delta = result.overallScore - row.expectedScore;
  const miss = missPercent(result.overallScore, row.expectedScore);
  if (Math.abs(delta) <= 8 || miss < 15) {
    return {
      rootCause: "Within tolerance for this confirmation case.",
      specificRule: "No rule change recommended.",
    };
  }
  if (delta > 0) {
    return {
      rootCause: "Heuristic score is above expected.",
      specificRule: "If this pattern repeats, add a cap for missing source material, named audience, or concrete output constraints.",
    };
  }
  return {
    rootCause: "Heuristic score is below expected.",
    specificRule:
      "If this pattern repeats, add bounded partial credit for the task-family signals present without lifting generic one-line prompts too far.",
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const rows = cases.map((row, index) => {
    const result = scorePrompt(row.prompt);
    const delta = result.overallScore - row.expectedScore;
    const absDelta = Math.abs(delta);
    const miss = missPercent(result.overallScore, row.expectedScore);
    return {
      id: index + 1,
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
  const payload = {
    outputPath,
    combinedStats: stats(rows),
    rows,
    highMisses: rows
      .filter((row) => row.status === "Review")
      .sort((a, b) => b.miss - a.miss)
      .slice(0, 12),
  };
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload.combinedStats, null, 2));
  console.log(JSON.stringify(payload.highMisses, null, 2));
}

await main();
