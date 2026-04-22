const GRATITUDE_PATTERNS = [
  /\bgracias\b/i,
  /\bmerci\b/i,
  /\bobrigad[oa]\b/i,
  /\bthank[s ]|\bthank you\b|\bthanks a (lot|ton)\b/i,
  /\bappreciated?\b|\baprecio\b|\bagradezco\b/i,
  /\bthis (helped|saved)\b|\bme ayud[oó]\b|\bme salv[oó]\b/i,
  /\bgreat (point|answer|advice|thread)\b/i,
  /\b🙏|\b❤️|\b💯|\b👏/,
];

export function buildGratitude(parsedMessages, { sinceIso, untilIso } = {}) {
  const real = parsedMessages
    .filter(m => m.kind === 'message' && !m.wasDeleted && m.sender)
    .filter(m => m.sentAt >= sinceIso && m.sentAt <= untilIso);

  const grateful = [];
  const receivedBy = new Map();
  const expressedBy = new Map();

  for (let i = 0; i < real.length; i++) {
    const m = real[i];
    if (!GRATITUDE_PATTERNS.some(re => re.test(m.text ?? ''))) continue;
    expressedBy.set(m.sender, (expressedBy.get(m.sender) || 0) + 1);
    grateful.push({ sender: m.sender, sentAt: m.sentAt, text: m.text });

    const mMs = new Date(m.sentAt).getTime();
    for (let j = i - 1; j >= 0; j--) {
      const prior = real[j];
      if (prior.sender === m.sender) continue;
      if (mMs - new Date(prior.sentAt).getTime() > 60 * 60 * 1000) break;
      if ((prior.text ?? '').length < 30) continue;
      receivedBy.set(prior.sender, (receivedBy.get(prior.sender) || 0) + 1);
      break;
    }
  }

  const topReceivers = [...receivedBy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const topExpressers = [...expressedBy.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    totalCount: grateful.length,
    topReceivers,
    topExpressers,
    samples: grateful.slice(0, 5),
  };
}
