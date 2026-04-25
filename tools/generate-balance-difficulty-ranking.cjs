const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {
    input: path.join(repoRoot, "tools", "balance-search-deeper-results.json"),
    outJson: path.join(repoRoot, "tools", "balance-difficulty-ranking.json"),
    outMd: path.join(repoRoot, "tools", "balance-difficulty-ranking.md"),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--out-json") {
      args.outJson = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--out-md") {
      args.outMd = path.resolve(repoRoot, String(argv[++i] || ""));
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
    "  node tools/generate-balance-difficulty-ranking.cjs",
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

function toEntry(row) {
  const wins = (row.samples || []).length;
  const checked = row.checked || 0;
  const winRate = checked > 0 ? wins / checked : 0;
  const clearable = wins > 0;
  const isLowerBound = row.stopReason === "max-checks";
  return {
    key: row.key,
    bossName: row.bossName,
    wins,
    checked,
    winRate,
    clearable,
    stopReason: row.stopReason || "unknown",
    isLowerBound,
    samplePreview: (row.samples || []).slice(0, 5),
  };
}

function hardestSort(a, b) {
  if (a.clearable !== b.clearable) return a.clearable ? 1 : -1;
  if (a.winRate !== b.winRate) return a.winRate - b.winRate;
  if (a.wins !== b.wins) return a.wins - b.wins;
  return a.checked - b.checked;
}

function easiestSort(a, b) {
  if (a.clearable !== b.clearable) return a.clearable ? -1 : 1;
  if (a.winRate !== b.winRate) return b.winRate - a.winRate;
  if (a.wins !== b.wins) return b.wins - a.wins;
  return b.checked - a.checked;
}

function pct(value) {
  return `${(value * 100).toFixed(3)}%`;
}

function buildMarkdown(entries, inputPath) {
  const hardest = entries.slice().sort(hardestSort);
  const easiest = entries.slice().sort(easiestSort);

  const lines = [];
  lines.push("# Balance Difficulty Ranking");
  lines.push("");
  lines.push(`- source: ${path.relative(repoRoot, inputPath)}`);
  lines.push("- 指標: wins / checked を勝ち筋密度として使用");
  lines.push("- max-checks の行は下限値です");
  lines.push("");
  lines.push("## 難しすぎる寄り");
  lines.push("");
  lines.push("| rank | key | boss | wins | checked | winRate | stopReason | preview |");
  lines.push("| ---: | --- | --- | ---: | ---: | ---: | --- | --- |");
  hardest.slice(0, 15).forEach((entry, index) => {
    lines.push(
      `| ${index + 1} | ${entry.key} | ${entry.bossName} | ${entry.wins} | ${entry.checked} | ${pct(entry.winRate)} | ${entry.stopReason} | ${entry.samplePreview.join(" / ") || "-"} |`
    );
  });
  lines.push("");
  lines.push("## 緩すぎる寄り");
  lines.push("");
  lines.push("| rank | key | boss | wins | checked | winRate | stopReason | preview |");
  lines.push("| ---: | --- | --- | ---: | ---: | ---: | --- | --- |");
  easiest.slice(0, 15).forEach((entry, index) => {
    lines.push(
      `| ${index + 1} | ${entry.key} | ${entry.bossName} | ${entry.wins} | ${entry.checked} | ${pct(entry.winRate)} | ${entry.stopReason} | ${entry.samplePreview.join(" / ") || "-"} |`
    );
  });
  lines.push("");
  lines.push("## 全ステージ一覧");
  lines.push("");
  lines.push("| key | boss | wins | checked | winRate | stopReason |");
  lines.push("| --- | --- | ---: | ---: | ---: | --- |");
  entries.slice().sort(stageKeyOrder).forEach((entry) => {
    lines.push(
      `| ${entry.key} | ${entry.bossName} | ${entry.wins} | ${entry.checked} | ${pct(entry.winRate)} | ${entry.stopReason} |`
    );
  });
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
  const entries = rows.map(toEntry);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: path.relative(repoRoot, args.input),
    hardest: entries.slice().sort(hardestSort),
    easiest: entries.slice().sort(easiestSort),
    all: entries.slice().sort(stageKeyOrder),
  };

  fs.writeFileSync(args.outJson, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(args.outMd, buildMarkdown(entries, args.input), "utf8");

  console.log(`Wrote ${path.relative(repoRoot, args.outJson)}`);
  console.log(`Wrote ${path.relative(repoRoot, args.outMd)}`);
}

main();
