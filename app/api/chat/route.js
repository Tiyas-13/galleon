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

const QUERY_SYSTEM = `You are a personal finance assistant for Galleon, a finance tracking app.
Answer questions about the user's finances concisely (2-4 sentences max).
Be specific with numbers. Use the currency symbol provided.
Only use the data provided — don't make up figures.`;

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
      const { summary } = context ?? {};

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: QUERY_SYSTEM,
        messages: [{ role: 'user', content: `Financial data:\n${summary}\n\nQuestion: ${text}` }],
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
