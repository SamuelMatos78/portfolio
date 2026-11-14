// Mount the Code Arena files under /arena and adapt controls and data to the selected mode.
export function adaptArena(source: string, file: string): string {
  if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
    for (const asset of ['game.css','game.js','ide.css','ide.js','strategy-language.js','playback.js','commands.js','block-model.js','block-editor.js','assets/battlefield.png','assets/troops.png','assets/locations.png','schema.json','api-docs','debug']) {
      source = source.replaceAll('"/' + asset + '"', '"/arena/' + asset + '"').replaceAll("'/" + asset + "'", "'/arena/" + asset + "'");
    }
  }
  if (file === 'index.html') {
    source = source.replace('href="/"', 'href="/arena/"').replace('href="/arena/api-docs"', 'href="/arena/schema.json"').replace('API ↗', 'Schema ↗').replace('href="/arena/debug"', 'href="/arena/schema.json"').replace('Visualizador técnico ↗', 'Contrato JSON ↗');
    source = source.replace('</head>', `<style>
      .integration-banner {padding:16px 24px;border:1px solid #9bbd75;color:#dfedcf;margin:20px;border-radius:12px;background:#19221b}
      .integration-banner button {padding:14px 24px;margin:8px;background:#c6e398;color:#132018;border:0;border-radius:8px;font-weight:bold;cursor:pointer}
      [hidden]{display:none!important}.site-header {position:static!important} body {min-width:0!important}
      @media(max-width:600px){.site-header nav{flex-wrap:wrap}.page-heading h1{font-size:32px}}
    </style></head>`).replace('<main>', '<main><div class="integration-banner" id="integrationBanner" role="status"></div>');
  }
  if (file !== 'game.js') return source;
  source = `const integration = new URLSearchParams(location.search);\nconst spectator = integration.get('mode') === 'spectator';\n${source}`;
  source = source.replace('fetch("/api/game/config")', 'fetch("/api/game/config" + location.search)');
  source = source.replace('  $("villainCode").textContent = programToSource(villain.program, config.catalog);', '  const frozenDetails = document.querySelector(".frozen-details"); frozenDetails.hidden = !villain.program;\n  $("villainCode").textContent = villain.program ? programToSource(villain.program, config.catalog) : "";');
  source = source.replace('battle = await api("/api/game/battle", { program, villainId, durationSeconds });', `battle = await api("/api/game/battle", { program, villainId, durationSeconds, mode: spectator ? "spectator" : "event", agentA: integration.get("agentA") ?? "claude", requestKey: crypto.randomUUID() });
    window.parent.postMessage({type:"code-arena-result", winner:battle.winner, eventScore:battle.eventScore ?? null, matchId:battle.matchId ?? null}, location.origin);`);
  source = source.replace('$("resultOverlay").hidden = false;', `
    if (spectator) {
      $("resultEyebrow").textContent = "WATCH THE GENERALS FIGHT";
      $("resultTitle").textContent = draw ? "Empate entre os generais." : (humanWins ? config.agentAName : currentVillain().name) + " venceu.";
      $("resultSummary").textContent = "Confronto determinístico de programas congelados. Nenhum ponto de evento foi contabilizado.";
    } else if (battle.eventScore) {
      $("resultSummary").textContent += battle.eventScore.pending ? " Pontuação pendente da definição da política do evento." : " Pontos desta partida: Humanidade +" + battle.eventScore.humanity + " / Máquinas +" + battle.eventScore.machines + ".";
    }
    $("resultOverlay").hidden = false;`);
  source = source.replace('setPhase("editing"); durationHint();', `setPhase("editing"); durationHint();
    const banner = $("integrationBanner");
    banner.textContent = spectator ? "ESPECTADOR · Dois programas congelados. Sem pontos no placar. O mapa é determinístico e não usa seed de partida." : "CODE EVENT · Partida oficial: 720 segundos simulados. Ensaios não pontuam. " + (config.scoringPending ? "Resultados auditados; pontos pendentes da política do proprietário." : "Até três pontos por participante para cada lado.");
    if (spectator) {
      $("workshop").hidden = true;
      const opponents = document.querySelector(".opponents-section");
      opponents.querySelector(".eyebrow").textContent = "SUBMISSÕES PUBLICADAS";
      opponents.querySelector("h2").textContent = "Códigos dos generais";
      const ownSubmission = document.createElement("details"); ownSubmission.className = "frozen-details";
      const ownSummary = document.createElement("summary"); ownSummary.textContent = "Ver o código congelado de " + config.agentAName;
      const ownCode = document.createElement("pre"); ownCode.textContent = programToSource(config.starter, config.catalog);
      ownSubmission.append(ownSummary, ownCode); opponents.append(ownSubmission);
      document.querySelector(".team-heading h2").textContent = config.agentAName;
      document.querySelector(".team-heading .eyebrow").textContent = "CÓDIGO CONGELADO";
      const start = $("startBattle"); start.textContent = "▶ Assistir ao confronto"; banner.append(start);
      document.querySelector(".page-heading h1").textContent = "Watch the generals fight.";
      document.querySelector(".page-heading p:last-child").textContent = "Estratégias congeladas. Resultado do motor. Nenhuma chamada a LLM.";
    } else { $("matchDuration").value = "720"; $("matchDuration").disabled = true; durationHint(); }
    const sendHeight = () => parent.postMessage({type:"code-arena-height",height:Math.ceil(document.body.getBoundingClientRect().height)},location.origin);
    new ResizeObserver(sendHeight).observe(document.body); sendHeight();`);
  // Event duration is always enforced by the server; this locks the display as well.
  source = source.replace('$("preparingOverlay").hidden = next !== "preparing";', '$("preparingOverlay").hidden = next !== "preparing"; if (!spectator) $("matchDuration").disabled = true;');
  return source;
}
