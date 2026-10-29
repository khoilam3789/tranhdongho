import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context={};vm.runInNewContext(await readFile(new URL('../web/heritage-core.js',import.meta.url),'utf8'),context);
const grid={rows:3,cols:3,fitX:1,fitY:433*1.5/650};
test('grid snapping swaps pieces without gaps or overlaps, including edge movement',()=>{
 const slots=context.DongHoGrid.slots(grid),placed=slots.map((s,i)=>({key:i,...s,scale:100,angle:0}));
 const a=placed[0],b=placed[1],old={x:a.x,y:a.y};context.DongHoGrid.move(grid,placed,a,b.x+2,b.y-1);
 assert.equal(a.x,slots[1].x);assert.equal(b.x,old.x);assert.equal(b.y,old.y);
 context.DongHoGrid.move(grid,placed,b,-100,-100);assert.equal(b.x,slots[0].x);assert.equal(b.y,slots[0].y);
 assert.equal(new Set(placed.map(p=>p.x+':'+p.y)).size,9);
});
test('pig nine crops cover the unmodified full source exactly and retain old project IDs',async()=>{
 const html=await readFile(new URL('../Dongho.html',import.meta.url),'utf8'),catalog=JSON.parse(html.match(/window\.DONGHO_CATALOG\s*=\s*([\s\S]*?);<\/script>/)[1]);
 const original=JSON.parse(await readFile(new URL('../web/catalog-base.json',import.meta.url),'utf8'));
 const painting=catalog.paintings.find(p=>p.id==='pig');assert.equal(painting.img,original.paintings.find(p=>p.id==='pig').img);
 const tiles=catalog.pieces.filter(p=>p.painting==='pig'&&!p.legacyOnly);assert.equal(tiles.length,9);
 for(const legacy of original.pieces.filter(p=>p.painting==='pig'))assert.equal(catalog.pieces.find(p=>p.id===legacy.id).legacyOnly,true);
 let area=0;tiles.forEach((tile,i)=>{const b=tile.svgCrop;assert.equal(b.source,painting.img);assert.equal(b.x,i%3*650/3);assert.equal(b.y,Math.floor(i/3)*433/3);assert.equal(b.w,650/3);assert.equal(b.h,433/3);area+=b.w*b.h;const slot=context.DongHoGrid.slots(catalog.studios.find(s=>s.id==='pig').grid)[i];assert.equal(tile.target.x,slot.x);assert.equal(tile.target.y,slot.y);});
 assert.ok(Math.abs(area-650*433)<1e-8);
});
