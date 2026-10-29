import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createVideoServer} from '../server.mjs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('heritage/content.json',root),'utf8'));
const sandbox={};vm.runInNewContext(await readFile(new URL('web/heritage-core.js',root),'utf8'),sandbox);
const core=sandbox.DongHoHeritageCore;
test('new learning bank has 37 valid questions and ten distinct questions per attempt',()=>{
  assert.equal(data.questions.length,37);
  for(const q of data.questions){assert.equal(q.answers.length,4);assert.ok(q.correct>=0&&q.correct<4);assert.ok(q.why);}
  const question=core.sampleQuestions(data.questions,10,()=>0.25);
  assert.equal(question.length,10);assert.equal(new Set(question.map(q=>q.id)).size,10);
  for(const q of question){const original=data.questions.find(x=>x.id===q.id);assert.equal(q.answers[q.correct],original.answers[original.correct]);}
  assert.equal(core.scoreAssessment(question,question.map(q=>q.correct)).score,10);
  assert.equal(core.scoreAssessment(question,question.map(()=>null)).score,0);
  assert.equal(core.scoreAssessment(question,question.map(q=>(q.correct+1)%4)).wrong.length,10);
});
test('Vietnamese game answers accept accents, spaces and case without changing word meaning',()=>{
  assert.equal(core.normalizeAnswer('Giấy điệp'),core.normalizeAnswer('GIAY DIEP'));
  assert.notEqual(core.normalizeAnswer('giấy dó'),core.normalizeAnswer('giấy điệp'));
  assert.equal(data.games.crossword.length,10);assert.equal(data.games.guess.length,5);assert.equal(data.games.matching.length,6);
});
test('all embedded scripts compile and main app preserves dollar selectors',async()=>{
  const html=await readFile(new URL('Dongho.html',root),'utf8');
  for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(script[2]));
  const main=html.match(/<script id="dongho-app-script">([\s\S]*?)<\/script>/)[1];
  assert.equal(main,await readFile(new URL('web/app.js',root),'utf8'));
  const catalog=JSON.parse(html.match(/<script>window.DONGHO_CATALOG = ([\s\S]*?);<\/script>/)[1]);
  assert.equal(catalog.paintings.length,7);assert.ok(catalog.paintings.every(p=>!['mouse','fortune','hen'].includes(p.id)));
  for(const id of Object.keys(data.paintings))assert.ok(catalog.studios.some(s=>s.paintingId===id));
});
test('local learning assets are served while source files and traversal remain inaccessible',async t=>{
  const server=createVideoServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/heritage/images/image13.png');
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL('heritage/images/image13.png',root)));
  for(const route of ['/heritage/content.json','/heritage/images/../../.env','/heritage/images/%2e%2e/%2e%2e/.env','/web/app.js'])assert.equal((await fetch(base+route)).status,404);
});
