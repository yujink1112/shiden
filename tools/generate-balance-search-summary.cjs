const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    input: path.join(repoRoot, "tools", "balance-search-deep-results.json"),
    output: path.join(repoRoot, "tools", "balance-search-deep-summary.md"),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--output") {
      args.output = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function usage() {
  console.log([
    "Usage:",
    "  node tools/generate-balance-search-summary.cjs",
    "  node tools/generate-balance-search-summary.cjs --input tools/balance-search-deep-results.json --output tools/balance-search-deep-summary.md",
  ].join("\n"));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stageKeyOrder(a, b) {
  const parse = (key) => {
    const [stageBattle, bossPart] = key.split("#");
    const [stage, battle] = stageBattle.split("-").map(Number);
    const pattern = bossPart ? Number(bossPart) : 0;
    return { stage, battle, pattern };
  };

  const left = parse(a.key);
  const right = parse(b.key);
  return (
    left.stage - right.stage ||
    left.battle - right.battle ||
    left.pattern - right.pattern
  );
}

function buildMarkdown(rows, inputPath) {
  const sorted = rows.slice().sort(stageKeyOrder);
  const totalWins = sorted.reduce((sum, row) => sum + row.samples.length, 0);
  const stopReasonCounts = sorted.reduce((acc, row) => {
    acc[row.stopReason] = (acc[row.stopReason] || 0) + 1;
    return acc;
  }, {});

  const lines = [];
  lines.push("# Balance Search Deep Summary");
  lines.push("");
  lines.push(`- source: ${path.relative(repoRoot, inputPath)}`);
  lines.push(`- stages: ${sorted.length}`);
  lines.push(`- total wins stored: ${totalWins}`);
  lines.push(`- stop reasons: ${Object.entries(stopReasonCounts).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  lines.push("");
  lines.push("| key | boss | wins | checked | stopReason | first samples |");
  lines.push("| --- | --- | ---: | ---: | --- | --- |");
  for (const row of sorted) {
    lines.push(
      `| ${row.key} | ${row.bossName} | ${row.samples.length} | ${row.checked} | ${row.stopReason || "-"} | ${(row.samples || []).slice(0, 5).join(" / ") || "-"} |`
    );
  }
  lines.push("");
  lines.push("## max-checks で打ち切られたステージ");
  lines.push("");
  for (const row of sorted.filter((entry) => entry.stopReason === "max-checks")) {
    lines.push(`- ${row.key} ${row.bossName}: wins=${row.samples.length}, checked=${row.checked}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const rows = loadJson(args.input);
  const markdown = buildMarkdown(rows, args.input);
  fs.writeFileSync(args.output, markdown, "utf8");
  console.log(`Wrote ${path.relative(repoRoot, args.output)}`);
}

main();
