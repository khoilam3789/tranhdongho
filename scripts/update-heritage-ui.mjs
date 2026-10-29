import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(path.join(root,file),'utf8');
let html=await read('Dongho.html');
const content=JSON.parse(await read('heritage/content.json'));
const catalog=JSON.parse(await read('web/catalog-base.json'));
catalog.paintings=catalog.paintings.filter(item=>!['mouse','fortune','hen'].includes(item.id));
const embedded={};
const objectMasks=JSON.parse(await read('heritage/object-masks.json'));
const maskRuntime=await read('web/heritage-masks.js');
for(const kit of Object.values(objectMasks)){if(kit.backgroundSource)embedded[kit.backgroundSource]='data:image/png;base64,'+(await readFile(path.join(root,kit.backgroundSource))).toString('base64');}
for(const [id,item]of Object.entries(content.paintings)){
  const painting=catalog.paintings.find(p=>p.id===id);if(!painting)throw new Error('Unknown painting '+id);
  Object.assign(painting,{name:item.name,img:item.image,summary:item.summary,symbols:item.symbols,source:'Ảnh và nội dung theo bộ học liệu do nhóm cung cấp.',note:'Đọc hình tượng theo bản tranh tham chiếu; một số chi tiết có thể khác giữa các dị bản.'});
  for(const image of [item.image,...item.symbols.map(s=>s.img).filter(Boolean)]){
    const ext=path.extname(image).slice(1),type=ext==='jpg'?'jpeg':ext;
    embedded[image]=`data:image/${type};base64,`+(await readFile(path.join(root,image))).toString('base64');
  }
}
catalog.studios.push({id:'teacher',title:'Thầy đồ cóc',paintingId:'teacher',background:null,complete:true},{id:'roosterfamily',title:'Thư hùng – Gia đình gà',paintingId:'roosterfamily',background:null,complete:true});
const teacher=[['Thầy đồ cóc','image14.png',26],['Học trò xách ấm','image15.png',17],['Nhóm học trò đọc sách','image17.png',24],['Nhóm học trò bị phạt','image18.png',29],['Học trò nhỏ','image19.png',17]];
teacher.forEach(([name,file,width],index)=>{
  const img='heritage/images/'+file;catalog.pieces.push({id:'teacher_'+(index+1),name,img,width,painting:'teacher',desc:'Hình tượng được trích từ học liệu Thầy đồ cóc. Đối chiếu hình chuẩn để tự căn vị trí.'});
});
for(let row=0;row<2;row++)for(let col=0;col<3;col++){
  const index=row*3+col;
  catalog.pieces.push({id:'roosterfamily_'+(index+1),name:`Mảnh ${row?'dưới':'trên'} ${['trái','giữa','phải'][col]}`,img:`generated/family-${index}.svg`,width:29.63,painting:'roosterfamily',desc:'Mảnh nguyên bản của tranh Thư hùng. Tự xếp các mảnh để tái hiện toàn bộ bố cục.',svgCrop:{source:content.paintings.roosterfamily.image,width:894,height:670,x:col*298,y:row*335,w:298,h:335}});
}

for(const piece of catalog.pieces)if(['teacher','roosterfamily'].includes(piece.painting))piece.legacyOnly=true;
for(const [id,kit]of Object.entries(objectMasks)){
 const studio=catalog.studios.find(s=>s.id===id);studio.background='generated/'+id+'-background.svg';studio.structuralBackground=!!kit.backgroundSource;
 kit.objects.forEach((object,index)=>{
  const xs=[object.points,...(object.extras||[])].flat().map(p=>p[0]),ys=[object.points,...(object.extras||[])].flat().map(p=>p[1]),x=Math.max(0,Math.min(...xs)-2),y=Math.max(0,Math.min(...ys)-2),w=Math.min(kit.width,Math.max(...xs)+2)-x,h=Math.min(kit.height,Math.max(...ys)+2)-y,fitX=Math.min(1,kit.width/kit.height/1.5),fitY=Math.min(1,1.5/(kit.width/kit.height));
  catalog.pieces.push({id:id+'_object_'+index,name:object.name,img:'generated/'+id+'-object-'+index+'.svg',width:w/kit.width*fitX*100,painting:id,desc:'Phần hình tượng nhìn thấy trong tranh gốc, tách bằng mặt nạ SVG, không vẽ bù phần bị che.',target:{x:50+((x+w/2)/kit.width-.5)*fitX*100,y:50+((y+h/2)/kit.height-.5)*fitY*100}});
 });
}
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const catalogScript=scripts.find(match=>/^\s*window\.DONGHO_CATALOG\s*=/.test(match[2]));
if(!catalogScript)throw new Error('Missing catalogue');
html=html.replace(catalogScript[0],()=>'<script>window.DONGHO_CATALOG = '+JSON.stringify(catalog).replace(/</g,'\\u003c')+';</script>');
function script(id,source){return `<script id="${id}">${source.replace(/<\/script/gi,'<\\/script')}</script>`;}
function stripId(id){html=html.replace(new RegExp(`<script id="${id}">[\\s\\S]*?<\\/script>`,'g'),'');}
stripId('heritage-data');stripId('heritage-core');stripId('heritage-ui');
const dataScript=script('heritage-data',`window.HERITAGE_REQUIREMENTS=${JSON.stringify(content).replace(/</g,'\\u003c')};Object.assign(window.__ASSETS,${JSON.stringify(embedded)});for(const piece of window.DONGHO_CATALOG.pieces){if(!piece.svgCrop)continue;const b=piece.svgCrop;const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+b.w+'" height="'+b.h+'" viewBox="'+b.x+' '+b.y+' '+b.w+' '+b.h+'"><image width="'+b.width+'" height="'+b.height+'" href="'+window.__ASSETS[b.source]+'"/></svg>';window.__ASSETS[piece.img]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}`);
const appScript=scripts.find(match=>match[1].includes('id="dongho-app-script"')||match[2].includes('const paintings=window.DONGHO_CATALOG.paintings;'));
if(!appScript)throw new Error('Missing main application script');
const objectBootstrap=script('object-mask-data',maskRuntime+';window.DongHoObjectMasks.populate(window.__ASSETS,'+JSON.stringify(objectMasks)+');');
stripId('object-mask-data');
const mainBundle=dataScript+objectBootstrap+script('heritage-core',await read('web/heritage-core.js'))+script('dongho-app-script',await read('web/app.js'));
html=html.replace(appScript[0],()=>mainBundle);
const css='<style id="heritage-ui-style">'+await read('web/heritage-ui.css')+'</style>';
if(html.includes('<style id="heritage-ui-style">'))html=html.replace(/<style id="heritage-ui-style">[\s\S]*?<\/style>/,css);else html=html.replace('</head>',css+'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&amp;display=swap" rel="stylesheet"></head>');
if(!html.includes('id="view-games"')){
 const navAt=html.lastIndexOf('<button',html.indexOf('data-view="assessment"'));
 if(navAt<0)throw new Error('Missing assessment navigation');
 html=html.slice(0,navAt)+'<button class="nav-link" data-view="games"><span data-icon="puzzle"></span><span>Trò chơi di sản</span></button>'+html.slice(navAt);
 html=html.replace('</main>',`<section id="view-games" class="view" hidden aria-labelledby="gamesTitle"><div class="page-heading"><span class="eyebrow">VỪA CHƠI · VỪA HIỂU</span><h1 id="gamesTitle">Chơi cùng di sản Đông Hồ</h1><p>Khám phá từ khóa, nhận diện tranh và nối những điều em vừa học.</p></div><div class="heritage-game-tabs" role="tablist" aria-label="Ba trò chơi di sản"><button type="button" role="tab" data-learning-game="crossword" aria-selected="true" class="active">Giải mã ô chữ</button><button type="button" role="tab" data-learning-game="guess" aria-selected="false">Nhìn tranh đoán tên</button><button type="button" role="tab" data-learning-game="matching" aria-selected="false">Nối hình với chữ</button></div><div id="crosswordGame" class="learning-game" role="tabpanel"></div><div id="guessPaintingGame" class="learning-game" role="tabpanel" hidden></div><div id="matchingGame" class="learning-game" role="tabpanel" hidden></div></section></main>`);
}
if(!html.includes('id="paintingReading"'))html=html.replace('<p id="interpretationSummary"', '<div id="paintingReading"></div><p id="interpretationSummary"');
if(!html.includes('id="checkCompositionBtn"'))html=html.replace('<div class="canvas-next">','<div class="composition-check"><button id="checkCompositionBtn" type="button" class="button button-outline-dark" aria-pressed="false">Kiểm tra · Hiện hình chuẩn</button><p id="compositionCheckHint"></p></div><div class="canvas-next">');
if(!html.includes('id="newAssessmentBtn"'))html=html.replace('<form id="assessmentForm">','<div class="new-assessment-controls"><p>10 câu ngẫu nhiên từ ngân hàng 37 câu mới.</p><button type="button" id="newAssessmentBtn" class="button button-neutral">Lấy 10 câu hỏi mới</button></div><form id="assessmentForm">');
html=html.replace('Bài kiểm tra gồm 5 câu hỏi','Bài ôn tập gồm 10 câu hỏi ngẫu nhiên');
html=html.replace(/<h1 id="homeTitle">([\s\S]*?)<\/h1>/,'<h2 id="homeTitle">$1</h2>').replace('Tài liệu chưa kèm tệp video giới thiệu. Anh/chị có thể chọn video từ máy để xem thử tại đây.','Video giới thiệu sẽ được bổ sung. Em có thể chọn video có sẵn trên thiết bị để xem thử.');
html=html.replace('05 câu hỏi minh họa','10 câu hỏi ngẫu nhiên').replace(/> \d+ tác phẩm<\/span>/,`> ${catalog.paintings.length} tác phẩm</span>`);
html=html.replace(/<strong>\d+<\/strong><span>tác phẩm khám phá<\/span>/,`<strong>${catalog.paintings.length}</strong><span>tác phẩm khám phá</span>`).replace(/<strong>\d+<\/strong><span>mảnh ghép từ tư liệu<\/span>/,`<strong>${catalog.pieces.filter(p=>!p.legacyOnly).length}</strong><span>mảnh ghép từ tư liệu</span>`);
html=html.replace('<strong>2 chế độ</strong><span>2D tại máy · video AI</span>','<strong>3 trò chơi</strong><span>Học qua trải nghiệm</span>').replace('2D ngoại tuyến · AI trực tuyến','Học di sản · Kể chuyện bằng AI');
html=html.replace(/<p class="demo-story-note">[\s\S]*?<\/p>/,'<p class="demo-story-note">Viết lời kể rồi tạo video AI dựa trên tranh gốc. Giữ nguyên nét vẽ, màu sắc và bố cục của tranh Đông Hồ.</p>');
html=html.replace('2D trên máy · AI qua API','Video AI · Giữ nguyên tranh gốc').replace('Biến câu chuyện của em thành hoạt ảnh hoặc một thước phim AI.','Tạo video AI chuyển động nhẹ từ tranh gốc và lời kể của em.');
html=html.replace('Phần bài học luôn có sẵn khi không có mạng.','Bài học có nội dung chữ, hình ảnh và bản đọc tiếng Việt.').replace('Ảnh tư liệu từ tài liệu của nhóm nghiên cứu · Bấm số trên hình để đọc ý nghĩa','Ảnh tư liệu từ học liệu · Chọn hình tượng trong phần chú giải để đọc thêm');
if(!html.includes('id="heritageIntroDialog"'))html=html.replace('</body>','<dialog id="heritageIntroDialog" class="intro-video-dialog"><div class="intro-dialog-heading"><h2>Video giới thiệu tranh Đông Hồ</h2><button id="closeHeritageIntro" type="button" class="button button-neutral">Đóng</button></div><p id="introVideoStatus">Tài liệu chưa kèm tệp video giới thiệu. Anh/chị có thể chọn video từ máy để xem thử tại đây.</p><label>Chọn video giới thiệu<input id="heritageIntroFile" type="file" accept="video/*"></label><video id="heritageIntroVideo" controls playsinline preload="metadata" hidden></video></dialog></body>');
const uiBundle=script('heritage-ui',await read('web/heritage-ui.js'))+'</body>';
html=html.replace('</body>',()=>uiBundle);
await writeFile(path.join(root,'Dongho.html'),html);
console.log('Embedded updated learning content, games, assessment and original artwork.');
