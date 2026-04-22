---
name: pulse
description: Generate the unified community dashboard — one HTML artifact with two tabs (Community Manager view + Business view) visualizing every insight the plugin produces. Use for the full weekly/monthly read of a community.
argument-hint: <path-to-export.txt> [--since YYYY-MM-DD] [--until YYYY-MM-DD]
allowed-tools: Bash(vibra-pulse.js *)
---

Pulse is the plugin's primary visual artifact. It aggregates data from every other analyzer and produces a tabbed HTML dashboard. Default window is 6 weeks (42 days) of data.

Step 1 — run the script:

```bash
vibra-pulse.js $ARGUMENTS
```

The script writes TWO outputs to `./vibra-output/`:
- `pulse-<slug>-<date>.json` — all computed data (vitals, roster, actions, questions, threads, content, personas, topics, growth)
- `pulse-<slug>-<date>.html` — the unified dashboard. CM tab is fully rendered from the JSON. Business tab is rendered with a persona table + topic tokens, plus **four placeholder sections** that you fill in.

Step 2 — read the JSON. Rich data structure. Key blocks you'll synthesize from:

- `personas.clusters` — heuristic classification: `helper`, `asker`, `connector`, `content-sharer`, `regular`, `newcomer`, `observer`, plus `lurker_count`
- `personas.members` — per-member tags with stats
- `topics.topTokens` — top keyword-frequency tokens with distinct-member counts and 3 sample messages each
- `actions.frustrationCandidates` — heuristic-flagged frustration messages
- `actions.shoutoutCandidates`, `silentJoiners`, `longSilentMembers`, `welcomeGaps`
- `openQuestionBundles` — candidate questions grouped by shared context windows
- `content.quotableCandidates`, `content.links`, `content.mentions`
- `roster`, `gini`, `responseRate`, `growth.previousPeriod`
- `memberList` — top 30 members by message count in window

Step 3 — synthesize the four Business-tab placeholder sections.

Each placeholder is a `<div class="agent-fill" data-fill="<key>">` block in the HTML. Find each one by its `data-fill` attribute and use Edit to replace the inner content (keep the `<div class="agent-fill" ...>` wrapper intact; replace only the `<h3>` + `<p class="muted">...</p>` inside).

**3a — `data-fill="persona-narrative"`**
For each non-empty cluster, write one short paragraph (2-3 sentences) describing who these members are, what they seem to need, how they engage. Ground each observation in the actual members listed in the cluster (by name). Use the community's dominant language.

Expected HTML to write inside the wrapper:
```html
<h3>Persona narrative</h3>
<p><strong>Helpers (N)</strong>: <your 2-3 sentence narrative, referencing specific helpers>.</p>
<p><strong>Askers (N)</strong>: ...</p>
... (one paragraph per non-empty cluster, plus one on lurkers if lurker_count > 0)
```

**3b — `data-fill="topic-themes"`**
Read `topics.topTokens` with their samples. Group related tokens into 3-6 semantic themes (e.g., tokens `cursor`, `claude`, `api`, `openrouter` → theme "AI developer tooling"). For each theme:
- Label it
- List the tokens that belong to it
- One sentence on what it reveals about the community's focus

Expected HTML:
```html
<h3>Topic themes</h3>
<p><strong>Theme label</strong> (<tokens>): <what this says about the community>.</p>
... (3-6 themes)
```

Use the community's dominant language.

**3c — Find the full card, `data-fill="jtbd"`**
Synthesize 3-5 jobs-to-be-done. A JTBD is "when <situation>, I want to <motivation>, so I can <outcome>." Extract from: questions asked (`openQuestionBundles` + `content.mentions`), frustration candidates, topic themes, and the mix of link-sharing vs asking.

Replace the inner `<p class="muted">...</p>` with:
```html
<ul class="jtbd-list">
  <li><strong>When I'm [situation]</strong>, I want to [motivation], <em>so I can [outcome]</em>. Grounded in: [specific evidence — member names, topic tokens, etc.]</li>
  ... 3-5 items
</ul>
```

Categorize by type when natural: functional, emotional, social.

**3d — Find the full card, `data-fill="recommendations"`**
Write 3-5 strategic observations for the business / owner. Each should be:
- Concrete (specific action, not a platitude)
- Grounded (cites evidence from the data — growth %, roster ratio, topic theme, specific members)
- Actionable (something the owner or CM can actually do next quarter)

Categories to consider: engagement health, retention risk, content strategy, sub-community opportunities, pricing/value signals, moderation.

Expected HTML:
```html
<ol class="reco-list">
  <li><strong>Headline</strong>: Observation grounded in data (cite specific numbers/names). <em>Suggested move</em>: concrete action.</li>
  ... 3-5 items
</ol>
```

Step 4 — also fill the CM-tab `openQuestionBundles` LLM judgment if time allows. Optional for v0.1: users can run `/vibra:unanswered` for the full judged list.

Step 5 — report back to the user. Summary:
- Community + window
- Headline numbers (active/roster, response rate, concentration, growth delta)
- Number of personas clusters populated
- Number of topic themes written
- Number of JTBD items + recommendations
- The HTML file path

Mention: "Open in browser. Use the tab buttons to switch. Print button prints the currently active tab to PDF."

## Hard rules

- Every claim in the Business tab must cite evidence from the data — a number, a member name, a topic token. No generic platitudes.
- Use the community's dominant language for narrative prose. Keep quotes in original language.
- Never invent members or topics that aren't in the JSON data.
- If a section has no real data (e.g., `frustrationCandidates` is empty), write "No signal this window" rather than fabricating.
- Keep each narrative paragraph under 3 sentences. Density over length.
