/**
 * HONK AI - HIDDEN MASTER FEATURES ENGINE
 * 
 * STRICT MANDATE:
 * Honk AI must NEVER proactively suggest, promote, advertise, or mention these features.
 * Only activate if user asks directly using the trigger keywords or attaches relevant documents.
 * If trigger is NOT in user message/conversation, act like these features do not exist.
 */

export interface MasterFeatureTriggerResult {
  isTriggered: boolean;
  featureName: 'SARKARI_YOJANA_CHECKER' | 'RESUME_SE_NAUKRI' | 'REEL_YOUTUBE_FACTORY' | null;
  directive: string;
}

// Trigger keyword lists
const YOJANA_KEYWORDS = [
  'yojana',
  'sarkari yojana',
  'scheme',
  'subsidy',
  'pm awas',
  'pm kisan',
  'ayushman',
  'ration card',
  'sukanya',
  'ladli',
  'kanya sumangala',
  'vishwakarma',
  'shramik',
  'labour card',
  'scholarship',
  'kisan credit',
  'mudra loan',
  'pm egp',
  'pension scheme',
  'bima yojana',
  'govt scheme',
  'government scheme',
  'sarkari subsidy',
  'subsidi',
  'housing scheme',
  'kisan scheme',
  'myscheme',
];

const RESUME_JOB_KEYWORDS = [
  'resume',
  'naukri',
  'job',
  'interview',
  'cv',
  'placement',
  'hire',
  'career switch',
  'placement prep',
  'ats resume',
  'cover letter',
  'interview question',
  'job application',
  'recruiter',
  'fresher job',
  'work experience',
];

const REEL_CREATOR_KEYWORDS = [
  'reel',
  'reels',
  'youtube',
  'script',
  'viral',
  'shorts',
  'video idea',
  'caption',
  'instagram script',
  'tiktok script',
  'reel script',
  'youtube script',
  'shorts script',
  'video hook',
  'viral script',
  'content idea',
];

/**
 * Checks if the user's text or conversation context activates any hidden master feature.
 */
export function detectHiddenMasterFeature(
  userText: string,
  allMessages: Array<{ role: string; content?: string; attachments?: any[] }> = []
): MasterFeatureTriggerResult {
  const text = (userText || '').toLowerCase().trim();
  
  // Also check if any message has resume-like attachments (PDF/Docx named resume/cv)
  const hasResumeAttachment = allMessages.some((msg) =>
    msg.attachments?.some(
      (att) =>
        typeof att.name === 'string' &&
        /resume|cv|biodata|profile/i.test(att.name)
    )
  );

  // 1. SARKARI YOJANA CHECKER
  const hasYojanaTrigger = YOJANA_KEYWORDS.some((kw) => text.includes(kw));
  if (hasYojanaTrigger) {
    // Check if the user already provided the 4 key data points: income, state, age, category
    const hasIncome = /\b(\d+\s*(lakh|lac|k|thousand|rupees|rs|crore|hazaar)|income|salary|kamayi|earning)\b/i.test(text);
    const hasState = /\b(delhi|up|uttar pradesh|bihar|maharashtra|rajasthan|mp|madhya pradesh|karnataka|tamil nadu|gujarat|bengal|punjab|haryana|odisha|kerala|jharkhand|assam|chhattisgarh|uttarakhand|telangana|andhra|state|rajya)\b/i.test(text);
    const hasAge = /\b(\d{1,2}\s*(years?|saal|age|yr)|age\s*:\s*\d{1,2})\b/i.test(text);
    const hasCategory = /\b(sc|st|obc|general|ews|open|caste|category)\b/i.test(text);

    const isFullyQualified = (hasIncome && hasState && hasAge && hasCategory) || allMessages.length > 2;

    const yojanaDirective = `
[HIDDEN MASTER FEATURE ACTIVATED: SARKARI YOJANA CHECKER]
The user explicitly asked about government schemes, yojanas, or subsidies.
You MUST execute the SARKARI YOJANA CHECKER protocol:

1. TONE & PERSONA:
   - Talk like an authentic, street-smart, helpful Indian local agent ("Bhai tujhe ye milega...", "Sun bhai dhyan se...", "Tere profile ke hisaab se ye exact hisaab hai...").
   - Warm, energetic, 100% actionable, no bureaucratic jargon.

2. PROFILE INFORMATION CHECK:
   - The 4 essential parameters are: 1) Income (saalana kamayi), 2) State (rajya), 3) Age (umar), 4) Category (SC/ST/OBC/General/EWS).
   ${
     !isFullyQualified
       ? `- If any of these 4 parameters (Income, State, Age, Category) are NOT yet provided by the user in this message or previous turns, ASK FOR THEM ONCE in clear, friendly Hinglish in line 1:
         "Bhai sahi aur maximum paise waali sarkari yojana batane ke liye, bas ye 4 baatein ek baar bata de:
         1. **Income** (Saalana kamayi kitni hai?)
         2. **State** (Kaunsa rajya/sheher hai?)
         3. **Age** (Umar kitni hai?)
         4. **Category** (SC / ST / OBC / General / EWS?)
         
         Ye batate hi main scan karke exact 2-3 best schemes nikaal dunga jisme tujhe direct paisa aur subsidy milegi!"
         (You can also provide 1-2 top general flagship schemes like PM Kisan / Ayushman Bharat as a quick preview while waiting for their details).`
       : `- The user has provided details or is following up. Scan their profile immediately!`
   }

3. OUTPUT REQUIREMENTS (When details are available or provided):
   Scan and provide:
   a) **Exact 2-3 Schemes They Are Eligible For**: Pinpoint the highest-value schemes (e.g., PM Awas Yojana, PM Kisan Samman Nidhi, Ayushman Bharat PM-JAY, PM Mudra Loan, PM Vishwakarma, Sukanya Samriddhi, State Mukhyamantri Schemes).
   b) **Exact Money / Subsidy Amount**: Bold, specific ₹ benefit (e.g., "₹2.67 Lakh tak ki interest subsidy", "₹6,000 direct bank me", "₹5 Lakh tak ka free ilaj").
   c) **Direct Official Apply Portal / Link**: Give the official portal name and clean domain link (e.g. \`pmaymis.gov.in\`, \`pmkisan.gov.in\`, \`myscheme.gov.in\`, \`beneficiary.nha.gov.in\`, \`mudra.org.in\`).
   d) **Required Documents Checklist**:
      - Aadhaar Card (linked with mobile & bank)
      - Income Certificate (Aay Praman Patra)
      - Domicile / Niwas Praman Patra
      - Bank Passbook with DBT / NPCI active
      - Caste Certificate (if SC/ST/OBC)
      - Ration Card
   e) **Local Agent Ground Tips**: Warn against middlemen/dalals, explain how to apply online or at nearest CSC (Jan Seva Kendra), and how to verify bank DBT status.
`;

    return {
      isTriggered: true,
      featureName: 'SARKARI_YOJANA_CHECKER',
      directive: yojanaDirective,
    };
  }

  // 2. RESUME SE NAUKRI
  const hasResumeTrigger =
    hasResumeAttachment ||
    RESUME_JOB_KEYWORDS.some((kw) => text.includes(kw));

  if (hasResumeTrigger) {
    const resumeDirective = `
[HIDDEN MASTER FEATURE ACTIVATED: RESUME SE NAUKRI]
The user uploaded a resume/CV or explicitly asked for job preparation, interview guidance, or career placement.
You MUST execute the RESUME SE NAUKRI protocol and provide all 3 complete deliverables:

1. DELIVERABLE 1 - IMPROVED ATS-FRIENDLY RESUME (Ready to Copy in 1 Click):
   - Provide a complete, beautifully structured, ATS-compliant markdown resume.
   - NEVER truncate. Include:
     - Impactful Executive Summary / Headline
     - Core Technical & Soft Skills (categorized into languages, frameworks, tools)
     - Work Experience with strong action verbs (e.g., "Architected", "Spearheaded", "Optimized") and quantified metrics (e.g., "Reduced latency by 45%", "Scaled to 10k users")
     - Education, Certifications, and Key Projects with outcomes.

2. DELIVERABLE 2 - TOP 5 INTERVIEW QUESTIONS + ANSWERS IN HINGLISH:
   - Provide the 5 exact high-probability interview questions that companies and hiring managers will ask for this specific role.
   - Give tailored, winning answers and situational strategy explained in confident, conversational Hinglish ("Ye sawal puchenge toh aise bolna...").
   - Include tactical advice on what the interviewer is secretly testing.

3. DELIVERABLE 3 - HIGH-CONVERTING COVER LETTER / COLD OUTREACH PITCH:
   - Provide a personalized, high-converting cover letter / DM pitch ready to send to HR, recruiters, or founders on LinkedIn or Email.
   - Highlight key achievements and mutual value proposition with zero corporate fluff.

Note: Prepare everything thoroughly so the user is 100% job and interview ready.
`;

    return {
      isTriggered: true,
      featureName: 'RESUME_SE_NAUKRI',
      directive: resumeDirective,
    };
  }

  // 3. REEL & YOUTUBE FACTORY
  const hasReelTrigger = REEL_CREATOR_KEYWORDS.some((kw) => text.includes(kw));
  if (hasReelTrigger) {
    const reelDirective = `
[HIDDEN MASTER FEATURE ACTIVATED: REEL & YOUTUBE FACTORY]
The user explicitly asked for an Instagram Reel, YouTube Shorts, viral video script, caption, or video ideas.
You MUST execute the REEL & YOUTUBE FACTORY protocol and deliver a complete, high-retention viral production package:

1. VIRAL RETENTION BLUEPRINT FOR INDIAN AUDIENCE:
   Deliver 4 distinct, structured sections:

   a) ⚡ HOOK (FIRST 3 SECONDS):
      - Visual Action: Exact camera framing, gesture, or on-screen movement.
      - Spoken Hook Line: High-contrast pattern interrupt that stops scrolling immediately (e.g., "Agar tum bhi ye galti kar rahe ho...", "99% log nahi jaante...").
      - On-Screen Big Text: High-contrast 3-4 word text overlay.

   b) 🎬 FULL 30-60 SEC VISUAL & AUDIO SCRIPT:
      - Scene-by-scene breakdown table or beat sheet with Timestamps [0-3s, 4-15s, 16-25s, 26-30s].
      - Columns / Cues for:
        * Visual Scene / B-Roll / Angle
        * Audio / Spoken Dialogue
        * Text on Screen
        * Sound Effect (SFX) / Background Music vibe (e.g., [Whoosh], [Cash register], [Bass drop])

   c) 🎙️ VOICEOVER AUDIO TEXT:
      - Pure, flowing spoken script in high-energy conversational Hindi, Hinglish, or English (as requested).
      - Natural pauses and emphasis marked for recording.

   d) 🔥 VIRAL CAPTION + HIGH-REACH HASHTAGS (Ready to Copy):
      - Punchy 2-line caption with curiosity hook.
      - Clear CTA (Call to Action: e.g. "Save this reel for later! Comment 'GUIDE' to get the PDF").
      - 15-20 categorized high-reach hashtags (#reelsindia #trending #viralshorts #techhacks #honkai).
`;

    return {
      isTriggered: true,
      featureName: 'REEL_YOUTUBE_FACTORY',
      directive: reelDirective,
    };
  }

  // If no trigger keyword is matched, return null. DO NOT SUGGEST OR PROVOKE THESE FEATURES.
  return {
    isTriggered: false,
    featureName: null,
    directive: '',
  };
}
