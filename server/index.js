import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "./db.js";
import { scoreNarrative, scorePrompt } from "./scoring.js";
import {
  clientIp,
  decryptValue,
  encryptValue,
  hashIp,
  hashPrompt,
  hashToken,
  normalizeEmail,
  randomToken,
  sha256,
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
            take: 1,
          },
        },
      });

      if (existingContact) {
        let accessToken = existingContact.accessTokens[0];
        let coachUrl = null;
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
        } else {
          const existingRawToken = decryptValue(accessToken.tokenCiphertext);
          if (existingRawToken) {
            coachUrl = `${publicBaseUrl}/u/${existingRawToken}`;
          }
        }

        return {
          alreadyEntered: true,
          contactId: existingContact.id,
          coachUrl,
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
          currentPrompt: structuredPromptFrom(promptText),
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

    response.json(result);
  } catch (error) {
    console.error("Entry creation failed", error);
    response.status(500).json({ error: "Unable to create entry right now." });
  }
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
      contact: true,
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

  const session = accessToken.coachSessions[0];
  const narrative = session ? scoreNarrative(session.overallScore) : null;
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

app.use("/assets", express.static(path.join(rootDir, "assets"), { index: false }));

app.get(["/app.js", "/styles.css"], (request, response) => {
  response.sendFile(path.join(rootDir, request.path));
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

function structuredPromptFrom(promptText) {
  return `Who: You are a practical AI productivity coach.
Task: Improve this prompt so it produces a useful, trustworthy response.
Context: The user's original prompt was: ${promptText}
Output: Return a concise revised prompt, then explain the two most important changes.`;
}
