const STOPWORDS_EN = new Set('the a an and or but is are was were be been being this that these those i you he she it we they them us him her my your our their this that for of to in on at by with as from not no yes ok okay so if then than about up down out over under just only also really very some any all each no not do does did done have has had will would could should may might must can make made say said says see saw seen know knew known get got gotten think thought like way one two three more most much many few lot lots thing things people guys hey hi hello thanks thank please sure yeah yep nope'.split(/\s+/));
const STOPWORDS_ES = new Set('el la los las un una unos unas y o pero es son era eran fue fueron ser sido siendo este ese estos esos esas estas yo tú tu vos él ella nosotros ustedes ellos ellas me te nos les lo le de a en para por con como sin no si sí también muy mucho poco todo todos cada ninguno alguno solo solamente pero aunque o u algo nada hacer hecho decir dicho ver visto saber conocido obtener ido pensar querer quiere gustan como por favor gracias hola chao bueno ok vale perfecto genial cosa cosas gente'.split(/\s+/));
const URL_RE = /https?:\/\/[^\s)]+/gi;

export function buildTopics(parsedMessages, { sinceIso, untilIso, minMessages = 3, topN = 12 } = {}) {
  const real = parsedMessages.filter(m =>
    m.kind === 'message' && !m.wasDeleted && m.sender
    && m.sentAt >= sinceIso && m.sentAt <= untilIso
  );

  const tokenCounts = new Map();
  const tokenMembers = new Map();
  const tokenSamples = new Map();

  for (const m of real) {
    const text = (m.text ?? '').replace(URL_RE, '').toLowerCase();
    const tokens = text
      .split(/[^\p{Letter}\p{Number}]+/u)
      .filter(t => t.length >= 4)
      .filter(t => !STOPWORDS_EN.has(t) && !STOPWORDS_ES.has(t))
      .filter(t => !/^[0-9]+$/.test(t));
    const seen = new Set();
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
      const mem = tokenMembers.get(t) ?? new Set();
      mem.add(m.sender);
      tokenMembers.set(t, mem);
      if (!tokenSamples.has(t)) tokenSamples.set(t, []);
      const samples = tokenSamples.get(t);
      if (samples.length < 3) samples.push({ sender: m.sender, sentAt: m.sentAt, text: m.text });
    }
  }

  const topTokens = [...tokenCounts.entries()]
    .filter(([, c]) => c >= minMessages)
    .map(([token, count]) => ({
      token,
      count,
      distinctMembers: tokenMembers.get(token).size,
      samples: tokenSamples.get(token),
    }))
    .sort((a, b) => b.count - a.count || b.distinctMembers - a.distinctMembers)
    .slice(0, topN);

  return { topTokens };
}
