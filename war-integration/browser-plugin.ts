import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { adaptArena } from './arena-adapter.ts';

export function browserArenaPlugin():Plugin {
  const root=process.cwd(), vendor=resolve(root,'war-integration/vendor');
  return {
    name:'browser-code-arena',
    async config() {
      await mkdir(resolve(root,'arena'),{recursive:true});
      await mkdir(resolve(root,'public/arena/assets'),{recursive:true});
      const html=adaptArena(await readFile(resolve(vendor,'game/index.html'),'utf8'),'index.html')
        .replace('src="/arena/game.js"','src="/src/war/browser-entry.js"');
      await writeFile(resolve(root,'arena/index.html'),html);
      for(const file of ['game.css','ide.css'])
        await writeFile(resolve(root,'public/arena',file),adaptArena(await readFile(resolve(vendor,'game',file),'utf8'),file));
      for(const file of ['assets/battlefield.png','assets/troops.png','assets/locations.png'])
        await copyFile(resolve(vendor,'game',file),resolve(root,'public/arena',file));
      await copyFile(resolve(vendor,'schema.json'),resolve(root,'public/arena/schema.json'));
    },
    resolveId(id) {if(id==='virtual:arena-game')return '\0arena-game';},
    async load(id) {
      if(id!=='\0arena-game')return;
      let source=adaptArena(await readFile(resolve(vendor,'game/game.js'),'utf8'),'game.js');
      source='import { browserConfig, browserApi } from "/src/war/browser-runtime.ts";\n'+source;
      for(const file of ['playback.js','ide.js','strategy-language.js'])
        source=source.replaceAll('"/arena/'+file+'"','"/war-integration/vendor/game/'+file+'"');
      const start=source.indexOf('async function api(path, payload) {');
      const end=source.indexOf('\nfunction updateLines()',start);
      if(start<0||end<0)throw new Error('Não foi possível adaptar a API da Arena para o navegador.');
      source=source.slice(0,start)+'async function api(path, payload) { return browserApi(path, payload, integration); }\n'+source.slice(end);
      source=source.replace(/  const response = await fetch\("\/api\/game\/config" \+ location.search\);[^\n]*\n  config = await response.json\(\);/,'  config = await browserConfig(integration);');
      if(source.includes('fetch("/api/'))throw new Error('A Arena ainda possui uma dependência da API HTTP.');
      return source
        .replace('CODE EVENT · Partida oficial: 720 segundos simulados. Ensaios não pontuam. ','CODE EVENT · Partida local: 720 segundos simulados. Ensaios não entram no histórico. ')
        .replace('Até três pontos por participante para cada lado.','Resultados e progresso ficam neste navegador.')
        .replace('Pontuação pendente da definição da política do evento.','Resultado salvo neste navegador.');
    },
  };
}
