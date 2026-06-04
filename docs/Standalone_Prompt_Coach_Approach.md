# Standalone Prompt Coach Approach

## Purpose

This document outlines a proposed approach for creating a new standalone Prompt Coach application inspired by the existing Herman Prompt Guide Me experience.

The standalone app would let a user enter a proposed prompt, score it against four prompt-quality criteria, guide the user through improving weak areas, and produce a final prompt that can be copied into any LLM product of the user's choice.

This should be treated as a new application, not as a route or reduced mode inside Herman Prompt.

## Product Goal

The app should function first as a marketing-oriented prompt challenge and lead-capture tool, then unlock a reusable prompt coaching experience after entry.

The commercial message is not that prompt structure coaching is the only or deepest value. The unlocked coach should be treated as a valuable benefit of entering the challenge, but the larger strategic value being sold is HermanScience personalization: depending on the task, personalization can contribute up to 72.6% of the quality of the results.

This means the app should use the unlocked coach as a proof point and conversion path toward CQI and the full Herman prompting tool.

The public experience should invite users to submit their best prompt, receive a high-level score, and then enter contact information to unlock detailed results, comparison placement, contest entry, and the full Prompt Coach.

Core acquisition workflow:

1. User enters a proposed prompt.
2. App evaluates the prompt against four criteria:
   - Who
   - Task
   - Context
   - Output
3. App shows an overall score and short plain-language feedback.
4. App asks the user to enter contact information to see detailed results, compare their placement, enter the weekly contest, and unlock coaching.
5. App creates a personalized access URL for the user.
6. App reveals detailed scores, ranking/placement, and the full coaching experience.
7. User can return directly to the Prompt Coach through their personalized URL.

Core coaching workflow after unlock:

1. User accesses the coach through their personalized URL.
2. App shows detailed scores by dimension:
   - Who
   - Task
   - Context
   - Output
3. App guides the user through targeted improvement questions.
4. App maintains and displays an improved working draft.
5. App produces a final structured prompt.
6. User copies the final prompt into ChatGPT, Claude, Gemini, Perplexity, a local model, or another LLM tool.

The product should not require users to send the final prompt to an LLM inside the product.

## Contest And Access Model

The contest should use a random weekly drawing rather than awarding the prize to the highest-scoring prompt. This reduces the incentive to cheat, over-optimize, or game the scoring rubric.

Contest rules for the MVP:

- One contest entry per email address.
- Once entered, a user remains eligible for future weekly drawings unless they unsubscribe, are removed, or become otherwise ineligible.
- Email confirmation should be used to validate prize eligibility and list quality.
- Coach access should unlock immediately after entry, even before email confirmation.
- The submitted prompt score should be used for feedback and comparison, not for selecting the weekly prize winner.
- Basic abuse controls should still apply, such as character limits, empty prompt rejection, and spam review.

After a valid contest entry, the app should create a unique, unguessable personalized coach URL, such as:

```text
/u/7f4a9d2b81...
```

This URL should let the user return directly to the unlocked Prompt Coach without re-entering the contest. It should not expose the user's email address or other contact information.

Returning-user behavior:

- If a user opens their personalized URL, send them directly to the coach experience.
- If a user tries to enter again with the same email, do not create a second contest entry. Instead, resend or redisplay their existing personalized coach URL.
- Coach usage after entry should be treated as normal product usage, not as additional contest entries.

## Personalization Teaser Model

The product should make the HermanScience personalization angle explicit. The core thesis is that effective LLM use depends on three interacting factors:

1. Prompt structure: whether the prompt clearly defines Who, Task, Context, and Output.
2. Human personality / workstyle: how the user communicates with and interprets the LLM.
3. The LLM being used: different models respond differently because they are trained, tuned, and aligned differently.

The standalone Prompt Coach should directly improve prompt structure, but it should only offer minimal personalization guidance. Its job is to show that personalization matters, not to replace the CQI or the full Herman prompting experience.

Positioning principle:

```text
Good structure is like being book smart. True performance comes from developing personalized talent.
```

The app should use personalization as a teaser and education layer that encourages users to take the CQI and use the full Herman prompting tool for deeper personalization.

Core positioning:

- Prompt structure coaching is valuable and useful, but it is not the full HermanScience advantage.
- Personalization is the differentiator and the thing HermanScience is selling.
- Depending on the task, personalization can contribute up to 72.6% of the quality of the results.
- The unlocked coach should make the user feel the gap between a structurally better prompt and a truly personalized AI interaction.
- The primary conversion goal is to move users from the unlocked coach into CQI and the full Herman prompting experience.

Personality should not be treated as a fifth scoring dimension. The four scoring dimensions should remain universal:

- Who
- Task
- Context
- Output

Personality should be treated as a light interpretive layer, not a full coaching engine inside this product.

Use the HermanScience / CQI personality type names rather than numeric type labels:

- Reformer
- Helper
- Achiever
- Individualist
- Investigator
- Loyalist
- Enthusiast
- Challenger
- Peacemaker

Public UX implications:

- The contest prompt should stay low-friction and should not require a personality selector before the first score.
- The detailed scoring reveal may infer or suggest a likely communication/personality pattern from the submitted prompt, but this should be presented as a light teaser.
- The inference should be framed carefully as a hypothesis, not a diagnosis. Example: "Your prompt reads like it may fit an Investigator-style approach because it asks for evidence, detail, and analysis."
- The app should invite the user to take the CQI for a real profile rather than asking the coach to fully personalize from a single prompt.
- The coach may include one or two static personalization tips, but should not deeply adapt every question or rewrite to a type.
- The full personalization promise should point to the real Herman prompting tool.

Detailed scoring reveal should show:

- Overall prompt score.
- Four structure scores.
- Weekly and all-time placement.
- A light personalization teaser.
- A short note that the submitted prompt may suggest a communication pattern, if inference is used.
- A CTA to take the CQI for a real profile.
- A CTA to use the full Herman prompting tool for deeper personalization.

Static personalization teaser examples:

- "Want even better LLM results? Personalize the prompt to how you think, decide, and interpret answers."
- "Prompt structure gets you clearer responses. CQI personalization helps the response fit the person using it."
- "A strong prompt tells the model what to do. A personalized prompt helps the model communicate in a way you can act on."
- "Good structure is like being book smart. True performance comes from developing personalized talent."

If light type-based tips are used, keep them concise:

- Reformer: emphasize accuracy, standards, criteria, and quality checks.
- Helper: emphasize audience needs, empathy, usefulness, and support.
- Achiever: emphasize goals, outcomes, efficiency, and measurable success.
- Individualist: emphasize voice, originality, nuance, and personal expression.
- Investigator: emphasize evidence, definitions, assumptions, and depth.
- Loyalist: emphasize risks, constraints, reliability, and second-order effects.
- Enthusiast: emphasize options, creative directions, momentum, and next steps.
- Challenger: emphasize directness, authority, decisions, and control.
- Peacemaker: emphasize clarity, alignment, balance, and reducing ambiguity.

LLM-specific adaptation should also remain a teaser or later enhancement. The MVP can mention that different models respond differently, but should focus implementation on prompt structure, lead capture, and conversion toward CQI / Herman prompting.

## Reusable Herman Transformer Personalization Elements

The personality leaning dimensions already exist in `prompt_transformer` and should be reused or ported into this standalone app instead of recreated from scratch.

Primary source files:

- `/Users/michaelanderson/projects/prompt_transformer/app/rules/summary_personas.yaml`
- `/Users/michaelanderson/projects/prompt_transformer/app/services/profile_resolver.py`
- `/Users/michaelanderson/projects/prompt_transformer/app/models/profile.py`
- `/Users/michaelanderson/projects/prompt_transformer/app/services/profile_builder.py`
- `/Users/michaelanderson/projects/prompt_transformer/app/services/transformer_engine.py`
- `/Users/michaelanderson/projects/prompt_transformer/app/rules/llm_policies.yaml`
- `/Users/michaelanderson/projects/prompt_transformer/app/rules/llm_provider_profiles.yaml`

The existing personality leaning fields are:

- `structure`
- `answer_first`
- `tone_directness`
- `detail_level`
- `ambiguity_reduction`
- `exploration_level`
- `context_loading`

`summary_personas.yaml` defines a generic default and nine summary type profiles using those fields. The standalone app should map those summary type profiles to the public HermanScience type names:

- `1` -> Reformer
- `2` -> Helper
- `3` -> Achiever
- `4` -> Individualist
- `5` -> Investigator
- `6` -> Loyalist
- `7` -> Enthusiast
- `8` -> Challenger
- `9` -> Peacemaker

`profile_resolver.py` defines the canonical `PROFILE_FIELDS` list and returns a resolved persona from either:

- a summary type override, or
- a persisted final profile.

For the standalone MVP, these rules should primarily inform static educational copy and light teaser language. Later, if HermanScience CQI profiles are integrated, the app can reuse the layered profile approach from `profile_builder.py`, where foundational type details can be overlaid by brain chemistry, environment details, and behavioral adjustment layers.

`transformer_engine.py` uses the resolved personality values to generate prompt adaptation instructions. The standalone coach can reference the same behavioral thresholds and instruction patterns for teaser copy, but should reserve deep adaptation for the full Herman prompting tool:

- `answer_first >= 0.65`: start with the direct answer before supporting detail.
- `structure >= 0.75`: use clearly labeled structure with concise sections or bullets.
- `structure <= 0.35`: keep structure lightweight and natural instead of rigid.
- `detail_level >= 0.8`: include substantive detail, examples, and explicit reasoning.
- `detail_level <= 0.35`: keep the response brief and focused on essentials.
- `ambiguity_reduction >= 0.75`: state assumptions, constraints, and next actions explicitly.
- `exploration_level >= 0.75`: offer multiple angles or options before converging.
- `exploration_level <= 0.3`: prefer one strong recommendation instead of many alternatives.
- `context_loading >= 0.75`: load helpful context proactively.
- `context_loading <= 0.3`: avoid extra background unless required.
- `tone_directness >= 0.7`: use direct, confident phrasing.
- `tone_directness <= 0.35`: use a softer, more exploratory tone.

The third factor, the LLM being used, is represented in `llm_policies.yaml` and `llm_provider_profiles.yaml`. These files define provider/model-specific behavior such as:

- `structure_preference`
- `format_strictness`
- `verbosity`
- `stepwise`
- supported provider/model metadata

For MVP, the app can keep LLM-specific adaptation as an educational note or optional selector. For a later version, the coach can ask which model the user plans to use and adapt final prompt recommendations based on the matching model policy.

## Hosting, Data, And Brand Constraints

The application should be hosted on Railway and backed by a Railway-managed or Railway-connected Postgres database.

Production infrastructure assumptions:

- Deploy the web app and any backend API from Railway.
- Use Postgres as the primary system of record.
- Store contacts, contest entries, score results, personalized access tokens, email confirmation tokens, and coach sessions in Postgres.
- Keep the `/u/{token}` route backed by a long, random, unguessable token stored in Postgres.
- Use email confirmation to mark a contact as prize-eligible, but do not require confirmation before the user can access the unlocked coach.
- Keep the architecture simple enough to run as a single web service for the MVP unless the email worker or scoring service clearly needs to be separated later.

The app should use HermanScience branding and follow the HermanScience brand guide.

Brand implementation notes from the current guide:

- Brand name: HermanScience.
- Tagline / promise: Creating AI-confident workforces.
- Brand personality: intelligent, modern, professional, trustworthy, optimistic, and human-centered.
- Core idea: AI adoption improves when the experience adapts to the way each person thinks, communicates, learns, and works.
- Primary audience: organizations implementing AI, enterprise buyers, workforce enablement leaders, security/governance stakeholders, consultants, MSPs, and partners.
- Visual style: enterprise-grade SaaS polish with human-centered AI language, not playful consumer-tech styling.
- Primary palette:
  - Background Black: `#0D0D0D`
  - Panel White: `#FFFFFF`
  - Panel Border: `#4E8AD929`
  - Brand Purple: `#7471D9`
  - Brand Blue: `#4E8AD9`
  - Brand Soft Blue: `#D8E6FF`
  - Accent Cyan: `#05C7F2`
  - Muted Slate: `#334155`
  - Danger Rose: `#D96A7F`
- Typography: use `"Segoe UI", Aptos, Arial, Helvetica, sans-serif` for UI and `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace` for prompt/code boxes.
- Layout: use a dark atmospheric page background, white or soft-blue cards, generous rounded panels, subtle shadows, and a max content width near `1220px`.
- Logo: use the full horizontal HermanScience logo with the "Creating AI-confident Workforces" tagline and TM marker.
- Logo source asset: `/Users/michaelanderson/Library/CloudStorage/Dropbox/1_GTMNow/Herman Science/Website/HermanScience_com v3/Website Assets/logo.png`.
- Favicon / app icon: use the HermanScience face icon.
- Favicon source asset: `/Users/michaelanderson/Library/CloudStorage/Dropbox/1_GTMNow/Herman Science/Graphics/Face icon logo small.jpg`.
- Header: place the full horizontal HermanScience logo inside a sticky white rounded navigation row when the final UI includes navigation or brand framing.
- Buttons: use pill-shaped primary CTAs, with Brand Purple or cyan-blue-purple gradients and white text.
- Prompt entry: use a light gray/blue prompt box with monospace text so the entry surface feels familiar to users of LLM tools.
- Copy voice: clear, professional, confident, modern, intelligent, helpful, optimistic about AI, and realistic about adoption friction.
- Avoid: hype-only AI language, fear-based AI messaging, generic "AI transformation" copy, robotic cliches, or overly technical jargon.

## Recommendation

Use a hybrid approach:

**Clean standalone app, reused product logic.**

Do not fork Herman Prompt wholesale. Do not build everything from scratch either. Instead, create a new app with its own identity, state model, routes, deployment, and UX surface, while intentionally extracting proven pieces from:

- `herman-prompt`
- `herman_transform`

This gives the new product a simple architecture while still fast-tracking it with existing Guide Me and scoring work.

## Why Not a Pure Clean Build

A fully clean build would avoid coupling, but it would likely recreate work that already exists:

- Guide Me flow behavior
- prompt field parsing
- prompt draft assembly
- section-level indicator UI
- field-specific coaching logic
- heuristic scoring rules
- scoring thresholds and rubric language

Those pieces encode useful product learning and should be reused where practical.

## Why Not a Direct Extraction

A direct extraction from Herman Prompt would bring too much unrelated complexity:

- chat transcript UI
- conversation sidebar
- session bootstrap and auth assumptions
- attachment handling
- feedback flow
- LLM-provider routing
- Prompt Transformer integration paths
- deployment assumptions tied to the existing Herman Prompt app

The standalone Prompt Coach should remain focused on prompt scoring, coaching, refinement, and copy/export.

## Candidate Reuse From Herman Prompt

Reusable areas:

- Guide Me flow structure:
  - session start
  - targeted question steps
  - refinement mode
  - final prompt preview
  - restart behavior

- Guide Me UI concepts:
  - four requirement indicators
  - question panel
  - answer input
  - progress and busy states
  - draft preview
  - final formatted prompt display

- Prompt-state methods:
  - parsing labeled prompt sections
  - merging user answers into prompt fields
  - preserving user wording
  - assembling final labeled prompt text

- UX behavior:
  - do not ask for sections that are already strong
  - move from structure collection into specificity refinement
  - avoid looping on the same question
  - show practical progress toward prompt readiness

Areas to avoid:

- main chat shell
- conversation storage model
- auth/session bootstrap
- personal context documents
- feedback modal
- LLM response generation
- Prompt Transformer request orchestration

## Candidate Reuse From Herman Transform

Reusable areas:

- four-criteria scoring rubric:
  - Who
  - Task
  - Context
  - Output

- heuristic scoring rules
- section-level scoring outputs
- scoring thresholds
- improvement hints
- reason strings or explainability metadata

Areas to avoid or isolate:

- full prompt transformation pipeline, unless the standalone coach explicitly needs it
- external LLM scoring dependencies for the MVP
- enforcement behavior intended to block or modify chat requests
- Herman Prompt-specific client contracts

## Proposed Architecture

The standalone app should have a clean domain model centered on a contest submission, a contact record, and an unlocked prompt draft workspace.

```text
prompt-coach
  frontend
    splash / promotional copy
    contest prompt entry
    overall score teaser
    contact capture
    detailed score and placement reveal
    personalization teaser
    personalized coach access at /u/{token}
    guided coaching flow
    draft preview
    final copy/export panel

  backend
    contest entry storage
    contact and email verification
    personalized access token creation
    weekly random drawing eligibility
    ranking and placement calculation

  postgres
    contacts
    contest_entries
    score_results
    access_tokens
    email_confirmations
    coach_sessions

  scoring and coaching module
    parse prompt
    score four criteria
    generate light personalization teaser
    choose next coaching step
    merge answers
    assemble final prompt

  shared prompt-coaching logic
    scoring rubric
    heuristic rules
    personalization teaser rules
    section parser
    draft model
    coaching step selection
```

For the MVP, the scoring and coaching logic could still be implemented as a small shared module, but the marketing funnel needs a backend for contest entry storage, contact capture, email verification, personalized access links, and ranking/placement.

## UI Screens And Routes

The public MVP should use four primary screens or screen states, with one optional admin screen for operations.

Recommended public flow:

```text
Landing / Prompt Challenge
  -> Score Teaser / Contact Gate
  -> Detailed Results / Contest Confirmation
  -> Prompt Coach at /u/{token}
```

### 1. Landing / Prompt Challenge

Purpose: invite the user to submit their best prompt.

Core elements:

- HermanScience branding.
- Promotional copy such as "Prompting is personal."
- Short challenge explanation.
- One LLM-style prompt input.
- Character limit.
- Submit button.
- Short contest note, such as "Enter once for weekly drawing eligibility."

This screen should not show detailed scoring dimensions, coaching questions, or a leaderboard yet.

### 2. Score Teaser / Contact Gate

Purpose: show enough feedback to create curiosity and motivate contact capture.

Core elements:

- Overall score.
- Short plain-language feedback.
- Contact capture form.
- CTA explaining that contact entry unlocks ranking, detailed scoring, contest entry, and the coach.

This can be implemented as a separate visual state on the landing route rather than a separate route.

### 3. Detailed Results / Contest Confirmation

Purpose: reward entry and confirm the user has unlocked the product.

Core elements:

- Contest entry confirmation.
- Personalized coach URL.
- Email confirmation notice for prize eligibility.
- Overall score.
- Weekly placement.
- All-time placement.
- Dimension scores:
  - Who
  - Task
  - Context
  - Output
- Dimension-level feedback.
- CTA to improve the submitted prompt.

### 4. Prompt Coach

Purpose: provide the reusable unlocked coaching tool.

Core elements:

- Prompt input or current working draft.
- Four score indicators.
- Guided coaching question panel.
- Working draft preview.
- Final prompt copy/export.
- Option to score and improve another prompt.

The personalized URL should route directly to this unlocked coach experience, while still allowing the app to show the user's original score and placement where useful.

### Optional 5. Admin / Drawing Dashboard

Purpose: support contest operations.

Potential elements:

- Entry list.
- Email confirmation status.
- Drawing eligibility.
- Random winner selection.
- Contact export.
- Spam review or disqualification controls.

This is not required for the first public MVP, but it is likely useful once the contest is live.

### Route Recommendation

Implement the public MVP as two main routes and four screen states:

- `/`: landing, prompt submission, score teaser, and contact gate.
- `/u/{token}`: detailed results and reusable coach access.

This keeps routing simple while preserving a clear staged user journey.

## Suggested API Contract

If implemented with a backend, keep the contract narrow and product-specific.

Potential endpoints:

```text
POST /score
POST /entries
POST /entries/resend-link
GET /u/{token}
POST /email/confirm
POST /coach/start
POST /coach/respond
POST /coach/draft
POST /coach/finalize
```

Example responsibilities:

- `/score`: parse and score a prompt against the four criteria.
- `/entries`: create a one-time contest entry for an email address, create or reuse the personalized coach URL, and unlock detailed results.
- `/entries/resend-link`: resend the existing personalized URL when a returning user enters an email that is already registered.
- `/u/{token}`: resolve a personalized access token and load the unlocked coach experience.
- `/email/confirm`: validate an email confirmation token and mark the contact as confirmed for prize eligibility.
- `/coach/start`: initialize a coaching session from a proposed prompt.
- `/coach/respond`: accept a user answer and update the working draft.
- `/coach/draft`: manually update or re-score the draft.
- `/coach/finalize`: return the final copy-ready prompt.

The contract should not assume a chat conversation or downstream LLM response.

## MVP Scope

Recommended MVP:

- standalone app shell
- splash screen with promotional copy and simple instructions
- LLM-style prompt input with a character limit
- overall score teaser with short feedback
- contact capture form
- one entry per email address
- personalized coach URL in the form `/u/{token}`
- email confirmation flow for prize eligibility
- detailed score reveal after entry
- weekly and all-time placement display
- light personalization teaser
- CTAs to take the CQI and use the full Herman prompting tool
- four-part score dashboard after unlock
- heuristic scoring only
- guided questions for missing or weak sections
- working draft preview
- final formatted prompt
- copy-to-clipboard
- persistent coach access through the personalized URL

Out of scope for MVP:

- password-based user accounts
- conversation history
- file attachments
- LLM answer generation
- provider selection
- Prompt Transformer dependency
- complex admin/debug tooling

## Build Sequence

1. Audit reusable functions in `herman-prompt` Guide Me.
2. Audit scoring and heuristic components in `herman_transform`.
3. Define data models for contacts, contest entries, score results, personalized access tokens, and coach sessions.
4. Define a compact scoring result schema.
5. Define the personalization teaser copy using the named HermanScience / CQI types without making the coach a full CQI replacement.
6. Define the `/u/{token}` return-access behavior and token lifecycle.
7. Build the splash and contest prompt-entry UI.
8. Port or package heuristic scoring.
9. Build the overall score teaser and contact capture flow.
10. Implement one-entry-per-email behavior and personalized coach URL creation.
11. Add email confirmation for prize eligibility.
12. Build the detailed score, weekly placement, all-time placement, and personalization teaser reveal.
13. Add CQI and full Herman prompting CTAs.
14. Port or rewrite prompt parsing and draft assembly.
15. Implement the guided coaching step selector with structure-first guidance.
16. Add copy/export final prompt behavior.
17. Add focused tests around scoring, teaser behavior, entry deduplication, token access, merging, and flow progression.

## Key Design Principle

Treat the current repos as proven prototypes and source material, not as an application to fork.

The standalone Prompt Coach should inherit the strongest ideas from Guide Me and Herman Transform while staying architecturally small, portable, and independent.
