const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(__dirname, ".battle-sim-build");
const defaultResultsPath = path.join(__dirname, "8-2-brinekul-build-search.json");
const defaultProgressLogPath = path.join(__dirname, "8-2-brinekul-build-search.log");

const PLAYER_POOL = [..."一刺果待搦玉強速拳飛奏焦毒礁霊魔"];
const REQUIRE_MAGIC = ["魔"];
const BOSS_LENGTH = 7;
const MANDATORY_BOSS_SKILLS = ["凍", "円"];
const FORBIDDEN_BOSS_SKILLS = new Set(["飛", "空", "Ｈ", "弱", "狼", "▽", "爆", "魔"]);
const ALLOWED_BOSS_SKILLS = [
  ..."防封影毒癒凍奏盗交搦待玉崩疫幻水転罠受強硬速反盾錬逆無裏先連燐円礁霊",
].filter((skill) => !FORBIDDEN_BOSS_SKILLS.has(skill));
const KAMIWAZA = new Set(["狼", "▽", "爆", "魔"]);

function parseArgs(argv) {
  const args = {
    iterations: 200,
    sampleLimit: 20,
    top: 20,
    seed: Date.now(),
    resultsPath: defaultResultsPath,
    progressLogPath: defaultProgressLogPath,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--iterations") args.iterations = Number(argv[++i] || "200");
    else if (arg === "--sample-limit") args.sampleLimit = Number(argv[++i] || "20");
    else if (arg === "--top") args.top = Number(argv[++i] || "20");
    else if (arg === "--seed") args.seed = Number(argv[++i] || "0");
    else if (arg === "--results-path") args.resultsPath = path.resolve(repoRoot, String(argv[++i] || ""));
    else if (arg === "--progress-log-path") args.progressLogPath = path.resolve(repoRoot, String(argv[++i] || ""));
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }

  return args;
}

function usage() {
  console.log([
    "Usage:",
    "  node tools/search-8-2-brinekul-builds.cjs",
    "  node tools/search-8-2-brinekul-builds.cjs --iterations 500 --top 30",
    "",
    "Options:",
    "  --iterations <n>       Number of random boss candidates to evaluate",
    "  --sample-limit <n>     Winning samples to keep per evaluation",
    "  --top <n>              Number of top candidates to save",
    "  --seed <n>             Random seed for reproducible runs",
    "  --results-path <path>  Output JSON path",
    "  --progress-log-path <path>  Output log path",
  ].join("\n"));
}

function appendProgress(progressLogPath, message) {
  fs.mkdirSync(path.dirname(progressLogPath), { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(progressLogPath, line, "utf8");
  console.log(message);
}

function writeResults(resultsPath, payload) {
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify(payload, null, 2), "utf8");
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

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChoice(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function randomBoss(rng) {
  const chars = [...MANDATORY_BOSS_SKILLS];
  while (chars.length < BOSS_LENGTH) {
    chars.push(randomChoice(rng, ALLOWED_BOSS_SKILLS));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
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

function evaluateBoss(Battle, boss, sampleLimit, requiredSkills) {
  const samples = [];
  let checked = 0;
  for (const lineup of tuples(PLAYER_POOL, 5)) {
    if (!lineupContainsRequiredSkills(lineup, requiredSkills)) continue;
    checked++;
    const win = new Battle(`${lineup}／P`, `${boss}／B`).start() === 1;
    if (!win) continue;
    samples.push(lineup);
    if (samples.length >= sampleLimit) break;
  }
  return {
    checked,
    wins: samples.length,
    firstWin: samples[0] || null,
    samples,
  };
}

function rankCandidate(candidate) {
  return [
    candidate.all.checked,
    candidate.magic.checked,
    candidate.magic.wins,
  ];
}

function compareRank(a, b) {
  const ar = rankCandidate(a);
  const br = rankCandidate(b);
  for (let i = 0; i < ar.length; i++) {
    if (br[i] !== ar[i]) return br[i] - ar[i];
  }
  return a.boss.localeCompare(b.boss, "ja");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  appendProgress(
    args.progressLogPath,
    `8-2 candidate search start iterations=${args.iterations} sampleLimit=${args.sampleLimit} seed=${args.seed}.`
  );

  compileBattle();
  const { Battle } = require(path.join(buildDir, "Battle.js"));
  const rng = mulberry32(args.seed);
  const seen = new Set();
  const candidates = [];

  for (let i = 0; i < args.iterations; i++) {
    let boss = randomBoss(rng);
    while (seen.has(boss)) boss = randomBoss(rng);
    seen.add(boss);

    const all = evaluateBoss(Battle, boss, args.sampleLimit, []);
    const magic = evaluateBoss(Battle, boss, args.sampleLimit, REQUIRE_MAGIC);
    const candidate = { boss, all, magic };
    candidates.push(candidate);

    appendProgress(
      args.progressLogPath,
      `candidate ${i + 1}/${args.iterations} boss=${boss} all=${all.checked}/${all.wins} magic=${magic.checked}/${magic.wins} firstAll=${all.firstWin || "-"} firstMagic=${magic.firstWin || "-"}.`
    );
  }

  candidates.sort(compareRank);
  const payload = {
    generatedAt: new Date().toISOString(),
    iterations: args.iterations,
    sampleLimit: args.sampleLimit,
    seed: args.seed,
    playerPool: PLAYER_POOL.join(""),
    mandatoryBossSkills: MANDATORY_BOSS_SKILLS,
    forbiddenBossSkills: [...FORBIDDEN_BOSS_SKILLS],
    topCandidates: candidates.slice(0, args.top),
  };

  writeResults(args.resultsPath, payload);
  appendProgress(
    args.progressLogPath,
    `8-2 candidate search done top=${Math.min(args.top, candidates.length)} saved=${args.resultsPath}.`
  );
}

main();
