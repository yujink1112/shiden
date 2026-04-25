const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = path.resolve(__dirname, "..");
const buildDir = path.join(__dirname, ".battle-sim-build");

const resultLabels = {
  1: "player",
  2: "boss",
  3: "draw",
};

function usage() {
  console.log([
    "Usage:",
    "  node tools/battle-sim.cjs --player <skills> --boss <skills>",
    "  node tools/battle-sim.cjs --player <skills> --stage <stageNo>",
    "",
    "Options:",
    "  --player <skills>   Player skill abbreviations. Can be repeated.",
    "  --boss <skills>     Boss skill abbreviations. Can be repeated.",
    "  --stage <stageNo>   Load bossSkillAbbrs from public/data/stages.json.",
    "  --log               Print full battle logs.",
    "  --json              Print machine-readable JSON.",
    "  --help              Show this help.",
    "",
    "Examples:",
    "  node tools/battle-sim.cjs --player 待拳強飛果 --stage 36",
    "  node tools/battle-sim.cjs --player 狼一刺果飛 --boss 罠硬凍盾毒速燐連砲錬 --log",
  ].join("\n"));
}

function parseArgs(argv) {
  const args = {
    players: [],
    bosses: [],
    stage: null,
    printLog: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--player" || arg === "-p") {
      args.players.push(requireValue(argv, ++i, arg));
    } else if (arg === "--boss" || arg === "-b") {
      args.bosses.push(requireValue(argv, ++i, arg));
    } else if (arg === "--stage" || arg === "-s") {
      args.stage = Number(requireValue(argv, ++i, arg));
    } else if (arg === "--log") {
      args.printLog = true;
    } else if (arg === "--json") {
      args.json = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function loadStageBosses(stageNo) {
  const stagesPath = path.join(repoRoot, "public", "data", "stages.json");
  const stages = JSON.parse(fs.readFileSync(stagesPath, "utf8"));
  const stage = stages.find((entry) => entry.no === stageNo);
  if (!stage) throw new Error(`Stage ${stageNo} was not found in public/data/stages.json.`);

  if (Array.isArray(stage.bossSkillAbbrs)) return stage.bossSkillAbbrs;
  if (typeof stage.bossSkillAbbrs === "string") return [stage.bossSkillAbbrs];
  throw new Error(`Stage ${stageNo} does not have bossSkillAbbrs.`);
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
      reportDiagnostics: true,
      fileName,
    });

    const diagnostics = output.diagnostics || [];
    const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
      const message = ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => repoRoot,
        getNewLine: () => "\n",
      });
      throw new Error(message);
    }

    fs.writeFileSync(path.join(buildDir, fileName.replace(/\.ts$/, ".js")), output.outputText, "utf8");
  }
}

function getLastRound(logText) {
  const matches = [...logText.matchAll(/【第(\d+)ラウンド】/g)];
  if (matches.length === 0) return null;
  return Number(matches[matches.length - 1][1]);
}

function simulate(Battle, player, boss, printLog) {
  const battle = new Battle(`${player}／Player`, `${boss}／Boss`);
  const result = battle.start();
  const winner = resultLabels[result] || `unknown:${result}`;
  const round = getLastRound(battle.text);

  if (printLog) {
    console.log(`\n===== ${player} vs ${boss} =====`);
    console.log(battle.text);
  }

  return { player, boss, result, winner, round };
}

function printTable(results) {
  const playerWidth = Math.max("Player".length, ...results.map((r) => r.player.length));
  const bossWidth = Math.max("Boss".length, ...results.map((r) => r.boss.length));
  const lines = [];
  lines.push(`${pad("Player", playerWidth)}  ${pad("Boss", bossWidth)}  Winner  Round`);
  lines.push(`${"-".repeat(playerWidth)}  ${"-".repeat(bossWidth)}  ------  -----`);
  for (const r of results) {
    lines.push(`${pad(r.player, playerWidth)}  ${pad(r.boss, bossWidth)}  ${pad(r.winner, 6)}  ${r.round ?? "-"}`);
  }
  console.log(lines.join("\n"));
}

function pad(value, width) {
  const text = String(value);
  return text + " ".repeat(Math.max(0, width - [...text].length));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  if (args.stage !== null) {
    args.bosses.push(...loadStageBosses(args.stage));
  }

  if (args.players.length === 0 || args.bosses.length === 0) {
    usage();
    process.exitCode = 1;
    return;
  }

  compileBattle();
  const { Battle } = require(path.join(buildDir, "Battle.js"));

  const results = [];
  for (const player of args.players) {
    for (const boss of args.bosses) {
      results.push(simulate(Battle, player, boss, args.printLog));
    }
  }

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printTable(results);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
