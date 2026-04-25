const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(__dirname, ".battle-sim-build-12-2-1-hardening");
const defaultOutPath = path.join(__dirname, "12-2-1-hardening-results.json");
const defaultLogPath = path.join(__dirname, "12-2-1-hardening-progress.log");

const INITIAL = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const KAMIWAZA = new Set(["狼", "▽", "爆", "魔"]);
const BANNED_REPLACEMENTS = new Set(["空", "Ｈ", "弱", "狼", "▽", "爆", "魔", "死"]);
const CANDIDATE_SKILLS = [
  "一", "刺", "果", "待", "搦", "玉", "強", "速",
  "拳", "飛", "奏", "焦", "毒", "礁", "霊", "円",
  "滅", "受", "盗", "反", "砲", "紫", "封", "凍",
  "隠", "燐", "連", "盾", "硬", "防", "癒", "交",
  "崩", "水", "逆", "雷", "弓", "先", "罠", "烈",
  "幻", "無", "錬",
];

function parseArgs(argv) {
  const args = {
    maxChecks: 651605,
    outPath: defaultOutPath,
    logPath: defaultLogPath,
    progressEvery: 20,
    top: 20,
    mode: "exhaustive",
    iterations: 500,
    minReplacements: 1,
    maxReplacements: 3,
    seed: Date.now(),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--max-checks") {
      args.maxChecks = Number(argv[++i] || "651605");
    } else if (arg === "--out-path") {
      args.outPath = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--log-path") {
      args.logPath = path.resolve(repoRoot, String(argv[++i] || ""));
    } else if (arg === "--progress-every") {
      args.progressEvery = Number(argv[++i] || "50");
    } else if (arg === "--top") {
      args.top = Number(argv[++i] || "20");
    } else if (arg === "--mode") {
      args.mode = String(argv[++i] || "exhaustive");
    } else if (arg === "--iterations") {
      args.iterations = Number(argv[++i] || "500");
    } else if (arg === "--min-replacements") {
      args.minReplacements = Number(argv[++i] || "1");
    } else if (arg === "--max-replacements") {
      args.maxReplacements = Number(argv[++i] || "3");
    } else if (arg === "--seed") {
      args.seed = Number(argv[++i] || `${Date.now()}`);
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
    "  node tools/analyze-12-2-1-hardening.cjs",
    "  node tools/analyze-12-2-1-hardening.cjs --max-checks 651605 --top 30",
    "",
    "Options:",
    "  --max-checks <n>      1候補ごとの探索上限",
    "  --out-path <path>     結果 JSON の出力先",
    "  --log-path <path>     進捗ログの出力先",
    "  --progress-every <n>  何候補ごとに進捗を画面とログへ出すか",
    "  --top <n>             保存する候補数",
    "  --mode <type>         exhaustive / random",
    "  --iterations <n>      random モードの試行回数",
    "  --min-replacements <n> random モードの最小差し替え数",
    "  --max-replacements <n> random モードの最大差し替え数",
    "  --seed <n>            random モードの乱数シード",
  ].join("\n"));
}

function appendProgress(logPath, message) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, line, "utf8");
  console.log(message);
}

function compileBattle() {
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, "package.json"), '{"type":"commonjs"}\n', "utf8");

  for (const fileName of ["Player.ts", "Battle.ts"]) {
    const sourcePath = path.join(repoRoot, "src", fileName);
    const source = fs.readFileSync(sourcePath, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
      fileName,
    });
    fs.writeFileSync(path.join(buildDir, fileName.replace(/\.ts$/, ".js")), output.outputText, "utf8");
  }
}

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function buildPool(chapter2Flows) {
  let owned = INITIAL.slice();
  for (const flow of chapter2Flows) {
    for (const step of flow.flow) {
      if (step.type === "reward" && step.skill) {
        owned.push(step.skill);
        continue;
      }
      if (step.type !== "battle") continue;

      const key = `${flow.stageNo - 12}-${step.subStage}`;
      if (key === "12-2") {
        return [...new Set(owned.filter((abbr) => !KAMIWAZA.has(abbr) || abbr === "狼"))];
      }
    }
  }
  return [];
}

function isLineupAllowed(lineup) {
  let kamiwazaCount = 0;
  for (const skill of lineup) {
    if (KAMIWAZA.has(skill)) kamiwazaCount++;
    if (kamiwazaCount > 1) return false;
  }
  return lineup.includes("狼");
}

function* tuples(pool, length) {
  const current = Array(length).fill("");
  let kamiwazaCount = 0;

  function* rec(pos) {
    if (pos === length) {
      if (current.includes("狼")) yield current.join("");
      return;
    }

    for (const skill of pool) {
      const nextKamiwazaCount = kamiwazaCount + (KAMIWAZA.has(skill) ? 1 : 0);
      if (nextKamiwazaCount > 1) continue;
      current[pos] = skill;
      const prev = kamiwazaCount;
      kamiwazaCount = nextKamiwazaCount;
      yield* rec(pos + 1);
      kamiwazaCount = prev;
    }
  }

  yield* rec(0);
}

function evaluateBoss(Battle, pool, boss, maxChecks) {
  const samples = [];
  let checked = 0;
  let wins = 0;
  let firstWinAt = null;

  for (const lineup of tuples(pool, 5)) {
    checked++;
    if (new Battle(`${lineup}／P`, `${boss}／B`).start() === 1) {
      wins++;
      if (firstWinAt == null) firstWinAt = checked;
      if (samples.length < 5) samples.push(lineup);
    }
    if (checked >= maxChecks) break;
  }

  return {
    checked,
    wins,
    firstWinAt,
    winRate: checked > 0 ? wins / checked : 0,
    samples,
    stopReason: checked >= maxChecks ? "max-checks" : "exhausted",
  };
}

function applyReplacement(boss, index, replacement) {
  const chars = [...boss];
  chars[index] = replacement;
  return chars.join("");
}

function applyReplacementPlan(boss, plan) {
  const chars = [...boss];
  for (const change of plan) {
    chars[change.index] = change.to;
  }
  return chars.join("");
}

function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(array, rng) {
  const next = array.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function randomIntInclusive(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

function buildRandomPlan(baseBoss, replacements, minReplacements, maxReplacements, rng) {
  const bossChars = [...baseBoss];
  const count = randomIntInclusive(minReplacements, maxReplacements, rng);
  const positions = shuffle(
    bossChars.map((from, index) => ({ index, from })),
    rng
  ).slice(0, Math.min(count, bossChars.length));

  return positions.map((position) => {
    const choices = replacements.filter((skill) => skill !== position.from);
    const to = choices[Math.floor(rng() * choices.length)];
    return {
      index: position.index,
      from: position.from,
      to,
    };
  });
}

function describePlan(plan) {
  return plan
    .map((change) => `${change.index + 1}:${change.from}->${change.to}`)
    .join(", ");
}

function candidateSort(baseWinRate) {
  return (a, b) => {
    const aHarder = a.winRate < baseWinRate;
    const bHarder = b.winRate < baseWinRate;
    if (aHarder !== bHarder) return aHarder ? -1 : 1;

    if (aHarder && bHarder) {
      if (a.winRate !== b.winRate) return a.winRate - b.winRate;
      if ((a.firstWinAt ?? -1) !== (b.firstWinAt ?? -1)) return (b.firstWinAt ?? -1) - (a.firstWinAt ?? -1);
      return a.wins - b.wins;
    }

    const aDelta = Math.abs(a.winRate - baseWinRate);
    const bDelta = Math.abs(b.winRate - baseWinRate);
    if (aDelta !== bDelta) return aDelta - bDelta;
    return a.wins - b.wins;
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  fs.writeFileSync(args.logPath, "", "utf8");

  compileBattle();
  const { Battle } = require(path.join(buildDir, "Battle.js"));
  const chapter2Flows = loadJson("public/data/chapter2_flow.json");
  const stages = loadJson("public/data/stages.json");
  const stageEntry = stages.find((s) => s.chapter === 2 && s.stage === 12 && s.battle === 2);
  const baseBoss = stageEntry.bossSkillAbbrs[0];
  const pool = buildPool(chapter2Flows);

  appendProgress(args.logPath, `base start boss=${baseBoss} pool=${pool.join("")} maxChecks=${args.maxChecks}`);
  const base = evaluateBoss(Battle, pool, baseBoss, args.maxChecks);
  appendProgress(args.logPath, `base done wins=${base.wins} checked=${base.checked} winRate=${base.winRate.toFixed(6)} samples=${base.samples.join(" | ")}`);

  const candidates = [];
  let processed = 0;
  const replacements = CANDIDATE_SKILLS.filter((skill) => !BANNED_REPLACEMENTS.has(skill));
  const seenBosses = new Set();
  const rng = createRng(args.seed);

  appendProgress(
    args.logPath,
    `search start mode=${args.mode} top=${args.top} progressEvery=${args.progressEvery}` +
      (args.mode === "random"
        ? ` iterations=${args.iterations} replacements=${args.minReplacements}-${args.maxReplacements} seed=${args.seed}`
        : "")
  );

  const evaluateCandidate = (plan, tunedBoss) => {
    const result = evaluateBoss(Battle, pool, tunedBoss, args.maxChecks);
    if (result.wins === 0) return;

    candidates.push({
      tunedBoss,
      changes: plan.map((change) => ({
        index: change.index + 1,
        from: change.from,
        to: change.to,
      })),
      wins: result.wins,
      checked: result.checked,
      winRate: result.winRate,
      firstWinAt: result.firstWinAt,
      stopReason: result.stopReason,
      samples: result.samples,
    });
  };

  if (args.mode === "random") {
    for (let iteration = 0; iteration < args.iterations; iteration++) {
      const plan = buildRandomPlan(
        baseBoss,
        replacements,
        args.minReplacements,
        args.maxReplacements,
        rng
      );
      const tunedBoss = applyReplacementPlan(baseBoss, plan);
      if (seenBosses.has(tunedBoss)) continue;
      seenBosses.add(tunedBoss);
      processed++;
      evaluateCandidate(plan, tunedBoss);

      if (processed % args.progressEvery === 0) {
        const best = candidates.slice().sort(candidateSort(base.winRate))[0];
        appendProgress(
          args.logPath,
          `progress processed=${processed} uniqueBosses=${seenBosses.size} candidates=${candidates.length} latest=${describePlan(plan)} best=${best ? `${best.tunedBoss} rate=${best.winRate.toFixed(6)} changes=${best.changes.map((change) => `${change.index}:${change.from}->${change.to}`).join(", ")}` : "none"}`
        );
      }
    }
  } else {
    for (let index = 0; index < [...baseBoss].length; index++) {
      for (const replacement of replacements) {
        if (replacement === baseBoss[index]) continue;
        processed++;
        const plan = [{ index, from: baseBoss[index], to: replacement }];
        const tunedBoss = applyReplacementPlan(baseBoss, plan);
        evaluateCandidate(plan, tunedBoss);

        if (processed % args.progressEvery === 0) {
          const best = candidates.slice().sort(candidateSort(base.winRate))[0];
          appendProgress(
            args.logPath,
            `progress processed=${processed} candidates=${candidates.length} best=${best ? `${best.tunedBoss} rate=${best.winRate.toFixed(6)} changes=${best.changes.map((change) => `${change.index}:${change.from}->${change.to}`).join(", ")}` : "none"}`
          );
        }
      }
    }
  }

  const ranked = candidates.slice().sort(candidateSort(base.winRate));
  const payload = {
    generatedAt: new Date().toISOString(),
    target: "12-2#1",
    requireSkill: "狼",
    baseBoss,
    pool: pool.join(""),
    mode: args.mode,
    iterations: args.mode === "random" ? args.iterations : null,
    minReplacements: args.mode === "random" ? args.minReplacements : 1,
    maxReplacements: args.mode === "random" ? args.maxReplacements : 1,
    seed: args.mode === "random" ? args.seed : null,
    base,
    topCandidates: ranked.slice(0, args.top),
    allCandidateCount: candidates.length,
    processedCount: processed,
    uniqueBossCount: args.mode === "random" ? seenBosses.size : null,
  };

  fs.writeFileSync(args.outPath, JSON.stringify(payload, null, 2), "utf8");
  appendProgress(args.logPath, `done processed=${processed} candidates=${candidates.length} out=${path.relative(repoRoot, args.outPath)}`);
}

main();
