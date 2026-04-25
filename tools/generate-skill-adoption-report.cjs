const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const flowPath = path.join(repoRoot, "public", "data", "chapter2_flow.json");
const defaultResultsPath = path.join(repoRoot, "tools", "balance-search-results.json");
const defaultOutJsonPath = path.join(repoRoot, "tools", "skill-adoption-summary.json");
const defaultOutMdPath = path.join(repoRoot, "tools", "skill-adoption-report.md");

const INITIAL_SKILLS = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const KAMIWAZA_SUGGESTIONS = {
  "狼": "7-1 や 12-2#1 で機能していて、専用導線はあるので据え置き候補です。",
  "▽": "7-2 や 12-2#2 で機能していて、尖った役割を持てています。",
  "爆": "8-1 や 12-2#3 で強く、既に十分存在感があります。",
  "魔": "専用採用は少ないですが、8-2 の個性としては残す価値があります。",
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = {
    resultsPath: defaultResultsPath,
    outJsonPath: defaultOutJsonPath,
    outMdPath: defaultOutMdPath,
    title: "Chapter2 Skill Adoption Report",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--results-path") {
      args.resultsPath = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--out-json-path") {
      args.outJsonPath = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--out-md-path") {
      args.outMdPath = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--title") {
      args.title = String(argv[++i] || "").trim() || args.title;
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
    "  node tools/generate-skill-adoption-report.cjs",
    "  node tools/generate-skill-adoption-report.cjs --results-path tools/balance-search-deep-results.json --out-json-path tools/skill-power-summary-deep.json --out-md-path tools/skill-power-report-deep.md --title \"Chapter2 Skill Power Report (Deep Search)\"",
  ].join("\n"));
}

function stageKeyOrder(a, b) {
  const parse = (key) => {
    const [stageBattle, bossPart] = key.split("#");
    const [stage, battle] = stageBattle.split("-").map(Number);
    const pattern = bossPart ? Number(bossPart) : 0;
    return { stage, battle, pattern };
  };
  const left = parse(a);
  const right = parse(b);
  return (
    left.stage - right.stage ||
    left.battle - right.battle ||
    left.pattern - right.pattern
  );
}

function collectRewardSkills(flows) {
  const ordered = [];
  for (const flow of flows) {
    for (const step of flow.flow) {
      if (step.type === "reward" && step.skill) {
        ordered.push(step.skill);
      }
    }
  }
  return ordered;
}

function collectSkillUniverse(results, rewardSkills) {
  const set = new Set([...INITIAL_SKILLS, ...rewardSkills]);
  for (const row of results) {
    for (const ch of [...(row.pool || "")]) set.add(ch);
    for (const sample of row.samples || []) {
      for (const ch of [...sample]) set.add(ch);
    }
  }
  return [...set];
}

function computeSummary(results, rewardOrder, skillUniverse) {
  const rewardFirstIndex = new Map();
  rewardOrder.forEach((skill, index) => {
    if (!rewardFirstIndex.has(skill)) rewardFirstIndex.set(skill, index + 1);
  });

  const summary = skillUniverse.map((skill) => {
    let availableStages = 0;
    let usedStages = 0;
    let totalSamplesWhenAvailable = 0;
    let samplesUsingSkill = 0;
    let totalSlotOccurrences = 0;
    const usedStageKeys = [];
    const sampleStageKeys = [];

    for (const row of results) {
      const pool = new Set([...(row.pool || "")]);
      const samples = row.samples || [];
      if (!pool.has(skill)) continue;

      availableStages++;
      totalSamplesWhenAvailable += samples.length;

      let usedInStage = false;
      for (const sample of samples) {
        const count = [...sample].filter((ch) => ch === skill).length;
        if (count > 0) {
          usedInStage = true;
          samplesUsingSkill++;
          totalSlotOccurrences += count;
          sampleStageKeys.push(row.key);
        }
      }

      if (usedInStage) {
        usedStages++;
        usedStageKeys.push(row.key);
      }
    }

    const stageAdoption = availableStages ? usedStages / availableStages : 0;
    const sampleAdoption = totalSamplesWhenAvailable
      ? samplesUsingSkill / totalSamplesWhenAvailable
      : 0;
    const slotShare = totalSamplesWhenAvailable
      ? totalSlotOccurrences / (totalSamplesWhenAvailable * 5)
      : 0;

    return {
      skill,
      firstRewardIndex: rewardFirstIndex.get(skill) || null,
      isInitialSkill: INITIAL_SKILLS.includes(skill),
      availableStages,
      usedStages,
      totalSamplesWhenAvailable,
      samplesUsingSkill,
      totalSlotOccurrences,
      stageAdoption,
      sampleAdoption,
      slotShare,
      usedStageKeys: usedStageKeys.sort(stageKeyOrder),
      sampleStageKeys: sampleStageKeys.sort(stageKeyOrder),
    };
  });

  return summary.sort((a, b) =>
    b.sampleAdoption - a.sampleAdoption ||
    b.stageAdoption - a.stageAdoption ||
    b.slotShare - a.slotShare ||
    a.skill.localeCompare(b.skill, "ja")
  );
}

function findSummary(summary, skill) {
  return summary.find((entry) => entry.skill === skill);
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildReplacementSuggestions(summary, rewardOrder) {
  const rewardOnly = summary.filter((entry) => entry.firstRewardIndex != null);
  const unpopular = rewardOnly
    .filter((entry) => entry.availableStages >= 4)
    .sort((a, b) =>
      a.sampleAdoption - b.sampleAdoption ||
      a.stageAdoption - b.stageAdoption ||
      a.firstRewardIndex - b.firstRewardIndex
    );

  const popular = rewardOnly
    .filter((entry) => !["狼", "▽", "爆", "魔"].includes(entry.skill))
    .sort((a, b) =>
      b.sampleAdoption - a.sampleAdoption ||
      b.stageAdoption - a.stageAdoption ||
      a.firstRewardIndex - b.firstRewardIndex
    );

  const suggestions = [];
  const usedTargets = new Set();

  for (const source of unpopular) {
    if (["狼", "▽", "爆", "魔"].includes(source.skill)) continue;
    const target = popular.find((candidate) => {
      if (candidate.skill === source.skill) return false;
      if (usedTargets.has(candidate.skill)) return false;
      if (candidate.sampleAdoption <= source.sampleAdoption + 0.05) return false;
      return true;
    });
    if (!target) continue;

    usedTargets.add(target.skill);
    suggestions.push({
      from: source.skill,
      to: target.skill,
      fromFirstRewardIndex: source.firstRewardIndex,
      toFirstRewardIndex: target.firstRewardIndex,
      fromSampleAdoption: source.sampleAdoption,
      toSampleAdoption: target.sampleAdoption,
      reason: `${source.skill} は採用率が低く、${target.skill} は reward スキルの中で採用率が高いです。`,
    });
  }

  return suggestions;
}

function buildMarkdown(summary, rewardOrder, replacementSuggestions, title) {
  const totalSamples = summary.length > 0
    ? Math.max(...summary.map((entry) => entry.totalSamplesWhenAvailable))
    : 0;
  const rewardOnly = summary.filter((entry) => entry.firstRewardIndex != null);
  const popularAll = summary.slice(0, 12);
  const unpopularReward = rewardOnly
    .filter((entry) => entry.availableStages >= 4)
    .sort((a, b) =>
      a.sampleAdoption - b.sampleAdoption ||
      a.stageAdoption - b.stageAdoption ||
      a.firstRewardIndex - b.firstRewardIndex
    )
    .slice(0, 8);

  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`- 集計対象サンプル数: ${totalSamples}`);
  lines.push(`- reward.skill の出現順: ${rewardOrder.join(" -> ")}`);
  lines.push("");
  lines.push("## 全体の採用率上位");
  lines.push("");
  lines.push("| スキル | 初期/報酬 | reward順 | 使用ステージ率 | サンプル採用率 | スロット占有率 | 使用ステージ |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | --- |");
  for (const entry of popularAll) {
    lines.push(
      `| ${entry.skill} | ${entry.isInitialSkill ? "初期" : "報酬"} | ${entry.firstRewardIndex ?? "-"} | ${formatPct(entry.stageAdoption)} | ${formatPct(entry.sampleAdoption)} | ${formatPct(entry.slotShare)} | ${entry.usedStageKeys.join(", ") || "-"} |`
    );
  }
  lines.push("");
  lines.push("## reward スキルの不人気候補");
  lines.push("");
  lines.push("| スキル | reward順 | 使用ステージ率 | サンプル採用率 | スロット占有率 | 使用ステージ |");
  lines.push("| --- | ---: | ---: | ---: | ---: | --- |");
  for (const entry of unpopularReward) {
    lines.push(
      `| ${entry.skill} | ${entry.firstRewardIndex ?? "-"} | ${formatPct(entry.stageAdoption)} | ${formatPct(entry.sampleAdoption)} | ${formatPct(entry.slotShare)} | ${entry.usedStageKeys.join(", ") || "-"} |`
    );
  }
  lines.push("");
  lines.push("## スキル別の採用状況");
  lines.push("");
  for (const entry of summary) {
    const title = `${entry.skill} (${entry.isInitialSkill ? "初期" : `reward ${entry.firstRewardIndex ?? "-"}`})`;
    lines.push(`### ${title}`);
    lines.push("");
    lines.push(`- 使用ステージ率: ${formatPct(entry.stageAdoption)} (${entry.usedStages}/${entry.availableStages})`);
    lines.push(`- サンプル採用率: ${formatPct(entry.sampleAdoption)} (${entry.samplesUsingSkill}/${entry.totalSamplesWhenAvailable})`);
    lines.push(`- スロット占有率: ${formatPct(entry.slotShare)} (${entry.totalSlotOccurrences}/${entry.totalSamplesWhenAvailable * 5 || 0})`);
    lines.push(`- 使用ステージ一覧: ${entry.usedStageKeys.join(", ") || "なし"}`);
    lines.push("");
  }
  lines.push("## reward 差し替え候補案");
  lines.push("");
  for (const suggestion of replacementSuggestions) {
    lines.push(`- ${suggestion.from} -> ${suggestion.to}`);
    lines.push(`  - ${suggestion.reason}`);
    lines.push(`  - 採用率: ${suggestion.from} ${formatPct(suggestion.fromSampleAdoption)} -> ${suggestion.to} ${formatPct(suggestion.toSampleAdoption)}`);
  }
  lines.push("");
  lines.push("## 神業メモ");
  lines.push("");
  for (const skill of ["狼", "▽", "爆", "魔"]) {
    const entry = findSummary(summary, skill);
    if (!entry) continue;
    lines.push(`- ${skill}: 採用率 ${formatPct(entry.sampleAdoption)} / ${KAMIWAZA_SUGGESTIONS[skill]}`);
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

  const flows = loadJson(flowPath);
  const results = loadJson(args.resultsPath);
  const rewardOrder = collectRewardSkills(flows);
  const skillUniverse = collectSkillUniverse(results, rewardOrder);
  const summary = computeSummary(results, rewardOrder, skillUniverse);
  const replacementSuggestions = buildReplacementSuggestions(summary, rewardOrder);

  fs.writeFileSync(
    args.outJsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceResultsPath: path.relative(repoRoot, args.resultsPath),
        rewardOrder,
        summary,
        replacementSuggestions,
      },
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    args.outMdPath,
    buildMarkdown(summary, rewardOrder, replacementSuggestions, args.title),
    "utf8"
  );

  console.log(`Wrote ${path.relative(repoRoot, args.outJsonPath)}`);
  console.log(`Wrote ${path.relative(repoRoot, args.outMdPath)}`);
}

main();
