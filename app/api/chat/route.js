import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Verify Firebase ID token using Firebase REST API (no admin SDK needed)
async function verifyToken(idToken) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0]?.localId ?? null;
}

const PARSE_SYSTEM = `You are a transaction parser for a personal finance app called Galleon.
Extract transaction details from natural language and return ONLY valid JSON.
Today's date is {TODAY}.

Rules:
- type: "expense", "income", or "transfer"
- amount: positive number only
- date: YYYY-MM-DD format
- cat: pick the closest match from the provided categories, or null if unclear
- from: pick the closest matching account id from the provided accounts, or null if unclear
- to: account id for transfers only, otherwise null
- desc: short clean description (3-5 words)
- notes: any extra context, otherwise ""

Return ONLY this JSON shape, nothing else:
{"type":"expense","desc":"","amount":0,"date":"","cat":null,"from":null,"to":null,"notes":""}`;

const QUERY_SYSTEM = `You are a friendly personal finance assistant for Galleon, a finance tracking app.
Answer questions about the user's finances concisely (2-4 sentences max).
Be specific with numbers. Use the currency symbol provided.
Only use the data provided — don't make up figures.
{PERSONAL_CONTEXT}`;

const OWL_SYSTEM = `You are the Galleon Vault Owl — a magical financial correspondent in the wizarding world.
Each week you deliver a letter to the vault owner about the state of their finances.

Decide the letter type based on the financial data:
- "howler" if: a SPENDING budget group (dining, shopping, fun, etc.) is over 100%, OR net income minus expenses is negative this month, OR the user is spending notably more than they earn
- "owl" for everything else — including if someone is OVER their savings target (that is a good thing, celebrate it, do NOT treat it as a problem)
- IMPORTANT: exceeding a savings or investment budget means the user saved MORE than planned — this is excellent behaviour, never flag it negatively

For an OWL letter:
- Warm, encouraging, written like proper wizarding correspondence
- Reference Gringotts, vaults, Galleons/Sickles naturally where it fits
- Mention specific positive numbers — celebrate wins
- Note one thing to watch, gently
- Sign off: "Yours faithfully, The Galleon Owl"
- 3–4 short paragraphs, under 180 words

For a HOWLER:
- Dramatic and urgent, like Mrs Weasley's howler — but ultimately helpful
- Use CAPS for the most alarming figures
- Name the exact problem clearly
- End with one specific action they MUST take
- Sign off: "— THE GALLEON VAULT ALARM —"
- Under 140 words, punchy

{PERSONAL_CONTEXT}

Return ONLY valid JSON — nothing else:
{"type":"owl","title":"Weekly Vault Report","content":"..."}`;

const ANALYSE_SYSTEM = `You are a warm, balanced personal finance advisor for Galleon.
Your job is to give the user a thoughtful monthly vault briefing — like a trusted friend who happens to be great with money.

Guidelines:
- Start with a genuine positive observation. Find something they're genuinely doing well.
- Be specific with numbers — reference actual figures from the data.
- Point out 1-2 areas to watch, but frame them constructively ("you might want to keep an eye on X" not "you're overspending").
- Consider the personal context the user has shared — factor in their lifestyle, goals, and circumstances when giving advice.
- If they're ahead of their savings goal, celebrate it. If they're behind, be encouraging not alarming.
- Compare month-over-month trends where relevant.
- End with one concrete, actionable suggestion.
- Keep it conversational, warm, and under 200 words. No bullet points — write in flowing paragraphs.
- Use the currency symbol provided.
{PERSONAL_CONTEXT}`;

export async function POST(request) {
  try {
    const { idToken, type, text, context } = await request.json();

    if (!idToken || !text) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user is authenticated
    const uid = await verifyToken(idToken);
    if (!uid) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (type === 'parse') {
      const { categories = [], accounts = [] } = context ?? {};
      const today = new Date().toISOString().split('T')[0];
      const system = PARSE_SYSTEM.replace('{TODAY}', today);

      const userMsg = `Categories: ${categories.join(', ')}
Accounts: ${accounts.map(a => `${a.name} (id: ${a.id})`).join(', ')}
Transaction: "${text}"`;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        system,
        messages: [{ role: 'user', content: userMsg }],
      });

      const raw = msg.content[0]?.text?.trim() ?? '';
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ error: 'Could not parse response' }, { status: 500 });
      const parsed = JSON.parse(jsonMatch[0]);
      return Response.json({ result: parsed });

    } else if (type === 'query') {
      const { summary, personalContext, history = [] } = context ?? {};
      const ctxNote = personalContext
        ? `\n\nAbout this user: ${personalContext}`
        : '';
      const system = QUERY_SYSTEM.replace('{PERSONAL_CONTEXT}', ctxNote);

      // Build multi-turn messages: seed with financial data, then replay history
      const seedMsg  = { role: 'user',      content: `Here is my current financial data for context:\n${summary}` };
      const seedReply = { role: 'assistant', content: 'Got it — I have your financial data. What would you like to know?' };
      const historyMsgs = history
        .filter(m => m.text && m.text !== '✦ Analyse my vault') // skip system-style messages
        .map(m => ({ role: m.role, content: m.text }));
      const finalMsg = { role: 'user', content: text };

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system,
        messages: [seedMsg, seedReply, ...historyMsgs, finalMsg],
      });

      return Response.json({ result: msg.content[0]?.text?.trim() });

    } else if (type === 'owl') {
      const { summary, personalContext } = context ?? {};
      const ctxNote = personalContext
        ? `\n\nAbout this vault owner: ${personalContext}`
        : '';
      const system = OWL_SYSTEM.replace('{PERSONAL_CONTEXT}', ctxNote);

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 768,
        system,
        messages: [{ role: 'user', content: `Here is the vault owner's financial data:\n\n${summary}\n\nWrite this week's letter.` }],
      });

      const raw = msg.content[0]?.text?.trim() ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ error: 'Could not parse owl response' }, { status: 500 });
      const parsed = JSON.parse(jsonMatch[0]);
      return Response.json({ result: parsed });

    } else if (type === 'analyse') {
      const { summary, personalContext, history = [] } = context ?? {};
      const ctxNote = personalContext
        ? `\n\nAbout this user (factor this into your advice): ${personalContext}`
        : '';
      const system = ANALYSE_SYSTEM.replace('{PERSONAL_CONTEXT}', ctxNote);

      // Include prior conversation context so the briefing feels aware of what was discussed
      const historyMsgs = history
        .filter(m => m.text && m.text !== '✦ Analyse my vault')
        .map(m => ({ role: m.role, content: m.text }));

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system,
        messages: [
          ...historyMsgs,
          { role: 'user', content: `Here is my complete financial data:\n\n${summary}\n\nPlease give me my vault briefing.` },
        ],
      });

      return Response.json({ result: msg.content[0]?.text?.trim() });

    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (err) {
    console.error('Chat API error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
