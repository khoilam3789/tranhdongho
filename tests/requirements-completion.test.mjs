
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('heritage/content.json',root),'utf8'));
const masks=JSON.parse(await readFile(new URL('heritage/object-masks.json',root),'utf8'));
test('clean learning text and labeled illustration intro',async()=>{
 for(const item of [...data.lessons,...Object.values(data.paintings)])for(const text of item.paragraphs)assert.doesNotMatch(text,/^(Đoạn 5 màu sắc|Phần em có biết thì có thêm|Ý nghĩa bức tranh:|Ý nghĩa từng đối tượng:)/);
 assert.equal(data.introVideo.kind,'illustration');
 const video=await readFile(new URL(data.introVideo.src,root));assert.equal(video.subarray(4,8).toString(),'ftyp');assert.ok(video.length>100000);
});
test('semantic masks preserve source pixels and align with their original background',async()=>{
 const sandbox={};vm.runInNewContext(await readFile(new URL('web/heritage-masks.js',root),'utf8'),sandbox);
 const assets={};for(const kit of Object.values(masks))for(const source of [kit.source,kit.backgroundSource].filter(Boolean))assets[source]='data:image/png;base64,'+(await readFile(new URL(source,root))).toString('base64');
 sandbox.DongHoObjectMasks.populate(assets,masks);
 assert.equal(masks.teacher.objects.length,12);assert.equal(masks.roosterfamily.objects.length,10);
 for(const [id,kit]of Object.entries(masks)){
  kit.objects.forEach((object,index)=>{
   assert.ok(object.points.length>8);
   for(const [x,y]of object.points){assert.ok(x>=0&&x<=kit.width);assert.ok(y>=0&&y<=kit.height);}
   const box=sandbox.DongHoObjectMasks.geometry(kit,object);assert.ok(box.width>0&&box.width<100);assert.ok(box.targetX>0&&box.targetX<100);assert.ok(box.targetY>0&&box.targetY<100);
   const svg=decodeURIComponent(assets['generated/'+id+'-object-'+index+'.svg'].split(',').slice(1).join(','));
   assert.ok(svg.includes(assets[kit.source]));assert.match(svg,/<mask/);assert.match(svg,/<polygon/);
  });
  assert.ok(assets['generated/'+id+'-background.svg']);if(kit.backgroundSource)assert.ok(decodeURIComponent(assets['generated/'+id+'-background.svg']).includes(assets[kit.backgroundSource]));
 }
});
test('new shelves retain legacy IDs but show semantic objects',async()=>{
 const html=await readFile(new URL('Dongho.html',root),'utf8');
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].find(x=>x[1].startsWith('window.DONGHO_CATALOG = '))[1];
 const catalog=JSON.parse(script.slice(script.indexOf('=')+1).trim().replace(/;$/,''));
 for(const id of ['teacher','roosterfamily']){
  assert.equal(catalog.pieces.filter(p=>p.painting===id&&!p.legacyOnly).length,masks[id].objects.length);
  assert.ok(catalog.pieces.some(p=>p.painting===id&&p.legacyOnly));
  assert.equal(catalog.studios.find(s=>s.id===id).background,'generated/'+id+'-background.svg');
 }
});
