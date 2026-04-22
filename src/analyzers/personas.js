const DAY_MS = 24 * 60 * 60 * 1000;

export function buildPersonas(parsedMessages, { sinceIso, untilIso, rosterSize } = {}) {
  const real = parsedMessages.filter(m => m.kind === 'message' && !m.wasDeleted && m.sender);
  const inWindow = real.filter(m => m.sentAt >= sinceIso && m.sentAt <= untilIso);

  const stats = new Map();
  for (const m of inWindow) {
    const s = stats.get(m.sender) ?? { name: m.sender, messages: 0, questions: 0, repliesGiven: 0, linksShared: 0, mediaShared: 0, threadsStarted: 0, distinctPeopleReplied: new Set(), firstAt: m.sentAt, lastAt: m.sentAt };
    s.messages++;
    if (/[?¿]/.test(m.text ?? '')) s.questions++;
    if (/https?:\/\//.test(m.text ?? '')) s.linksShared++;
    if (m.mediaKind) s.mediaShared++;
    if (m.sentAt < s.firstAt) s.firstAt = m.sentAt;
    if (m.sentAt > s.lastAt) s.lastAt = m.sentAt;
    stats.set(m.sender, s);
  }

  for (let i = 0; i < inWindow.length; i++) {
    const q = inWindow[i];
    if (!/[?¿]/.test(q.text ?? '')) continue;
    const qMs = new Date(q.sentAt).getTime();
    for (let j = i + 1; j < inWindow.length; j++) {
      const r = inWindow[j];
      const rMs = new Date(r.sentAt).getTime();
      if (rMs - qMs > 30 * 60 * 1000) break;
      if (!r.sender || r.sender === q.sender) continue;
      if ((r.text ?? '').length < 30) continue;
      const s = stats.get(r.sender);
      if (!s) continue;
      s.repliesGiven++;
      s.distinctPeopleReplied.add(q.sender);
    }
  }

  const all = [...parsedMessages.filter(m => m.kind === 'message' && !m.wasDeleted && m.sender)];
  const windowStartMs = new Date(sinceIso).getTime();
  const firstEverBy = new Map();
  for (const m of all) {
    if (!firstEverBy.has(m.sender) || m.sentAt < firstEverBy.get(m.sender)) firstEverBy.set(m.sender, m.sentAt);
  }

  const members = [...stats.values()].map(s => {
    const qRatio = s.messages > 0 ? s.questions / s.messages : 0;
    const helpRatio = s.messages > 0 ? s.repliesGiven / s.messages : 0;
    const distinctPartners = s.distinctPeopleReplied.size;
    const firstEver = firstEverBy.get(s.name);
    const isNew = firstEver && new Date(firstEver).getTime() >= windowStartMs;

    const tags = [];
    if (s.repliesGiven >= 3 && helpRatio >= 0.25) tags.push('helper');
    if (s.questions >= 3 && qRatio >= 0.3) tags.push('asker');
    if (distinctPartners >= 5) tags.push('connector');
    if (s.linksShared >= 3) tags.push('content-sharer');
    if (s.messages >= 10 && !tags.includes('asker') && !tags.includes('helper')) tags.push('regular');
    if (isNew) tags.push('newcomer');
    if (tags.length === 0) tags.push('observer');

    return {
      name: s.name,
      messages: s.messages,
      questions: s.questions,
      repliesGiven: s.repliesGiven,
      linksShared: s.linksShared,
      distinctPartners,
      questionRatio: +qRatio.toFixed(2),
      helpRatio: +helpRatio.toFixed(2),
      tags,
    };
  });

  const activePostingSenders = new Set(members.map(m => m.name));
  const clusters = {
    helper: members.filter(m => m.tags.includes('helper')).sort((a, b) => b.repliesGiven - a.repliesGiven),
    asker: members.filter(m => m.tags.includes('asker')).sort((a, b) => b.questions - a.questions),
    connector: members.filter(m => m.tags.includes('connector')).sort((a, b) => b.distinctPartners - a.distinctPartners),
    'content-sharer': members.filter(m => m.tags.includes('content-sharer')).sort((a, b) => b.linksShared - a.linksShared),
    regular: members.filter(m => m.tags.includes('regular')).sort((a, b) => b.messages - a.messages),
    newcomer: members.filter(m => m.tags.includes('newcomer')).sort((a, b) => b.messages - a.messages),
    observer: members.filter(m => m.tags.includes('observer')).sort((a, b) => b.messages - a.messages),
    lurker_count: rosterSize ? rosterSize - activePostingSenders.size : 0,
  };

  return { members, clusters };
}
