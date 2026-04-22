#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseWhatsAppChat, extractCommunityName } from '../src/parser/parser.js';
import { buildPulse } from '../src/analyzers/pulse.js';
import { renderPulseHtml } from '../src/renderers/pulse-html.js';
import { parseArgs, isoFromDate, isoFromDateEnd } from '../src/cli/args.js';

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'community'; }

function main() {
  const { path: filePath, since, until, outputDir } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error('Usage: vibra-pulse <path-to-export.txt> [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--output-dir <dir>]');
    process.exit(2);
  }
  if (!existsSync(filePath)) { console.error(`Can't find that file: ${filePath}`); process.exit(1); }

  const { messages } = parseWhatsAppChat(readFileSync(filePath, 'utf8'));
  const community = extractCommunityName(messages) ?? '(unnamed)';

  const pulse = buildPulse(messages, { sinceIso: isoFromDate(since), untilIso: isoFromDateEnd(until) });
  pulse.community = community;
  const html = renderPulseHtml(pulse, { community });

  const outDir = path.resolve(outputDir);
  mkdirSync(outDir, { recursive: true });
  const base = `pulse-${slugify(community)}-${pulse.untilIso.slice(0, 10)}`;
  const htmlPath = path.join(outDir, `${base}.html`);
  const jsonPath = path.join(outDir, `${base}.json`);
  writeFileSync(htmlPath, html);
  writeFileSync(jsonPath, JSON.stringify(pulse, null, 2));

  console.log(`Community: ${community}`);
  console.log(`Window: ${pulse.sinceIso.slice(0, 10)} → ${pulse.untilIso.slice(0, 10)} (${pulse.windowDays} days)`);
  console.log(`${pulse.totalMessages} messages, ${pulse.distinctMembers} active members, ${pulse.threadStats.count} threads.`);
  console.log(`Roster: ${pulse.roster.activeInWindow}/${pulse.roster.rosterSize} active, ${pulse.roster.neverPosted} never posted${pulse.roster.rosterIsLowerBound ? ' (lower bound)' : ''}.`);
  const rate = pulse.responseRate.rate;
  console.log(`Response rate: ${rate == null ? '—' : Math.round(rate * 100) + '%'} (${pulse.responseRate.answered}/${pulse.responseRate.questions}).`);
  console.log('');
  console.log(`Dashboard HTML: ${htmlPath}`);
  console.log(`Dashboard data: ${jsonPath}`);
  console.log('');
  console.log('Next: open the HTML in a browser, or read the JSON to synthesize Business-tab insights (persona narrative, topic themes, JTBD, recommendations) and Edit them into the HTML.');
}

main();
