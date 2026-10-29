import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {externalizeCloudMedia} from '../scripts/cloud-media.mjs';

test('cloud HTML is small, media bytes remain exact, and SVG crops remain self-contained',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'dongho-cloud-media-'));
  assert.ok(path.isAbsolute(directory)&&path.dirname(directory)===path.resolve(tmpdir())&&path.basename(directory).startsWith('dongho-cloud-media-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const source=await readFile(new URL('../Dongho.html',import.meta.url),'utf8');
  const {html,mediaCount}=await externalizeCloudMedia(source,directory);
  assert.ok(Buffer.byteLength(html)<512*1024,'Cloud entry document must remain under 512 KiB');
  assert.ok(mediaCount>30);assert.ok(!/data:(?:image\/[^;]+|video\/mp4);base64,[A-Za-z0-9+/=]{100}/.test(html));
  for(const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(script[2]));
  const assets=JSON.parse(html.match(/<script>window\.__ASSETS=([\s\S]*?);<\/script>/)[1]);
  assert.deepEqual(await readFile(path.join(directory,assets['heritage/images/image13.png'])),await readFile(new URL('../heritage/images/image13.png',import.meta.url)));
  const crop=await readFile(path.join(directory,assets['generated/family-0.svg']),'utf8');
  assert.match(crop,/href="data:image\/png;base64,/);assert.ok(!crop.includes('href="/media/'));
  assert.ok(html.includes('lesson-history.mp3'));assert.ok(html.includes('heritageWelcomeTitle'));
});

test('reference images support own cloud media and reject foreign or non-image endpoints',async()=>{
  const source=await readFile(new URL('../web/story-ai.js',import.meta.url),'utf8');
  const helper=source.match(/function isPaintingSource\(source\) \{[\s\S]*?\n  \}/)[0];
  const context=vm.createContext({URL,window:{location:{href:'https://tranhdongho.vercel.app/',origin:'https://tranhdongho.vercel.app'}}});
  vm.runInContext(helper+';globalThis.valid=isPaintingSource;',context);
  for(const value of ['data:image/png;base64,abc','/media/source.png','https://tranhdongho.vercel.app/media/source.jpg'])assert.equal(context.valid(value),true);
  for(const value of [null,'https://evil.example/media/source.png','//evil.example/media/a.png','/api/video/config','javascript:alert(1)'])assert.equal(context.valid(value),false);
});
