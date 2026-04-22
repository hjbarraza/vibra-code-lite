const DAY_MS = 24 * 60 * 60 * 1000;

export function buildStickiness(parsedMessages, { sinceIso, untilIso } = {}) {
  const real = parsedMessages.filter(m => m.kind === 'message' && !m.wasDeleted && m.sender);
  const joined = parsedMessages.filter(m => m.kind === 'joined' && m.sender);

  const untilMs = new Date(untilIso).getTime();
  const joinedInWindow = joined.filter(j => j.sentAt >= sinceIso && j.sentAt <= untilIso);

  const cohort = joinedInWindow.map(j => {
    const jMs = new Date(j.sentAt).getTime();
    const windowEndMs = Math.min(untilMs, jMs + 14 * DAY_MS);
    const msgs = real.filter(m => m.sender === j.sender && new Date(m.sentAt).getTime() >= jMs && new Date(m.sentAt).getTime() <= windowEndMs);
    const totalMsgs = real.filter(m => m.sender === j.sender && new Date(m.sentAt).getTime() >= jMs).length;

    let stage;
    if (msgs.length === 0) stage = 'ghost';
    else if (msgs.length <= 2) stage = 'tried';
    else if (msgs.length <= 7) stage = 'stuck';
    else stage = 'ramped';

    return {
      name: j.sender,
      joinedAt: j.sentAt,
      firstWeeksMsgs: msgs.length,
      totalMsgsSinceJoin: totalMsgs,
      stage,
    };
  });

  const funnel = {
    total: cohort.length,
    ghost: cohort.filter(c => c.stage === 'ghost').length,
    tried: cohort.filter(c => c.stage === 'tried').length,
    stuck: cohort.filter(c => c.stage === 'stuck').length,
    ramped: cohort.filter(c => c.stage === 'ramped').length,
  };

  return {
    cohort,
    funnel,
    ghosts: cohort.filter(c => c.stage === 'ghost'),
  };
}
