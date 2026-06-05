import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { scorePrompt } from "../server/scoring.js";

const outputDir = path.resolve("outputs/scoring-audit");
const outputPath = path.join(outputDir, "hermancoach_scoring_audit_partial_rules_fresh_40.xlsx");

const cases = [
  {
    id: 1,
    type: "Creative writing",
    expectedScore: 24,
    description: "Very vague creative request",
    prompt: "Write me something interesting about leadership.",
    suggestedRule:
      "No immediate rule update. The low score is appropriate for a vague request with little role, context, or output direction.",
  },
  {
    id: 2,
    type: "Humor",
    expectedScore: 48,
    description: "Simple joke request with audience and tone",
    prompt:
      "Tell me a clean joke for a team meeting about learning AI at work. Keep it friendly and short.",
    suggestedRule:
      "Add task signals for common direct verbs like tell, rewrite, translate, review, and plan; current task scoring underweights everyday prompt phrasing.",
  },
  {
    id: 3,
    type: "Research",
    expectedScore: 82,
    description: "Structured research/personality prompt with missing word list",
    prompt:
      "You are an LLM helping me with a research project. I am exploring how different LLMs respond to a question about their personality. I want you to pick one of the words and explain why you picked that word. For the output give me the word you select and a one line explanation about why you selected it.",
    suggestedRule:
      "No rule update recommended from this case. The prompt is strong and gets a modest context penalty for referring to a word list that is not included.",
  },
  {
    id: 4,
    type: "Research",
    expectedScore: 94,
    description: "Structured research/personality prompt with included options",
    prompt:
      "You are an LLM helping me with a research project. I am exploring how different LLMs respond to a question about their personality. Pick one of these words: curious, precise, cautious, playful. Explain why you picked that word. For the output give me the selected word and a one-line explanation.",
    suggestedRule:
      "No immediate rule update. This should remain a high-scoring example of role, task, context, input options, and output format.",
  },
  {
    id: 5,
    type: "Sales",
    expectedScore: 88,
    description: "Sales email draft with audience, context, tone, and output",
    prompt:
      "Act as a B2B SaaS sales coach. Draft a follow-up email for a VP of Sales who attended our webinar but has not booked a demo. Context: they manage a 40-person revenue team and care about forecast accuracy. Use a confident but not pushy tone. Output one subject line and a 120-word email.",
    suggestedRule:
      "If over-scored, cap scores slightly when the prompt lacks source material or success criteria. Otherwise this is a strong prompt.",
  },
  {
    id: 6,
    type: "Executive summary",
    expectedScore: 90,
    description: "Executive summary from notes with constraints and format",
    prompt:
      "You are an operations analyst. Summarize these meeting notes for an executive audience. Focus on decisions, risks, owners, and next steps. Use concise language. Return a table with columns for Topic, Decision, Owner, Due Date, and Risk.",
    suggestedRule:
      "No immediate rule update. Good example of task, audience, focus areas, and table output.",
  },
  {
    id: 7,
    type: "Coding",
    expectedScore: 74,
    description: "Code debugging request with error but limited environment context",
    prompt:
      "Act as a senior JavaScript engineer. Help me debug this React error: Cannot read properties of undefined reading map. Explain the likely causes, show a safe rendering pattern, and give me a short checklist to diagnose it.",
    suggestedRule:
      "Add coding/debugging signals for error, debug, React, JavaScript, checklist, and show a pattern. Also consider a missing-environment penalty when framework/version/code sample is absent.",
  },
  {
    id: 8,
    type: "Data analysis",
    expectedScore: 92,
    description: "Data analysis request with clear role, inputs, metrics, and output",
    prompt:
      "You are a marketing analyst. I have a CSV of campaign performance with spend, impressions, clicks, leads, and opportunities by channel. Analyze which channels are most efficient. Calculate CPC, CPL, and cost per opportunity. Return a ranked table and three recommendations for next month.",
    suggestedRule:
      "Add analysis signals for CSV, calculate, metric names, ranked table, and recommendations; the rubric should strongly reward explicit inputs plus derived metrics.",
  },
  {
    id: 9,
    type: "Translation",
    expectedScore: 64,
    description: "Translation request with tone and audience",
    prompt:
      "Translate this customer support reply into Spanish. Keep the tone warm, professional, and simple enough for a nontechnical customer. Preserve product names and do not add new promises.",
    suggestedRule:
      "Add translation/localization signals: translate, into [language], preserve terms, do not add, customer support. This task type has strong task and output constraints even without a model role.",
  },
  {
    id: 10,
    type: "Brainstorming",
    expectedScore: 78,
    description: "Brainstorming request with constraints and quantity",
    prompt:
      "You are a product marketer. Generate 12 campaign ideas for promoting an AI readiness workshop to HR leaders. The ideas should be practical for a small team, avoid hype, and include one sentence explaining the audience insight behind each idea.",
    suggestedRule:
      "Add ideation signals for quantity targets, ideas, practical constraints, avoid/guardrail language, and audience insight explanations.",
  },
  {
    id: 11,
    type: "Contract review",
    expectedScore: 58,
    description: "Legal-ish review request with no jurisdiction/context guardrails",
    prompt:
      "Review this vendor contract and tell me if anything looks risky. Give me a bullet list of issues and questions to ask before signing.",
    suggestedRule:
      "Add review/risk/question signals, but include a domain penalty when legal, medical, financial, or contract prompts omit jurisdiction, role boundary, or scope.",
  },
  {
    id: 12,
    type: "Contract review",
    expectedScore: 91,
    description: "Strong contract review prompt with role, scope, caveat, output format",
    prompt:
      "Act as a contract review assistant, not a lawyer. Review the vendor agreement for a US-based small business. Focus on renewal terms, data usage, liability, termination, and payment obligations. Return a risk table with Severity, Clause, Why it matters, and Suggested question for counsel.",
    suggestedRule:
      "Reward role-boundary phrases such as not a lawyer/not medical advice, jurisdiction/scope, focus areas, and risk-table output.",
  },
  {
    id: 13,
    type: "Creative writing",
    expectedScore: 62,
    description: "Creative writing with style constraints but weak purpose",
    prompt:
      "Write a short opening scene for a science fiction story set in a quiet city after the power goes out. Make it atmospheric, restrained, and under 500 words.",
    suggestedRule:
      "Add creative-writing signals for scene, story, genre, style adjectives, and word count. Do not over-reward because audience/purpose remain thin.",
  },
  {
    id: 14,
    type: "Learning design",
    expectedScore: 89,
    description: "Lesson plan with audience, learning objectives, timing, output",
    prompt:
      "You are an instructional designer. Create a 30-minute lesson plan for managers learning how to give better feedback. Audience: new frontline managers. Include learning objectives, agenda, facilitator notes, one practice activity, and a closing reflection question.",
    suggestedRule:
      "Add learning-design signals for lesson plan, learning objectives, agenda, facilitator notes, activity, and reflection question.",
  },
  {
    id: 15,
    type: "Planning",
    expectedScore: 82,
    description: "Meal plan request with constraints and format",
    prompt:
      "Create a 5-day dinner plan for a family of four. Constraints: vegetarian, under 35 minutes per meal, kid-friendly, and uses overlapping ingredients to reduce waste. Output a table with meal, prep time, key ingredients, and one shopping list grouped by grocery section.",
    suggestedRule:
      "Add planning signals for day counts, constraints, grouped lists, prep time, and resource optimization. These are strong context/output markers.",
  },
  {
    id: 16,
    type: "Resume coaching",
    expectedScore: 86,
    description: "Resume bullet rewrite with role, target job, examples, output",
    prompt:
      "Act as a resume coach. Rewrite these three resume bullets for a customer success manager applying to a senior CSM role. Make them measurable, action-oriented, and ATS friendly. Return before and after versions plus one note explaining the improvement.",
    suggestedRule:
      "Add rewrite/edit signals and career-task signals: resume, bullets, target role, measurable, ATS, before/after.",
  },
  {
    id: 17,
    type: "SQL",
    expectedScore: 90,
    description: "SQL generation with schema and constraints",
    prompt:
      "You are a data engineer. Write a PostgreSQL query using tables accounts, opportunities, and activities. Goal: show accounts with open opportunities over $50k and no activity in the last 30 days. Return the SQL, then explain each join and filter in plain English.",
    suggestedRule:
      "Add technical-generation signals for SQL, PostgreSQL, tables, schema terms, joins, filters, thresholds, and explain-the-query output.",
  },
  {
    id: 18,
    type: "Summarization",
    expectedScore: 38,
    description: "Ambiguous summarization request",
    prompt: "Summarize this document and make it better.",
    suggestedRule:
      "No immediate rule update. The score should stay low because audience, purpose, criteria, and output shape are missing.",
  },
  {
    id: 19,
    type: "Research synthesis",
    expectedScore: 93,
    description: "Customer research synthesis with role, inputs, output, decision use",
    prompt:
      "You are a customer research strategist. Synthesize 15 interview excerpts about onboarding friction for a B2B software product. Identify recurring pain points, emotional drivers, and unmet needs. Return five themes with supporting quote snippets, confidence level, and product implications.",
    suggestedRule:
      "Add synthesis signals for interview excerpts, themes, quotes, confidence level, implications, and recurring pain points.",
  },
  {
    id: 20,
    type: "Social content",
    expectedScore: 80,
    description: "Personalized LinkedIn post with voice and guardrails",
    prompt:
      "Draft a LinkedIn post for a founder announcing a new AI training program. Voice: thoughtful, practical, and not hype-driven. Audience: HR and enablement leaders. Include a hook, one short story, three takeaways, and a soft call to action.",
    suggestedRule:
      "Add social-content signals for LinkedIn post, voice, audience, hook, story, takeaways, and call to action.",
  },
  {
    id: 21,
    type: "Customer support",
    expectedScore: 84,
    description: "Support macro with role, user context, guardrails, and output sections",
    prompt:
      "Act as a customer support lead. Draft a response to a frustrated admin who cannot sync Salesforce data. Context: they have already tried reconnecting the integration. Keep the tone calm and accountable. Include apology, next troubleshooting step, escalation path, and a short closing.",
  },
  {
    id: 22,
    type: "Strategy",
    expectedScore: 76,
    description: "Business strategy options with criteria and recommendation",
    prompt:
      "You are a startup advisor. Compare three pricing approaches for a new AI training product: per-seat, cohort fee, and enterprise license. Evaluate each option for buyer clarity, sales complexity, and revenue predictability. Recommend one option and explain the tradeoff.",
  },
  {
    id: 23,
    type: "Vague coding",
    expectedScore: 34,
    description: "Vague code help request",
    prompt: "My app is broken. Tell me what to fix in the code.",
  },
  {
    id: 24,
    type: "HR policy",
    expectedScore: 88,
    description: "HR policy draft with audience, constraints, and structure",
    prompt:
      "Act as an HR communications partner. Draft a one-page remote work policy for a 75-person professional services firm. Audience: managers and employees. Include eligibility, core hours, communication expectations, equipment, security, and review cadence. Keep the tone clear and practical.",
  },
  {
    id: 25,
    type: "Math tutoring",
    expectedScore: 70,
    description: "Tutoring explanation with audience and step-by-step output",
    prompt:
      "You are a patient math tutor. Explain how to solve a quadratic equation by factoring for a high school student. Use one simple example, show each step, and end with two practice problems.",
  },
  {
    id: 26,
    type: "Medical",
    expectedScore: 48,
    description: "Health question with some safety framing but little personal context",
    prompt:
      "I have had a headache for two days. Explain common causes, what warning signs would require urgent care, and what information I should tell my doctor. Do not diagnose me.",
  },
  {
    id: 27,
    type: "Product requirements",
    expectedScore: 91,
    description: "PRD outline with role, product context, users, and output format",
    prompt:
      "Act as a senior product manager. Create a PRD outline for an admin dashboard that lets contest managers review prompt submissions, disqualify entries, and draw a random winner. Include user stories, functional requirements, edge cases, metrics, and open questions.",
  },
  {
    id: 28,
    type: "Meeting agenda",
    expectedScore: 82,
    description: "Meeting agenda with purpose, audience, timing, and output",
    prompt:
      "Create a 45-minute agenda for a leadership team meeting about improving AI adoption. Audience: department heads. Include objectives, timing, discussion questions, decisions needed, and pre-work.",
  },
  {
    id: 29,
    type: "Image prompt",
    expectedScore: 68,
    description: "Image generation prompt with style and composition constraints",
    prompt:
      "Create an image prompt for a realistic photo of a modern training workshop. Show diverse adult learners around laptops, natural daylight, clean office setting, no text in the image, and a confident but approachable mood.",
  },
  {
    id: 30,
    type: "Financial analysis",
    expectedScore: 86,
    description: "Financial model review with metrics and output table",
    prompt:
      "You are a finance analyst. Review this SaaS forecast for revenue, gross margin, CAC payback, burn, and runway. Identify the three biggest assumptions to validate. Return a table with assumption, risk, evidence needed, and owner.",
  },
  {
    id: 31,
    type: "Vague marketing",
    expectedScore: 30,
    description: "Vague marketing request",
    prompt: "Make me a marketing plan for my business.",
  },
  {
    id: 32,
    type: "Interview questions",
    expectedScore: 79,
    description: "Interview guide with role, competencies, and format",
    prompt:
      "Act as a hiring manager. Create 10 interview questions for a senior customer success manager. Focus on renewal strategy, executive communication, change management, and coaching. For each question, include what a strong answer would demonstrate.",
  },
  {
    id: 33,
    type: "Email rewrite",
    expectedScore: 72,
    description: "Email rewrite with tone and output comparison",
    prompt:
      "Rewrite this email so it sounds clearer, warmer, and more direct without becoming too casual. Return the revised email and then list the three biggest changes you made.",
  },
  {
    id: 34,
    type: "Ops checklist",
    expectedScore: 83,
    description: "Operational checklist with scenario, audience, and phases",
    prompt:
      "You are an operations manager. Build a launch checklist for rolling out a new CRM workflow to a sales team. Organize it into before launch, launch day, and first week. Include owner, dependency, and success signal for each item.",
  },
  {
    id: 35,
    type: "Research design",
    expectedScore: 87,
    description: "Survey design with audience, goal, and question types",
    prompt:
      "Act as a UX researcher. Design a 12-question survey to understand why employees avoid using AI tools at work. Include a mix of Likert, multiple choice, and open-ended questions. Group questions by theme and explain what each theme measures.",
  },
  {
    id: 36,
    type: "Personal productivity",
    expectedScore: 63,
    description: "Personal productivity plan with constraints but little context",
    prompt:
      "Help me make a weekly productivity plan. I want fewer meetings, more deep work, and a better way to track priorities. Give me a simple template I can use every Friday.",
  },
  {
    id: 37,
    type: "Procurement",
    expectedScore: 84,
    description: "Vendor comparison rubric with criteria and output table",
    prompt:
      "You are a procurement advisor. Create a vendor evaluation rubric for selecting an AI training partner. Criteria should include security, customization, measurement, facilitator quality, and change management support. Return a weighted scoring table and notes for using it.",
  },
  {
    id: 38,
    type: "Weak translation",
    expectedScore: 42,
    description: "Translation request without audience or guardrails",
    prompt: "Translate this into French.",
  },
  {
    id: 39,
    type: "Change management",
    expectedScore: 90,
    description: "Change plan with role, audience segments, timeline, and outputs",
    prompt:
      "Act as a change management consultant. Build a 60-day adoption plan for introducing AI assistants to a 500-person company. Segment the plan by executives, managers, and individual contributors. Include communications, training, risks, metrics, and owner roles.",
  },
  {
    id: 40,
    type: "Creative brief",
    expectedScore: 85,
    description: "Creative brief with brand, audience, deliverables, and constraints",
    prompt:
      "You are a creative director. Write a campaign brief for HermanScience promoting personalized AI confidence training. Audience: HR leaders. Include campaign objective, key message, emotional tone, proof points, deliverables, and constraints to avoid generic AI hype.",
  },
];

const validationCases = [
  {
    id: 1,
    type: "Customer support",
    expectedScore: 82,
    description: "Refund support reply with tone and required sections",
    prompt:
      "Act as a customer support lead. Draft a reply to a customer who was charged twice after upgrading. Context: the billing team is already investigating. Use a calm, accountable tone. Include apology, current status, next step, expected timing, and escalation path.",
  },
  {
    id: 2,
    type: "Customer support",
    expectedScore: 46,
    description: "Light angry-customer reply",
    prompt: "Reply to this frustrated customer and make it sound more helpful.",
  },
  {
    id: 3,
    type: "Strategy",
    expectedScore: 84,
    description: "Market-entry strategy comparison",
    prompt:
      "You are a market strategy consultant. Compare three entry options for launching a prompt coaching product in healthcare, financial services, and professional services. Evaluate compliance risk, buyer urgency, sales cycle, and proof needed. Recommend one wedge and explain why.",
  },
  {
    id: 4,
    type: "Strategy",
    expectedScore: 55,
    description: "Light strategy decision",
    prompt: "Help me pick the best market for a new AI coaching product.",
  },
  {
    id: 5,
    type: "Product requirements",
    expectedScore: 89,
    description: "PRD for email confirmation flow",
    prompt:
      "Act as a senior product manager. Create a PRD for an email confirmation flow that verifies contest entrants before they are eligible to win. Include user stories, functional requirements, token expiration, resend behavior, error states, analytics events, and open questions.",
  },
  {
    id: 6,
    type: "Product requirements",
    expectedScore: 52,
    description: "Light PRD request",
    prompt: "Write a PRD for email verification.",
  },
  {
    id: 7,
    type: "Meeting agenda",
    expectedScore: 80,
    description: "Board prep agenda",
    prompt:
      "Create a 90-minute agenda for a board prep meeting about AI adoption metrics. Audience: CEO, COO, CFO, and People lead. Include objectives, timing, discussion prompts, decisions needed, pre-read, and owner for each section.",
  },
  {
    id: 8,
    type: "Meeting agenda",
    expectedScore: 43,
    description: "Light agenda request",
    prompt: "Make an agenda for a customer meeting.",
  },
  {
    id: 9,
    type: "Image prompt",
    expectedScore: 72,
    description: "Detailed illustration prompt",
    prompt:
      "Create an image prompt for a polished editorial illustration of a manager learning to write better AI prompts. Show a laptop, notes, confident expression, clean modern workspace, bright color palette, no text, and a professional optimistic mood.",
  },
  {
    id: 10,
    type: "Image prompt",
    expectedScore: 44,
    description: "Light image request",
    prompt: "Make an image about confident AI users.",
  },
  {
    id: 11,
    type: "Financial analysis",
    expectedScore: 84,
    description: "Unit economics review",
    prompt:
      "You are a finance analyst. Review this unit economics model for customer acquisition cost, payback period, gross margin, services cost, expansion revenue, and churn. Return a table with metric, concern, evidence needed, and recommendation.",
  },
  {
    id: 12,
    type: "Financial analysis",
    expectedScore: 50,
    description: "Light finance request",
    prompt: "Tell me if this forecast makes sense.",
  },
  {
    id: 13,
    type: "HR policy",
    expectedScore: 86,
    description: "AI disclosure policy",
    prompt:
      "Act as an HR policy partner. Draft a simple employee policy for when people should disclose AI use in client work. Audience: consultants and managers. Include scope, examples, approval process, privacy expectations, prohibited uses, and review cadence.",
  },
  {
    id: 14,
    type: "HR policy",
    expectedScore: 46,
    description: "Light policy request",
    prompt: "Create a policy for using AI at work.",
  },
  {
    id: 15,
    type: "Interview questions",
    expectedScore: 80,
    description: "Interview guide for product marketer",
    prompt:
      "Act as a hiring manager. Create 10 interview questions for a senior product marketer. Focus on positioning, launch planning, sales enablement, customer insight, and executive communication. For each question, include what a strong answer demonstrates.",
  },
  {
    id: 16,
    type: "Interview questions",
    expectedScore: 44,
    description: "Light interview prompt",
    prompt: "Give me interview questions for a sales role.",
  },
  {
    id: 17,
    type: "Ops checklist",
    expectedScore: 84,
    description: "Webinar launch checklist",
    prompt:
      "You are an operations manager. Build a checklist for launching a weekly prompt contest webinar. Organize it into planning, promotion, speaker prep, live event, and follow-up. Include owner, dependency, due date, risk, and success signal.",
  },
  {
    id: 18,
    type: "Ops checklist",
    expectedScore: 42,
    description: "Light checklist prompt",
    prompt: "Make a checklist for onboarding.",
  },
  {
    id: 19,
    type: "Research design",
    expectedScore: 88,
    description: "Interview study design",
    prompt:
      "Act as a UX researcher. Design a study to learn why managers avoid using AI tools for feedback coaching. Include research goals, participant criteria, 8 interview questions, analysis themes, and what each theme should reveal.",
  },
  {
    id: 20,
    type: "Research design",
    expectedScore: 48,
    description: "Light research prompt",
    prompt: "Make a few research questions about AI at work.",
  },
  {
    id: 21,
    type: "Personal productivity",
    expectedScore: 66,
    description: "Weekly planning system",
    prompt:
      "Help me create a weekly planning system. I want to block focus time, reduce context switching, track important commitments, and review what slipped. Return a Friday planning template and a Monday reset checklist.",
  },
  {
    id: 22,
    type: "Personal productivity",
    expectedScore: 36,
    description: "Light productivity prompt",
    prompt: "Help me manage my week better.",
  },
  {
    id: 23,
    type: "Procurement",
    expectedScore: 84,
    description: "AI vendor scoring rubric",
    prompt:
      "You are a procurement advisor. Create a weighted scoring rubric for choosing an AI enablement vendor. Criteria: security, integrations, training quality, reporting, admin controls, customer references, and implementation support. Include scoring guidance and notes for reviewers.",
  },
  {
    id: 24,
    type: "Procurement",
    expectedScore: 50,
    description: "Light vendor choice prompt",
    prompt: "Help me compare two software vendors.",
  },
  {
    id: 25,
    type: "Change management",
    expectedScore: 89,
    description: "Manager adoption plan",
    prompt:
      "Act as a change management consultant. Build a 45-day plan to help managers adopt AI coaching tools. Segment by senior leaders, managers, and HR partners. Include communications, training, reinforcement, risks, metrics, and owners.",
  },
  {
    id: 26,
    type: "Change management",
    expectedScore: 52,
    description: "Light adoption prompt",
    prompt: "Make a plan for AI adoption at work.",
  },
  {
    id: 27,
    type: "Creative brief",
    expectedScore: 84,
    description: "Lead-gen creative brief",
    prompt:
      "You are a creative director. Write a campaign brief for a lead-generation quiz about prompt confidence. Audience: HR leaders. Include objective, audience insight, key message, emotional tone, proof points, deliverables, and constraints.",
  },
  {
    id: 28,
    type: "Creative brief",
    expectedScore: 48,
    description: "Light campaign brief",
    prompt: "Write a campaign brief for an AI workshop.",
  },
  {
    id: 29,
    type: "Prompt coaching",
    expectedScore: 82,
    description: "Prompt review and rewrite",
    prompt:
      "Act as a prompt coach. Review this prompt for role, task, context, constraints, and output format. Identify the three biggest gaps, then return a revised prompt and a brief explanation of what changed.",
  },
  {
    id: 30,
    type: "Prompt coaching",
    expectedScore: 45,
    description: "Light prompt improvement",
    prompt: "Improve this prompt and tell me what you changed.",
  },
  {
    id: 31,
    type: "Business email",
    expectedScore: 86,
    description: "Executive change email",
    prompt:
      "Act as an executive communications coach. Draft an email from the CEO announcing a new AI learning initiative. Context: employees are excited but unsure how it affects their work. Include subject line, opening, three key points, reassurance, and next step.",
  },
  {
    id: 32,
    type: "Data analysis",
    expectedScore: 88,
    description: "Sales pipeline analysis",
    prompt:
      "You are a sales operations analyst. I have a CSV with rep, stage, deal size, next step date, close date, and forecast category. Identify stuck opportunities, calculate stage aging, return a ranked table, and recommend three manager actions.",
  },
  {
    id: 33,
    type: "Translation",
    expectedScore: 60,
    description: "Tone-aware translation",
    prompt:
      "Translate this renewal reminder into Spanish for a busy executive buyer. Preserve dates, links, and product names. Keep the tone concise, respectful, and clear. Do not add promises.",
  },
  {
    id: 34,
    type: "SQL",
    expectedScore: 86,
    description: "SQL with schema and explanation",
    prompt:
      "You are a data engineer. Write a PostgreSQL query using contacts, submissions, and winners. Find confirmed contacts with eligible submissions who have never won. Return the SQL and explain each join and filter.",
  },
  {
    id: 35,
    type: "Contract review",
    expectedScore: 86,
    description: "Contract review with boundaries",
    prompt:
      "Act as a contract review assistant, not a lawyer. Review a US SaaS agreement for a small business. Focus on renewal, termination, data rights, limitation of liability, and payment terms. Return a risk table with clause, severity, concern, and question for counsel.",
  },
  {
    id: 36,
    type: "Creative writing",
    expectedScore: 62,
    description: "Creative scene with tone and length",
    prompt:
      "Write a 350-word scene about a team discovering that their AI assistant misunderstood a vague prompt. Make it workplace-friendly, lightly funny, and end with a useful lesson.",
  },
  {
    id: 37,
    type: "Learning design",
    expectedScore: 88,
    description: "Workshop plan",
    prompt:
      "You are an instructional designer. Create a 60-minute workshop plan on writing better AI prompts for customer success managers. Include learning objectives, agenda, facilitator notes, practice activity, debrief, and reflection question.",
  },
  {
    id: 38,
    type: "Vague",
    expectedScore: 24,
    description: "Ultra-vague prompt",
    prompt: "Explain work.",
  },
  {
    id: 39,
    type: "Brainstorming",
    expectedScore: 76,
    description: "Campaign ideation with quantity and constraints",
    prompt:
      "You are a product marketer. Generate 10 low-cost campaign ideas for promoting a prompt coaching contest to sales enablement leaders. Avoid hype. For each idea, include target channel and one sentence explaining why it fits the audience.",
  },
  {
    id: 40,
    type: "Medical",
    expectedScore: 48,
    description: "Safe medical information request",
    prompt:
      "Explain common causes of mild wrist pain after typing, warning signs that should prompt urgent care, and what information to share with a clinician. Do not diagnose me or recommend medication.",
  },
];

const ruleDetailById = {
  1: {
    rootCause: "Near miss only. The score is low, but task receives modest credit for 'write', which is acceptable.",
    specificRule:
      "Keep as calibration anchor. No rule change. This prompt should stay below 35 because it has only a task verb and topic, with no role, audience, context, constraints, or output format.",
  },
  2: {
    rootCause: "The scorer underweights conversational task phrasing and light constraints.",
    specificRule:
      "Add task signal +10 for /\\b(tell me|give me|make me)\\b/. Add context signal +6 for /\\b(for a|for an)\\b/ followed by audience/use case. Add output signal +6 for tone/length constraints such as clean, friendly, short. Expected lift: +10 to +14 overall.",
  },
  3: {
    rootCause: "The current score is aligned. The missing-input penalty correctly lowers context.",
    specificRule:
      "Keep as calibration anchor. No rule change. Maintain missing referenced input penalty for /one of the words|the options|the list/ when no inline list marker such as colon/comma series follows.",
  },
  4: {
    rootCause: "The current score is aligned; task is slightly low because 'pick' is rewarded less than 'I want you to pick'.",
    specificRule:
      "Optional small change: add task signal +6 for /\\b(pick|select|choose) one of (these|the following)\\b/ when an inline option list is present. Keep total capped below 98 unless source/input completeness is explicit.",
  },
  5: {
    rootCause: "Strong business prompts are under-scored because audience, business context, tone, and deliverable details are treated as ordinary keyword matches.",
    specificRule:
      "Add business-communication bundle: if prompt includes role + draft/write + audience/persona + business context + output length/format, add +12 task, +14 context, +10 output. Signals: follow-up email, VP, webinar/demo, revenue/team, tone, subject line, word count.",
  },
  6: {
    rootCause: "The scorer misses focus-area lists and table-column specifications as high-value structure.",
    specificRule:
      "Add summary/report bundle: +10 task for summarize + notes/document/meeting, +14 context for executive audience plus focus list, +16 output for 'return a table with columns'. Treat named columns after 'columns for' as strong output evidence.",
  },
  7: {
    rootCause: "Technical debugging prompts need domain-specific signals; current context score is too low despite error and framework detail.",
    specificRule:
      "Add debugging bundle: +12 who for senior engineer/framework role, +14 task for debug/error/help me diagnose, +10 context for named framework + error message, +10 output for likely causes/checklist/safe pattern. Apply -6 context if no code sample or version is included.",
  },
  8: {
    rootCause: "Data-analysis prompts with inputs, metrics, calculations, and ranked recommendations are dramatically under-credited.",
    specificRule:
      "Add analytics bundle: +12 who for analyst role, +14 task for analyze/calculate/rank, +18 context for CSV/data fields/metrics list, +14 output for ranked table + recommendations. Signals: CSV, spend, impressions, clicks, leads, opportunities, CPC, CPL, cost per.",
  },
  9: {
    rootCause: "Translation/localization is a valid task type even without an explicit model role, and guardrails are underweighted.",
    specificRule:
      "Add localization bundle: +18 task for translate into language, +10 context for customer/support/nontechnical audience, +12 output for tone/preserve/do-not-add guardrails. Do not require role for translation prompts; max score around 70 without source text.",
  },
  10: {
    rootCause: "Ideation prompts with quantity, audience, practical constraints, and explanation requirements are under-scored.",
    specificRule:
      "Add ideation bundle: +12 task for generate/brainstorm + quantity, +12 context for audience and practical constraints, +12 output for include/explain/insight behind each. Signals: ideas, campaign, HR leaders, avoid hype, one sentence.",
  },
  11: {
    rootCause: "Risk-review prompts deserve some structure credit, but high-stakes domains need missing-scope penalties.",
    specificRule:
      "Add review bundle: +10 task for review/tell me risky/issues/questions, +8 output for bullet list/questions. Add high-stakes penalty -10 context when contract/legal/medical/financial prompts omit jurisdiction, reviewer role boundary, or scope.",
  },
  12: {
    rootCause: "Strong high-stakes prompt is under-scored because role boundary, jurisdiction, focus areas, and risk-table output are not recognized.",
    specificRule:
      "Add high-stakes structured-review bundle: +12 who for assistant/not-a-lawyer boundary, +14 context for jurisdiction/business type/focus areas, +16 output for risk table with named columns, +8 task for review agreement/vendor. Expected lift: +20 to +28 overall.",
  },
  13: {
    rootCause: "Creative-writing constraints are under-recognized, but the prompt should not score as high as business/analysis prompts.",
    specificRule:
      "Add creative bundle: +10 task for write/opening scene/story, +8 context for genre/setting, +10 output for style adjectives and word count. Cap creative prompts at 70 unless audience/purpose/use case is included.",
  },
  14: {
    rootCause: "Instructional-design structure is under-scored because learning objectives, timing, agenda, activities, and facilitator notes are not recognized.",
    specificRule:
      "Add learning-design bundle: +12 who for instructional designer/trainer, +12 task for lesson plan, +14 context for audience + duration, +16 output for learning objectives/agenda/facilitator notes/activity/reflection.",
  },
  15: {
    rootCause: "Planning prompts with constraints and grouped outputs are under-scored.",
    specificRule:
      "Add planning bundle: +12 task for create plan, +14 context for constraints list and household/audience, +14 output for table + grouped shopping/list. Signals: 5-day, constraints, under X minutes, grouped by, reduce waste.",
  },
  16: {
    rootCause: "Rewrite/editing prompts with target role and before/after output are under-scored.",
    specificRule:
      "Add rewrite/career bundle: +12 who for coach, +14 task for rewrite/revise bullets, +14 context for target job/role and source count, +14 output for before-and-after plus explanation. Signals: resume, ATS, measurable, action-oriented.",
  },
  17: {
    rootCause: "Technical-generation prompts with schema/table names and SQL output are under-scored.",
    specificRule:
      "Add SQL/code-generation bundle: +12 who for data engineer, +14 task for write query/SQL, +18 context for database, tables, filters, thresholds, time windows, +12 output for return SQL plus plain-English explanation.",
  },
  18: {
    rootCause: "The current score is aligned. Ambiguous summarization should remain low.",
    specificRule:
      "Keep as calibration anchor. No rule change. Add no credit for 'make it better' unless criteria, audience, or output format are provided.",
  },
  19: {
    rootCause: "Research-synthesis prompts with source count, analytic lenses, and decision outputs are under-scored.",
    specificRule:
      "Add synthesis bundle: +12 who for strategist/researcher, +14 task for synthesize/identify themes, +18 context for source count/domain/friction topic, +16 output for themes + quote snippets + confidence + implications.",
  },
  20: {
    rootCause: "Social/content prompts with voice, audience, structure, and CTA are under-scored.",
    specificRule:
      "Add content-creation bundle: +12 task for draft post/email/message, +12 context for audience/persona/channel, +14 output for hook/story/takeaways/CTA, +8 output for voice/tone guardrails. Cap around 85 without examples/source material.",
  },
};

function snippet(prompt) {
  return prompt.length > 118 ? `${prompt.slice(0, 115)}...` : prompt;
}

function percentMiss(delta, expectedScore) {
  return Number(((Math.abs(delta) / expectedScore) * 100).toFixed(1));
}

function sourceSet(id) {
  return "Fresh 40";
}

function recommendationFor(row) {
  if (Math.abs(row.delta) <= 7) {
    return "Within tolerance after rule update. No further heuristic change recommended for this case.";
  }

  const direction = row.delta < 0 ? "under-scored" : "over-scored";
  const lowDimensions = [
    ["Who", row.score.whoScore],
    ["Task", row.score.taskScore],
    ["Context", row.score.contextScore],
    ["Output", row.score.outputScore],
  ]
    .filter(([, value]) => value < row.expectedScore - 10)
    .map(([name]) => name)
    .join(", ");

  if (row.delta < 0) {
    const common = `Still ${direction} by ${Math.abs(row.delta)} points (${percentMiss(row.delta, row.expectedScore)}%). Lowest relative dimensions: ${lowDimensions || "none obvious"}.`;
    const recommendations = {
      "Customer support":
        "Add support-response bundle: +12 who for support lead, +12 task for draft response, +14 context for frustrated/admin/integration/prior step, +14 output for apology/troubleshooting/escalation/closing.",
      Strategy:
        "Add strategy-comparison bundle: +12 who for advisor, +14 task for compare/evaluate/recommend, +12 context for named options and criteria, +10 output for tradeoff explanation.",
      "HR policy":
        "Add policy-draft bundle: +12 who for HR partner, +14 task for draft policy, +16 context for company size/audience/policy topics, +12 output for named sections and practical tone.",
      "Math tutoring":
        "Add tutoring bundle: +14 who for tutor, +12 task for explain/teach, +10 context for student level, +12 output for example/steps/practice problems.",
      Medical:
        "Add safe-health-info bundle with cap: +8 task for explain causes/warning signs, +8 output for doctor-info checklist, +8 safety for do-not-diagnose, but cap overall near 55 without age/history/severity context.",
      "Product requirements":
        "Add product-requirements bundle: +14 who for product manager, +16 task for PRD/requirements, +14 context for admin dashboard/users/actions, +16 output for user stories/requirements/edge cases/metrics/questions.",
      "Meeting agenda":
        "Add agenda bundle: +12 task for create agenda, +12 context for duration/audience/topic, +14 output for objectives/timing/questions/decisions/prework.",
      "Image prompt":
        "Add image-prompt bundle: +12 task for create image prompt, +10 context for subject/setting, +14 output for composition/style/negative constraints such as no text.",
      "Financial analysis":
        "Add financial-analysis bundle: +14 who for finance analyst, +14 task for review/analyze, +16 context for metrics list, +14 output for assumption-risk-evidence-owner table; apply high-stakes context cap if no source numbers are included.",
      "Interview questions":
        "Add interview-guide bundle: +12 who for hiring manager, +12 task for create questions, +12 context for target role/competencies, +14 output for strong-answer rubric.",
      "Email rewrite":
        "Add edit/rewrite bundle for non-resume content: +12 task for rewrite, +8 context for tone constraints, +12 output for revised version plus change list.",
      "Ops checklist":
        "Add operations-checklist bundle: +12 who for ops manager, +14 task for build checklist, +12 context for launch/team/workflow, +14 output for phases/owner/dependency/success signal.",
      "Research design":
        "Add survey/research-design bundle: +14 who for UX researcher, +14 task for design survey, +12 context for audience/research goal, +16 output for question types/themes/measurement explanation.",
      "Personal productivity":
        "Add lightweight planning bundle for personal workflows: +10 task for plan/template, +8 context for stated goals, +10 output for reusable template; cap near 70 without schedule constraints.",
      Procurement:
        "Add rubric/evaluation bundle: +12 who for advisor, +14 task for rubric/evaluation, +12 context for criteria list, +16 output for weighted scoring table and usage notes.",
      "Change management":
        "Add change-management bundle: +14 who for consultant, +16 task for adoption/change plan, +16 context for timeline/company size/audience segments, +16 output for comms/training/risks/metrics/owners.",
      "Creative brief":
        "Add creative-brief bundle: +14 who for creative director, +14 task for campaign brief, +12 context for brand/audience, +16 output for objective/message/tone/proof/deliverables/constraints.",
      "Business email":
        "Tune business-communication bundle for executive-email prompts: add +8 who for communications coach, +8 context for employee concern/change context, and +8 output for subject/opening/bullets/next step.",
      "Prompt coaching":
        "Add prompt-coaching bundle: +12 who for prompt coach, +14 task for review/improve prompt, +12 context for scoring criteria, +14 output for weaknesses plus revised version.",
      Vague:
        "No positive rule update. Keep vague prompts low; if over-scored, reduce base length/task credit for prompts under 6 words.",
    };
    return `${common} ${recommendations[row.type] || "Consider adding a task-specific bundle with role, action, input/context, and output-format signals for this task family."}`;
  }

  return `Over-scored by ${row.delta} points (${percentMiss(row.delta, row.expectedScore)}%). Add a cap or penalty for missing source material, missing audience, missing constraints, or high-stakes domain context.`;
}

const rows = validationCases.map((item) => {
  const score = scorePrompt(item.prompt);
  const delta = score.overallScore - item.expectedScore;
  const row = {
    ...item,
    score,
    delta,
    absDelta: Math.abs(delta),
    missPercent: percentMiss(delta, item.expectedScore),
    miss: Math.abs(delta) >= 8 ? "Review" : "Close",
    sourceSet: sourceSet(item.id),
  };
  return {
    ...row,
    rootCause:
      Math.abs(delta) <= 7
        ? "Post-rule score is within tolerance for this validation case."
        : `Post-rule score is ${delta < 0 ? "below" : "above"} expected for this validation case.`,
    specificRule: recommendationFor(row),
  };
});

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const detail = workbook.worksheets.add("Audit Results");

summary.showGridLines = false;
detail.showGridLines = false;

summary.getRange("A1:H1").merge();
summary.getRange("A1").values = [["HermanCoach Heuristic Scoring Audit"]];
summary.getRange("A1").format = {
  fill: "#111A35",
  font: { bold: true, color: "#FFFFFF", size: 18 },
};
summary.getRange("A3:B9").values = [
  ["Prompts Tested", rows.length],
  ["Average Heuristic Score", Number((rows.reduce((sum, row) => sum + row.score.overallScore, 0) / rows.length).toFixed(1))],
  ["Average Expected Score", Number((rows.reduce((sum, row) => sum + row.expectedScore, 0) / rows.length).toFixed(1))],
  ["Average Absolute Miss", Number((rows.reduce((sum, row) => sum + Math.abs(row.delta), 0) / rows.length).toFixed(1))],
  ["Average Miss %", `${Number((rows.reduce((sum, row) => sum + row.missPercent, 0) / rows.length).toFixed(1))}%`],
  ["Review Threshold", "Absolute delta >= 8"],
  ["Cases Flagged For Review", rows.filter((row) => row.miss === "Review").length],
];
summary.getRange("A3:A9").format = { font: { bold: true }, fill: "#E8F1FF" };
summary.getRange("B3:B9").format = { font: { bold: true }, fill: "#F8FAFC" };

summary.getRange("A11:G11").values = [["ID", "Set", "Type", "Heuristic", "Expected", "Delta", "Miss %"]];
summary.getRange("A11:G11").format = {
  fill: "#05A8E8",
  font: { bold: true, color: "#FFFFFF" },
};
summary.getRange("A12:G51").values = rows.map((row) => [
  row.id,
  row.sourceSet,
  row.type,
  row.score.overallScore,
  row.expectedScore,
  row.delta,
  row.missPercent,
]);
summary.getRange("A11:G51").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
summary.getRange("D12:F51").format.numberFormat = "0";
summary.getRange("G12:G51").format.numberFormat = "0.0";

const headers = [
  "ID",
  "Set",
  "Prompt Snippet",
  "Prompt Description",
  "Task Type",
  "Heuristic Score",
  "Expected Score",
  "Delta",
  "Abs Delta",
  "Miss %",
  "Miss Status",
  "Who",
  "Task",
  "Context",
  "Output",
  "Root Cause",
  "Specific Rule Update",
  "Full Prompt",
];

detail.getRange("A1:R1").values = [headers];
detail.getRange("A1:R1").format = {
  fill: "#111A35",
  font: { bold: true, color: "#FFFFFF" },
};
detail.getRange(`A2:R${rows.length + 1}`).values = rows.map((row) => [
  row.id,
  row.sourceSet,
  snippet(row.prompt),
  row.description,
  row.type,
  row.score.overallScore,
  row.expectedScore,
  row.delta,
  row.absDelta,
  row.missPercent,
  row.miss,
  row.score.whoScore,
  row.score.taskScore,
  row.score.contextScore,
  row.score.outputScore,
  row.rootCause,
  row.specificRule,
  row.prompt,
]);

detail.getRange(`A1:R${rows.length + 1}`).format.borders = {
  preset: "all",
  style: "thin",
  color: "#D9E2F3",
};
detail.getRange(`C2:D${rows.length + 1}`).format.wrapText = true;
detail.getRange(`P2:R${rows.length + 1}`).format.wrapText = true;
detail.getRange(`F2:O${rows.length + 1}`).format.numberFormat = "0";
detail.getRange(`J2:J${rows.length + 1}`).format.numberFormat = "0.0";
detail.freezePanes.freezeRows(1);
summary.freezePanes.freezeRows(10);

detail.getRange("A:A").format.columnWidthPx = 52;
detail.getRange("B:B").format.columnWidthPx = 110;
detail.getRange("C:C").format.columnWidthPx = 330;
detail.getRange("D:D").format.columnWidthPx = 240;
detail.getRange("E:E").format.columnWidthPx = 140;
detail.getRange("F:O").format.columnWidthPx = 104;
detail.getRange("P:P").format.columnWidthPx = 340;
detail.getRange("Q:Q").format.columnWidthPx = 560;
detail.getRange("R:R").format.columnWidthPx = 520;
summary.getRange("A:A").format.columnWidthPx = 190;
summary.getRange("B:G").format.columnWidthPx = 120;

detail.tables.add(`A1:R${rows.length + 1}`, true, "ScoringAuditTable");
summary.tables.add("A11:G51", true, "ScoreSummaryTable");

detail.getRange(`H2:H${rows.length + 1}`).conditionalFormats.add("cellIs", {
  operator: "lessThan",
  formula: -7,
  format: { fill: "#FDE2E2", font: { color: "#991B1B", bold: true } },
});
detail.getRange(`H2:H${rows.length + 1}`).conditionalFormats.add("cellIs", {
  operator: "greaterThan",
  formula: 7,
  format: { fill: "#FEF3C7", font: { color: "#92400E", bold: true } },
});
detail.getRange(`K2:K${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Review",
  format: { fill: "#FEF3C7", font: { color: "#92400E", bold: true } },
});

const render = await workbook.render({
  sheetName: "Audit Results",
  range: "A1:R12",
  scale: 1,
  format: "png",
});
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "audit_results_preview.png"), new Uint8Array(await render.arrayBuffer()));

const inspect = await workbook.inspect({
  kind: "table",
  range: "Audit Results!A1:R8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 18,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(JSON.stringify({ outputPath, rows: rows.length }, null, 2));
