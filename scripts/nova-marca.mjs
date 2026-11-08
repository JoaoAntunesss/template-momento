// Gera os ficheiros que dependem de marca.js:  node scripts/nova-marca.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(raiz, 'public/marca.js'), 'utf8'), ctx);
const M = ctx.window.MARCA;
const w = (f, o) => { fs.writeFileSync(path.join(raiz, f), JSON.stringify(o, null, 2) + '\n'); console.log('✔', f); };
const tipo = M.icone.endsWith('.svg') ? 'image/svg+xml' : M.icone.endsWith('.png') ? 'image/png' : 'image/jpeg';
w('public/manifest.json', { name: M.nomeCompleto || M.nome, short_name: M.nome, description: M.descricao, start_url: './index.html', display: 'standalone', background_color: M.cores.fundo, theme_color: M.cores.fundo, icons: [{ src: M.icone, sizes: M.icone.endsWith('.svg') ? 'any' : '512x512', type: tipo, purpose: 'any' }] });
w('functions/marca.json', { nome: M.nome, site: M.site, regiaoBD: M.regiaoBD, fuso: M.fuso, respostaEmHoras: M.respostaEmHoras, cores: { fundo: M.cores.fundo, texto: M.cores.texto } });
if (M.firebase.projectId) w('.firebaserc', { projects: { default: M.firebase.projectId } });
else console.log('ℹ firebase.projectId vazio: o site fica em MODO DEMONSTRAÇÃO.');
if (!M.site || M.site.includes('lume.pt')) console.warn('⚠ Muda "site" em marca.js para o endereço final: vai nos emails e nos links da área de cliente.');
for (const f of [M.hero.imagens.principal, M.hero.imagens.fundo, M.hero.imagens.frente, M.sobre.foto, ...M.portefolio.map(p => p.img)]) if (!fs.existsSync(path.join(raiz, 'public', f))) console.warn('⚠ imagem em falta:', f);
