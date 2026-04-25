const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(__dirname, ".battle-sim-build");
const resultsPath = path.join(__dirname, "balance-search-results.json");
const progressLogPath = path.join(__dirname, "balance-search-progress.log");

const INITIAL = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const ALLOWED_KAMIWAZA = {
  "7-1": "狼",
  "7-2": "▽",
  "8-1": "爆",
  "8-2": "魔",
};
const KAMIWAZA = new Set(["狼", "▽", "爆", "魔"]);

const PREVIOUS_CLEAR_SAMPLES = {
};

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

function getStageEntry(stages, stageNo, subStage) {
  return stages.find((s) => s.chapter === 2 && s.stage === stageNo - 12 && s.battle === subStage);
}

function getBossPatterns(entry) {
  return Array.isArray(entry.bossSkillAbbrs) ? entry.bossSkillAbbrs : [entry.bossSkillAbbrs];
}

function parseArgs(argv) {
  const args = {
    targets: null,
    sampleLimit: 10,
    includeCleared: true,
    requireSkills: [],
    bossIndexes: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--targets") {
      args.targets = String(argv[++i] || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (arg === "--sample-limit") {
      args.sampleLimit = Number(argv[++i] || "10");
    } else if (arg === "--uncleared-only") {
      args.includeCleared = false;
    } else if (arg === "--require-skills") {
      args.requireSkills = String(argv[++i] || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (arg === "--boss-indexes") {
      args.bossIndexes = String(argv[++i] || "")
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v > 0);
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
    "  node tools/chapter2-balance-search.cjs",
    "  node tools/chapter2-balance-search.cjs --targets 6-2,7-2",
    "  node tools/chapter2-balance-search.cjs --uncleared-only",
    "",
    "Options:",
    "  --targets <keys>       Stage keys like 6-2,7-2",
    "  --sample-limit <n>     Max winning samples per stage",
    "  --uncleared-only       Search only stages without stored clear samples",
    "  --require-skills <s>   Comma-separated required skills like 毒,霊",
    "  --boss-indexes <n>     1-based boss pattern indexes like 1 or 1,3",
  ].join("\n"));
}

function readExistingResults() {
  if (!fs.existsSync(resultsPath)) return [];
  return JSON.parse(fs.readFileSync(resultsPath, "utf8"));
}

function writeResults(results) {
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
}

function appendProgress(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(progressLogPath, line, "utf8");
  console.log(message);
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
  const existingResults = readExistingResults();
  const existingMap = new Map(existingResults.map((entry) => [entry.key, entry]));
  const results = [];

  const shouldSearch = (baseKey, key) => {
    if (args.targets && !args.targets.includes(baseKey) && !args.targets.includes(key)) return false;
    if (args.includeCleared) return true;
    const existing = existingMap.get(key);
    return !existing || !existing.clearable;
  };

  const win = (player, boss) => new Battle(`${player}／P`, `${boss}／B`).start() === 1;

  let owned = INITIAL.slice();
  for (const flow of chapter2Flows) {
    for (const step of flow.flow) {
      if (step.type === "reward" && step.skill) {
        owned.push(step.skill);
        continue;
      }
      if (step.type !== "battle") continue;

      const stage = flow.stageNo - 12;
      const baseKey = `${stage}-${step.subStage}`;
      const entry = getStageEntry(stages, flow.stageNo, step.subStage);
      const allowed = ALLOWED_KAMIWAZA[baseKey];
      const pool = [...new Set(owned.filter((abbr) => !KAMIWAZA.has(abbr) || !allowed || abbr === allowed))];
      const allBosses = getBossPatterns(entry);
      const selectedBossIndexes = args.bossIndexes
        ? args.bossIndexes.filter((index) => index >= 1 && index <= allBosses.length)
        : null;
      const bosses = selectedBossIndexes
        ? selectedBossIndexes.map((index) => allBosses[index - 1])
        : allBosses;
      const key = selectedBossIndexes && selectedBossIndexes.length > 0
        ? `${baseKey}#${selectedBossIndexes.join(",")}`
        : baseKey;

      if (!shouldSearch(baseKey, key)) {
        const existing = existingMap.get(key);
        if (existing) results.push(existing);
        continue;
      }

      const previousSamples = PREVIOUS_CLEAR_SAMPLES[key] || [];
      const existingSeedSamples = existingMap.get(key)?.samples || [];
      const seedSamples = [...existingSeedSamples, ...previousSamples];
      const missingRequiredSkills = args.requireSkills.filter((skill) => !pool.includes(skill));
      if (previousSamples.length > 0) {
        const filteredSamples = previousSamples
          .filter((sample) => lineupContainsRequiredSkills(sample, args.requireSkills))
          .slice(0, args.sampleLimit);
        const entryResult = {
          key,
          bossName: entry.bossName,
          clearable: filteredSamples.length > 0,
          searchMode: "previous-ordered-no-dup",
          checked: null,
          samples: filteredSamples,
          pool: pool.join(""),
          requireSkills: args.requireSkills,
          bossIndexes: selectedBossIndexes,
        };
        results.push(entryResult);
        writeResults(results);
        appendProgress(`${key} ${entry.bossName}: reused ${entryResult.samples.length} stored samples.`);
        continue;
      }

      const samples = [];
      let checked = 0;
      if (missingRequiredSkills.length > 0) {
        const entryResult = {
          key,
          bossName: entry.bossName,
          clearable: false,
          searchMode: "ordered-with-dup",
          checked: 0,
          samples: [],
          pool: pool.join(""),
          requireSkills: args.requireSkills,
          bossIndexes: selectedBossIndexes,
        };
        results.push(entryResult);
        writeResults(results);
        appendProgress(`${key} ${entry.bossName}: skipped because required skills are missing from pool (${missingRequiredSkills.join(",")}).`);
        continue;
      }
      appendProgress(`${key} ${entry.bossName}: search start (pool=${pool.join("")}, bosses=${bosses.length}, bossIndexes=${selectedBossIndexes ? selectedBossIndexes.join(",") : "all"}, kamiwazaLimit=1, seeds=${seedSamples.length}, require=${args.requireSkills.join(",") || "-" }).`);
      for (const lineup of seededCandidates(pool, 5, seedSamples)) {
        if (!lineupContainsRequiredSkills(lineup, args.requireSkills)) continue;
        checked++;
        if (bosses.every((boss) => win(lineup, boss))) {
          samples.push(lineup);
          appendProgress(`${key} ${entry.bossName}: found #${samples.length} ${lineup} after ${checked} checks.`);
          if (samples.length >= args.sampleLimit) break;
        }
        if (checked % 250000 === 0) {
          const snapshot = {
            key,
            bossName: entry.bossName,
          clearable: samples.length > 0,
          searchMode: "ordered-with-dup",
          checked,
          samples: samples.slice(),
          pool: pool.join(""),
          requireSkills: args.requireSkills,
          bossIndexes: selectedBossIndexes,
        };
          const nextResults = results.filter((r) => r.key !== key).concat(snapshot);
          writeResults(nextResults);
          appendProgress(`${key} ${entry.bossName}: progress ${checked} checks, wins=${samples.length}.`);
        }
      }

      const entryResult = {
        key,
        bossName: entry.bossName,
        clearable: samples.length > 0,
        searchMode: "ordered-with-dup",
        checked,
        samples,
        pool: pool.join(""),
        requireSkills: args.requireSkills,
        bossIndexes: selectedBossIndexes,
      };
      results.push(entryResult);
      writeResults(results);
      appendProgress(`${key} ${entry.bossName}: done (${checked} checks, wins=${samples.length}).`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
