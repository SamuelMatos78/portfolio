import { BattleClock, frameIndexAt } from "/playback.js";
import { StrategyIDE } from "/ide.js";
import { programToSource, sourceToProgram } from "/strategy-language.js";

const $ = (id) => document.getElementById(id);
const canvas = $("battlefield"), ctx = canvas.getContext("2d");
const clock = new BattleClock();
const STORAGE_KEY = "codewar.human.program.v1";
const states = { IDLE: "Aguardando", MOVING: "Em movimento", GUARDING: "Protegendo", COLLECTING: "Coletando recursos", BUILDING: "Construindo", EQUIPPING: "Forjando equipamento", HEALING: "Tratando aliado", PICKING_UP: "Resgatando", CARRYING: "Transportando", DROPPING: "Soltando incapacitado", ENGAGED: "Em combate", INCAPACITATED: "Incapacitado", DEAD: "Morto" };
const weapons = { sword: "Espada", spear: "Lança", axe: "Machado" };
const spriteColumns = { sword: 1, spear: 2, axe: 3 };
let config, villainId, phase = "loading", battle = null, frames = [], selectedUnit = null;
let pendingSpeed = 1, hudTime = 0, battleEvents = [], lastHudTick = -1;
let camera = { zoom: 1, x: 0, y: 0 }, showGrid = false, drag = null;
let renderScale = 1;
const images = {};
const rosterButtons = [];
let ide = null;

function saveDraft() { try { localStorage.setItem(STORAGE_KEY, $("humanCode").value); } catch { /* Storage is optional. */ } }
function savedDraft() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } }
function message(text, kind = "") { $("editorMessage").textContent = text; $("editorMessage").className = `editor-message ${kind}`; }
function timeLabel(seconds) { const n = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; }
function currentVillain() { return config?.villains.find((villain) => villain.id === villainId); }
function editing() { return phase === "editing"; }
function active(unit) { return unit.state !== "DEAD" && unit.state !== "INCAPACITATED"; }
function readProgram() { return sourceToProgram($("humanCode").value, config.catalog); }

async function api(path, payload) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(750_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "A arena não conseguiu processar esta estratégia.");
  return result;
}

function updateLines() {
  const count = $("humanCode").value.split("\n").length;
  $("lineNumbers").textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
  $("lineNumbers").scrollTop = $("humanCode").scrollTop;
  ide?.syncFromCode();
}

function setPhase(next) {
  phase = next;
  const canEdit = next === "editing";
  const phaseLabels = { loading: "CARREGANDO", editing: "PREPARAÇÃO", testing: "ENSAIO", preparing: "PREPARANDO", running: "EM CONFRONTO", paused: "PAUSADO", finished: "ENCERRADO" };
  $("phaseBadge").textContent = phaseLabels[next];
  $("humanCode").disabled = !canEdit;
  ide?.setDisabled(!canEdit);
  $("editorState").textContent = canEdit ? "● EDITÁVEL" : "◆ CONGELADO";
  for (const id of ["testCode", "startBattle", "validateCode", "formatCode", "restoreStarter", "importCode", "matchDuration"]) $(id).disabled = !canEdit;
  document.querySelector(".file-button").classList.toggle("disabled", !canEdit);
  document.querySelectorAll(".villain-card").forEach((button) => { button.disabled = !canEdit; });
  $("pauseButton").disabled = !["running", "paused"].includes(next);
  $("pauseButton").textContent = next === "paused" ? "▶ Continuar" : "Ⅱ Pausar";
  $("newMatch").disabled = !["running", "paused", "finished"].includes(next);
  $("preparingOverlay").hidden = next !== "preparing";
  $("liveStatus").lastChild.textContent = ` ${next === "running" ? "Confronto em andamento" : next === "paused" ? "Confronto pausado" : next === "finished" ? "Confronto encerrado" : next === "testing" ? "Testando estratégia…" : "Aguardando estratégia"}`;
}

function selectVillain(id) {
  if (phase !== "loading" && !editing()) return;
  villainId = id;
  const villain = currentVillain();
  $("enemyName").textContent = villain.name;
  $("enemyResourceName").textContent = villain.name.toUpperCase();
  $("villainHash").textContent = `BUILD ${villain.hash.slice(0, 10)}`;
  $("villainDescription").textContent = villain.description;
  $("villainCode").textContent = programToSource(villain.program, config.catalog);
  document.querySelectorAll(".villain-card").forEach((button) => {
    const selected = button.dataset.id === id;
    button.setAttribute("aria-pressed", String(selected));
    button.querySelector(".check").textContent = selected ? "✓" : "";
  });
  $("testResult").hidden = true;
}

function makeVillainCards() {
  config.villains.forEach((villain, index) => {
    const button = document.createElement("button");
    button.className = "villain-card"; button.dataset.id = villain.id;
    button.style.setProperty("--villain-color", villain.color);
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = '<span class="build-number"></span><div class="portrait enemy"></div><strong></strong><small></small><span class="check"></span>';
    button.querySelector(".build-number").textContent = `0${index + 1} / ADVERSÁRIO`;
    button.querySelector("strong").textContent = villain.name;
    button.querySelector("small").textContent = villain.title;
    button.querySelector(".portrait").style.backgroundPosition = `${[33.333, 66.666, 0, 100][index % 4]}% 100%`;
    button.addEventListener("click", () => selectVillain(villain.id));
    $("villainCards").append(button);
  });
}

function previewFrame() {
  return { tick: 0, units: ["A", "B"].flatMap((team) => Array.from({ length: 10 }, (_, index) => ({ id: `${team}-${index}`, team, x: team === "A" ? 8 : 91, y: 45 + index, weapon: null, state: "IDLE", durability: 0, carryingId: null, carriedBy: null }))),
    markers: ["A", "B"].flatMap((team) => [{ kind: "forest", team, x: team === "A" ? 20 : 79, y: 20 }, { kind: "mine", team, x: team === "A" ? 20 : 79, y: 79 }]), teams: null };
}

function frameNow() {
  if (!frames.length) return { frame: previewFrame(), next: null, ratio: 0 };
  const tick = clock.seconds * config.tickRate;
  const index = frameIndexAt(frames, tick), frame = frames[index], next = frames[index + 1];
  const ratio = next && next.tick > frame.tick ? Math.max(0, Math.min(1, (tick - frame.tick) / (next.tick - frame.tick))) : 0;
  return { frame, next, ratio };
}

function makeRoster() {
  for (let index = 0; index < 10; index += 1) {
    const button = document.createElement("button");
    button.className = "troop-slot"; button.innerHTML = '<span class="sprite"></span><span></span>';
    button.lastChild.textContent = String(index + 1).padStart(2, "0");
    button.setAttribute("aria-label", `Inspecionar soldado humano ${index + 1}`);
    button.addEventListener("click", () => { selectedUnit = `A-${index}`; lastHudTick = -1; updateHud(); });
    rosterButtons.push(button); $("troopRoster").append(button);
  }
}

function updateHud() {
  const { frame } = frameNow();
  $("clock").textContent = timeLabel(clock.seconds);
  const limit = battle?.durationLimit ?? (Number($("matchDuration").value) || 720);
  $("clockLimit").textContent = `DE ${timeLabel(limit)}`;
  const progress = document.querySelector(".battle-progress");
  progress.setAttribute("aria-valuemax", String(limit)); progress.setAttribute("aria-valuenow", String(Math.floor(clock.seconds)));
  $("battleProgress").style.width = `${Math.min(100, clock.seconds / limit * 100)}%`;
  if (lastHudTick === frame.tick && !selectedUnit) return;
  lastHudTick = frame.tick;
  for (const [team, prefix] of [["A", "human"], ["B", "enemy"]]) {
    $(prefix + "Alive").textContent = frame.units.filter((unit) => unit.team === team && active(unit)).length;
    $(prefix + "Armed").textContent = frame.units.filter((unit) => unit.team === team && active(unit) && unit.weapon).length;
    $(prefix + "Wood").textContent = frame.teams?.[team].wood ?? 0;
    $(prefix + "Ore").textContent = frame.teams?.[team].ore ?? 0;
  }
  rosterButtons.forEach((button, index) => {
    const unit = frame.units.find((item) => item.id === `A-${index}`);
    button.className = `troop-slot${unit.id === selectedUnit ? " selected" : ""}${unit.state === "INCAPACITATED" ? " downed" : unit.state === "DEAD" ? " dead" : ""}`;
    button.querySelector(".sprite").style.backgroundPosition = `${(spriteColumns[unit.weapon] ?? 0) * 100 / 3}% 0%`;
    button.title = `Soldado ${index + 1} · ${states[unit.state]} · ${weapons[unit.weapon] ?? "Desarmado"}`;
  });
  const unit = frame.units.find((item) => item.id === selectedUnit);
  $("unitInspector").hidden = !unit;
  if (unit) {
    const heading = document.createElement("b"), info = document.createElement("span");
    heading.textContent = `${unit.team === "A" ? "Humano" : currentVillain().name} #${Number(unit.id.split("-")[1]) + 1}`;
    info.textContent = `${states[unit.state]} · ${weapons[unit.weapon] ?? "Desarmado"} · (${unit.x}, ${unit.y})`;
    if (unit.carriedBy) info.textContent += ` · Em transporte: morte pausada (${unit.deathRemainingSeconds?.toFixed(1)} s restantes)`;
    else if (unit.deathRemainingSeconds !== null && unit.deathRemainingSeconds !== undefined) info.textContent += ` · ${unit.deathRemainingSeconds.toFixed(1)} s até morrer`;
    if (unit.carryingId) info.textContent += " · Transportando incapacitado: contagem de morte pausada";
    $("unitInspector").replaceChildren(heading, info);
  }
  const visible = battleEvents.filter((event) => event.tick <= frame.tick).slice(-6).reverse();
  if (visible.length) {
    $("battleLog").replaceChildren(...visible.map((event) => {
      const li = document.createElement("li"), time = document.createElement("time");
      time.textContent = timeLabel(event.tick / 14); li.append(time, document.createTextNode(event.text)); return li;
    }));
  }
}

function eventsFromFrames(timeline) {
  const events = [{ tick: 0, text: `Humanidade × ${currentVillain().name}. As estratégias foram congeladas.` }];
  const previous = { A: {}, B: {} };
  const labels = { buildingsCreated: "construção concluída", soldiersEquipped: "soldado equipado", knockdowns: "soldado incapacitado", deaths: "soldado morto", rescues: "aliado recuperado", captures: "inimigo capturado" };
  for (const frame of timeline) {
    for (const team of ["A", "B"]) {
      const stats = frame.teams?.[team].stats;
      if (!stats) continue;
      for (const [key, label] of Object.entries(labels)) {
        if (stats[key] > (previous[team][key] ?? 0)) events.push({ tick: frame.tick, text: `${team === "A" ? "Humanidade" : currentVillain().name}: ${label} (+${stats[key] - (previous[team][key] ?? 0)}).` });
      }
      previous[team] = stats;
    }
  }
  return events;
}

function boardPoint(unit) { return { x: 54 + unit.x / 99 * 1092, y: 54 + unit.y / 99 * 692 }; }
function sprite(image, column, row, x, y, size, cols = 4, rows = 2) {
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, column * image.naturalWidth / cols, row * image.naturalHeight / rows, image.naturalWidth / cols, image.naturalHeight / rows, x - size / 2, y - size, size, size);
  return true;
}

function markerLabel(text, x, y, color = "#e4d9ac") {
  const unit = 1 / (renderScale * camera.zoom), size = 14 * unit;
  const left = 600 + (-600 - camera.x) / camera.zoom, right = left + 1200 / camera.zoom;
  if (x < left || x > right) return;
  ctx.font = `600 ${size}px system-ui, sans-serif`; ctx.textAlign = "center";
  const width = ctx.measureText(text).width + 12 * unit;
  const labelX = Math.max(left + width / 2 + 4 * unit, Math.min(right - width / 2 - 4 * unit, x));
  ctx.fillStyle = "#102014ed"; ctx.fillRect(labelX - width / 2, y - 15 * unit, width, 23 * unit);
  ctx.fillStyle = color; ctx.fillText(text, labelX, y + unit); ctx.textAlign = "left";
}

function drawMarker(marker) {
  const p = boardPoint(marker), column = { forest: 0, mine: 1, armory: 2, hospital: 3 }[marker.kind];
  const size = marker.kind === "forest" ? 92 : marker.kind === "mine" ? 77 : 65;
  if (marker.kind === "forest" || marker.kind === "mine") {
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 34, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = marker.kind === "forest" ? "#afbe5730" : "#82d0df20"; ctx.fill();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = "#d2dc9980"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  }
  sprite(images.locations, column, 0, p.x, p.y + 13, size, 4, 1);
  const name = { forest: "Floresta", mine: "Mina", armory: "Armaria", hospital: "Enfermaria" }[marker.kind];
  markerLabel(`${name} · ${marker.team === "A" ? "Humanos" : "Vilão"}${marker.hp === undefined ? "" : ` · ${marker.hp}/3`}`, p.x, p.y + 23, marker.team === "A" ? "#c1e0dd" : "#efc4a0");
}

function drawUnit(unit, nextUnit, ratio, now) {
  if (unit.carriedBy) return;
  let ux = unit.x, uy = unit.y;
  if (nextUnit && Math.abs(nextUnit.x - ux) + Math.abs(nextUnit.y - uy) <= 1 && active(unit)) {
    ux += (nextUnit.x - ux) * ratio; uy += (nextUnit.y - uy) * ratio;
  }
  const p = boardPoint({ x: ux, y: uy }), color = unit.team === "A" ? "#8bcedc" : "#eea17d";
  const moving = ["MOVING", "CARRYING"].includes(unit.state) && active(unit);
  const bob = moving ? Math.sin(now / 90 + Number(unit.id.split("-")[1])) * .9 : 0;
  ctx.save();
  ctx.globalAlpha = unit.state === "DEAD" ? .25 : 1;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, unit.id === selectedUnit ? 10 : 6, 3.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#0b1715a0"; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = unit.id === selectedUnit ? 1.8 : .8; ctx.stroke();
  if (unit.id === selectedUnit) {
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.ellipse(p.x, p.y, 110, 70, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `${color}60`; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
  }
  if (unit.state === "ENGAGED") {
    ctx.beginPath(); ctx.arc(p.x, p.y - 8, 12 + Math.sin(now / 140) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#f6c567b0"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#ffe4a5"; ctx.font = "14px Georgia"; ctx.fillText("⚔", p.x + 5, p.y - 27);
  }
  ctx.translate(p.x, p.y + bob);
  let facingLeft = unit.team === "B";
  if (nextUnit && nextUnit.x !== unit.x) facingLeft = nextUnit.x < unit.x;
  if (facingLeft) ctx.scale(-1, 1);
  if (unit.state === "DEAD" || unit.state === "INCAPACITATED") { ctx.rotate(-Math.PI / 2); ctx.translate(8, 0); }
  if (!sprite(images.troops, spriteColumns[unit.weapon] ?? 0, unit.team === "A" ? 0 : 1, 0, 0, 33)) {
    ctx.fillStyle = color; ctx.fillRect(-5, -18, 10, 17);
  }
  ctx.restore();
  if (unit.carryingId) { ctx.fillStyle = "#e4dc9d"; ctx.font = "12px system-ui"; ctx.fillText("✚", p.x + 8, p.y - 20); }
  const actionIcon = { COLLECTING: "♧", BUILDING: "⚒", EQUIPPING: "⚒", HEALING: "✚", PICKING_UP: "✚", DROPPING: "↓", GUARDING: "⌖" }[unit.state];
  if (actionIcon) { ctx.fillStyle = "#f2dfab"; ctx.font = "12px system-ui"; ctx.fillText(actionIcon, p.x + 7, p.y - 25); }
  if (unit.state === "INCAPACITATED") { ctx.fillStyle = "#e7bf6d"; ctx.font = "10px system-ui"; ctx.fillText("!", p.x + 8, p.y - 4); }
  if (unit.id === selectedUnit || camera.zoom > 2) markerLabel(`${unit.team === "A" ? "H" : "V"}${Number(unit.id.split("-")[1]) + 1}`, p.x, p.y + 13, color);
}

function draw(now) {
  renderScale = (canvas.clientWidth || 1200) / 1200;
  ctx.clearRect(0, 0, 1200, 800);
  ctx.save(); ctx.translate(600 + camera.x, 400 + camera.y); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-600, -400);
  if (images.battlefield?.naturalWidth) ctx.drawImage(images.battlefield, 0, 0, 1200, 800);
  else { ctx.fillStyle = "#4a5830"; ctx.fillRect(0, 0, 1200, 800); }
  const shade = ctx.createLinearGradient(54, 0, 1146, 0); shade.addColorStop(0, "#233e4c25"); shade.addColorStop(.5, "#00000000"); shade.addColorStop(1, "#6d29202b");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 1200, 800);
  if (showGrid) {
    ctx.strokeStyle = "#e2e1ac30"; ctx.lineWidth = .6;
    for (let n = 0; n <= 100; n += 5) {
      const x = 54 + n / 100 * 1092, y = 54 + n / 100 * 692;
      ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x, 746); ctx.moveTo(54, y); ctx.lineTo(1146, y); ctx.stroke();
    }
  }
  const { frame, next, ratio } = frameNow();
  for (const marker of frame.markers ?? []) drawMarker(marker);
  const nextUnits = new Map(next?.units.map((unit) => [unit.id, unit]) ?? []);
  for (const unit of [...frame.units].sort((a, b) => a.y - b.y || a.x - b.x)) drawUnit(unit, nextUnits.get(unit.id), ratio, now);
  ctx.restore();
}

function finishBattle() {
  if (phase === "finished") return;
  clock.running = false; setPhase("finished");
  const humanWins = battle.winner === "A", draw = battle.winner === "DRAW";
  $("resultEyebrow").textContent = draw ? "TEMPO ENCERRADO" : humanWins ? "A HUMANIDADE RESISTIU" : "AS MÁQUINAS VENCERAM";
  $("resultTitle").textContent = draw ? "Um impasse no vale." : humanWins ? "Vitória dos humanos." : "A defesa caiu.";
  $("resultSummary").textContent = draw ? "Nenhum exército foi eliminado. Ajuste sua estratégia e desafie o adversário novamente."
    : humanWins ? `Seu código derrotou ${currentVillain().name}. A próxima estratégia espera por você.` : `${currentVillain().name} venceu este confronto. Aprenda com a batalha e prepare a próxima defesa.`;
  const stats = battle.stats.A;
  $("resultMetrics").replaceChildren(...[[timeLabel(battle.durationSeconds), "TEMPO"], [stats.soldiersEquipped, "HUMANOS EQUIPADOS"], [stats.rescues, "RESGATES"]].map(([number, label]) => {
    const span = document.createElement("span"), b = document.createElement("b"); b.textContent = String(number); span.append(b, document.createTextNode(label)); return span;
  }));
  $("resultOverlay").hidden = false;
  battleEvents.push({ tick: Math.round(battle.durationSeconds * 14), text: `Confronto encerrado: ${draw ? "empate" : humanWins ? "vitória da Humanidade" : `vitória de ${currentVillain().name}`}.` });
  lastHudTick = -1; updateHud();
}

function resetMatch() {
  clock.reset(0); battle = null; frames = []; battleEvents = []; selectedUnit = null; lastHudTick = -1;
  $("resultOverlay").hidden = true; $("readyOverlay").hidden = false; $("unitInspector").hidden = true;
  $("codeInfo").textContent = "LINGUAGEM DA ARENA"; $("testResult").hidden = true;
  $("battleLog").replaceChildren(Object.assign(document.createElement("li"), { textContent: "Uma nova estratégia pode mudar o destino do vale." }));
  setPhase("editing"); message("Pronto para preparar a próxima estratégia."); updateHud();
}

function durationHint() {
  const duration = Number($("matchDuration").value);
  $("durationHint").textContent = Number.isInteger(duration) && duration >= 1 && duration <= 720
    ? `${timeLabel(duration)} em 1× · ${timeLabel(duration / 2)} em 2× · ${timeLabel(duration / 4)} em 4×`
    : "Escolha de 1 a 720 segundos (12 minutos).";
  if (!battle) updateHud();
}

$("humanCode").addEventListener("input", () => { updateLines(); saveDraft(); $("testResult").hidden = true; message("Estratégia alterada. Teste antes de iniciar."); });
$("humanCode").addEventListener("scroll", () => { $("lineNumbers").scrollTop = $("humanCode").scrollTop; });
$("humanCode").addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault(); const field = event.target, start = field.selectionStart;
    field.setRangeText("  ", start, field.selectionEnd, "end"); field.dispatchEvent(new Event("input"));
  } else if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault(); const field = event.target, start = field.selectionStart;
    const before = field.value.slice(0, start), after = field.value.slice(field.selectionEnd);
    const line = before.slice(before.lastIndexOf("\n") + 1), indent = line.match(/^\s*/)[0];
    const opens = /[\[{]\s*$/.test(line), closes = /^\s*[\]}]/.test(after);
    const inserted = `\n${indent}${opens ? "  " : ""}${opens && closes ? `\n${indent}` : ""}`;
    field.setRangeText(inserted, start, field.selectionEnd, "end");
    const cursor = start + 1 + indent.length + (opens ? 2 : 0); field.setSelectionRange(cursor, cursor); field.dispatchEvent(new Event("input"));
  }
});
$("formatCode").addEventListener("click", () => { try { $("humanCode").value = programToSource(readProgram(), config.catalog); updateLines(); saveDraft(); message("Código formatado.", "success"); } catch (error) { message(error.message, "error"); } });
$("importCode").addEventListener("change", async (event) => {
  const file = event.target.files[0]; if (!file || !editing()) return;
  try { if (file.size > 1_000_000) throw new Error("Escolha um arquivo de código com até 1 MB.");
    const source = await file.text(), program = sourceToProgram(source, config.catalog);
    $("humanCode").value = programToSource(program, config.catalog); updateLines(); saveDraft(); $("testResult").hidden = true; message(file.name + " carregado. Valide ou teste sua estratégia.");
  } catch (error) { message(error.message, "error"); } finally { event.target.value = ""; }
});
$("exportCode").addEventListener("click", () => {
  try { const content = programToSource(readProgram(), config.catalog), url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "humanidade-estrategia.cw"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { message(error.message, "error"); }
});
$("restoreStarter").addEventListener("click", () => { $("humanCode").value = programToSource(config.starter, config.catalog); updateLines(); saveDraft(); $("testResult").hidden = true; message("Estratégia inicial carregada."); });
$("validateCode").addEventListener("click", async () => {
  if (!editing()) return;
  setPhase("testing"); message("Validando sua estratégia…");
  try { const result = await api("/api/game/validate", { program: readProgram() }); message("Estratégia válida · build " + result.hash.slice(0, 10) + ".", "success"); }
  catch (error) { message(error.message, "error"); } finally { setPhase("editing"); }
});
$("testCode").addEventListener("click", async () => {
  if (!editing()) return;
  setPhase("testing"); message("Executando ensaio de 30 segundos…"); $("testResult").hidden = true;
  try { const result = await api("/api/game/test", { program: readProgram(), villainId });
    const stats = result.stats.A; $("testResult").textContent = `✓ Ensaio concluído: ${result.durationSeconds} s. Seus humanos coletaram ${stats.woodCollected} madeira e ${stats.oreCollected} minério, concluíram ${stats.buildingsCreated} construção(ões) e equiparam ${stats.soldiersEquipped} soldado(s).`;
    $("testResult").hidden = false; message("Seu código executou o ensaio. Você pode editar ou iniciar o confronto.", "success");
  } catch (error) { message(error.message, "error"); } finally { setPhase("editing"); }
});
$("startBattle").addEventListener("click", async () => {
  if (!editing()) return;
  const durationSeconds = Number($("matchDuration").value);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 720) { message("Escolha uma duração de 1 a 720 segundos.", "error"); $("matchDuration").focus(); return; }
  let program;
  try { program = readProgram(); } catch (error) { message(error.message, "error"); return; }
  setPhase("preparing"); message("Congelando seu código para o confronto…");
  try {
    battle = await api("/api/game/battle", { program, villainId, durationSeconds });
    if (!battle.debugFrames?.length) throw new Error("A arena retornou uma partida sem quadros.");
    frames = battle.debugFrames; selectedUnit = null; lastHudTick = -1;
    battleEvents = eventsFromFrames(frames); clock.reset(battle.durationSeconds); clock.setSpeed(pendingSpeed, performance.now());
    $("readyOverlay").hidden = true; $("resultOverlay").hidden = true;
    $("codeInfo").textContent = `BUILD CONGELADA · ${battle.humanHash.slice(0, 10)}`;
    message("Sua estratégia está congelada. Acompanhe a tropa e ajuste a velocidade.", "success");
    setPhase("running"); clock.play(performance.now()); updateHud(); $("arena").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { battle = null; frames = []; setPhase("editing"); message(error.message, "error"); }
});
$("pauseButton").addEventListener("click", () => {
  if (phase === "running") { clock.pause(performance.now()); if (clock.seconds >= clock.duration) finishBattle(); else setPhase("paused"); }
  else if (phase === "paused") { clock.play(performance.now()); setPhase("running"); }
});
for (const id of ["newMatch", "resultNew"]) $(id).addEventListener("click", resetMatch);
$("replayButton").addEventListener("click", () => {
  clock.reset(battle.durationSeconds); clock.setSpeed(pendingSpeed, performance.now());
  battleEvents = eventsFromFrames(frames); lastHudTick = -1; $("resultOverlay").hidden = true;
  setPhase("running"); clock.play(performance.now());
});
document.querySelectorAll("[data-speed]").forEach((button) => button.addEventListener("click", () => {
  pendingSpeed = Number(button.dataset.speed); clock.setSpeed(pendingSpeed, performance.now());
  document.querySelectorAll("[data-speed]").forEach((item) => { const selected = item === button; item.classList.toggle("selected", selected); item.setAttribute("aria-pressed", String(selected)); });
}));
$("matchDuration").addEventListener("input", durationHint);
$("gridToggle").addEventListener("click", () => { showGrid = !showGrid; $("gridToggle").setAttribute("aria-pressed", String(showGrid)); });
$("zoomIn").addEventListener("click", () => { camera.zoom = Math.min(3, camera.zoom + .5); });
$("zoomOut").addEventListener("click", () => { camera.zoom = Math.max(1, camera.zoom - .5); if (camera.zoom === 1) camera.x = camera.y = 0; });
$("centerMap").addEventListener("click", () => { camera = { zoom: 1, x: 0, y: 0 }; });
function canvasPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * 1200, y: (event.clientY - rect.top) / rect.height * 800 }; }
canvas.addEventListener("pointerdown", (event) => { const point = canvasPoint(event); drag = { point, last: point, moved: false }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  if (Math.hypot(point.x - drag.point.x, point.y - drag.point.y) > 5) drag.moved = true;
  if (drag.moved && camera.zoom > 1) { camera.x = Math.max(-600 * (camera.zoom - 1), Math.min(600 * (camera.zoom - 1), camera.x + point.x - drag.last.x)); camera.y = Math.max(-400 * (camera.zoom - 1), Math.min(400 * (camera.zoom - 1), camera.y + point.y - drag.last.y)); }
  drag.last = point;
});
canvas.addEventListener("pointerup", (event) => {
  if (drag && !drag.moved) {
    const point = canvasPoint(event), world = { x: (point.x - 600 - camera.x) / camera.zoom + 600, y: (point.y - 400 - camera.y) / camera.zoom + 400 };
    let best = 24, id = null;
    for (const unit of frameNow().frame.units) {
      if (unit.carriedBy) continue;
      const p = boardPoint(unit), distance = Math.hypot(p.x - world.x, p.y - 12 - world.y);
      if (distance < best) { best = distance; id = unit.id; }
    }
    selectedUnit = id; lastHudTick = -1; updateHud();
  }
  drag = null;
});
canvas.addEventListener("pointercancel", () => { drag = null; });

async function initialize() {
  setPhase("loading");
  const response = await fetch("/api/game/config"); if (!response.ok) throw new Error("Não foi possível carregar a configuração da arena.");
  config = await response.json();
  let initialProgram = config.starter;
  const draft = savedDraft();
  if (!config.hasInitialPrograms && draft) {
    try { initialProgram = sourceToProgram(draft, config.catalog); }
    catch { /* Keep a broken draft visible so the player can fix it. */ }
  }
  $("humanCode").value = initialProgram === config.starter && draft && !config.hasInitialPrograms
    ? draft
    : programToSource(initialProgram, config.catalog);
  updateLines(); makeVillainCards(); selectVillain(config.selectedVillain); makeRoster();
  ide = new StrategyIDE({ catalog: config.catalog, api, message, canEdit: editing,
    onDraft: () => { updateLines(); saveDraft(); $("testResult").hidden = true; } });
  const assets = [["battlefield", "/assets/battlefield.png"], ["troops", "/assets/troops.png"], ["locations", "/assets/locations.png"]];
  const loaded = await Promise.allSettled(assets.map(([key, src]) => new Promise((resolve, reject) => {
    const image = new Image(); images[key] = image; image.onload = resolve; image.onerror = () => reject(new Error(`Falha ao carregar ${src}`)); image.src = src;
  })));
  setPhase("editing"); durationHint();
  message(loaded.some((result) => result.status === "rejected") ? "Algumas imagens não carregaram. Atualize a página para restaurar a arte." : "Sua estratégia está pronta para editar. Teste seu código antes de entrar na arena.", loaded.some((result) => result.status === "rejected") ? "error" : "");
  updateHud();
}

function animate(now) {
  if (config) {
    if (phase === "running") { clock.advance(now); if (!clock.running && clock.seconds >= clock.duration) finishBattle(); }
    draw(now);
    if (now - hudTime > 100) { hudTime = now; updateHud(); }
  }
  requestAnimationFrame(animate);
}
initialize().catch((error) => { message(error.message, "error"); $("phaseBadge").textContent = "ARENA INDISPONÍVEL"; });
requestAnimationFrame(animate);
