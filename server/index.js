import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearAdminSessionCookie,
  configuredAdminEmail,
  createAdminCode,
  createAdminSessionCookie,
  hashAdminCode,
  requireAdmin,
  verifyAdminPassword,
} from "./adminAuth.js";
import { prisma } from "./db.js";
import { sendAdminCodeEmail, sendCoachLinkEmail } from "./email.js";
import { coachingSuggestionFor, scoreNarrative, scorePrompt } from "./scoring.js";
import {
  clientIp,
  decryptValue,
  encryptValue,
  hashIp,
  hashPrompt,
  hashToken,
  normalizeEmail,
  randomToken,
} from "./security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const port = Number.parseInt(process.env.PORT || "8765", 10);
const host = process.env.HOST || "127.0.0.1";

const app = express();
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://${host}:${port}`).replace(/\/$/, "");

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "herman-coach",
  });
});

app.get("/health/db", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({
      ok: true,
      service: "herman-coach",
      database: "reachable",
    });
  } catch {
    response.status(503).json({
      ok: false,
      service: "herman-coach",
      database: "unreachable",
    });
  }
});

app.post("/api/score-preview", (request, response) => {
  const promptText = String(request.body?.promptText || "").trim();
  if (promptText.length < 20) {
    response.status(400).json({
      error: "Prompt must be at least 20 characters.",
    });
    return;
  }
  if (promptText.length > 1200) {
    response.status(400).json({
      error: "Prompt must be 1,200 characters or fewer.",
    });
    return;
  }

  response.json({
    score: scorePrompt(promptText),
    placementPreview: {
      thisWeek: 18,
      allTime: 142,
    },
  });
});

app.post("/api/entries", async (request, response) => {
  const firstName = String(request.body?.firstName || "").trim();
  const lastName = String(request.body?.lastName || "").trim();
  const email = normalizeEmail(request.body?.email);
  const promptText = String(request.body?.promptText || "").trim();
  const agreed = Boolean(request.body?.contestAgreement);

  if (!firstName || !lastName || !email || !email.includes("@")) {
    response.status(400).json({ error: "First name, last name, and a valid email are required." });
    return;
  }
  if (!agreed) {
    response.status(400).json({ error: "Contest agreement is required." });
    return;
  }
  if (promptText.length < 20 || promptText.length > 1200) {
    response.status(400).json({ error: "Prompt must be between 20 and 1,200 characters." });
    return;
  }

  const score = scorePrompt(promptText);
  const rawAccessToken = randomToken("hsc");
  const rawConfirmationToken = randomToken("hce");
  const ipHash = hashIp(clientIp(request));
  const userAgent = String(request.headers["user-agent"] || "").slice(0, 500) || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingContact = await tx.contact.findUnique({
        where: { email },
        include: {
          accessTokens: {
            where: { revokedAt: null },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
          promptSubmissions: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

      if (existingContact) {
        let accessToken = existingContact.accessTokens[0];
        let coachUrl = null;
        let confirmationUrl = null;
        if (!accessToken) {
          accessToken = await tx.accessToken.create({
            data: {
              contactId: existingContact.id,
              tokenHash: hashToken(rawAccessToken),
              tokenCiphertext: encryptValue(rawAccessToken),
              tokenPrefix: rawAccessToken.slice(0, 12),
              firstIpHash: ipHash,
              lastIpHash: ipHash,
            },
          });
          coachUrl = `${publicBaseUrl}/u/${rawAccessToken}`;
          const originalSubmission = existingContact.promptSubmissions[0];
          if (originalSubmission) {
            await tx.coachSession.create({
              data: {
                contactId: existingContact.id,
                accessTokenId: accessToken.id,
                currentPrompt: originalSubmission.promptText,
                draftVersion: 1,
                overallScore: originalSubmission.overallScore,
                whoScore: originalSubmission.whoScore,
                taskScore: originalSubmission.taskScore,
                contextScore: originalSubmission.contextScore,
                outputScore: originalSubmission.outputScore,
              },
            });
          }
        } else {
          const existingRawToken = decryptValue(accessToken.tokenCiphertext);
          if (existingRawToken) {
            coachUrl = `${publicBaseUrl}/u/${existingRawToken}`;
          }
        }
        if (!existingContact.emailConfirmedAt) {
          const confirmationToken = randomToken("hce");
          await tx.contact.update({
            where: { id: existingContact.id },
            data: {
              emailConfirmationTokenHash: hashToken(confirmationToken),
              emailConfirmationSentAt: new Date(),
            },
          });
          confirmationUrl = `${publicBaseUrl}/api/email/confirm?token=${confirmationToken}`;
        }

        return {
          alreadyEntered: true,
          contactId: existingContact.id,
          email,
          firstName: existingContact.firstName,
          coachUrl,
          confirmationUrl,
          needsEmailResend: true,
          message: "You are already entered. We will resend your existing coach link.",
        };
      }

      const contact = await tx.contact.create({
        data: {
          email,
          firstName,
          lastName,
          emailConfirmationTokenHash: hashToken(rawConfirmationToken),
          emailConfirmationSentAt: new Date(),
        },
      });
      const submission = await tx.promptSubmission.create({
        data: {
          contactId: contact.id,
          promptText,
          promptHash: hashPrompt(promptText),
          overallScore: score.overallScore,
          whoScore: score.whoScore,
          taskScore: score.taskScore,
          contextScore: score.contextScore,
          outputScore: score.outputScore,
          feedbackSummary: score.feedbackSummary,
          ipHash,
          userAgent,
        },
      });
      const accessToken = await tx.accessToken.create({
        data: {
          contactId: contact.id,
          tokenHash: hashToken(rawAccessToken),
          tokenCiphertext: encryptValue(rawAccessToken),
          tokenPrefix: rawAccessToken.slice(0, 12),
          firstIpHash: ipHash,
          lastIpHash: ipHash,
        },
      });
      await tx.coachSession.create({
        data: {
          contactId: contact.id,
          accessTokenId: accessToken.id,
          currentPrompt: promptText,
          draftVersion: 1,
          overallScore: score.overallScore,
          whoScore: score.whoScore,
          taskScore: score.taskScore,
          contextScore: score.contextScore,
          outputScore: score.outputScore,
        },
      });

      return {
        alreadyEntered: false,
        contactId: contact.id,
        email,
        firstName,
        submissionId: submission.id,
        coachUrl: `${publicBaseUrl}/u/${rawAccessToken}`,
        confirmationUrl: `${publicBaseUrl}/api/email/confirm?token=${rawConfirmationToken}`,
        message: "You are entered. Your personal coach link is ready.",
      };
    });

    if (result.alreadyEntered && !result.coachUrl) {
      response.json({
        alreadyEntered: true,
        coachUrl: null,
        message: result.message,
      });
      return;
    }

    if (result.coachUrl) {
      try {
        await sendCoachLinkEmail({
          to: result.email,
          firstName: result.firstName,
          coachUrl: result.coachUrl,
          confirmationUrl: result.confirmationUrl,
        });
      } catch (error) {
        console.error("Coach link email failed", error);
      }
    }

    response.json(result);
  } catch (error) {
    console.error("Entry creation failed", error);
    response.status(500).json({ error: "Unable to create entry right now." });
  }
});

app.get("/api/email/confirm", async (request, response) => {
  const rawToken = String(request.query.token || "").trim();
  if (!rawToken) {
    response.status(400).send(confirmEmailHtml("Confirmation link missing", "This confirmation link is missing its token."));
    return;
  }

  const contact = await prisma.contact.findUnique({
    where: { emailConfirmationTokenHash: hashToken(rawToken) },
  });
  if (!contact) {
    response
      .status(404)
      .send(confirmEmailHtml("Confirmation link not found", "This link may have expired or already been used."));
    return;
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      emailConfirmedAt: contact.emailConfirmedAt || new Date(),
      emailConfirmationTokenHash: null,
    },
  });

  response.send(
    confirmEmailHtml(
      "Email confirmed",
      "Your contest entry is now eligible for the weekly drawing. Your personal coach link is ready in your email.",
    ),
  );
});

app.post("/api/admin/login", async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password || "");
  if (!verifyAdminPassword(email, password)) {
    response.status(401).json({ error: "Invalid admin credentials." });
    return;
  }

  const code = createAdminCode();
  const ttlMinutes = Number.parseInt(process.env.ADMIN_CODE_TTL_MINUTES || "10", 10);
  await prisma.adminLoginCode.create({
    data: {
      email,
      codeHash: hashAdminCode(email, code),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });

  try {
    await sendAdminCodeEmail({ to: email, code });
  } catch (error) {
    console.error("Admin code email failed", error);
    response.status(500).json({ error: "Unable to send admin code." });
    return;
  }

  response.json({ requiresCode: true, email });
});

app.post("/api/admin/verify", async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const code = String(request.body?.code || "").trim();
  if (!email || !code) {
    response.status(400).json({ error: "Email and code are required." });
    return;
  }

  const loginCode = await prisma.adminLoginCode.findFirst({
    where: {
      email,
      codeHash: hashAdminCode(email, code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!loginCode || email !== configuredAdminEmail()) {
    response.status(401).json({ error: "Invalid or expired code." });
    return;
  }

  await prisma.adminLoginCode.update({
    where: { id: loginCode.id },
    data: { usedAt: new Date() },
  });
  response.setHeader("Set-Cookie", createAdminSessionCookie(email));
  response.json({ ok: true, email });
});

app.post("/api/admin/logout", requireAdmin, (_request, response) => {
  response.setHeader("Set-Cookie", clearAdminSessionCookie());
  response.json({ ok: true });
});

app.get("/api/admin/me", requireAdmin, (request, response) => {
  response.json({ email: request.admin.email });
});

app.get("/api/admin/entries", requireAdmin, async (request, response) => {
  const period = parseAdminPeriod(request.query);
  const submissions = await loadAdminSubmissions(period);
  response.json({
    period,
    stats: adminStats(submissions),
    entries: submissions.map(adminSubmissionDto),
  });
});

app.get("/api/admin/entries.csv", requireAdmin, async (request, response) => {
  const period = parseAdminPeriod(request.query);
  const submissions = await loadAdminSubmissions(period);
  const csv = toCsv([
    [
      "created_at",
      "first_name",
      "last_name",
      "email",
      "email_confirmed",
      "status",
      "overall_score",
      "who_score",
      "task_score",
      "context_score",
      "output_score",
      "winner_selected_at",
      "prompt_text",
      "disqualified_reason",
    ],
    ...submissions.map((submission) => [
      submission.createdAt.toISOString(),
      submission.contact.firstName,
      submission.contact.lastName,
      submission.contact.email,
      submission.contact.emailConfirmedAt ? "yes" : "no",
      submission.status,
      submission.overallScore,
      submission.whoScore,
      submission.taskScore,
      submission.contextScore,
      submission.outputScore,
      submission.contestWinners[0]?.selectedAt?.toISOString() || "",
      submission.promptText,
      submission.disqualifiedReason || "",
    ]),
  ]);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="hermancoach-entries.csv"`);
  response.send(csv);
});

app.patch("/api/admin/submissions/:id", requireAdmin, async (request, response) => {
  const submissionId = String(request.params.id || "");
  const status = String(request.body?.status || "");
  const reason = String(request.body?.reason || "").trim();
  if (!["eligible", "disqualified"].includes(status)) {
    response.status(400).json({ error: "Status must be eligible or disqualified." });
    return;
  }

  const submission = await prisma.promptSubmission.update({
    where: { id: submissionId },
    data: {
      status,
      disqualifiedReason: status === "disqualified" ? reason || "Admin disqualified" : null,
      reviewedAt: new Date(),
      reviewedBy: request.admin.email,
    },
    include: adminSubmissionInclude,
  });
  response.json({ entry: adminSubmissionDto(submission) });
});

app.post("/api/admin/draw-winner", requireAdmin, async (request, response) => {
  const period = parseAdminPeriod(request.body || {});
  const eligibleSubmissions = await prisma.promptSubmission.findMany({
    where: {
      ...periodWhere(period),
      status: "eligible",
      contact: {
        emailConfirmedAt: { not: null },
        contestWinners: { none: {} },
      },
      contestWinners: { none: {} },
    },
    include: adminSubmissionInclude,
  });
  if (eligibleSubmissions.length === 0) {
    response.status(409).json({ error: "No eligible entries found for this drawing period." });
    return;
  }

  const selectedSubmission = eligibleSubmissions[Math.floor(Math.random() * eligibleSubmissions.length)];
  const winner = await prisma.contestWinner.create({
    data: {
      contactId: selectedSubmission.contactId,
      promptSubmissionId: selectedSubmission.id,
      selectedBy: request.admin.email,
      prizeLabel: "weekly prize",
      notes: period.label,
    },
    include: {
      contact: true,
      promptSubmission: true,
    },
  });
  response.json({
    winner: {
      id: winner.id,
      selectedAt: winner.selectedAt,
      prizeLabel: winner.prizeLabel,
      contact: {
        firstName: winner.contact.firstName,
        lastName: winner.contact.lastName,
        email: winner.contact.email,
      },
      score: winner.promptSubmission.overallScore,
      promptText: winner.promptSubmission.promptText,
    },
    eligibleCount: eligibleSubmissions.length,
  });
});

app.get("/api/coach/session", async (request, response) => {
  const rawToken = String(request.query.token || "").trim();
  if (!rawToken) {
    response.status(400).json({ error: "Token is required." });
    return;
  }

  const tokenHash = hashToken(rawToken);
  const ipHash = hashIp(clientIp(request));
  const userAgent = String(request.headers["user-agent"] || "").slice(0, 500) || null;

  const accessToken = await prisma.accessToken.findUnique({
    where: { tokenHash },
    include: {
      contact: {
        include: {
          promptSubmissions: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
      coachSessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!accessToken || accessToken.revokedAt) {
    response.status(404).json({ error: "Coach link was not found." });
    return;
  }

  const updates = {
    lastUsedAt: new Date(),
    lastIpHash: ipHash,
  };
  let showSharingNotice = false;
  if (!accessToken.firstIpHash && ipHash) {
    updates.firstIpHash = ipHash;
  } else if (ipHash && accessToken.firstIpHash && ipHash !== accessToken.firstIpHash) {
    updates.ipMismatchCount = { increment: 1 };
    showSharingNotice = accessToken.ipMismatchCount + 1 > 2;
  }

  const updatedToken = await prisma.accessToken.update({
    where: { id: accessToken.id },
    data: updates,
  });
  await prisma.tokenAccessEvent.create({
    data: {
      accessTokenId: accessToken.id,
      ipHash,
      userAgent,
      action: "view_coach",
    },
  });

  let session = accessToken.coachSessions[0];
  const originalSubmission = accessToken.contact.promptSubmissions[0];
  if (session && originalSubmission && isLegacyStructuredPrompt(session.currentPrompt)) {
    session = await prisma.coachSession.update({
      where: { id: session.id },
      data: {
        currentPrompt: originalSubmission.promptText,
        overallScore: originalSubmission.overallScore,
        whoScore: originalSubmission.whoScore,
        taskScore: originalSubmission.taskScore,
        contextScore: originalSubmission.contextScore,
        outputScore: originalSubmission.outputScore,
      },
    });
  }
  const narrative = session ? scoreNarrative(session.overallScore) : null;
  const weakestDimension = session
    ? weakestDimensionFromScores(session)
    : "context";
  response.json({
    contact: {
      firstName: accessToken.contact.firstName,
      lastName: accessToken.contact.lastName,
      emailConfirmed: Boolean(accessToken.contact.emailConfirmedAt),
    },
    coachSession: session,
    score: session
      ? {
          overallScore: session.overallScore,
          whoScore: session.whoScore,
          taskScore: session.taskScore,
          contextScore: session.contextScore,
          outputScore: session.outputScore,
          headline: narrative.headline,
          feedbackSummary: narrative.feedbackSummary,
          coachingSuggestion: coachingSuggestionFor(weakestDimension),
        }
      : null,
    sharingNotice: showSharingNotice
      ? {
          message:
            "Your personal link is not meant to be shared. If you are using a shared link, get your own coach link and enter for a chance to win your own prize in our weekly drawing.",
          challengeUrl: process.env.PUBLIC_CHALLENGE_URL || "/",
          mismatchCount: updatedToken.ipMismatchCount,
        }
      : null,
  });
});

app.post("/api/coach/rescore", async (request, response) => {
  const rawToken = String(request.body?.token || "").trim();
  const currentPrompt = String(request.body?.currentPrompt || "").trim();
  if (!rawToken) {
    response.status(400).json({ error: "Token is required." });
    return;
  }
  if (currentPrompt.length < 20 || currentPrompt.length > 1200) {
    response.status(400).json({ error: "Draft must be between 20 and 1,200 characters." });
    return;
  }

  const accessToken = await prisma.accessToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      coachSessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!accessToken || accessToken.revokedAt) {
    response.status(404).json({ error: "Coach link was not found." });
    return;
  }

  const existingSession = accessToken.coachSessions[0];
  if (!existingSession) {
    response.status(404).json({ error: "Coach session was not found." });
    return;
  }

  const score = scorePrompt(currentPrompt);
  const coachSession = await prisma.coachSession.update({
    where: { id: existingSession.id },
    data: {
      currentPrompt,
      draftVersion: { increment: 1 },
      overallScore: score.overallScore,
      whoScore: score.whoScore,
      taskScore: score.taskScore,
      contextScore: score.contextScore,
      outputScore: score.outputScore,
    },
  });
  await prisma.tokenAccessEvent.create({
    data: {
      accessTokenId: accessToken.id,
      ipHash: hashIp(clientIp(request)),
      userAgent: String(request.headers["user-agent"] || "").slice(0, 500) || null,
      action: "rescore",
    },
  });

  response.json({
    coachSession,
    score,
  });
});

app.use("/assets", express.static(path.join(rootDir, "assets"), { index: false }));

app.get(["/app.js", "/styles.css", "/admin.js", "/admin.css"], (request, response) => {
  response.sendFile(path.join(rootDir, request.path));
});

app.get("/admin", (_request, response) => {
  response.sendFile(path.join(rootDir, "admin.html"));
});

app.get(["/", "/u/:token"], (_request, response) => {
  response.sendFile(path.join(rootDir, "index.html"));
});

app.use((_request, response) => {
  response.status(404).json({
    error: "Not found",
  });
});

app.listen(port, host, () => {
  console.log(`HermanCoach listening on http://${host}:${port}`);
});

function isLegacyStructuredPrompt(currentPrompt) {
  return String(currentPrompt || "").startsWith(
    "Who: You are a practical AI productivity coach.\nTask: Improve this prompt",
  );
}

function weakestDimensionFromScores(session) {
  return [
    ["who", session.whoScore],
    ["task", session.taskScore],
    ["context", session.contextScore],
    ["output", session.outputScore],
  ].sort((a, b) => a[1] - b[1])[0][0];
}

const adminSubmissionInclude = {
  contact: {
    include: {
      contestWinners: true,
    },
  },
  contestWinners: true,
};

function parseAdminPeriod(source) {
  const start = parseDateValue(source.startDate);
  const end = parseDateValue(source.endDate, true);
  const label = start || end ? `${start?.toISOString() || "beginning"} to ${end?.toISOString() || "now"}` : "all time";
  return {
    startDate: start ? start.toISOString().slice(0, 10) : "",
    endDate: end ? end.toISOString().slice(0, 10) : "",
    label,
  };
}

function parseDateValue(value, endOfDay = false) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function periodWhere(period) {
  const createdAt = {};
  if (period.startDate) {
    createdAt.gte = parseDateValue(period.startDate);
  }
  if (period.endDate) {
    createdAt.lte = parseDateValue(period.endDate, true);
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

async function loadAdminSubmissions(period) {
  return prisma.promptSubmission.findMany({
    where: periodWhere(period),
    include: adminSubmissionInclude,
    orderBy: { createdAt: "desc" },
  });
}

function adminStats(submissions) {
  const confirmed = submissions.filter((submission) => submission.contact.emailConfirmedAt).length;
  const eligible = submissions.filter(
    (submission) =>
      submission.status === "eligible" &&
      submission.contact.emailConfirmedAt &&
      submission.contact.contestWinners.length === 0 &&
      submission.contestWinners.length === 0,
  ).length;
  return {
    total: submissions.length,
    confirmed,
    eligible,
    disqualified: submissions.filter((submission) => submission.status === "disqualified").length,
    winners: submissions.filter((submission) => submission.contestWinners.length > 0).length,
  };
}

function adminSubmissionDto(submission) {
  return {
    id: submission.id,
    createdAt: submission.createdAt,
    promptText: submission.promptText,
    overallScore: submission.overallScore,
    whoScore: submission.whoScore,
    taskScore: submission.taskScore,
    contextScore: submission.contextScore,
    outputScore: submission.outputScore,
    status: submission.status,
    disqualifiedReason: submission.disqualifiedReason,
    reviewedAt: submission.reviewedAt,
    reviewedBy: submission.reviewedBy,
    emailConfirmed: Boolean(submission.contact.emailConfirmedAt),
    winnerSelectedAt: submission.contestWinners[0]?.selectedAt || null,
    canWin:
      submission.status === "eligible" &&
      Boolean(submission.contact.emailConfirmedAt) &&
      submission.contact.contestWinners.length === 0 &&
      submission.contestWinners.length === 0,
    contact: {
      firstName: submission.contact.firstName,
      lastName: submission.contact.lastName,
      email: submission.contact.email,
    },
  };
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const cell = String(value ?? "");
          if (/[",\n\r]/.test(cell)) {
            return `"${cell.replaceAll('"', '""')}"`;
          }
          return cell;
        })
        .join(","),
    )
    .join("\n");
}

function confirmEmailHtml(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f6f9fc; color: #111a35; }
      main { max-width: 560px; margin: 12vh auto; padding: 32px; background: white; border: 1px solid #dce7f7; border-radius: 18px; }
      h1 { margin: 0 0 12px; }
      a { color: #13b5de; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
      <p><a href="/">Return to HermanCoach</a></p>
    </main>
  </body>
</html>`;
}
