#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { renderRamsShell, mdToHtml } from '../src/renderers/base-html.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') out.input = argv[++i];
    else if (argv[i] === '--output') out.output = argv[++i];
    else if (argv[i] === '--title') out.title = argv[++i];
    else if (argv[i] === '--eyebrow') out.eyebrow = argv[++i];
    else if (argv[i] === '--community') out.community = argv[++i];
    else if (argv[i] === '--subtitle') out.subtitle = argv[++i];
  }
  return out;
}

function main() {
  const { input, output, title, eyebrow, community, subtitle } = parseArgs(process.argv.slice(2));
  if (!input || !output) {
    console.error('Usage: vibra-render-html --input <md> --output <html> [--title "..."] [--eyebrow "..."] [--community "..."] [--subtitle "..."]');
    process.exit(2);
  }
  if (!existsSync(input)) { console.error(`Can't find input: ${input}`); process.exit(1); }

  const md = readFileSync(input, 'utf8');
  const bodyHtml = mdToHtml(md);
  const html = renderRamsShell({
    title: title ?? community ?? 'Report',
    eyebrow: eyebrow ?? '',
    community: community ?? title ?? '',
    subtitle: subtitle ?? '',
    bodyHtml,
  });

  mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  writeFileSync(output, html);
  console.log(`HTML written: ${output}`);
}

main();
