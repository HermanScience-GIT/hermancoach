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
  "engineer",
  "designer",
  "strategist",
  "assistant",
  "manager",
  "consultant",
  "director",
  "partner",
  "researcher",
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
  "tell me",
  "translate",
  "review",
  "rewrite",
  "plan",
  "debug",
  "calculate",
  "synthesize",
  "design",
  "outline",
];

const contextTerms = [
  "context",
  "background",
  "research project",
  "project",
  "exploring",
  "for",
  "because",
  "constraint",
  "goal",
  "purpose",
  "audience",
  "situation",
  "using",
  "based on",
  "assume",
  "include",
  "constraints",
  "source",
  "notes",
  "document",
  "data",
  "criteria",
  "requirements",
  "timeline",
];

const outputTerms = [
  "format",
  "bullet",
  "table",
  "json",
  "markdown",
  "tone",
  "length",
  "line",
  "one line",
  "step",
  "example",
  "return",
  "output",
  "structure",
  "columns",
  "checklist",
  "subject line",
  "call to action",
  "rubric",
  "agenda",
  "template",
];

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(text, terms) {
  return terms.reduce((count, term) => (text.includes(term) ? count + 1 : count), 0);
}

function signalScore(rawPrompt, text, signals) {
  return signals.reduce((score, signal) => {
    if (signal.test(text, rawPrompt)) {
      return score + signal.points;
    }
    return score;
  }, 0);
}

function makeSignal(points, pattern) {
  return {
    points,
    test: (text) => pattern.test(text),
  };
}

function has(pattern, text) {
  return pattern.test(text);
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasInlineListAfterReference(text) {
  return /\b(these|following) (words|options|items)\s*:/i.test(text) || /:\s*\w+,\s*\w+,\s*\w+/i.test(text);
}

function addBundle(scores, bundle) {
  scores.who += bundle.who || 0;
  scores.task += bundle.task || 0;
  scores.context += bundle.context || 0;
  scores.output += bundle.output || 0;
}

function applyDomainBundles(scores, text) {
  const hasExplicitRole = hasAny(text, [
    /\byou are\b/,
    /\bact as\b/,
    /\bcoach\b/,
    /\banalyst\b/,
    /\bengineer\b/,
    /\bdesigner\b/,
    /\bstrategist\b/,
    /\bassistant\b/,
  ]);
  const hasBusinessAudience = hasAny(text, [
    /\bvp\b/,
    /\bleader(s)?\b/,
    /\bmanager(s)?\b/,
    /\bexecutive\b/,
    /\bcustomer\b/,
    /\bhr\b/,
    /\benablement\b/,
    /\bfounder\b/,
    /\bteam\b/,
  ]);
  const hasToneOrGuardrail = hasAny(text, [
    /\btone\b/,
    /\bvoice\b/,
    /\bclean\b/,
    /\bfriendly\b/,
    /\bshort\b/,
    /\bconcise\b/,
    /\bprofessional\b/,
    /\bdo not\b/,
    /\bavoid\b/,
    /\bpreserve\b/,
    /\bnot hype\b/,
  ]);
  const hasColumnSpec = /\b(columns? for|with columns?|risk table|ranked table)\b/.test(text);

  if (/\b(tell me|give me|make me)\b/.test(text)) {
    addBundle(scores, { task: 10 });
  }
  if (/\b(help me|make|create|write|draft|compare|review|explain|plan|design|generate)\b/.test(text) && /\b(for|about|with|to)\b/.test(text)) {
    addBundle(scores, {
      task: 6,
      context: 4,
      output: /\b(template|questions?|checklist|agenda|plan|reply|email|table|summary|rubric)\b/.test(text) ? 4 : 0,
    });
  }
  if (/\b(for a|for an|for the)\b/.test(text) && hasBusinessAudience) {
    addBundle(scores, { context: 6 });
  }
  if (hasToneOrGuardrail) {
    addBundle(scores, { output: 6 });
  }
  if (/\b(pick|select|choose) one of (these|the following)\b/.test(text) && hasInlineListAfterReference(text)) {
    addBundle(scores, { task: 6 });
  }

  if (/\b(reply|respond)\b/.test(text) && /\b(angry|frustrated|upset|customer|client)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\bangry\b/, /\bfrustrated\b/, /\bcustomer\b/, /\bclient\b/]) ? 10 : 4,
      output: hasAny(text, [/\bsound better\b/, /\btone\b/, /\bclear\b/, /\bwarmer\b/]) ? 8 : 4,
    });
  }

  if (/\b(draft|write|reply|respond|response)\b/.test(text) && /\b(customer|support|customer success|upset|frustrated)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bcustomer success lead\b/, /\bcustomer support lead\b/, /\bsupport lead\b/]) ? 8 : 0,
      task: 8,
      context: hasAny(text, [/\bcontext\b/, /\bfailed\b/, /\binvestigating\b/, /\breproduced\b/, /\bissue\b/]) ? 10 : 4,
      output: hasAny(text, [
        /\bapology\b/,
        /\bstatus\b/,
        /\bworkaround\b/,
        /\bescalation\b/,
        /\bexpected\b/,
        /\bnext update\b/,
      ])
        ? 14
        : 4,
    });
  }

  if (/\b(choose|pick|select|best)\b/.test(text) && /\b(strategy|growth|approach|option)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\bgrowth\b/, /\bcompany\b/, /\bbusiness\b/, /\bai training\b/]) ? 8 : 4,
      output: hasAny(text, [/\bexplain\b/, /\brecommend\b/, /\btradeoff\b/]) ? 6 : 2,
    });
  }

  if (/\b(help me )?(choose|pick|select)\b/.test(text) && /\b(best )?(market|segment|wedge|audience)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\bai\b/, /\bcoaching\b/, /\boffer\b/, /\bproduct\b/, /\bbusiness\b/]) ? 8 : 4,
      output: hasAny(text, [/\brecommend\b/, /\bexplain\b/, /\bwhy\b/, /\bcriteria\b/]) ? 8 : 4,
    });
  }

  if (/\b(prd|product requirements)\b/.test(text) && /\b(dashboard|feature|app|tool)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 8, output: 8 });
  }

  if (/\b(agenda|meeting)\b/.test(text) && !/\b(objectives?|timing|discussion questions?|decisions?|pre-work|prework)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 4, output: 6 });
  }

  if (/\b(make|create)\b/.test(text) && /\b(image|picture|visual)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\babout\b/, /\bat work\b/, /\bworkshop\b/, /\bsubject\b/]) ? 6 : 2,
      output: hasAny(text, [/\bcool\b/, /\brealistic\b/, /\bphoto\b/, /\bstyle\b/]) ? 6 : 2,
    });
  }

  if (/\b(image|illustration|photo|visual)\b/.test(text)) {
    const imageSubject = hasAny(text, [/\babout\b/, /\bof\b/, /\bshow\b/, /\bmanager\b/, /\busers?\b/, /\bworkshop\b/]);
    addBundle(scores, {
      task: hasAny(text, [/\bmake\b/, /\bcreate\b/, /\bgenerate\b/, /\bimage prompt\b/]) ? 8 : 2,
      context: imageSubject ? 8 : 2,
      output: hasAny(text, [
        /\brealistic\b/,
        /\billustration\b/,
        /\bphoto\b/,
        /\bpalette\b/,
        /\bmood\b/,
        /\bno text\b/,
        /\bcomposition\b/,
        /\bstyle\b/,
      ])
        ? 12
        : 4,
    });
  }

  if (/\b(policy)\b/.test(text) && /\b(employee|employees|workplace|company|hr|ai)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 8, output: 6 });
  }

  if (/\b(interview questions?)\b/.test(text)) {
    addBundle(scores, {
      task: 10,
      context: hasAny(text, [/\bmanager\b/, /\brole\b/, /\bcandidate\b/, /\bsenior\b/]) ? 8 : 4,
      output: hasAny(text, [/\bstrong answer\b/, /\bfollow-up\b/, /\bdemonstrate\b/]) ? 8 : 4,
    });
  }

  if (/\b(checklist)\b/.test(text) && /\b(project|launch|migration|rollout)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 6, output: 8 });
  }

  if (/\b(survey)\b/.test(text) && /\b(ai tools|employees|customers|users|work)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 8, output: 8 });
  }

  if (/\b(research questions?|research study|study to learn|user research|customer research)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bux researcher\b/, /\bresearcher\b/, /\bcustomer research\b/]) ? 12 : 0,
      task: hasAny(text, [/\bmake\b/, /\bcreate\b/, /\bdesign\b/, /\bquestions?\b/, /\bstudy\b/]) ? 14 : 8,
      context: hasAny(text, [/\babout\b/, /\bwhy\b/, /\bai at work\b/, /\bmanagers?\b/, /\bcustomers?\b/, /\busers?\b/])
        ? 10
        : 4,
      output: hasAny(text, [/\bquestions?\b/, /\bthemes?\b/, /\bparticipant\b/, /\bcriteria\b/, /\breveal\b/]) ? 12 : 4,
    });
  }

  if (/\b(vendors?|which one to pick|selecting)\b/.test(text)) {
    addBundle(scores, { task: 8, context: 4, output: 4 });
  }

  if (/\b(compare|evaluate|choose|select|pick)\b/.test(text) && /\b(vendors?|software vendors?|partners?|tools?)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\btwo\b/, /\bcriteria\b/, /\bsoftware\b/, /\bsecurity\b/, /\bintegrations?\b/]) ? 8 : 4,
      output: hasAny(text, [/\brubric\b/, /\bscore\b/, /\bweighted\b/, /\btable\b/, /\brecommend\b/]) ? 10 : 4,
    });
  }

  if (/\b(adopt|adoption|roll out|rollout)\b/.test(text) && /\b(ai|employees|team|company)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 8, output: 6 });
  }

  if (/\b(plan|roadmap|rollout|adoption)\b/.test(text) && /\b(ai adoption|adopt ai|ai at work|ai tools)\b/.test(text)) {
    addBundle(scores, {
      task: 12,
      context: hasAny(text, [/\bat work\b/, /\bcompany\b/, /\bmanagers?\b/, /\bemployees\b/, /\bleaders\b/]) ? 10 : 4,
      output: hasAny(text, [/\bcommunications?\b/, /\btraining\b/, /\brisks?\b/, /\bmetrics?\b/, /\bowners?\b/]) ? 12 : 4,
    });
  }

  if (/\b(creative brief|campaign brief)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 6, output: 8 });
  }

  if (/\b(prompt coach|prompt coaching|review this prompt|improve this prompt)\b/.test(text)) {
    addBundle(scores, {
      who: /\bprompt coach\b/.test(text) ? 12 : 0,
      task: 14,
      context: hasAny(text, [/\bclarity\b/, /\bcontext\b/, /\brole\b/, /\boutput\b/]) ? 12 : 6,
      output: hasAny(text, [/\bweaknesses\b/, /\brevised version\b/, /\breturn\b/]) ? 14 : 6,
    });
  }

  if (/\b(prompt|prompts?)\b/.test(text) && /\b(stronger|improve|improving|rewrite|review|edits?)\b/.test(text)) {
    addBundle(scores, {
      task: 10,
      context: hasAny(text, [/\brole\b/, /\btask\b/, /\bcontext\b/, /\boutput format\b/, /\bconstraints?\b/]) ? 12 : 4,
      output: hasAny(text, [/\bexplain\b/, /\bedits?\b/, /\brewrite\b/, /\bgaps?\b/]) ? 10 : 4,
    });
  }

  const businessCommunication =
    hasExplicitRole &&
    /\b(draft|write|create)\b/.test(text) &&
    /\b(email|message|post|subject line)\b/.test(text) &&
    hasBusinessAudience &&
    /\b(context|webinar|demo|revenue|forecast|team|audience)\b/.test(text);
  if (businessCommunication) {
    addBundle(scores, { who: 8, task: 20, context: 20, output: 15 });
  }

  if (/\b(draft|write)\b/.test(text) && /\b(email|invitation|invite)\b/.test(text)) {
    addBundle(scores, {
      task: 8,
      context: hasAny(text, [/\bcustomers?\b/, /\bhr leaders?\b/, /\bprompt challenge\b/, /\bcontest\b/, /\bdemo\b/]) ? 8 : 2,
      output: hasAny(text, [/\bsubject line\b/, /\bcall to action\b/, /\bcta\b/, /\bnext step\b/]) ? 8 : 2,
    });
  }

  if (/\bsummarize\b/.test(text) && /\b(notes|document|meeting)\b/.test(text)) {
    addBundle(scores, { task: 20 });
    if (/\bexecutive audience\b/.test(text) || /\bfocus on\b/.test(text)) {
      addBundle(scores, { context: 18 });
    }
    if (hasColumnSpec) {
      addBundle(scores, { output: 22 });
    }
  }

  if (/\b(debug|error|react|javascript|typescript|stack trace)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bsenior\b/, /\bengineer\b/, /\bdeveloper\b/, /\breact\b/, /\bjavascript\b/]) ? 12 : 0,
      task: hasAny(text, [/\bdebug\b/, /\berror\b/, /\bdiagnose\b/]) ? 14 : 0,
      context: hasAny(text, [/\breact\b/, /\bjavascript\b/, /\berror:/, /\bcannot read\b/]) ? 10 : 0,
      output: hasAny(text, [/\blikely causes\b/, /\bchecklist\b/, /\bpattern\b/]) ? 10 : 0,
    });
    if (!hasAny(text, [/\bcode sample\b/, /\bversion\b/, /\bsnippet\b/])) {
      scores.context -= 6;
    }
  }

  if (/\b(csv|spreadsheet|data|campaign performance|metrics?)\b/.test(text) && /\b(analyze|calculate|rank|efficient)\b/.test(text)) {
    addBundle(scores, {
      who: /\banalyst\b/.test(text) ? 16 : 0,
      task: 22,
      context: hasAny(text, [/\bcsv\b/, /\bspend\b/, /\bimpressions\b/, /\bclicks\b/, /\bleads\b/, /\bopportunities\b/, /\bcpc\b/, /\bcpl\b/]) ? 26 : 12,
      output: hasAny(text, [/\branked table\b/, /\brecommendations?\b/, /\bcost per\b/]) ? 22 : 10,
    });
  }

  if (/\b(analyze|review)\b/.test(text) && /\b(entries|contest entries|patterns|what patterns)\b/.test(text)) {
    addBundle(scores, {
      task: 10,
      context: 8,
      output: hasAny(text, [/\bpatterns\b/, /\btell me\b/, /\bthemes?\b/, /\brecommend\b/]) ? 8 : 2,
    });
  }

  if (/\btranslate\b/.test(text) && /\b(spanish|english|french|german|language)\b/.test(text)) {
    addBundle(scores, {
      task: 26,
      context: hasAny(text, [/\bcustomer\b/, /\bsupport\b/, /\bnontechnical\b/, /\baudience\b/]) ? 24 : 8,
      output: hasToneOrGuardrail ? 24 : 10,
    });
  }

  if (/\b(generate|brainstorm)\b/.test(text) && /\b(ideas?|campaign)\b/.test(text)) {
    addBundle(scores, {
      task: /\b\d+\b/.test(text) ? 12 : 8,
      context: hasAny(text, [/\baudience\b/, /\bhr leaders\b/, /\bsmall team\b/, /\bpractical\b/, /\bavoid\b/]) ? 12 : 6,
      output: hasAny(text, [/\bone sentence\b/, /\bexplaining\b/, /\binsight\b/, /\beach idea\b/]) ? 22 : 8,
    });
  }

  if (/\b(review|risky|risk|issues|questions)\b/.test(text) && /\b(contract|agreement|vendor|clause)\b/.test(text)) {
    addBundle(scores, { task: 10, output: /\b(bullet|questions?|risk table)\b/.test(text) ? 8 : 0 });
    const hasScope = hasAny(text, [/\bus-based\b/, /\bjurisdiction\b/, /\bnot a lawyer\b/, /\bcounsel\b/, /\bfocus on\b/, /\bscope\b/]);
    if (hasScope) {
    addBundle(scores, {
      who: hasAny(text, [/\bassistant\b/, /\bnot a lawyer\b/]) ? 16 : 0,
      context: 22,
      output: hasAny(text, [/\brisk table\b/, /\bseverity\b/, /\bclause\b/, /\bwhy it matters\b/]) ? 24 : 8,
      task: /\bagreement\b/.test(text) ? 14 : 0,
    });
    } else {
      scores.context -= 10;
    }
  }

  if (/\b(scene|story|science fiction|fiction|opening scene)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bwrite\b/, /\bopening scene\b/, /\bstory\b/]) ? 10 : 0,
      context: hasAny(text, [/\bscience fiction\b/, /\bset in\b/, /\bcity\b/, /\bteam\b/, /\bworkplace\b/, /\babout\b/])
        ? 12
        : 0,
      output: hasAny(text, [
        /\batmospheric\b/,
        /\brestrained\b/,
        /\bunder \d+ words\b/,
        /\b\d+-word\b/,
        /\bfriendly\b/,
        /\bfunny\b/,
        /\bend with\b/,
        /\blesson\b/,
      ])
        ? 14
        : 0,
    });
  }

  if (/\b(lesson plan|learning objectives|facilitator notes|practice activity|reflection question)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\binstructional designer\b/, /\btrainer\b/]) ? 16 : 0,
      task: /\blesson plan\b/.test(text) ? 20 : 10,
      context: hasAny(text, [/\baudience\b/, /\b\d+-minute\b/, /\bfrontline managers\b/]) ? 20 : 8,
      output: hasAny(text, [/\blearning objectives\b/, /\bagenda\b/, /\bfacilitator notes\b/, /\bactivity\b/, /\breflection\b/]) ? 24 : 10,
    });
  }

  if (/\b(lesson|training|workshop)\b/.test(text) && /\b(prompting|prompts?|ai)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bmake\b/, /\bcreate\b/, /\bdesign\b/, /\blesson\b/, /\bworkshop\b/]) ? 12 : 4,
      context: hasAny(text, [/\bbetter\b/, /\bmanagers?\b/, /\bteam\b/, /\bcustomer success\b/]) ? 6 : 2,
      output: hasAny(text, [/\bobjectives?\b/, /\bagenda\b/, /\bactivity\b/, /\breflection\b/]) ? 10 : 4,
    });
  }

  if (/\b(plan|shopping list|meal|prep time|grocery|grouped by)\b/.test(text) && /\b(day|days|constraints?|under \d+|table)\b/.test(text)) {
    addBundle(scores, {
      task: /\b(create|draft|build)\b/.test(text) ? 18 : 10,
      context: hasAny(text, [/\bconstraints?\b/, /\bfamily\b/, /\bvegetarian\b/, /\bkid-friendly\b/, /\breduce waste\b/]) ? 20 : 8,
      output: hasAny(text, [/\btable\b/, /\bshopping list\b/, /\bgrouped by\b/]) ? 20 : 8,
    });
  }

  if (/\b(rewrite|revise|resume|bullets?|ats|before and after)\b/.test(text)) {
    addBundle(scores, {
      who: /\bcoach\b/.test(text) ? 16 : 0,
      task: hasAny(text, [/\brewrite\b/, /\brevise\b/, /\bbullets?\b/]) ? 20 : 0,
      context: hasAny(text, [/\btarget\b/, /\brole\b/, /\bapplying\b/, /\bcustomer success\b/, /\bsenior\b/]) ? 20 : 8,
      output: hasAny(text, [/\bbefore and after\b/, /\bmeasurable\b/, /\bats\b/, /\bexplaining\b/]) ? 20 : 8,
    });
  }

  if (/\b(sql|postgresql|query|join|filter|tables?)\b/.test(text)) {
    addBundle(scores, {
      who: /\bdata engineer\b/.test(text) ? 16 : 0,
      task: hasAny(text, [/\bwrite\b/, /\bquery\b/, /\bsql\b/]) ? 22 : 0,
      context: hasAny(text, [
        /\btables?\b/,
        /\baccounts\b/,
        /\bopportunities\b/,
        /\bactivities\b/,
        /\bcontacts\b/,
        /\bsubmissions\b/,
        /\bwinners\b/,
        /\bconfirmed\b/,
        /\beligible\b/,
        /\b\$?\d+k\b/,
        /\blast \d+ days\b/,
      ])
        ? 30
        : 10,
      output: hasAny(text, [/\breturn the sql\b/, /\bsql and explain\b/, /\bexplain each\b/, /\bplain english\b/]) ? 24 : 8,
    });
  }

  if (/\b(synthesize|interview excerpts|themes|quote snippets|confidence|implications)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bstrategist\b/, /\bresearcher\b/]) ? 16 : 0,
      task: hasAny(text, [/\bsynthesize\b/, /\bidentify\b/, /\bthemes?\b/]) ? 22 : 0,
      context: hasAny(text, [/\b\d+ interview\b/, /\bfriction\b/, /\bb2b\b/, /\bproduct\b/]) ? 26 : 10,
      output: hasAny(text, [/\bthemes?\b/, /\bquote snippets\b/, /\bconfidence\b/, /\bimplications\b/]) ? 24 : 10,
    });
  }

  if (/\b(linkedin|post|hook|story|takeaways?|call to action|cta)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bdraft\b/, /\bpost\b/, /\bmessage\b/]) ? 12 : 0,
      context: hasAny(text, [/\baudience\b/, /\bfounder\b/, /\bhr\b/, /\benablement\b/, /\bchannel\b/]) ? 12 : 4,
      output: hasAny(text, [/\bhook\b/, /\bstory\b/, /\btakeaways?\b/, /\bcall to action\b/, /\bcta\b/]) ? 14 : 6,
    });
    if (hasToneOrGuardrail) {
      addBundle(scores, { output: 8 });
    }
  }

  if (/\b(customer support|support lead|frustrated|troubleshooting|escalation|cannot sync|integration)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bsupport lead\b/, /\bcustomer support\b/]) ? 12 : 0,
      task: hasAny(text, [/\bdraft\b/, /\bresponse\b/, /\breply\b/]) ? 12 : 0,
      context: hasAny(text, [/\bfrustrated\b/, /\badmin\b/, /\bintegration\b/, /\bsync\b/, /\btried\b/]) ? 14 : 6,
      output: hasAny(text, [/\bapology\b/, /\btroubleshooting\b/, /\bescalation\b/, /\bclosing\b/]) ? 14 : 6,
    });
  }

  if (/\b(compare|evaluate|recommend)\b/.test(text) && /\b(options?|approaches?|criteria|tradeoff|pricing|strategy)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\badvisor\b/, /\bconsultant\b/, /\bstrategist\b/]) ? 12 : 0,
      task: 14,
      context: hasAny(text, [/\bthree\b/, /\boptions?\b/, /\bapproaches?\b/, /\bcriteria\b/, /\bbuyer\b/, /\brevenue\b/]) ? 12 : 6,
      output: hasAny(text, [/\brecommend\b/, /\btradeoff\b/, /\bexplain\b/]) ? 10 : 4,
    });
  }

  if (/\b(prd|product requirements|functional requirements|user stories|edge cases|open questions)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bproduct manager\b/, /\bsenior product\b/]) ? 24 : 0,
      task: hasAny(text, [/\bprd\b/, /\brequirements\b/, /\boutline\b/]) ? 28 : 12,
      context: hasAny(text, [/\bdashboard\b/, /\busers?\b/, /\badmin\b/, /\bsubmissions?\b/, /\bwinner\b/]) ? 24 : 10,
      output: hasAny(text, [/\buser stories\b/, /\bfunctional requirements\b/, /\bedge cases\b/, /\bmetrics\b/, /\bopen questions\b/]) ? 34 : 12,
    });
  }

  if (/\b(agenda|meeting)\b/.test(text) && /\b(objectives?|timing|discussion questions?|decisions?|pre-work|prework)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bcreate\b/, /\bagenda\b/]) ? 12 : 6,
      context: hasAny(text, [/\b\d+-minute\b/, /\baudience\b/, /\bleadership\b/, /\bteam\b/, /\btopic\b/]) ? 12 : 6,
      output: hasAny(text, [/\bobjectives?\b/, /\btiming\b/, /\bquestions?\b/, /\bdecisions?\b/, /\bpre-?work\b/]) ? 14 : 6,
    });
  }

  if (/\b(image prompt|photo|realistic|composition|no text|mood|setting)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bcreate\b/, /\bimage prompt\b/]) ? 12 : 6,
      context: hasAny(text, [/\bphoto\b/, /\bworkshop\b/, /\blearners\b/, /\boffice\b/, /\bsetting\b/]) ? 10 : 4,
      output: hasAny(text, [/\brealistic\b/, /\bdiverse\b/, /\bnatural daylight\b/, /\bno text\b/, /\bmood\b/]) ? 14 : 6,
    });
  }

  if (/\b(finance analyst|forecast|gross margin|cac payback|burn|runway|assumptions?)\b/.test(text)) {
    addBundle(scores, {
      who: /\bfinance analyst\b/.test(text) ? 14 : 0,
      task: hasAny(text, [/\breview\b/, /\banalyze\b/, /\bvalidate\b/, /\btell me if\b/, /\bmakes sense\b/]) ? 16 : 6,
      context: hasAny(text, [
        /\brevenue\b/,
        /\bgross margin\b/,
        /\bcac\b/,
        /\bburn\b/,
        /\brunway\b/,
        /\bforecast\b/,
        /\bchurn\b/,
        /\bsales hiring\b/,
      ])
        ? 24
        : 8,
      output: hasAny(text, [/\btable\b/, /\bassumption\b/, /\brisk\b/, /\brisks\b/, /\bevidence\b/, /\bowner\b/, /\brecommendation\b/])
        ? 20
        : 6,
    });
    if (!hasAny(text, [/\bsource numbers\b/, /\bdata\b/, /\bspreadsheet\b/, /\bmodel\b/])) {
      scores.context -= 4;
    }
  }

  if (/\bforecast\b/.test(text) && /\b(tell me if|makes sense|review|analyze)\b/.test(text)) {
    addBundle(scores, { task: 10, context: 4, output: 4 });
  }

  if (/\b(explain|common reasons?|common causes?)\b/.test(text) && /\b(tired|pain|headache|wrist|screen)\b/.test(text)) {
    addBundle(scores, {
      task: 8,
      context: hasAny(text, [/\bafter\b/, /\bscreen\b/, /\btyping\b/, /\ball day\b/]) ? 6 : 2,
      output: hasAny(text, [/\bwithout diagnosing\b/, /\bdo not diagnose\b/, /\bwarning signs\b/, /\bclinician\b/]) ? 8 : 2,
    });
  }

  if (/\b(hr communications|hr partner|policy|eligibility|core hours|communication expectations|review cadence)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bhr\b/, /\bcommunications partner\b/]) ? 12 : 0,
      task: hasAny(text, [/\bdraft\b/, /\bpolicy\b/]) ? 14 : 6,
      context: hasAny(text, [/\b\d+-person\b/, /\baudience\b/, /\bmanagers\b/, /\bemployees\b/, /\bprofessional services\b/]) ? 16 : 6,
      output: hasAny(text, [/\beligibility\b/, /\bcore hours\b/, /\bequipment\b/, /\bsecurity\b/, /\breview cadence\b/]) ? 12 : 6,
    });
  }

  if (/\b(interview questions?|hiring manager|strong answer|competenc|renewal strategy|candidate)\b/.test(text)) {
    addBundle(scores, {
      who: /\bhiring manager\b/.test(text) ? 12 : 0,
      task: hasAny(text, [/\bcreate\b/, /\bquestions?\b/, /\binterview\b/]) ? 12 : 6,
      context: hasAny(text, [
        /\bsenior\b/,
        /\brole\b/,
        /\bcompetenc/,
        /\brenewal\b/,
        /\bcommunication\b/,
        /\bpositioning\b/,
        /\blaunch planning\b/,
        /\bsales enablement\b/,
        /\bcustomer insight\b/,
      ])
        ? 16
        : 6,
      output: hasAny(text, [/\bstrong answer\b/, /\bdemonstrate\b/, /\bfor each\b/, /\bwould demonstrate\b/]) ? 18 : 6,
    });
  }

  if (/\b(checklist|launch day|first week|owner|dependency|success signal|speaker prep|follow-up|due date)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\boperations manager\b/, /\bops manager\b/]) ? 12 : 0,
      task: hasAny(text, [/\bbuild\b/, /\bcreate\b/, /\bmake\b/, /\bchecklist\b/]) ? 18 : 6,
      context: hasAny(text, [/\blaunch\b/, /\bteam\b/, /\bworkflow\b/, /\bcrm\b/, /\bwebinar\b/, /\bonboarding\b/]) ? 16 : 6,
      output: hasAny(text, [
        /\bbefore launch\b/,
        /\blaunch day\b/,
        /\bfirst week\b/,
        /\bplanning\b/,
        /\bpromotion\b/,
        /\bspeaker prep\b/,
        /\bfollow-up\b/,
        /\bowner\b/,
        /\bdependency\b/,
        /\bdue date\b/,
        /\brisk\b/,
        /\bsuccess signal\b/,
      ])
        ? 20
        : 8,
    });
  }

  if (/\b(survey|ux researcher|likert|multiple choice|open-ended|questions by theme|what each theme measures)\b/.test(text)) {
    addBundle(scores, {
      who: /\bux researcher\b/.test(text) ? 26 : 0,
      task: hasAny(text, [/\bdesign\b/, /\bsurvey\b/, /\bquestions?\b/]) ? 28 : 10,
      context: hasAny(text, [/\bemployees\b/, /\bai tools\b/, /\bat work\b/, /\bunderstand why\b/]) ? 24 : 10,
      output: hasAny(text, [/\blikert\b/, /\bmultiple choice\b/, /\bopen-ended\b/, /\btheme\b/, /\bmeasures\b/]) ? 34 : 12,
    });
  }

  if (/\b(productivity plan|weekly productivity|deep work|track priorities|template)\b/.test(text)) {
    addBundle(scores, {
      task: hasAny(text, [/\bhelp me\b/, /\bmake\b/, /\bplan\b/, /\btemplate\b/]) ? 10 : 4,
      context: hasAny(text, [/\bmeetings\b/, /\bdeep work\b/, /\bpriorities\b/, /\bweekly\b/]) ? 8 : 4,
      output: /\btemplate\b/.test(text) ? 10 : 4,
    });
  }

  if (/\b(rubric|vendor evaluation|weighted scoring|criteria|procurement|selecting)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bprocurement advisor\b/, /\badvisor\b/]) ? 12 : 0,
      task: hasAny(text, [/\bcreate\b/, /\brubric\b/, /\bevaluation\b/]) ? 14 : 6,
      context: hasAny(text, [/\bcriteria\b/, /\bsecurity\b/, /\bcustomization\b/, /\bmeasurement\b/, /\bchange management\b/]) ? 12 : 6,
      output: hasAny(text, [/\bweighted scoring table\b/, /\bnotes\b/, /\busing it\b/]) ? 16 : 6,
    });
  }

  if (/\b(change management|adoption plan|60-day|executives|individual contributors|communications|training|owner roles)\b/.test(text)) {
    addBundle(scores, {
      who: hasAny(text, [/\bchange management consultant\b/, /\bconsultant\b/]) ? 14 : 0,
      task: hasAny(text, [/\bbuild\b/, /\bplan\b/, /\badoption\b/]) ? 16 : 6,
      context: hasAny(text, [/\b60-day\b/, /\b500-person\b/, /\bexecutives\b/, /\bmanagers\b/, /\bindividual contributors\b/]) ? 16 : 8,
      output: hasAny(text, [/\bcommunications\b/, /\btraining\b/, /\brisks\b/, /\bmetrics\b/, /\bowner roles\b/]) ? 16 : 8,
    });
  }

  if (/\b(campaign brief|creative brief|creative director|key message|proof points|deliverables|generic ai hype)\b/.test(text)) {
    addBundle(scores, {
      who: /\bcreative director\b/.test(text) ? 14 : 0,
      task: hasAny(text, [/\bwrite\b/, /\bbrief\b/, /\bcampaign\b/]) ? 14 : 6,
      context: hasAny(text, [/\bhermanscience\b/, /\baudience\b/, /\bhr leaders\b/, /\bbrand\b/]) ? 12 : 6,
      output: hasAny(text, [/\bobjective\b/, /\bkey message\b/, /\btone\b/, /\bproof points\b/, /\bdeliverables\b/, /\bconstraints\b/]) ? 16 : 8,
    });
  }
}

function applyCaps(scores, text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 5 && !hasAny(text, [/\bjson\b/, /\bsql\b/, /\btranslate\b/])) {
    scores.who = Math.min(scores.who, 35);
    scores.task = Math.min(scores.task, 40);
    scores.context = Math.min(scores.context, 30);
    scores.output = Math.min(scores.output, 30);
  }

  if (/\b(scene|story|science fiction|fiction|opening scene)\b/.test(text) && !/\b(audience|for a|for an|purpose|use case)\b/.test(text)) {
    scores.who = Math.min(scores.who, 70);
    scores.task = Math.min(scores.task, 70);
    scores.context = Math.min(scores.context, 70);
    scores.output = Math.min(scores.output, 70);
  }
  if (/\btranslate\b/.test(text) && !/\bsource text|reply:|text:\b/.test(text)) {
    scores.who = Math.min(scores.who, 72);
    scores.task = Math.min(scores.task, 76);
    scores.context = Math.min(scores.context, 72);
    scores.output = Math.min(scores.output, 76);
  }
  if (/\b(linkedin|post)\b/.test(text) && !/\b(example|source|draft|details about)\b/.test(text)) {
    scores.who = Math.min(scores.who, 86);
    scores.task = Math.min(scores.task, 86);
    scores.context = Math.min(scores.context, 86);
    scores.output = Math.min(scores.output, 88);
  }
  if (/\b(campaign brief|creative brief)\b/.test(text) && !/\b(source|existing|brand guide|campaign data|examples?)\b/.test(text)) {
    scores.who = Math.min(scores.who, 92);
    scores.task = Math.min(scores.task, 92);
    scores.context = Math.min(scores.context, 86);
    scores.output = Math.min(scores.output, 90);
  }
  if (/\b(ux researcher|research study|study to learn|survey)\b/.test(text) && !/\b(source|existing|interview excerpts|transcripts?|data)\b/.test(text)) {
    scores.who = Math.min(scores.who, 92);
    scores.task = Math.min(scores.task, 92);
    scores.context = Math.min(scores.context, 86);
    scores.output = Math.min(scores.output, 92);
  }
  if (/\binterview questions?\b/.test(text) && !/\b(10|8|strong answer|competenc|focus on|candidate|scorecard)\b/.test(text)) {
    scores.who = Math.min(scores.who, 70);
    scores.task = Math.min(scores.task, 76);
    scores.context = Math.min(scores.context, 66);
    scores.output = Math.min(scores.output, 60);
  }
  if (/\btranslate\b/.test(text) && !/\b(source text|reply:|text:|preserve|do not|dates|links|product names)\b/.test(text)) {
    scores.who = Math.min(scores.who, 58);
    scores.task = Math.min(scores.task, 70);
    scores.context = Math.min(scores.context, 58);
    scores.output = Math.min(scores.output, 64);
  }
  if (/\b(vendor|vendors)\b/.test(text) && !/\b(rubric|weighted|scoring table|reviewer|criteria should include|return)\b/.test(text)) {
    scores.who = Math.min(scores.who, 66);
    scores.task = Math.min(scores.task, 82);
    scores.context = Math.min(scores.context, 66);
    scores.output = Math.min(scores.output, 62);
  }
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

function scoreDimension({ rawPrompt, text, words, terms, signals = [], base }) {
  return clampScore(
    base +
      countMatches(text, terms) * 8 +
      signalScore(rawPrompt, text, signals) +
      lengthSignal(words) +
      punctuationSignal(rawPrompt),
  );
}

export function scorePrompt(promptText) {
  const rawPrompt = String(promptText || "").trim();
  const text = rawPrompt.toLowerCase();
  const words = rawPrompt.split(/\s+/).filter(Boolean).length;

  const missingReferencedInputPenalty =
    /\b(one of the words|the options|the list|these notes|this document|this customer support reply)\b/.test(text) &&
    !hasInlineListAfterReference(text)
      ? 1
      : 0;

  const scores = {
    who: scoreDimension({
    rawPrompt,
    text,
    words,
    terms: roleTerms,
    signals: [
      makeSignal(16, /\byou are an?\b/),
      makeSignal(10, /\bhelping me\b/),
      makeSignal(8, /\b(llm|model|assistant|chatgpt|claude|gemini)\b/),
    ],
    base: 28,
    }),
    task: clampScore(
    scoreDimension({
      rawPrompt,
      text,
      words,
      terms: taskTerms,
      signals: [
        makeSignal(16, /\bi want you to\b/),
        makeSignal(10, /\b(pick|select|choose)\b/),
        makeSignal(8, /\bexplain why\b/),
      ],
      base: 34,
    }) - missingReferencedInputPenalty * 8,
    ),
    context: clampScore(
    scoreDimension({
      rawPrompt,
      text,
      words,
      terms: contextTerms,
      signals: [
        makeSignal(14, /\bi am (exploring|researching|working on|trying to)\b/),
        makeSignal(10, /\bhow different\b/),
        makeSignal(8, /\babout their\b/),
      ],
      base: 24,
    }) - missingReferencedInputPenalty * 22,
    ),
    output: clampScore(
    scoreDimension({
      rawPrompt,
      text,
      words,
      terms: outputTerms,
      signals: [
        makeSignal(16, /\bfor the output\b/),
        makeSignal(12, /\bgive me\b/),
        makeSignal(10, /\bone[- ]line\b/),
      ],
      base: 26,
    }) - missingReferencedInputPenalty * 8,
    ),
  };

  applyDomainBundles(scores, text);
  applyCaps(scores, text);

  const whoScore = clampScore(scores.who);
  const taskScore = clampScore(scores.task);
  const contextScore = clampScore(scores.context);
  const outputScore = clampScore(scores.output);

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
