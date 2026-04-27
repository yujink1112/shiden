const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(__dirname, ".battle-sim-build");
const outPath = path.join(__dirname, "boss-tuning-results.json");
const progressLogPath = path.join(__dirname, "boss-tuning-progress.log");
const balanceResultsPath = path.join(__dirname, "balance-search-results.json");

const INITIAL = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const ALLOWED_KAMIWAZA = {
  "7-1": "狼",
  "7-2": "▽",
  "8-1": "爆",
  "8-2": "魔",
  "11-1": "狼",
  "11-2": "魔",
};
const KAMIWAZA = new Set(["狼", "▽", "爆", "魔"]);
const BANNED_REPLACEMENTS = new Set(["空", "Ｈ", "弱", "狼", "▽", "爆", "魔"]);

const CANDIDATE_SKILLS = [
  "一", "刺", "果", "待", "搦", "玉", "強", "速",
  "拳", "飛", "奏", "焦", "毒", "礁", "狼", "▽",
  "霊", "爆", "魔", "円", "滅", "受", "盗", "反",
  "砲", "紫", "封", "凍", "隠", "燐", "連", "盾",
  "硬", "防", "癒", "交", "崩", "水", "逆", "雷",
  "弓", "先", "罠", "死", "烈", "幻", "無",
];

const PREVIOUS_CLEAR_SAMPLES = {

};

function usage() {
  console.log([
    "Usage:",
    "  node tools/chapter2-boss-tuning-search.cjs",
    "  node tools/chapter2-boss-tuning-search.cjs --targets 6-2,7-2",
    "  node tools/chapter2-boss-tuning-search.cjs --fix-limit 12",
    "  node tools/chapter2-boss-tuning-search.cjs --max-replacements 2",
    "",
    "Options:",
    "  --targets <keys>     Stage keys like 6-2,7-2,12-2",
    "  --fix-limit <n>      Max fixes per stage",
    "  --sample-limit <n>   Max winning lineups stored per fix",
    "  --max-replacements <n>  Max replacement count per boss pattern set",
    "  --require-skills <s> Comma-separated required skills like 毒,霊",
  ].join("\n"));
}

function parseArgs(argv) {
  const args = {
    targets: null,
    fixLimit: 12,
    sampleLimit: 5,
    maxReplacements: 1,
    requireSkills: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--targets") {
      args.targets = String(argv[++i] || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (arg === "--fix-limit") {
      args.fixLimit = Number(argv[++i] || "12");
    } else if (arg === "--sample-limit") {
      args.sampleLimit = Number(argv[++i] || "5");
    } else if (arg === "--max-replacements") {
      args.maxReplacements = Number(argv[++i] || "1");
    } else if (arg === "--require-skills") {
      args.requireSkills = String(argv[++i] || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
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
      reportDiagnostics: true,
    });
    fs.writeFileSync(path.join(buildDir, fileName.replace(/\.ts$/, ".js")), output.outputText, "utf8");
  }
}

function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function shuffle(array) {
  const next = array.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function appendProgress(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(progressLogPath, line, "utf8");
  console.log(message);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getStageEntry(stages, stageNo, subStage) {
  return stages.find((s) => s.chapter === 2 && s.stage === stageNo - 12 && s.battle === subStage);
}

function getBossPatterns(entry) {
  return Array.isArray(entry.bossSkillAbbrs) ? entry.bossSkillAbbrs : [entry.bossSkillAbbrs];
}

function buildPlayerPool(chapter2Flows, targetKey) {
  let owned = INITIAL.slice();
  for (const flow of chapter2Flows) {
    for (const step of flow.flow) {
      if (step.type === "reward" && step.skill) {
        owned.push(step.skill);
        continue;
      }
      if (step.type !== "battle") continue;

      const key = `${flow.stageNo - 12}-${step.subStage}`;
      if (key === targetKey) {
        const allowed = ALLOWED_KAMIWAZA[key];
        return [...new Set(owned.filter((abbr) => !KAMIWAZA.has(abbr) || !allowed || abbr === allowed))];
      }
    }
  }
  return null;
}

function* tuples(pool, length) {
  const current = Array(length).fill("");
  let kamiwazaCount = 0;

  function* rec(pos) {
    if (pos === length) {
      yield current.join("");
      return;
    }

    for (const skill of pool) {
      const nextKamiwazaCount = kamiwazaCount + (KAMIWAZA.has(skill) ? 1 : 0);
      if (nextKamiwazaCount > 1) continue;

      current[pos] = skill;
      const prevKamiwazaCount = kamiwazaCount;
      kamiwazaCount = nextKamiwazaCount;
      yield* rec(pos + 1);
      kamiwazaCount = prevKamiwazaCount;
    }
  }

  yield* rec(0);
}

function isLineupAllowed(lineup) {
  let kamiwazaCount = 0;
  for (const skill of lineup) {
    if (KAMIWAZA.has(skill)) kamiwazaCount++;
    if (kamiwazaCount > 1) return false;
  }
  return true;
}

function lineupContainsRequiredSkills(lineup, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  const chars = [...lineup];
  return requiredSkills.every((skill) => chars.includes(skill));
}

function* seededCandidates(pool, length, seedSamples) {
  const poolSet = new Set(pool);
  const emitted = new Set();
  const seeds = (seedSamples || []).filter((sample) =>
    sample &&
    sample.length === length &&
    [...sample].every((skill) => poolSet.has(skill)) &&
    isLineupAllowed(sample)
  );

  for (const seed of seeds) {
    if (!emitted.has(seed)) {
      emitted.add(seed);
      yield seed;
    }
  }

  for (const seed of seeds) {
    const chars = [...seed];
    for (let index = 0; index < length; index++) {
      for (const replacement of pool) {
        if (replacement === chars[index]) continue;
        const next = chars.slice();
        next[index] = replacement;
        const lineup = next.join("");
        if (emitted.has(lineup) || !isLineupAllowed(lineup)) continue;
        emitted.add(lineup);
        yield lineup;
      }
    }
  }

  for (const seed of seeds) {
    const chars = [...seed];
    for (let first = 0; first < length; first++) {
      for (let second = first + 1; second < length; second++) {
        for (const replacementA of pool) {
          for (const replacementB of pool) {
            if (replacementA === chars[first] && replacementB === chars[second]) continue;
            const next = chars.slice();
            next[first] = replacementA;
            next[second] = replacementB;
            const lineup = next.join("");
            if (emitted.has(lineup) || !isLineupAllowed(lineup)) continue;
            emitted.add(lineup);
            yield lineup;
          }
        }
      }
    }
  }

  for (const lineup of tuples(pool, length)) {
    if (emitted.has(lineup)) continue;
    emitted.add(lineup);
    yield lineup;
  }
}

function* replacementPlans(bosses, candidateSkills, maxReplacements) {
  const flat = [];
  for (let bossIndex = 0; bossIndex < bosses.length; bossIndex++) {
    for (let charIndex = 0; charIndex < bosses[bossIndex].length; charIndex++) {
      flat.push({
        bossIndex,
        charIndex,
        from: bosses[bossIndex][charIndex],
      });
    }
  }
  const shuffledFlat = shuffle(flat);

  function* choosePositions(start, left, picked) {
    if (left === 0) {
      yield picked.slice();
      return;
    }
    for (let i = start; i <= shuffledFlat.length - left; i++) {
      picked.push(shuffledFlat[i]);
      yield* choosePositions(i + 1, left - 1, picked);
      picked.pop();
    }
  }

  function* assignReplacements(positions, idx, chosen) {
    if (idx === positions.length) {
      yield chosen.slice();
      return;
    }
    const position = positions[idx];
    for (const to of shuffle(candidateSkills)) {
      if (to === position.from) continue;
      chosen.push({ ...position, to });
      yield* assignReplacements(positions, idx + 1, chosen);
      chosen.pop();
    }
  }

  for (let count = 1; count <= maxReplacements; count++) {
    for (const positions of choosePositions(0, count, [])) {
      yield* assignReplacements(positions, 0, []);
    }
  }
}

function applyReplacementPlan(bosses, plan) {
  const nextBosses = bosses.slice();
  for (const change of plan) {
    const boss = nextBosses[change.bossIndex];
    nextBosses[change.bossIndex] =
      boss.slice(0, change.charIndex) + change.to + boss.slice(change.charIndex + 1);
  }
  return nextBosses;
}

function searchWinningLineups(Battle, pool, bosses, sampleLimit, seedSamples, requiredSkills) {
  const samples = [];
  let checked = 0;

  const win = (player, boss) => new Battle(`${player}／P`, `${boss}／B`).start() === 1;

  for (const lineup of seededCandidates(pool, 5, seedSamples)) {
    if (!lineupContainsRequiredSkills(lineup, requiredSkills)) continue;
    checked++;
    if (bosses.every((boss) => win(lineup, boss))) {
      samples.push(lineup);
      if (samples.length >= sampleLimit) break;
    }
  }

  return {
    clearable: samples.length > 0,
    checked,
    samples,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  compileBattle();
  const { Battle } = require(path.join(buildDir, "Battle.js"));
  const chapter2Flows = loadJson("public/data/chapter2_flow.json");
  const stages = loadJson("public/data/stages.json");
  const balanceResults = readJsonIfExists(balanceResultsPath);
  const previousTuningResults = readJsonIfExists(outPath);
  const balanceResultsMap = new Map(balanceResults.map((entry) => [entry.key, entry]));
  const previousTuningMap = new Map(previousTuningResults.map((entry) => [entry.key, entry]));
  const candidateSkills = CANDIDATE_SKILLS.filter((skill) => !BANNED_REPLACEMENTS.has(skill));

  const targets = [];
  for (const flow of chapter2Flows) {
    for (const step of flow.flow) {
      if (step.type !== "battle") continue;
      const key = `${flow.stageNo - 12}-${step.subStage}`;
      const previous = PREVIOUS_CLEAR_SAMPLES[key];
      if (args.targets && !args.targets.includes(key)) continue;
      if (previous && previous.length > 0) continue;

      const stageEntry = getStageEntry(stages, flow.stageNo, step.subStage);
      targets.push({
        key,
        stageNo: flow.stageNo,
        subStage: step.subStage,
        bossName: stageEntry.bossName,
        bosses: getBossPatterns(stageEntry),
      });
    }
  }

  const results = [];

  for (const target of targets) {
    const pool = buildPlayerPool(chapter2Flows, target.key);
    if (!pool) continue;
    const balanceSeeds = balanceResultsMap.get(target.key)?.samples || [];
    const priorTuning = previousTuningMap.get(target.key);
    const tuningSeeds = [
      ...(priorTuning?.baseSamples || []),
      ...((priorTuning?.fixes || []).flatMap((fix) => fix.samples || [])),
    ];
    const seedSamples = [...balanceSeeds, ...tuningSeeds];
    const missingRequiredSkills = args.requireSkills.filter((skill) => !pool.includes(skill));
    if (missingRequiredSkills.length > 0) {
      const result = {
        key: target.key,
        bossName: target.bossName,
        pool: pool.join(""),
        requireSkills: args.requireSkills,
        baseClearable: false,
        baseChecked: 0,
        baseSamples: [],
        fixes: [],
      };
      results.push(result);
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
      appendProgress(`${target.key} ${target.bossName}: skipped because required skills are missing from pool (${missingRequiredSkills.join(",")}).`);
      continue;
    }

    appendProgress(`${target.key} ${target.bossName}: base search start (seeds=${seedSamples.length}, require=${args.requireSkills.join(",") || "-"}).`);
    const base = searchWinningLineups(Battle, pool, target.bosses, args.sampleLimit, seedSamples, args.requireSkills);
    const result = {
      key: target.key,
      bossName: target.bossName,
      pool: pool.join(""),
      requireSkills: args.requireSkills,
      baseClearable: base.clearable,
      baseChecked: base.checked,
      baseSamples: base.samples,
      fixes: [],
    };

    if (base.clearable) {
      appendProgress(
        `${target.key} ${target.bossName}: base clearable samples=[${base.samples.join(" | ")}]`
      );
    }

    if (!base.clearable) {
      appendProgress(
        `${target.key} ${target.bossName}: tuning search start (maxReplacements=${args.maxReplacements}, seeds=${seedSamples.length}, require=${args.requireSkills.join(",") || "-"}).`
      );
      for (const plan of replacementPlans(target.bosses, candidateSkills, args.maxReplacements)) {
        const nextBosses = applyReplacementPlan(target.bosses, plan);
        const tuned = searchWinningLineups(Battle, pool, nextBosses, args.sampleLimit, seedSamples, args.requireSkills);
        if (!tuned.clearable) continue;

        const fix = {
          replacementCount: plan.length,
          changes: plan.map((change) => ({
            bossPattern: change.bossIndex + 1,
            index: change.charIndex + 1,
            from: change.from,
            to: change.to,
          })),
          tunedBosses: nextBosses,
          checked: tuned.checked,
          samples: tuned.samples,
        };
        result.fixes.push(fix);
        appendProgress(
          `${target.key} ${target.bossName}: fix found replacements=${fix.replacementCount} tuned=${fix.tunedBosses.join(" | ")} sample=${fix.samples[0]}`
        );

        if (result.fixes.length >= args.fixLimit) break;
      }
    }

    results.push(result);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
    appendProgress(`${target.key} ${target.bossName}: done fixes=${result.fixes.length}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
