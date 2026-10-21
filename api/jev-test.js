const sampleState = {
  thread: {
    subreddit: "r/crm",
    title: "What's the best CRM for an early stage, bootstrapped startup?",
    body: "I need something simple for a small sales team. We are comparing HubSpot and Pipedrive.",
  },
  product: "GoHook helps teams find buying-intent Reddit threads, assess relevance, and draft useful responses.",
  candidateSubreddits: ["r/crm", "r/smallbusiness", "r/startups"],
  candidateOpportunities: ["reply to this thread", "write a broader CRM comparison post", "ignore this thread"],
  draft: "For a small team, start with the workflow you need today. HubSpot is useful if you want CRM and marketing in one place; Pipedrive is simpler for a sales-first process.",
  campaignCandidates: ["crm-buying-intent", "founder-growth", "organic-reddit"],
};

function questions(state) {
  const subreddits = Object.fromEntries((state.candidateSubreddits || []).map((value) => [value, null]));
  const opportunities = Object.fromEntries((state.candidateOpportunities || []).map((value) => [value, null]));
  const campaigns = Object.fromEntries((state.campaignCandidates || []).map((value) => [value, null]));

  return {
    relevant_to_product: {
      type: "noul",
      instructions: "Is this Reddit thread relevant to the product described in the state?",
      criteria: { true: "The product could meaningfully help the person or conversation", false: "The product does not fit the thread" },
    },
    buying_intent: {
      type: "choice",
      instructions: "Classify the thread's buying intent.",
      criteria: { low: "No clear evaluation or purchase signal", medium: "Exploring options or comparing approaches", high: "Actively choosing a tool or ready to buy" },
    },
    best_subreddit: {
      type: "choice",
      instructions: "Which listed subreddit is the strongest fit for this opportunity?",
      criteria: subreddits,
    },
    first_opportunity: {
      type: "choice",
      instructions: "Which listed opportunity should GoHook surface first?",
      criteria: opportunities,
    },
    voice_match: {
      type: "noul",
      instructions: "Does the draft match the product voice and avoid sounding like an unsolicited pitch?",
      criteria: { true: "Helpful, direct, and natural for the subreddit", false: "Generic, promotional, or unlike the stated voice" },
    },
    answer_quality: {
      type: "score",
      instructions: "How well does the draft answer the thread's question?",
      criteria: ["Does not answer", "Partly answers", "Directly answers with useful context"],
    },
    recommended_action: {
      type: "choice",
      instructions: "What should GoHook recommend next?",
      criteria: { reply: "Reply directly to this thread", post: "Write a standalone post instead", ignore: "Do not engage" },
    },
    attribution: {
      type: "choice",
      instructions: "Which campaign or thread should receive attribution for a resulting click or signup?",
      criteria: campaigns,
    },
    competitor_mention: {
      type: "choice",
      instructions: "Classify competitor mentions in this thread.",
      criteria: { relevant: "A competitor or alternative appears and matters to the opportunity", irrelevant: "No meaningful competitor context", comparison: "The user is directly comparing named tools" },
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST with an optional GoHook thread state." });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not available in this deployment." });
  }

  const state = { ...sampleState, ...(req.body || {}) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gohook-homepage.vercel.app",
        "X-OpenRouter-Title": "GoHook staging Jev test",
      },
      body: JSON.stringify({ model: "typesafe/jev-1.13", state, questions: questions(state) }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({ error: "Jev returned a non-JSON response." }));
    return res.status(response.status).json(payload);
  } catch (error) {
    return res.status(error.name === "AbortError" ? 504 : 502).json({
      error: error.name === "AbortError" ? "Jev did not respond within 25 seconds." : "Jev request failed.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
