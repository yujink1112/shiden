const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const repoRoot = process.cwd();
const buildDir = path.join(repoRoot, "tools", ".battle-sim-build-12-2-1-harder");
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, "package.json"), '{"type":"commonjs"}\n', "utf8");
for (const fileName of ["Player.ts", "Battle.ts"]) {
  const source = fs.readFileSync(path.join(repoRoot, "src", fileName), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName,
  });
  fs.writeFileSync(path.join(buildDir, fileName.replace(/\.ts$/, ".js")), output.outputText, "utf8");
}
const { Battle } = require(path.join(buildDir, "Battle.js"));
const flows = JSON.parse(fs.readFileSync(path.join(repoRoot, "public/data/chapter2_flow.json"), "utf8"));
const stages = JSON.parse(fs.readFileSync(path.join(repoRoot, "public/data/stages.json"), "utf8"));
const INITIAL = ["一", "刺", "果", "待", "搦", "玉", "強", "速"];
const KAMI = new Set(["狼", "▽", "爆", "魔"]);
const BANNED = new Set(["空", "Ｈ", "弱", "狼", "▽", "爆", "魔", "死"]);
const CANDIDATES = ["一", "刺", "果", "待", "搦", "玉", "強", "速", "拳", "飛", "奏", "焦", "毒", "礁", "霊", "円", "滅", "受", "盗", "反", "砲", "紫", "封", "凍", "隠", "燐", "連", "盾", "硬", "防", "癒", "交", "崩", "水", "逆", "雷", "弓", "先", "罠", "烈", "幻", "無", "錬"];
function buildPool() {
  let owned = INITIAL.slice();
  for (const flow of flows) {
    for (const step of flow.flow) {
      if (step.type === "reward" && step.skill) owned.push(step.skill);
      if (step.type !== "battle") continue;
      const key = `${flow.stageNo - 12}-${step.subStage}`;
      if (key === "12-2") {
        return [...new Set(owned.filter((abbr) => !KAMI.has(abbr) || abbr === "狼"))];
      }
    }
  }
  return [];
}
function isAllowed(lineup) {
  let count = 0;
  for (const ch of lineup) {
    if (KAMI.has(ch)) count++;
    if (count > 1) return false;
  }
  return true;
}
function* tuples(pool) {
  const cur = Array(5).fill("");
  function* rec(pos) {
    if (pos === 5) {
      const lineup = cur.join("");
      if (isAllowed(lineup) && [...lineup].includes("狼")) yield lineup;
      return;
    }
    for (const skill of pool) {
      cur[pos] = skill;
      yield* rec(pos + 1);
    }
  }
  yield* rec(0);
}
function evaluate(boss, pool, maxChecks = Infinity) {
  let checked = 0;
  let wins = 0;
  let firstWinAt = null;
  const samples = [];
  for (const lineup of tuples(pool)) {
    checked++;
    if (new Battle(`${lineup}／P`, `${boss}／B`).start() === 1) {
      wins++;
      if (firstWinAt == null) firstWinAt = checked;
      if (samples.length < 5) samples.push(lineup);
    }
    if (checked >= maxChecks) break;
  }
  return { checked, wins, winRate: checked ? wins / checked : 0, firstWinAt, samples };
}
function applyOne(boss, index, to) {
  const chars = [...boss];
  chars[index] = to;
  return chars.join("");
}
const entry = stages.find((s) => s.chapter === 2 && s.stage === 12 && s.battle === 2);
const boss = entry.bossSkillAbbrs[0];
const pool = buildPool();
const base = evaluate(boss, pool);
const ranked = [];
for (let index = 0; index < boss.length; index++) {
  for (const to of CANDIDATES) {
    if (BANNED.has(to) || to === boss[index]) continue;
    const tuned = applyOne(boss, index, to);
    const result = evaluate(tuned, pool, 651605);
    if (result.wins === 0) continue;
    ranked.push({
      tuned,
      change: { index: index + 1, from: boss[index], to },
      wins: result.wins,
      checked: result.checked,
      winRate: result.winRate,
      firstWinAt: result.firstWinAt,
      samples: result.samples,
    });
  }
}
ranked.sort((a, b) => {
  const baseRate = base.winRate;
  const aDelta = Math.abs(a.winRate - baseRate);
  const bDelta = Math.abs(b.winRate - baseRate);
  const targetA = a.winRate < baseRate ? a.winRate : 999;
  const targetB = b.winRate < baseRate ? b.winRate : 999;
  if (targetA !== targetB) return targetA - targetB;
  if (aDelta !== bDelta) return aDelta - bDelta;
  if (a.firstWinAt !== b.firstWinAt) return b.firstWinAt - a.firstWinAt;
  return a.wins - b.wins;
});
const softer = ranked.filter(x => x.winRate < base.winRate);
console.log(JSON.stringify({
  boss,
  base,
  bestHarderCandidates: softer.slice(0, 20)
}, null, 2));
