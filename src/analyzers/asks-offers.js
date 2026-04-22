const WINDOW_MS = 3 * 60 * 60 * 1000;

const ASK_STARTERS = /^\s*(?:anyone|does anyone|has anyone|someone|looking for|need help|need a|need an|need someone|recommend|any recommendation|¿alguien|alguien|busco|necesito|¿cómo|¿qué|¿dónde|¿quién|recomiendan|recomendación|alguém|procuro|preciso|recomenda|quelqu'un|cherche|besoin|recommande)\b/i;
const OFFER_PATTERNS = [
  /\bI (?:can|could) help\b|\bi know (?:someone|a|one|a good)\b|\bhappy to help\b|\blet me\b|\breach out to me\b/i,
  /\bpuedo ayudar\b|\byo (?:puedo|sé|conozco)\b|\bte paso\b|\bte mando\b|\bescríbeme\b|\bmándame\b/i,
  /\bposso ajudar\b|\bte passo\b|\beu conheço\b/i,
  /\bje peux aider\b|\bcontacte-moi\b/i,
];
const STOPWORDS = new Set('the a an and or but is are was were be been being to of in on at by with as from for this that these those i you we they them us'.split(' '));

export function buildAsksOffers(parsedMessages, { sinceIso, untilIso } = {}) {
  const real = parsedMessages
    .filter(m => m.kind === 'message' && !m.wasDeleted && m.sender)
    .filter(m => m.sentAt >= sinceIso && m.sentAt <= untilIso);

  const asks = [];
  const offers = [];

  for (const m of real) {
    const text = (m.text ?? '').trim();
    if (!text) continue;
    const isAsk = /[?¿]/.test(text) || ASK_STARTERS.test(text);
    const isOffer = OFFER_PATTERNS.some(re => re.test(text));
    if (isAsk) asks.push({ sender: m.sender, sentAt: m.sentAt, text, tokens: topicTokens(text) });
    if (isOffer) offers.push({ sender: m.sender, sentAt: m.sentAt, text, tokens: topicTokens(text) });
  }

  const matches = [];
  for (const ask of asks) {
    for (const offer of offers) {
      if (ask.sender === offer.sender) continue;
      const overlap = tokenOverlap(ask.tokens, offer.tokens);
      if (overlap < 2) continue;
      const askMs = new Date(ask.sentAt).getTime();
      const offerMs = new Date(offer.sentAt).getTime();
      if (Math.abs(offerMs - askMs) > 14 * 24 * 60 * 60 * 1000) continue;

      const inWindow = Math.abs(offerMs - askMs) < WINDOW_MS;
      const confidence = overlap >= 4 ? 'high' : overlap >= 3 ? 'med' : 'low';
      matches.push({
        ask: { sender: ask.sender, sentAt: ask.sentAt, text: ask.text },
        offer: { sender: offer.sender, sentAt: offer.sentAt, text: offer.text },
        sharedTokens: [...ask.tokens].filter(t => offer.tokens.has(t)).slice(0, 5),
        inReplyWindow: inWindow,
        confidence,
      });
    }
  }

  matches.sort((a, b) => {
    const rank = { high: 3, med: 2, low: 1 };
    return rank[b.confidence] - rank[a.confidence];
  });

  const unrespondedOffers = offers.filter(o =>
    !matches.some(m => m.offer.sentAt === o.sentAt && m.offer.sender === o.sender && m.inReplyWindow)
  );

  return {
    asksCount: asks.length,
    offersCount: offers.length,
    matches: matches.slice(0, 20),
    possibleIntros: matches.filter(m => !m.inReplyWindow && m.confidence !== 'low').slice(0, 10),
  };
}

function topicTokens(text) {
  const tokens = text.toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter(t => t.length >= 4 && !STOPWORDS.has(t));
  return new Set(tokens);
}

function tokenOverlap(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}
