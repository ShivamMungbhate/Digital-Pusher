import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { User, IUser } from '../models/User.js';
import { Consent } from '../models/Consent.js';
import { Submission, ISubmission } from '../models/Submission.js';
import { Analysis } from '../models/Analysis.js';
import { Alert } from '../models/Alert.js';

export async function seedDemoData(): Promise<void> {
  const passwordHash = await bcrypt.hash('DemoPass123!', 10);

  // 1. Seed or update Demo Senior (Ramesh Sharma)
  let senior = await User.findOne({ email: 'ramesh.senior@example.com' });
  if (!senior) {
    senior = await User.create({
      name: 'Ramesh Sharma',
      email: 'ramesh.senior@example.com',
      passwordHash,
      role: 'senior',
      phone: '+919876543210',
      preferredLanguage: 'en'
    });
    logger.info('Created demo senior user: Ramesh Sharma (ramesh.senior@example.com)');
  } else {
    senior.passwordHash = passwordHash;
    await senior.save();
    logger.info('Updated demo senior user: Ramesh Sharma');
  }

  // 2. Seed or update Demo Family Member (Priya Sharma)
  let family = await User.findOne({ email: 'priya.family@example.com' });
  if (!family) {
    family = await User.create({
      name: 'Priya Sharma',
      email: 'priya.family@example.com',
      passwordHash,
      role: 'family',
      phone: '+919876543211',
      preferredLanguage: 'en'
    });
    logger.info('Created demo family member: Priya Sharma (priya.family@example.com)');
  } else {
    family.passwordHash = passwordHash;
    await family.save();
    logger.info('Updated demo family member: Priya Sharma');
  }

  // 3. Seed active Consent between Senior and Family Member
  let consent = await Consent.findOne({ seniorId: senior._id, familyId: family._id });
  if (!consent) {
    consent = await Consent.create({
      seniorId: senior._id,
      familyId: family._id,
      inviteCode: 'DEMO99',
      inviteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'active',
      shareLevel: 'summary_and_media',
      alertThreshold: 'medium',
      acceptedAt: new Date()
    });
    logger.info('Created active family consent link between Ramesh and Priya');
  }

  // 4. Sample Submissions & Analyses

  // Sample A: Scam Mode (Digital Arrest / Courier Drugs Parcel Seizure)
  const scamText =
    'URGENT: This is DCP Crime Branch. A parcel with drugs was seized at Mumbai Airport in your name. Transfer Rs 50,000 security deposit immediately or an arrest warrant will be executed in 2 hours.';
  let scamSub = await Submission.findOne({ userId: senior._id, mode: 'scam' });
  if (!scamSub) {
    scamSub = await Submission.create({
      userId: senior._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: scamText,
      status: 'done'
    });

    const scamAnalysis = await Analysis.create({
      submissionId: scamSub._id,
      userId: senior._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.98,
      summary:
        'This message is a clear scam attempting to pressure you with false threats. It uses fake police authority (DCP Crime Branch) and creates panic by claiming a drug parcel was seized in your name. Legitimate authorities never demand instant money transfers over text.',
      tactics: [
        { name: 'urgency', evidence: 'URGENT ... in 2 hours', severity: 'high' },
        { name: 'authority', evidence: 'This is DCP Crime Branch', severity: 'high' },
        { name: 'fear', evidence: 'parcel with drugs was seized ... arrest warrant will be executed', severity: 'high' },
        { name: 'payment_demand', evidence: 'Transfer Rs 50,000 security deposit immediately', severity: 'high' }
      ],
      findings: [],
      clauses: [],
      deadlines: [
        {
          label: 'Fake arrest warrant countdown',
          date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          source: 'in 2 hours'
        }
      ],
      safeSteps: [
        'Do not transfer any money or respond to the sender.',
        'Hang up immediately if anyone calls regarding this message.',
        'Verify directly by calling the official cybercrime helpline (1930) or your local police station.',
        'Share this with your trusted family members.'
      ],
      drafts: [
        {
          kind: 'family_alert',
          title: 'Scam Alert - Fake Police Parcel Extortion',
          body:
            'Hi Priya, I received a fake message claiming to be from DCP Crime Branch demanding Rs 50,000 for a parcel at Mumbai airport. I checked it on Digital Pusher and confirmed it is a scam. I have not sent any money.'
        },
        {
          kind: 'report',
          title: 'Cybercrime Portal Complaint',
          body:
            'Reporting impersonation and extortion attempt: The sender claimed to be DCP Crime Branch and threatened an arrest warrant unless Rs 50,000 was transferred immediately.'
        }
      ],
      audioUrl: '/audio/demo_scam_explanation.mp3',
      escalate: true,
      disclaimer: 'This is information to help you decide, not legal or financial advice.'
    });

    // Create corresponding High-Risk Alert for Priya
    await Alert.create({
      seniorId: senior._id,
      familyId: family._id,
      submissionId: scamSub._id,
      analysisId: scamAnalysis._id,
      risk: 'high',
      title: 'Scam Alert: High-risk message detected for Ramesh Sharma',
      summary:
        'High Alert: Fake DCP Crime Branch extortion message threatening arrest over a seized parcel.',
      suggestedAction:
        'Call your father immediately to assure him this is a known fraud tactic and ensure no money is sent.',
      mediaIncluded: false,
      channelsSent: [
        { channel: 'email', status: 'sent', sentAt: new Date() }
      ],
      status: 'unread'
    });

    logger.info('Seeded sample Scam submission, analysis, and family alert');
  }

  // Sample B: Genuine Bank OTP (HDFC NetBanking login OTP)
  const genuineText =
    '482910 is your secret OTP for login to HDFC Bank NetBanking. Valid for 10 mins. Do not share this OTP with anyone, including bank staff.';
  let genuineSub = await Submission.findOne({
    userId: senior._id,
    rawTextMasked: { $regex: /482910/ }
  });
  if (!genuineSub) {
    genuineSub = await Submission.create({
      userId: senior._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: genuineText,
      status: 'done'
    });

    await Analysis.create({
      submissionId: genuineSub._id,
      userId: senior._id,
      mode: 'scam',
      risk: 'low',
      verdict: 'looks_genuine',
      confidence: 0.96,
      summary:
        'This message appears to be a legitimate one-time password (OTP) sent by HDFC Bank for NetBanking login. It contains standard bank security disclaimers.',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: [
        'Use this code only if you personally just tried to log into your HDFC Bank account.',
        'Never read or share this code with anyone over phone, SMS, or email, even if they claim to be from the bank.'
      ],
      drafts: [],
      audioUrl: '/audio/demo_genuine_otp.mp3',
      escalate: false,
      disclaimer: 'This is information to help you decide, not legal or financial advice.'
    });

    logger.info('Seeded sample Genuine Bank OTP submission and analysis');
  }

  // Sample C: Dark Pattern Mode (Deceptive auto-renewal and roach motel cancellation)
  const darkPatternText =
    'Special Offer: 3-day trial for $1.00! (Hidden term: Auto-renews at $89.99/month unless cancelled 48 hours prior via certified mail. Cancellation fee of $25 applies).';
  let darkPatternSub = await Submission.findOne({ userId: senior._id, mode: 'dark_pattern' });
  if (!darkPatternSub) {
    darkPatternSub = await Submission.create({
      userId: senior._id,
      mode: 'dark_pattern',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: darkPatternText,
      status: 'done'
    });

    await Analysis.create({
      submissionId: darkPatternSub._id,
      userId: senior._id,
      mode: 'dark_pattern',
      risk: 'medium',
      verdict: 'issues_found',
      confidence: 0.93,
      summary:
        'Dark patterns detected: Deceptive trial offer with hidden recurring subscription billing ($89.99/month) and intentional obstacles to prevent cancellation (certified mail requirement + penalty fee).',
      tactics: [],
      findings: [
        {
          type: 'subscription_trap',
          category: 'Roach Motel',
          timestampSec: null,
          explanation:
            'The trial is priced at $1.00 but secretly converts to $89.99/month without clear upfront disclosure.',
          severity: 'high'
        },
        {
          type: 'hard_to_cancel',
          category: 'Obstruction',
          timestampSec: null,
          explanation:
            'Requiring cancellation via certified physical mail and charging a $25 cancellation fee violates fair consumer practices.',
          severity: 'high'
        }
      ],
      clauses: [],
      deadlines: [
        {
          label: 'Cancellation cutoff',
          date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          source: '48 hours prior'
        }
      ],
      safeSteps: [
        'Do not enter credit card or debit card details on this checkout.',
        'If you already signed up, contact your bank to place a block on unauthorized recurring merchant charges.'
      ],
      drafts: [
        {
          kind: 'cancellation',
          title: 'Immediate Cancellation Notice',
          body:
            'I hereby cancel my subscription trial immediately. I revoke any authorization for recurring billing to my card.'
        },
        {
          kind: 'complaint',
          title: 'Consumer Protection Complaint',
          body:
            'The vendor used deceptive trial pricing and prohibitive cancellation hurdles violating FTC negative option billing rules.'
        }
      ],
      audioUrl: '/audio/demo_dark_pattern.mp3',
      escalate: false,
      disclaimer: 'This is information to help you decide, not legal or financial advice.'
    });

    logger.info('Seeded sample Dark Pattern submission and analysis');
  }

  // Sample D: Paperwork Mode (One-sided lease agreement termination clause)
  const paperworkText =
    'Section 14(b): Landlord reserves the unilateral right to terminate the tenancy with 24 hours notice without cause. Tenant waives all rights to court proceedings and agrees to binding arbitration with tenant bearing all legal fees.';
  let paperworkSub = await Submission.findOne({ userId: senior._id, mode: 'paperwork' });
  if (!paperworkSub) {
    paperworkSub = await Submission.create({
      userId: senior._id,
      mode: 'paperwork',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: paperworkText,
      status: 'done'
    });

    await Analysis.create({
      submissionId: paperworkSub._id,
      userId: senior._id,
      mode: 'paperwork',
      risk: 'high',
      verdict: 'issues_found',
      confidence: 0.95,
      summary:
        'High-risk predatory terms identified in Section 14(b). The agreement permits unilateral eviction with only 24 hours notice and forces the tenant to pay all legal fees regardless of outcome.',
      tactics: [],
      findings: [],
      clauses: [
        {
          text: 'Landlord reserves unilateral right to terminate tenancy with 24 hours notice without cause',
          risk: 'high',
          reason:
            'Tenancy laws require a minimum 30 to 60 days written notice for no-cause termination. 24-hour eviction is legally unenforceable.',
          citation: 'Section 14(b)'
        },
        {
          text: 'Tenant waives all rights to court proceedings with tenant bearing all legal fees',
          risk: 'high',
          reason:
            'Unfair one-sided fee-shifting clause penalizes the tenant even if the landlord breaches the contract.',
          citation: 'Section 14(b)'
        }
      ],
      deadlines: [
        {
          label: 'Termination notice clause review',
          date: '2026-11-01T00:00:00Z',
          source: 'Section 14(b)'
        }
      ],
      safeSteps: [
        'Do not sign this lease agreement in its current form.',
        'Request the removal or amendment of Section 14(b) using the draft reply below.'
      ],
      drafts: [
        {
          kind: 'reply',
          title: 'Requested Lease Amendment',
          body:
            'Dear Property Manager, regarding Section 14(b), I request modifying the termination notice period to standard statutory notice (30 days) and revising the legal fees clause to mutual terms before signing.'
        }
      ],
      audioUrl: '/audio/demo_paperwork.mp3',
      escalate: true,
      disclaimer: 'This is information to help you decide, not legal or financial advice.'
    });

    logger.info('Seeded sample Paperwork submission and analysis');
  }

  logger.info('Demo seed completed successfully with all 4 operational mode samples!');
}

async function runStandalone() {
  try {
    await connectDB();
    await seedDemoData();
    logger.info('Seed script finished successfully.');
    process.exit(0);
  } catch (err: any) {
    logger.error({ error: err.message }, 'Seed script failed');
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runStandalone();
}
