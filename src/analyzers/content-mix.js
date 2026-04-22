const ASK_STARTERS = /^\s*(?:anyone|does anyone|has anyone|someone|looking for|need help|need a|need an|recommend|¿alguien|alguien|busco|necesito|¿cómo|¿qué|¿dónde|¿por qué|¿quién|recomiendan|alguém|procuro|preciso|quelqu'un|cherche|besoin)\b/i;
const URL_RE = /https?:\/\/\S+/;
const SOCIAL_SHORT_RE = /^\s*(?:hola|hi|hey|hello|buenos días|bom dia|bonjour|gracias|thanks|thank you|merci|obrigad[oa]|jajaja+|haha+|lol|lolz|wow|ok|okay|😂+|👍+|🙌+|🙏+|👏+|🤣+)[\s.!?]*$/i;
const META_RE = /\b(comunidad|community|this group|the group|el grupo|este chat|this chat)\b/i;

export function buildContentMix(parsedMessages, { sinceIso, untilIso } = {}) {
  const real = parsedMessages
    .filter(m => m.kind === 'message' && !m.wasDeleted && m.sender)
    .filter(m => m.sentAt >= sinceIso && m.sentAt <= untilIso);

  const categories = { question: 0, answer: 0, share: 0, social: 0, announcement: 0, meta: 0, other: 0 };
  const perMember = new Map();

  for (let i = 0; i < real.length; i++) {
    const m = real[i];
    const text = (m.text ?? '').trim();
    const category = classify(text, m, real, i);
    categories[category]++;
    const mm = perMember.get(m.sender) ?? { name: m.sender, question: 0, answer: 0, share: 0, social: 0, announcement: 0, meta: 0, other: 0 };
    mm[category]++;
    perMember.set(m.sender, mm);
  }

  const total = Object.values(categories).reduce((s, n) => s + n, 0) || 1;
  const percentages = Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, +((v / total) * 100).toFixed(1)]));

  return { categories, percentages, total, perMember: [...perMember.values()] };
}

function classify(text, m, all, idx) {
  if (!text) return 'other';
  if (m.mediaKind || URL_RE.test(text)) return 'share';
  if (SOCIAL_SHORT_RE.test(text) || text.length < 20) return 'social';
  if (/[?¿]/.test(text) || ASK_STARTERS.test(text)) return 'question';

  const mMs = new Date(m.sentAt).getTime();
  for (let j = idx - 1; j >= Math.max(0, idx - 20); j--) {
    const prior = all[j];
    if (prior.sender === m.sender) continue;
    if (mMs - new Date(prior.sentAt).getTime() > 30 * 60 * 1000) break;
    if (/[?¿]/.test(prior.text ?? '') && text.length > 30) return 'answer';
  }

  if (META_RE.test(text)) return 'meta';
  if (text.length > 200) return 'announcement';
  return 'other';
}
