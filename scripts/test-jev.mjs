process.stderr.write('OpenRouter key: ');
process.stdin.setRawMode?.(true);
const key = await new Promise(resolve => {
  let value = '';
  process.stdin.on('data', chunk => {
    const char = chunk.toString();
    if (char === '\r' || char === '\n') resolve(value.trim());
    else value += char;
  });
});
process.stdin.setRawMode?.(false);

const response = await fetch('https://openrouter.ai/api/alpha/decisions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'typesafe/jev-1.13',
    state: {
      product: 'GoHook helps brands find, evaluate, and reply to relevant Reddit opportunities.',
      thread: 'What is the best CRM for an early-stage, bootstrapped startup?',
      candidate_subreddits: ['r/CRM', 'r/startups', 'r/SmallBusiness'],
      draft: 'We tested a few CRMs while bootstrapping. Happy to share the trade-offs we found.',
      user_voice: 'Direct, helpful, specific, and never promotional.',
      attribution_event: 'User clicked the GoHook link after reading the r/CRM thread.',
    },
    questions: {
      relevant_to_product: { type: 'noul', instructions: 'Is this thread relevant to GoHook?', criteria: { true: 'A Reddit opportunity GoHook should evaluate', false: 'Not useful for GoHook' } },
      buying_intent: { type: 'choice', instructions: 'What is the buying-intent level?', criteria: { low: 'General discussion', medium: 'Researching solutions', high: 'Actively choosing a product' } },
      best_subreddit: { type: 'choice', instructions: 'Which candidate subreddit best fits this opportunity?', criteria: { 'r/CRM': 'CRM-focused conversation', 'r/startups': 'Startup-building conversation', 'r/SmallBusiness': 'Small-business conversation' } },
      opportunity_priority: { type: 'score', instructions: 'How strongly should GoHook surface this opportunity?', criteria: ['Do not surface', 'Low priority', 'Medium priority', 'High priority', 'Surface first'] },
      voice_match: { type: 'noul', instructions: 'Does the draft match the stated user voice?', criteria: { true: 'Direct, helpful, specific, and non-promotional', false: 'Does not match the voice' } },
      answer_quality: { type: 'score', instructions: 'How well does the draft answer the thread question?', criteria: ['Does not answer', 'Partly answers', 'Answers well'] },
      recommended_action: { type: 'choice', instructions: 'What should GoHook recommend?', criteria: { reply: 'Reply to this existing thread', post: 'Create a new post', ignore: 'Take no action' } },
      attribution: { type: 'choice', instructions: 'Which source should receive attribution for this click?', criteria: { 'r/CRM thread': 'The visible r/CRM thread', campaign: 'A broader campaign', direct: 'No attributable source' } },
      competitor_mention: { type: 'choice', instructions: 'How should GoHook classify the competitor signal?', criteria: { relevant: 'The thread compares or chooses competing products', irrelevant: 'No competitor decision signal' } },
    },
  }),
});

const result = await response.json();
if (!response.ok) {
  console.error(JSON.stringify({ status: response.status, error: result.error?.message ?? 'Request failed' }));
  process.exit(1);
}
console.log(JSON.stringify({ model: result.model, output: result.choices?.[0]?.message?.content ?? result }));
