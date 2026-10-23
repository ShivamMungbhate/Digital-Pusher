import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Alert, IAlert, ISentChannel } from '../models/Alert.js';
import { Consent, IConsent } from '../models/Consent.js';
import { User } from '../models/User.js';
import { TelegramLink } from '../models/TelegramLink.js';
import { ISubmission } from '../models/Submission.js';
import { IAnalysis } from '../models/Analysis.js';

const RISK_SEVERITY: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3
};

interface SendEmailParams {
  to: string;
  familyName: string;
  seniorName: string;
  title: string;
  summary: string;
  risk: string;
  suggestedAction: string;
  mediaUrl?: string;
}

export async function dispatchAlertEmail(params: SendEmailParams): Promise<boolean> {
  const { to, familyName, seniorName, title, summary, risk, suggestedAction, mediaUrl } = params;

  try {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });

      const mediaHtml = mediaUrl
        ? `<p style="margin-top: 10px;"><strong>Attached Media:</strong> <a href="${mediaUrl}" style="color: #2563eb;">View Evidence Media</a></p>`
        : '';

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: `[Digital Pusher] ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ Urgent Security Alert for ${seniorName}</h2>
            <p>Dear ${familyName},</p>
            <p>Digital Pusher detected a <strong>${risk.toUpperCase()} RISK</strong> message submitted by your family member, <strong>${seniorName}</strong>.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #334155;">Summary:</p>
              <p style="margin: 4px 0 0 0; color: #475569;">${summary}</p>
            </div>
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
              <p style="margin: 0; font-weight: bold; color: #1e3a8a;">Recommended Next Action:</p>
              <p style="margin: 4px 0 0 0; color: #1e40af;">${suggestedAction}</p>
            </div>
            ${mediaHtml}
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
              You received this automated notification because ${seniorName} granted you protective family consent on Digital Pusher.
            </p>
          </div>
        `
      });
      logger.info({ to, title }, 'Alert email sent successfully via SMTP');
      return true;
    } else {
      // In development / test or without SMTP credentials, record simulated success
      logger.info(
        { to, title, risk },
        'Alert email dispatched (simulated / test mode - SMTP not configured)'
      );
      return true;
    }
  } catch (err: any) {
    logger.error({ err: err.message, to }, 'Failed to send alert email');
    return false;
  }
}

export async function dispatchAlertTelegram(chatId: string, message: string): Promise<boolean> {
  try {
    if (env.TELEGRAM_BOT_TOKEN) {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (!res.ok) {
        throw new Error(`Telegram API HTTP ${res.status}: ${await res.text()}`);
      }
      logger.info({ chatId }, 'Alert telegram message sent successfully');
      return true;
    } else {
      // In development / test without token, simulate success
      logger.info(
        { chatId },
        'Alert telegram message dispatched (simulated / test mode - BOT_TOKEN not configured)'
      );
      return true;
    }
  } catch (err: any) {
    logger.error({ err: err.message, chatId }, 'Failed to send alert telegram message');
    return false;
  }
}

/**
 * Checks active consents for a senior, applies thresholds, fatigue caps (max 3/hr),
 * deduplication (10 mins), and dispatches notifications via Email and Telegram.
 */
export async function triggerFamilyAlerts(
  submission: ISubmission,
  analysis: IAnalysis
): Promise<IAlert[]> {
  const createdAlerts: IAlert[] = [];

  try {
    const seniorId = submission.userId;

    // 1. Fetch senior user details
    const senior = await User.findById(seniorId);
    const seniorName = senior?.name || 'Your family member';

    // 2. Fetch all ACTIVE consents for this senior
    const activeConsents = await Consent.find({
      seniorId,
      status: 'active'
    });

    if (!activeConsents.length) {
      logger.debug({ seniorId }, 'No active family consents found for senior');
      return [];
    }

    // 3. Hourly fatigue cap check: max 3 alerts per hour per senior
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyAlertsCount = await Alert.countDocuments({
      seniorId,
      createdAt: { $gte: oneHourAgo }
    });

    if (hourlyAlertsCount >= 3) {
      logger.warn(
        { seniorId, hourlyAlertsCount },
        'Alert hourly cap reached (max 3/hour per senior). Suppressing new alerts.'
      );
      return [];
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const analysisRiskScore = RISK_SEVERITY[analysis.risk] || 0;

    // 4. Process each active consent
    for (const consent of activeConsents) {
      if (!consent.familyId) {
        continue;
      }

      // Check remaining hourly quota
      const currentHourlyCount = await Alert.countDocuments({
        seniorId,
        createdAt: { $gte: oneHourAgo }
      });
      if (currentHourlyCount >= 3) {
        logger.warn(
          { seniorId },
          'Hourly alert cap of 3 reached during processing. Stopping further alerts.'
        );
        break;
      }

      // A. Threshold Check: analysis.risk >= consent.alertThreshold
      const thresholdScore = RISK_SEVERITY[consent.alertThreshold] || 2; // Default medium (2)
      if (analysisRiskScore < thresholdScore) {
        logger.debug(
          { analysisRisk: analysis.risk, threshold: consent.alertThreshold, familyId: consent.familyId },
          'Analysis risk is below consent alertThreshold. Alert suppressed.'
        );
        continue;
      }

      // B. Deduplication Check: Dedupe identical alerts within 10 minutes
      const existingDuplicate = await Alert.findOne({
        seniorId,
        familyId: consent.familyId,
        createdAt: { $gte: tenMinutesAgo },
        $or: [
          { submissionId: submission._id },
          { analysisId: analysis._id },
          { summary: analysis.summary }
        ]
      });

      if (existingDuplicate) {
        logger.info(
          { seniorId, familyId: consent.familyId },
          'Identical alert for this family member detected within 10 minutes. Deduplicated & suppressed.'
        );
        continue;
      }

      // C. Content Level Check: Summary only unless shareLevel is "summary_and_media"
      const isSummaryAndMedia = consent.shareLevel === 'summary_and_media';
      let mediaUrl: string | undefined = undefined;

      if (isSummaryAndMedia) {
        if (submission.storageKey) {
          mediaUrl = `/api/submissions/${submission._id}/media`;
        } else if (analysis.audioUrl) {
          mediaUrl = analysis.audioUrl;
        }
      }

      const title = `Scam Alert: High-risk message detected for ${seniorName}`;
      const suggestedAction =
        analysis.safeSteps && analysis.safeSteps.length > 0
          ? analysis.safeSteps[0]
          : 'Check in with your family member immediately. Ensure they do not transfer funds or share private OTPs.';

      // Fetch family member user
      const familyUser = await User.findById(consent.familyId);
      const channelsSent: ISentChannel[] = [];

      // D. Send via Email
      if (familyUser?.email) {
        const emailSent = await dispatchAlertEmail({
          to: familyUser.email,
          familyName: familyUser.name || 'Family Member',
          seniorName,
          title,
          summary: analysis.summary,
          risk: analysis.risk,
          suggestedAction,
          mediaUrl
        });

        channelsSent.push({
          channel: 'email',
          status: emailSent ? 'sent' : 'failed',
          sentAt: new Date(),
          error: emailSent ? undefined : 'Failed to deliver email'
        });
      }

      // E. Send via Telegram if linked
      const tgLink = await TelegramLink.findOne({
        userId: consent.familyId,
        isLinked: true
      });

      if (tgLink?.chatId) {
        const tgText = `🚨 <b>Digital Pusher Alert for ${seniorName}</b>\n\n` +
          `<b>Risk Level:</b> ${analysis.risk.toUpperCase()}\n` +
          `<b>Summary:</b> ${analysis.summary}\n\n` +
          `<b>Action:</b> ${suggestedAction}` +
          (mediaUrl ? `\n\n<a href="${mediaUrl}">View Attached Evidence</a>` : '');

        const tgSent = await dispatchAlertTelegram(tgLink.chatId, tgText);

        channelsSent.push({
          channel: 'telegram',
          status: tgSent ? 'sent' : 'failed',
          sentAt: new Date(),
          error: tgSent ? undefined : 'Failed to deliver telegram message'
        });
      }

      // F. Create and persist Alert record
      const alert = await Alert.create({
        seniorId,
        familyId: consent.familyId,
        submissionId: submission._id,
        analysisId: analysis._id,
        risk: analysis.risk,
        title,
        summary: analysis.summary,
        suggestedAction,
        mediaIncluded: isSummaryAndMedia && Boolean(mediaUrl),
        mediaUrl,
        channelsSent,
        status: 'unread'
      });

      createdAlerts.push(alert);
      logger.info(
        { alertId: alert._id, seniorId, familyId: consent.familyId, risk: analysis.risk },
        'Family alert created and dispatched successfully'
      );
    }
  } catch (err: any) {
    logger.error({ err: err.message, submissionId: submission._id }, 'Error during triggerFamilyAlerts');
  }

  return createdAlerts;
}
