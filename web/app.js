(() => {
'use strict';
const SVG = {
'house':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
'images':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
'shapes':'<rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="17" cy="7" r="4"/><path d="m7 14 6 8H1l6-8Zm9 8h7l-3.5-6z"/>',
'clapperboard':'<path d="M4 11h16v10H4zM4 11 2 6l18-4 2 5-18 4Zm5-7 3 5m3-6 3 5"/>',
'clipboard-check':'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 14l2 2 4-4"/>',
'rotate-ccw':'<path d="M3 11a9 9 0 1 0 3-6.7L3 7m0-4v4h4"/>',
'chevron-right':'<path d="m9 18 6-6-6-6"/>',
'circle-help':'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.2-2.5 4m0 4h.01"/>',
'arrow-up-right':'<path d="M6 18 18 6M8 6h10v10"/>',
'arrow-right':'<path d="M4 12h16m-7-7 7 7-7 7"/>',
'sparkles':'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Zm7 13 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>',
'puzzle':'<path d="M13 4h-2a2.5 2.5 0 1 0-5 0H4v6h2a2.5 2.5 0 1 1 0 5H4v5h6v-2a2.5 2.5 0 1 1 5 0v2h5v-6h-2a2.5 2.5 0 1 1 0-5h2V4h-5"/>',
'shield-check':'<path d="m12 2 9 4v5c0 5-3.3 8.3-9 11-5.7-2.7-9-6-9-11V6zM8 12l3 3 5-6"/>',
'check-circle-2':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
'search':'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
'play-circle':'<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>',
'info':'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.01"/>',
'book-open':'<path d="M12 6a8 8 0 0 0-9-2v15a8 8 0 0 1 9 2 8 8 0 0 1 9-2V4a8 8 0 0 0-9 2Zm0 0v15"/>',
'book-open-check':'<path d="M12 6a8 8 0 0 0-9-2v15a8 8 0 0 1 9 2 8 8 0 0 1 9-2V4a8 8 0 0 0-9 2Zm0 0v15m3-9 2 2 3-4"/>',
'lightbulb':'<path d="M9 18h6m-5 4h4M8 15c-2-1.5-3-3.5-3-6a7 7 0 1 1 14 0c0 2.5-1 4.5-3 6l-1 3H9z"/>',
'mouse-pointer-2':'<path d="m5 3 14 9-7 1-3 7-4-17Zm7 10 4 7"/>',
'mouse-pointer-click':'<path d="m6 5 13 8-7 1-3 7-3-16ZM4 2v2m-2 2h2m4-4V1"/>',
'copy':'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
'layers':'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
'trash-2':'<path d="M3 6h18m-2 0-1 15H6L5 6m3 0V3h8v3M10 10v7m4-7v7"/>',
'undo-2':'<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-2"/>',
'redo-2':'<path d="m15 14 5-5-5-5m5 5H10a6 6 0 0 0 0 12h2"/>',
'palette':'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 2-3 2 2 0 0 1 2-3h1a2 2 0 0 0 2-2V12a9 9 0 0 0-9-9Z"/><circle cx="7" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="17" cy="11" r="1"/>',
'download':'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
'file-down':'<path d="M6 3h9l5 5v13H6zM15 3v6h5M12 11v7m-3-3 3 3 3-3"/>',
'film':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18m10-18v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
'play':'<path d="m8 5 12 7-12 7z"/>',
'graduation-cap':'<path d="m2 9 10-5 10 5-10 5zM6 11v6c4 3 8 3 12 0v-6M22 9v7"/>',
'lock-keyhole':'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/>',
'wand-sparkles':'<path d="m4 20 15-15 2 2L6 22zM4 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1zm13 9 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
'x':'<path d="M5 5 19 19M19 5 5 19"/>',
'check':'<path d="m4 12 5 5L20 6"/>'};
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SVG[name]||SVG.info}</svg>`;
function applyIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);el.removeAttribute('data-icon');});}
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const assets=p=>(window.__ASSETS&&window.__ASSETS[p])||p;
const paintings=window.DONGHO_CATALOG.paintings;
const pieces=window.DONGHO_CATALOG.pieces;
const studios=window.DONGHO_CATALOG.studios;
let questions=window.DongHoHeritageCore.sampleQuestions(window.HERITAGE_REQUIREMENTS.questions,10);
const themeTemplates={family:'Một gia đình cùng chăm sóc nhau qua những ngày bận rộn. Từng thành viên đóng góp công sức và sẻ chia niềm vui. Từ hình tượng trong tranh, em kể một câu chuyện mới về tình thân và sự gắn bó.',heritage:'Một bạn nhỏ bước vào xưởng tranh, gặp nghệ nhân và quan sát từng bản khắc. Bạn nhận ra mỗi bức tranh lưu giữ cả kỹ năng, vật liệu và kinh nghiệm nhiều thế hệ. Câu chuyện này do em sáng tạo từ cảm hứng di sản.',kindness:'Các nhân vật trong bức tranh cùng nhau vượt qua một thử thách. Thay vì chỉ lo cho bản thân, họ biết quan tâm và giúp đỡ lẫn nhau. Em muốn gửi gắm lời nhắn rằng lòng tốt bắt đầu từ việc nhỏ.',future:'Hôm nay em tìm hiểu một bức tranh xưa, ngày mai em sẽ kể lại cho người khác. Không chỉ hình ảnh, em muốn giới thiệu cả đôi bàn tay và tâm huyết của những người làm nghề tranh. Mỗi câu chuyện đúng đắn là một cách nối dài di sản.'};
const DEFAULT_STORY='Một ngày, những hình tượng từ bức tranh Lợn đàn bước vào câu chuyện do em tưởng tượng. Cả gia đình cùng nhau chăm sóc khu vườn, chia sẻ công việc và niềm vui. Khi tìm hiểu nghề làm tranh Đông Hồ, em hiểu rằng di sản không chỉ là bức tranh đẹp mà còn là tri thức và bàn tay của người nghệ nhân. Em muốn kể lại điều ấy cho bạn bè và người thân.';
const STORE='dongho.lab.pro.v1';
let state={paintingId:'pig',studioId:'pig',placed:[],selected:null,bg:0,storyTitle:'Chuyện kể từ bức tranh Đông Hồ',storyTheme:'family',storyText:DEFAULT_STORY,logs:[],quiz:null,idCounter:0};
let undo=[],redo=[],currentView='home',movieRunning=false,recorderRunning=false,renderToken=0,savingTimer=null;
const imgCache={};for(const d of [...paintings.map(x=>x.img),...pieces.map(x=>x.img),...studios.map(x=>x.background).filter(Boolean)]){Object.defineProperty(imgCache,d,{configurable:true,get(){const im=new Image();im.src=assets(d);Object.defineProperty(imgCache,d,{value:im,configurable:true});return im;}});}
function alertToast(s){const el=$('#toast');el.textContent=s;el.classList.add('visible');clearTimeout(alertToast.t);alertToast.t=setTimeout(()=>el.classList.remove('visible'),3200);}
function safeState(){return {paintingId:state.paintingId,studioId:state.studioId,placed:state.placed,selected:state.selected,bg:state.bg,storyTitle:state.storyTitle,storyTheme:state.storyTheme,storyText:state.storyText,logs:state.logs.slice(-350),quiz:state.quiz,quizVersion:2,idCounter:state.idCounter};}
function persist(){clearTimeout(savingTimer);$('#saveStatus').textContent='Đang lưu…';savingTimer=setTimeout(()=>{try{localStorage.setItem(STORE,JSON.stringify(safeState()));$('#saveStatus').textContent='Đã lưu trên thiết bị';}catch(e){$('#saveStatus').textContent='Chế độ không lưu';}},170);}
function restore(){try{let s=JSON.parse(localStorage.getItem(STORE)||'null');if(!s)return;if(s.paintingId==='hen')s.paintingId='flock';if(!paintings.some(p=>p.id===s.paintingId))s.paintingId='pig';if(s.quizVersion!==2)s.quiz=null;if(Array.isArray(s.placed)&&s.placed.length<120&&s.placed.every(p=>p&&pieces.some(x=>x.id===p.key)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.scale)&&Number.isFinite(p.angle)&&Number.isInteger(p.id))&&paintings.some(p=>p.id===s.paintingId)&&Number.isInteger(s.bg)&&s.bg>=0&&s.bg<=3&&typeof s.storyText==='string'&&typeof s.storyTitle==='string'&&['family','heritage','kindness','future'].includes(s.storyTheme)){state={...state,paintingId:s.paintingId,studioId:studios.some(z=>z.id===s.studioId)?s.studioId:(s.placed.length?pieces.find(z=>z.id===s.placed[0].key)?.painting||'pig':'pig'),placed:s.placed,bg:s.bg,storyTitle:s.storyTitle.slice(0,90),storyTheme:s.storyTheme,storyText:s.storyText.slice(0,1600),logs:Array.isArray(s.logs)?s.logs.filter(x=>x&&typeof x.event==='string'&&typeof x.at==='string').slice(-350):[],quiz:Number.isInteger(s.quiz)&&s.quiz>=0&&s.quiz<=10?s.quiz:null,idCounter:Number.isInteger(s.idCounter)?s.idCounter:Math.max(0,...s.placed.map(x=>x.id)),selected:null};} }catch(e){}}
function logEvent(type,detail=''){state.logs.push({event:type,detail:String(detail),at:new Date().toISOString()});if(state.logs.length>350)state.logs.shift();metrics();persist();}
function metrics(){$('#piecesBadge').textContent=`${state.placed.length} mảnh ghép`;$('#pieceTotal').textContent=`${state.placed.length} hình`;$('#loggedActions').textContent=state.logs.length;$('#countPlaced').textContent=state.placed.length;$('#quizScoreDisplay').textContent=state.quiz===null?'—':`${state.quiz}/${questions.length}`;}
function navigate(view){if(recorderRunning){alertToast('Đang xuất hoạt ảnh. Hãy chờ xuất xong rồi chuyển trang.');return;}if(!$('#view-'+view))return;stopMoviePreview();currentView=view;$$('.view').forEach(v=>{v.hidden=v.id!==`view-${view}`;v.classList.toggle('shown',!v.hidden);});$$('.nav-link').forEach(n=>{const is=n.dataset.view===view;n.classList.toggle('active',is);n.setAttribute('aria-current',is?'page':'false');});$('#breadcrumbCurrent').textContent=({home:'Tổng quan',library:'Khám phá di sản',studio:'Xưởng sáng tạo',story:'Kể chuyện & video',assessment:'Đánh giá học tập',games:'Trò chơi di sản'})[view];if(view==='story'){renderMovie(0);window.donghoAI?.activate?.();}window.donghoHeritage?.pauseMedia?.();if(view==='studio')updateStudioShelf();window.scrollTo({top:0,behavior:'auto'});const heading=$('#view-'+view+' h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
function initNavigation(){$$('.nav-link').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));$$('[data-target]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.target)));$('#startExploreBtn').onclick=()=>navigate('library');$('#startStudioBtn').onclick=()=>navigate('studio');$('#goComposeFromLibrary').onclick=openStudioFromLibrary;$('#goStoryFromStudio').onclick=()=>navigate('story');$('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelpBtn').onclick=$('#gotHelpBtn').onclick=()=>$('#helpDialog').close();$('#helpDialog').addEventListener('click',e=>{if(e.target===$('#helpDialog'))$('#helpDialog').close();});$('#exportProjectBtn').onclick=()=>{const obj={application:'DongHo Lab',schemaVersion:1,exportedAt:new Date().toISOString(),project:safeState()};saveBlob(new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'}),'dong-ho-lab-du-an.json');logEvent('export_project');alertToast('Đã xuất tệp dự án JSON.');};$('#importProjectBtn').onclick=()=>$('#projectFileInput').click();$('#projectFileInput').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>1024*1024){alertToast('Tệp dự án vượt quá 1 MB.');return;}try{const data=JSON.parse(await file.text());const proj=data.project;if(proj){if(proj.paintingId==='hen')proj.paintingId='flock';if(!paintings.some(p=>p.id===proj.paintingId))proj.paintingId='pig';}if(data.schemaVersion!==1||!proj||!Array.isArray(proj.placed)||proj.placed.length>120||!proj.placed.every(p=>pieces.some(x=>x.id===p.key)&&Number.isFinite(p.x)&&p.x>=-8&&p.x<=108&&Number.isFinite(p.y)&&p.y>=-8&&p.y<=108&&Number.isFinite(p.scale)&&p.scale>=45&&p.scale<=190&&Number.isFinite(p.angle)&&p.angle>=-90&&p.angle<=90&&Number.isInteger(p.id)&&p.id>=1&&p.id<=1000000)||!paintings.some(x=>x.id===proj.paintingId)||!Number.isInteger(proj.bg)||proj.bg<0||proj.bg>3||!['family','heritage','kindness','future'].includes(proj.storyTheme)||typeof proj.storyText!=='string'||proj.storyText.length>1600||typeof proj.storyTitle!=='string'||proj.storyTitle.length>90){throw new Error('Tệp JSON không đúng định dạng dự án.');}if(!confirm('Mở dự án này sẽ thay thế bản đang lưu trên thiết bị. Tiếp tục?'))return;state={...state,paintingId:proj.paintingId,studioId:studios.some(z=>z.id===proj.studioId)?proj.studioId:(proj.placed.length?pieces.find(z=>z.id===proj.placed[0].key)?.painting||'pig':'pig'),placed:proj.placed.map(p=>({id:p.id,key:p.key,x:p.x,y:p.y,scale:p.scale,angle:p.angle,z:Number.isInteger(p.z)?Math.max(0,Math.min(1000,p.z)):p.id})),bg:proj.bg,storyTitle:proj.storyTitle,storyTheme:proj.storyTheme,storyText:proj.storyText,logs:Array.isArray(proj.logs)?proj.logs.filter(x=>x&&typeof x.event==='string'&&typeof x.at==='string').slice(-350).map(x=>({event:x.event.slice(0,80),at:x.at.slice(0,40),detail:String(x.detail||'').slice(0,150)})):[],quiz:proj.quizVersion===2&&Number.isInteger(proj.quiz)&&proj.quiz>=0&&proj.quiz<=10?proj.quiz:null,idCounter:Math.max(0,...proj.placed.map(x=>x.id)),selected:null};undo=[];redo=[];renderAll();persist();logEvent('import_project');alertToast('Đã mở lại dự án từ tệp JSON.');}catch(err){alertToast('Không thể nhập dự án: '+err.message);}});$('#resetAllBtn').onclick=()=>{if(!confirm('Bắt đầu dự án mới? Tranh, câu chuyện và nhật ký hiện tại trên thiết bị này sẽ bị xoá.'))return;localStorage.removeItem(STORE);state={paintingId:'pig',studioId:'pig',placed:[],selected:null,bg:0,storyTitle:'Chuyện kể từ bức tranh Đông Hồ',storyTheme:'family',storyText:DEFAULT_STORY,logs:[],quiz:null,idCounter:0};undo=[];redo=[];renderAll();navigate('home');logEvent('new_project');alertToast('Đã khởi tạo dự án mới.');};}
let activeSymbol=0;
function studioForPainting(id){return studios.find(q=>q.paintingId===id)?.id||null;}
function switchStudio(id){
 const target=studios.find(z=>z.id===id);if(!target)return false;
 if(state.studioId!==id){if(state.placed.length&&!confirm('Đổi bộ tranh sẽ làm trống bố cục hiện tại. Em nên xuất PNG/JSON để lưu lại. Tiếp tục?')){const sel=$('#studioPaintingSelect');if(sel)sel.value=state.studioId;return false;}
 state.studioId=id;state.placed=[];state.selected=null;state.bg=0;undo=[];redo=[];
 if(target.paintingId)state.paintingId=target.paintingId;
 if(state.storyText===DEFAULT_STORY)state.storyText=`Em chọn tranh ${target.title} để tìm hiểu và tạo bố cục riêng. Em sẽ giới thiệu hình tượng nổi bật, sau đó kể một câu chuyện mới nhưng không nhầm sáng tác của mình với lời giải thích về di sản.`;
 }
 updateStudioShelf();renderStudio();library();storyUI();logEvent('switch_studio',id);return true;
}
function openStudioFromLibrary(){let studioId=studioForPainting(state.paintingId);if(studioId){if(switchStudio(studioId))navigate('studio');}else{navigate('studio');alertToast('Tranh này hiện có chú giải, chưa có bộ hình tách lớp để ghép.');}}
function focusSymbol(index){
 const p=paintings.find(q=>q.id===state.paintingId)||paintings[0];activeSymbol=index;
 document.querySelectorAll('[data-symbol-index]').forEach(el=>{const active=Number(el.dataset.symbolIndex)===index;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 const item=p.symbols[index];const focus=$('#symbolFocus');if(!item||!focus)return;
 focus.innerHTML=`<span class="eyebrow">CHI TIẾT ĐANG KHÁM PHÁ</span><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.desc)}</p>`;
}
function library(){
 const grid=$('#paintingGrid');grid.innerHTML=paintings.map(p=>`<button type="button" class="painting-card ${p.id===state.paintingId?'active':''}" data-pid="${p.id}" aria-pressed="${p.id===state.paintingId}"><img loading="lazy" src="${assets(p.img)}" alt="Tranh ${escapeHTML(p.name)}"/><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.subtitle)}</small></button>`).join('');
 grid.querySelectorAll('[data-pid]').forEach(b=>b.onclick=()=>{state.paintingId=b.dataset.pid;activeSymbol=0;library();logEvent('open_painting',b.dataset.pid);});
 const p=paintings.find(x=>x.id===state.paintingId)||paintings[0];$('#selectedPaintingName').textContent=p.name;$('#selectedPaintingTag').textContent=p.kind;$('#selectedPaintingImg').src=assets(p.img);$('#selectedPaintingImg').alt=`Hình tư liệu tham khảo tranh ${p.name}`;$('#interpretationTitle').textContent='Giải mã: '+p.name;$('#interpretationSummary').textContent=p.summary;
 $('#interpretationSymbols').innerHTML=p.symbols.map((obj,i)=>`<button type="button" class="symbol-item symbol-button" data-symbol-index="${i}" aria-pressed="false">${obj.img?`<img src="${assets(obj.img)}" alt="" loading="lazy"/>`:`<span class="symbol-index">${String(i+1).padStart(2,'0')}</span>`}<span><strong>${escapeHTML(obj.name)}</strong><small>Nhấn để xem giải thích</small></span>${icon('chevron-right')}</button>`).join('');
 const points=$('#imageHotspots');if(points)points.innerHTML=p.symbols.filter(o=>Number.isFinite(o.x)).map((o,i)=>`<button class="art-hotspot" data-symbol-index="${i}" style="left:${o.x}%;top:${o.y}%" type="button" aria-label="Tìm hiểu: ${escapeHTML(o.name)}">${i+1}</button>`).join('');
 $$('[data-symbol-index]').forEach(btn=>btn.onclick=()=>focusSymbol(Number(btn.dataset.symbolIndex)));
 const studioId=studioForPainting(p.id);$('#goComposeFromLibrary').innerHTML=studioId?`Thực hành ghép tranh này ${icon('arrow-right')}`:`Mở xưởng ghép đang có ${icon('arrow-right')}`;
 $('#selectedImageSource').textContent=`Nguồn: ${p.source}`;$('#researchNote').textContent=p.note;
 focusSymbol(0);window.donghoHeritage?.refreshPainting?.();
}

const clone=x=>JSON.parse(JSON.stringify(x));const snap=()=>JSON.stringify({placed:state.placed,bg:state.bg,idCounter:state.idCounter});
function checkpoint(){undo.push(snap());if(undo.length>45)undo.shift();redo=[];historyUI();}
function historyUI(){$('#undoBtn').disabled=!undo.length;$('#redoBtn').disabled=!redo.length;}
function restoreSnap(s){let o=JSON.parse(s);state.placed=o.placed;state.bg=o.bg;state.idCounter=o.idCounter;state.selected=null;renderStudio();persist();}
function doUndo(){if(!undo.length)return;redo.push(snap());restoreSnap(undo.pop());historyUI();logEvent('undo');}function doRedo(){if(!redo.length)return;undo.push(snap());restoreSnap(redo.pop());historyUI();logEvent('redo');}
function updateStudioShelf(){
 const studio=studios.find(q=>q.id===state.studioId)||studios[0];
 const sel=$('#studioPaintingSelect');if(sel){sel.innerHTML=studios.map(q=>`<option value="${q.id}">${escapeHTML(q.title)}</option>`).join('');sel.value=studio.id;}
 $('#pieceShelfTitle').textContent=`Hình tượng: ${studio.title}`;
 $('#studioSourceStatus').textContent=['teacher','roosterfamily'].includes(studio.id)?'Các hình tượng được tách từ ảnh gốc bằng mặt nạ SVG. Không vẽ bù phần bị che; tự căn theo hình chuẩn.':studio.complete?'Mảnh ảnh được chuẩn bị từ bộ tranh nhóm cung cấp; nền và mảnh có thể đã được phục dựng.':'Chưa đủ mảnh để phục dựng tranh hoàn chỉnh; có thể thực hành bố cục nhưng cần bổ sung hình người.';
 const grid=$('#piecesGrid');const items=pieces.filter(z=>z.painting===studio.id&&!z.legacyOnly);
 grid.innerHTML=items.map(p=>`<button type="button" draggable="true" class="piece-option" data-piece="${p.id}" title="${escapeHTML(p.desc)}"><img draggable="false" src="${assets(p.img)}" alt=""/><strong>${escapeHTML(p.name)}</strong></button>`).join('');
 grid.querySelectorAll('[data-piece]').forEach(btn=>{btn.addEventListener('click',()=>addPiece(btn.dataset.piece));btn.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',btn.dataset.piece);e.dataTransfer.effectAllowed='copy';});});
}
function studioInit(){
 $('#studioPaintingSelect').addEventListener('change',e=>switchStudio(e.target.value));
 updateStudioShelf();
 const stage=$('#workStage');stage.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/plain'))e.preventDefault();});stage.addEventListener('drop',e=>{e.preventDefault();let p=e.dataTransfer.getData('text/plain');if(pieces.some(q=>q.id===p&&q.painting===state.studioId)){let r=stage.getBoundingClientRect();addPiece(p,(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);}});stage.addEventListener('pointerdown',e=>{if(e.target===stage)select(null);});$('#undoBtn').onclick=doUndo;$('#redoBtn').onclick=doRedo;$('#duplicateBtn').onclick=()=>{let obj=state.placed.find(p=>p.id===state.selected);if(!obj)return;checkpoint();state.idCounter++;state.placed.push({...obj,id:state.idCounter,x:Math.min(94,obj.x+7),y:Math.min(94,obj.y+7),z:Math.max(0,...state.placed.map(p=>p.z))+1});state.selected=state.idCounter;renderStudio();logEvent('duplicate_piece',obj.key);};$('#toFrontBtn').onclick=()=>{let obj=state.placed.find(p=>p.id===state.selected);if(!obj)return;checkpoint();obj.z=Math.max(0,...state.placed.map(p=>p.z))+1;renderStudio();logEvent('front_piece',obj.key);};$('#deletePieceBtn').onclick=removePiece;$('#changeBgBtn').onclick=()=>{checkpoint();state.bg=(state.bg+1)%4;renderStudio();logEvent('background_change',state.bg);};$('#clearStageBtn').onclick=()=>{if(!state.placed.length)return;if(!confirm('Xóa toàn bộ mảnh ghép trong tranh?'))return;checkpoint();state.placed=[];state.selected=null;renderStudio();logEvent('clear_art');};$('#pieceScale').addEventListener('pointerdown',()=>{if(state.selected!==null)checkpoint();});$('#pieceRotate').addEventListener('pointerdown',()=>{if(state.selected!==null)checkpoint();});$('#pieceScale').addEventListener('input',e=>updateSelected('scale',Number(e.target.value)));$('#pieceRotate').addEventListener('input',e=>updateSelected('angle',Number(e.target.value)));$('#downloadArtBtn').onclick=downloadArt;document.addEventListener('keydown',e=>{const editable=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);if(!editable&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)doRedo();else doUndo();}if(currentView==='studio'&&!editable&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();removePiece();}});}
function addPiece(key,x=null,y=null){const base=pieces.find(p=>p.id===key&&p.painting===state.studioId);if(!base)return;checkpoint();state.idCounter++;const i=state.placed.length;state.placed.push({id:state.idCounter,key,x:x??(32+(i*17)%42),y:y??(35+(i*9)%31),scale:100,angle:0,z:state.idCounter});state.selected=state.idCounter;renderStudio();logEvent('add_piece',key);}
function removePiece(){if(state.selected===null)return;const piece=state.placed.find(p=>p.id===state.selected);if(!piece)return;checkpoint();state.placed=state.placed.filter(p=>p.id!==piece.id);state.selected=null;renderStudio();logEvent('remove_piece',piece.key);}
function updateSelected(key,value){const piece=state.placed.find(p=>p.id===state.selected);if(!piece)return;piece[key]=value;renderStudio(false);persist();}
function select(id){state.selected=id;updateInspector();$$('#workStage .placed-piece').forEach(el=>el.classList.toggle('selected',Number(el.dataset.id)===id));}
function updateInspector(){const p=state.placed.find(x=>x.id===state.selected);const ref=p?pieces.find(z=>z.id===p.key):null;$('#selectionLabel').innerHTML=p?`${icon('check-circle-2')} Đã chọn: ${escapeHTML(ref.name)}`:`${icon('mouse-pointer-2')} Chưa chọn hình tượng`;for(const x of ['pieceScale','pieceRotate','duplicateBtn','toFrontBtn','deletePieceBtn'])$('#'+x).disabled=!p;$('#pieceScale').value=p?.scale??100;$('#pieceRotate').value=p?.angle??0;$('#scaleLabel').textContent=`${p?.scale??100}%`;$('#rotateLabel').textContent=`${p?.angle??0}°`;$('#pieceInterpretation').textContent=ref?.desc||'Chọn một hình tượng để tìm hiểu thông tin và thực hành ghép tranh.';}
function positioning(p){const ref=pieces.find(x=>x.id===p.key);return `left:${p.x}%;top:${p.y}%;width:${ref.width*p.scale/100}%;transform:translate(-50%,-50%) rotate(${p.angle}deg);z-index:${p.z+2};`;}
function renderStudio(recreate=true){const stage=$('#workStage');const kit=studios.find(z=>z.id===state.studioId)||studios[0];stage.style.backgroundImage=(state.bg===0&&kit.background)?`url("${assets(kit.background)}")`:'';stage.style.backgroundPosition='center';stage.style.backgroundSize='contain';stage.style.backgroundRepeat='no-repeat';stage.classList.remove('bg-sage','bg-sky','bg-rose');if(state.bg)stage.classList.add(['','bg-sage','bg-sky','bg-rose'][state.bg]);if(recreate){stage.querySelectorAll('.placed-piece').forEach(el=>el.remove());for(const p of [...state.placed].sort((a,b)=>a.z-b.z)){const ref=pieces.find(q=>q.id===p.key);if(!ref)continue;const el=document.createElement('img');el.className='placed-piece'+(p.id===state.selected?' selected':'');el.src=assets(ref.img);el.alt=ref.name;el.setAttribute('role','button');el.setAttribute('aria-label',`Di chuyển hình ${ref.name}, phím mũi tên để căn chỉnh`);el.tabIndex=0;el.dataset.id=p.id;el.dataset.key=p.key;el.draggable=false;el.style.cssText=positioning(p);el.addEventListener('pointerdown',dragPiece);el.addEventListener('keydown',keyboardPiece);stage.appendChild(el);}}else{stage.querySelectorAll('.placed-piece').forEach(el=>{const p=state.placed.find(p=>p.id===Number(el.dataset.id));if(p)el.style.cssText=positioning(p);});}$('#emptyStage').hidden=state.placed.length>0;metrics();updateInspector();historyUI();persist();window.donghoHeritage?.refreshStudio?.();}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function dragPiece(e){if(e.button!==0)return;e.preventDefault();const id=Number(e.currentTarget.dataset.id),p=state.placed.find(x=>x.id===id);if(!p)return;select(id);const stage=$('#workStage'),r=stage.getBoundingClientRect(),start={x:p.x,y:p.y,clientX:e.clientX,clientY:e.clientY};const target=e.currentTarget;target.setPointerCapture(e.pointerId);let moved=false;const onMove=ev=>{if(ev.pointerId!==e.pointerId)return;const x=start.x+(ev.clientX-start.clientX)/r.width*100,y=start.y+(ev.clientY-start.clientY)/r.height*100;p.x=clamp(x,-8,108);p.y=clamp(y,-8,108);moved=moved||Math.abs(ev.clientX-start.clientX)+Math.abs(ev.clientY-start.clientY)>3;target.style.cssText=positioning(p);};const end=ev=>{if(ev.pointerId!==e.pointerId)return;target.removeEventListener('pointermove',onMove);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);if(moved){const atEnd={...p};p.x=start.x;p.y=start.y;checkpoint();p.x=atEnd.x;p.y=atEnd.y;logEvent('drag_piece',p.key);}persist();};target.addEventListener('pointermove',onMove);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);}
function keyboardPiece(e){const p=state.placed.find(x=>x.id===Number(e.currentTarget.dataset.id));if(!p)return;const dirs={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};if(!(e.key in dirs))return;e.preventDefault();checkpoint();select(p.id);p.x=clamp(p.x+dirs[e.key][0],-8,108);p.y=clamp(p.y+dirs[e.key][1],-8,108);e.currentTarget.style.cssText=positioning(p);logEvent('keyboard_move',p.key);}
function drawContain(ctx,im,w,h,pad=0){const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;if(!iw||!ih)return;const r=Math.min((w-pad*2)/iw,(h-pad*2)/ih),dw=iw*r,dh=ih*r;ctx.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);}
function composition(ctx,w,h){
 ctx.clearRect(0,0,w,h);ctx.fillStyle=['#f4e7d1','#dae6d4','#dce9e9','#f3ded4'][state.bg];ctx.fillRect(0,0,w,h);
 const kit=studios.find(z=>z.id===state.studioId);
 if(state.bg===0&&kit?.background){const im=imgCache[kit.background];if(im?.complete&&im.naturalWidth)drawContain(ctx,im,w,h,0);}else{ctx.globalAlpha=.055;ctx.strokeStyle='#6f745c';for(let y=0;y<h;y+=6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.globalAlpha=1;}
 for(const p of [...state.placed].sort((a,b)=>a.z-b.z)){const ref=pieces.find(x=>x.id===p.key),im=imgCache[ref?.img];if(!ref||!im?.complete||!im.naturalWidth)continue;let dw=w*(ref.width*p.scale/100)/100,dh=dw*im.naturalHeight/im.naturalWidth;ctx.save();ctx.translate(w*p.x/100,h*p.y/100);ctx.rotate(p.angle*Math.PI/180);ctx.drawImage(im,-dw/2,-dh/2,dw,dh);ctx.restore();}
 ctx.fillStyle='#365747aa';ctx.font=`700 ${Math.max(13,Math.round(w*.015))}px Segoe UI,Arial,sans-serif`;ctx.fillText('ĐÔNG HỒ LAB  ·  SẢN PHẨM HỌC TẬP TÁI SÁNG TẠO',w*.025,h*.965);
}

function saveBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function downloadArt(){if(!state.placed.length){alertToast('Hãy thêm ít nhất một mảnh ghép trước khi xuất tranh.');return;}const c=document.createElement('canvas');c.width=1500;c.height=1000;const kit=studios.find(s=>s.id===state.studioId);const imgs=[...state.placed.map(p=>imgCache[pieces.find(x=>x.id===p.key)?.img]),...(state.bg===0&&kit?.background?[imgCache[kit.background]]:[])];const go=()=>{composition(c.getContext('2d'),c.width,c.height);c.toBlob(blob=>{if(blob){saveBlob(blob,'dong-ho-lab-tranh-sang-tao.png');logEvent('export_png');alertToast('Đã tạo ảnh PNG. Kiểm tra mục Tải xuống.');}else alertToast('Không thể xuất PNG trên trình duyệt này.');},'image/png');};if(imgs.every(i=>i?.complete&&i.naturalWidth))go();else Promise.all(imgs.map(im=>im?.decode?.().catch(()=>{})||Promise.resolve())).then(go);}
let movieAnimationFrame = null;
let moviePreviewPreparing = false;
SVG.pause = '<path d="M8 5v14M16 5v14"/>';

function updatePreviewButton() {
 const button = $('#playPreviewBtn');
 if (!button) return;
 const position = Number($('#videoSeek').value) || 0;
 const label = moviePreviewPreparing ? 'Đang tải hình…' : movieRunning ? 'Tạm dừng' : position > 0 && position < 12 ? 'Tiếp tục' : 'Xem thử';
 button.innerHTML = icon(movieRunning ? 'pause' : 'play') + ' ' + label;
 button.setAttribute('aria-pressed', String(movieRunning));
 button.disabled = recorderRunning || moviePreviewPreparing;
}

function stopMoviePreview() {
 ++renderToken;
 if (movieAnimationFrame !== null) cancelAnimationFrame(movieAnimationFrame);
 movieAnimationFrame = null;
 movieRunning = false;
 moviePreviewPreparing = false;
 updatePreviewButton();
}

async function prepareMovieAssets() {
 const kit = studios.find(item => item.id === state.studioId);
 const required = [];
 if (state.placed.length) {
  for (const placed of state.placed) {
   const reference = pieces.find(item => item.id === placed.key);
   if (reference) required.push(imgCache[reference.img]);
  }
  if (state.bg === 0 && kit?.background && state.studioId !== 'procession') required.push(imgCache[kit.background]);
  if (state.studioId === 'procession') {
   required.push(motionHorse);
   if (state.bg === 0) required.push(motionProcessionBg);
  }
 } else {
  const painting = paintings.find(item => item.id === state.paintingId) || paintings[0];
  required.push(imgCache[painting.img]);
 }
 await Promise.all([...new Set(required)].map(image => new Promise((resolve, reject) => {
  if (!image) { reject(new Error('Không tìm thấy hình ảnh của tranh.')); return; }
  let settled = false;
  const finish = error => {
   if (settled) return;
   settled = true;
   clearTimeout(timer);
   image.removeEventListener('load', loaded);
   image.removeEventListener('error', failed);
   error ? reject(error) : resolve();
  };
  const loaded = () => image.naturalWidth ? finish() : failed();
  const failed = () => finish(new Error('Không tải được hình ảnh. Hãy mở lại trang rồi thử lại.'));
  const timer = setTimeout(() => finish(new Error('Tải hình ảnh quá lâu. Hãy thử lại.')), 15000);
  if (image.complete) {
   if (!image.naturalWidth) failed();
   else if (image.decode) image.decode().then(loaded).catch(failed);
   else loaded();
   return;
  }
  image.addEventListener('load', loaded, {once: true});
  image.addEventListener('error', failed, {once: true});
  if (image.decode) image.decode().then(loaded).catch(() => { if (image.complete) loaded(); });
 })));
 compositionCache.key = '';
}

async function toggleMoviePreview() {
 if (recorderRunning) return;
 if (movieRunning || moviePreviewPreparing) { stopMoviePreview(); return; }
 const token = ++renderToken;
 moviePreviewPreparing = true;
 updatePreviewButton();
 try {
  await prepareMovieAssets();
  if (token !== renderToken || recorderRunning || currentView !== 'story') return;
  if (document.hidden) { stopMoviePreview(); return; }
  moviePreviewPreparing = false;
  movieRunning = true;
  const seek = Number($('#videoSeek').value) || 0;
  const from = seek >= 12 ? 0 : seek;
  let started = null;
  updatePreviewButton();
  const frame = now => {
   if (token !== renderToken || !movieRunning || recorderRunning) return;
   if (started === null) started = now;
   const elapsed = Math.min(12, from + (now - started) / 1000);
   renderMovie(elapsed);
   if (elapsed < 12) movieAnimationFrame = requestAnimationFrame(frame);
   else stopMoviePreview();
  };
  movieAnimationFrame = requestAnimationFrame(frame);
  logEvent('preview_video');
 } catch (error) {
  if (token === renderToken) {
   stopMoviePreview();
   $('#videoMessage').textContent = error.message;
   alertToast(error.message);
  }
 }
}

function storyInit() {
 $('#storyHeading').value = state.storyTitle;
 $('#themeSelect').value = state.storyTheme;
 $('#storyText').value = state.storyText;
 const input = () => {
  if (recorderRunning) return;
  state.storyTitle = $('#storyHeading').value;
  state.storyTheme = $('#themeSelect').value;
  state.storyText = $('#storyText').value;
  storyUI();
  persist();
 };
 $('#storyHeading').addEventListener('input', input);
 $('#storyText').addEventListener('input', input);
 $('#themeSelect').addEventListener('change', input);
 $('#sampleStoryBtn').onclick = () => {
  if (recorderRunning) return;
  if (state.storyText.trim() && !confirm('Thay lời kể hiện tại bằng lời gợi ý theo chủ đề?')) return;
  state.storyText = themeTemplates[state.storyTheme];
  $('#storyText').value = state.storyText;
  storyUI();
  logEvent('story_rule_template');
  alertToast('Đã thêm gợi ý theo chủ đề. Em có thể sửa lời kể trước khi tạo video.');
 };
 $('#downloadPromptBtn').onclick = () => {
  saveBlob(new Blob([promptText()], {type: 'text/plain;charset=utf-8'}), 'dong-ho-lab-prompt-video-ai.txt');
  logEvent('export_ai_prompt');
  alertToast('Đã xuất prompt TXT.');
 };
 $('#playPreviewBtn').onclick = toggleMoviePreview;
 $('#saveVideoBtn').onclick = exportMovie;
 $('#motionStrength').addEventListener('change', event => {
  if (recorderRunning) return;
  motionStrength = Number(event.target.value) || 1;
  if (!movieRunning) renderMovie(Number($('#videoSeek').value) || 0);
 });
 $('#videoSeek').addEventListener('input', event => {
  if (recorderRunning) return;
  stopMoviePreview();
  renderMovie(Number(event.target.value) || 0);
  updatePreviewButton();
 });
 document.addEventListener('visibilitychange', () => {
  if (document.hidden && !recorderRunning) stopMoviePreview();
 });
 $('#videoMessage').setAttribute('role', 'status');
 $('#videoMessage').setAttribute('aria-live', 'polite');
 $('#videoProgress').setAttribute('role', 'progressbar');
 $('#videoProgress').setAttribute('aria-label', 'Tiến trình xuất hoạt ảnh');
 $('#videoProgress').setAttribute('aria-valuemin', '0');
 $('#videoProgress').setAttribute('aria-valuemax', '12');
 $('#videoProgress').setAttribute('aria-valuenow', '0');
 $('#videoProgressText').setAttribute('aria-live', 'polite');
 window.donghoPlayback = Object.assign(window.donghoPlayback || {}, {isRecording: () => recorderRunning, stopPreview: stopMoviePreview});
 storyUI();
}

function sentences(text) {
 return (String(text).match(/[^.!?…\n]+[.!?…]*/g) || []).map(value => value.trim()).filter(Boolean);
}

function storyboard() {
 const words = state.storyText.trim().match(/\S+/g) || [];
 const fallback = ['Giới thiệu bức tranh và những hình tượng chính.', 'Nhân vật bắt đầu một câu chuyện do học sinh sáng tạo.', 'Các nhân vật cùng giải quyết một tình huống.', 'Khép lại bằng thông điệp giữ gìn và lan toả di sản.'];
 let cursor = 0;
 return Array.from({length: 4}, (_, index) => {
  let text = '';
  if (!words.length) text = fallback[index];
  else if (cursor < words.length) {
   const remainingScenes = 3 - index;
   const minimum = cursor + 1;
   const maximum = Math.max(minimum, words.length - remainingScenes);
   let end = index === 3 ? words.length : Math.max(minimum, Math.min(maximum, Math.round(words.length * (index + 1) / 4)));
   const target = end;
   const radius = Math.min(8, Math.floor(words.length / 8));
   let distance = radius + 1;
   if (index !== 3) {
    for (let boundary = Math.max(minimum, target - radius); boundary <= Math.min(maximum, target + radius); boundary++) {
     if (/[.!?…]["'”’\)\]]*$/.test(words[boundary - 1]) && Math.abs(boundary - target) < distance) {
      distance = Math.abs(boundary - target);
      end = boundary;
     }
    }
   }
   text = words.slice(cursor, end).join(' ');
   cursor = end;
  }
  return {start: index * 3, end: (index + 1) * 3, text};
 });
}

function storyUI() {
 $('#storyCharCount').textContent = `${state.storyText.length} / 1600 ký tự`;
 const scenes = storyboard();
 $('#scenesList').innerHTML = scenes.map((scene, index) => `<div class="scene-row"><span class="scene-time">${String(scene.start).padStart(2, '0')}–${String(scene.end).padStart(2, '0')}s</span><div><strong>Cảnh ${index + 1}</strong><p>${escapeHTML(scene.text || 'Tiếp nối hình ảnh, không thêm lời kể.')}</p></div></div>`).join('');
 let warning = $('#storyFitWarning');
 if (!warning) {
  warning = document.createElement('p');
  warning.id = 'storyFitWarning';
  warning.className = 'hint-text';
  warning.setAttribute('role', 'status');
  $('.story-editor .form-footer').after(warning);
  const describedBy = ($('#storyText').getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  $('#storyText').setAttribute('aria-describedby', [...new Set([...describedBy, 'storyCharCount', 'storyFitWarning'])].join(' '));
 }
 const canvas = $('#movieCanvas');
 const context = canvas.getContext('2d');
 context.save();
 const clipped = fitMovieText(context, state.storyTitle, canvas.width * .285, 3, 27, 20, '700').truncated || scenes.some(scene => fitMovieText(context, scene.text, canvas.width * .285, 7, 19, 15).truncated);
 context.restore();
 warning.hidden = !clipped;
 warning.textContent = clipped ? 'Lời kể hoặc tiêu đề dài: chữ trong hoạt ảnh 12 giây được rút gọn bằng dấu “…”. Storyboard và prompt AI vẫn giữ toàn bộ lời kể.' : '';
 if (currentView === 'story' && !movieRunning && !recorderRunning) renderMovie(Number($('#videoSeek').value) || 0);
 window.donghoAI?.updateStory?.();
}
function promptText(){let scenes=storyboard();return [`DỰ ÁN: ĐÔNG HỒ LAB — PROMPT AI VIDEO (SÁNG TÁC CỦA HỌC SINH)`,`TÊN: ${state.storyTitle||'Chuyện kể Đông Hồ'}`,`CHỦ ĐỀ: ${$('#themeSelect').selectedOptions[0]?.textContent||state.storyTheme}`,`NGUỒN CẢM HỨNG: ${state.placed.length?'bố cục học sinh tạo từ bộ '+(studios.find(p=>p.id===state.studioId)?.title||'Đông Hồ'):(paintings.find(p=>p.id===state.paintingId)?.name||'tranh Đông Hồ')}.`,`LỜI KỂ: ${state.storyText}`,``,`STORYBOARD 4 CẢNH / 12 GIÂY:`,...scenes.map((s,i)=>`Cảnh ${i+1} (${s.start}–${s.end} giây): ${s.text}`),``,`YÊU CẦU ĐỐI VỚI CÔNG CỤ AI:`,`1. Giữ nguyên đặc trưng hình tượng, màu sắc cơ bản và tinh thần của tư liệu nguồn.`,`2. Chuyển động nhẹ, phù hợp với lứa tuổi THCS; khung hình 16:9.`,`3. Phân biệt sáng tác mới của học sinh với thông tin lịch sử đã kiểm chứng.`,`4. Không tự gán ý nghĩa cổ truyền, tên nghệ nhân, niên đại hay truyện tích khi chưa có nguồn.`,`5. Có chú thích: 'Sản phẩm sáng tạo dựa trên tranh Đông Hồ — không phải tranh gốc'.`,`6. Nội dung tư liệu cần nghệ nhân/chuyên gia thẩm định trước khi công bố.`,`7. Có thể dùng ảnh PNG xuất từ Đông Hồ Lab làm hình ảnh tham chiếu.`].join('\n');}
function wrapLines(ctx, text, maxWidth, maxLines = 8) {
 const lines = [];
 let line = '';
 for (const token of String(text).split(/\s+/).filter(Boolean)) {
  if (line && ctx.measureText(line + ' ' + token).width <= maxWidth) { line += ' ' + token; continue; }
  if (line) { lines.push(line); line = ''; }
  let part = '';
  for (const character of token) {
   if (part && ctx.measureText(part + character).width > maxWidth) { lines.push(part); part = ''; }
   part += character;
  }
  line = part;
 }
 if (line) lines.push(line);
 const result = lines.slice(0, maxLines);
 result.truncated = lines.length > maxLines;
 if (result.truncated && result.length) {
  let last = result[result.length - 1];
  while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
  result[result.length - 1] = last.trimEnd() + '…';
 }
 return result;
}

function fitMovieText(ctx, text, width, lines, size, minimum, weight = '400') {
 let result;
 for (let current = size; current >= minimum; current--) {
  ctx.font = `${weight} ${current}px Arial,sans-serif`;
  result = wrapLines(ctx, text, width, lines);
  result.fontSize = current;
  if (!result.truncated) break;
 }
 return result;
}
let compositionCache={key:'',canvas:document.createElement('canvas')};compositionCache.canvas.width=1200;compositionCache.canvas.height=800;
function movieArtwork(){const key=JSON.stringify([state.studioId,state.placed,state.bg]);if(!state.placed.length){const active=paintings.find(p=>p.id===state.paintingId)||paintings[0];return imgCache[active.img];}if(key!==compositionCache.key){composition(compositionCache.canvas.getContext('2d'),1200,800);compositionCache.key=key;}return compositionCache.canvas;}
// 2.2 – Dựng từng hình tượng theo đường chuyển động; toàn bộ khung hình đều được tính từ thời gian t.
// Nhờ đó xem thử, tua timeline và xuất WebM hiển thị cùng một cảnh, không dùng ảnh tĩnh đã gộp.
let motionStrength=1;
const motionHorse=new Image(),motionProcessionBg=new Image();
motionHorse.src=assets('assets/motion_horse.png');motionProcessionBg.src=assets('assets/motion_procession_clean.png');
const smoothstep=x=>{const v=clamp(x,0,1);return v*v*(3-2*v);};
const easeTrack=(time,stops)=>{const t=clamp(time,0,12)/3;const i=Math.min(3,Math.floor(t));return stops[i]+(stops[i+1]-stops[i])*smoothstep(t-i);};
const motionProfiles={
 flock:{walk:[-4,-1,2,4,1],jump:0.65,freq:2.0},
 scholar:{walk:[-6,-2,1,4,7],jump:0.45,freq:1.38},
 procession:{walk:[-7,-2,2,6,9],jump:0.70,freq:1.7}
};
function motionAt(p,index,t){
 const id=state.studioId;
 const prof=motionProfiles[id]||{walk:[-2,0,2,0,2],jump:0.45,freq:1.35};
 const phase=t*prof.freq*Math.PI*2+(id==='flock'?index*.93:index*.28);
 const gait=Math.sin(phase),step=Math.abs(Math.sin(phase));
 const hasFly=id==='flock'&&p.key==='flock_3';
 const isMother=id==='flock'&&p.key==='flock_1';
 const isBuffalo=id==='scholar'&&p.key==='scholar_2';
 const rider=id==='scholar'&&p.key==='scholar_1';
 const isProcession=id==='procession';
 const travel=easeTrack(t,prof.walk)*motionStrength;
 const follow=id==='flock'?Math.sin(index*2.73+t*.61)*1.05:0;
 const dx=travel+follow+(hasFly?Math.sin(t*1.8)*1.9:0);
 const dy=hasFly?(-4.0 +Math.sin(t*4.8+index)*2.5)*motionStrength:
          rider?(-Math.abs(Math.sin(t*prof.freq*Math.PI*2))*.65)*motionStrength:
          -step*(prof.jump*(isProcession?1.15:1))*motionStrength;
 let rot=gait*(isMother?1.35:(isBuffalo?.35:1.5))*motionStrength;
 if(id==='flock'&&t>4&&t<9&&index!==2){rot+=(isMother?4.2:6.8)*Math.sin(Math.PI*(t-4)/5)*Math.sin(t*2+index)*motionStrength;}
 if(rider){rot=.65*Math.sin(t*3.1)*motionStrength;}
 return {dx,dy,rot,gait,phase,hasFly,isBuffalo,isProcession,doWalk:!rider&&!hasFly};
}
function drawJointedSprite(ctx,im,w,h,phase,amount){
 // Biến dạng liên tục ở nửa dưới: chân bước trái/phải trong khi phần đầu gần như giữ nguyên.
 // Chia nhiều lát ảnh để không xuất hiện đường cắt ngang đột ngột.
 const slices=28,ih=im.naturalHeight,iw=im.naturalWidth;
 for(let k=0;k<slices;k++){
  const a=k/slices,b=(k+1)/slices,v=(a+b)/2;
  const leg=Math.pow(Math.max(0,(v-.49)/.51),1.65);
  const sway=Math.sin(phase+(v-.5)*2.8)*amount*leg;
  const sliceH=h/slices;
  ctx.drawImage(im,0,ih*a,iw,ih*(b-a), -w/2+sway,-h/2+h*a,w,sliceH+.6);
 }
}
function animatedSprite(ctx,p,index,t,rect){
 const ref=pieces.find(z=>z.id===p.key),im=imgCache[ref?.img];if(!ref||!im?.naturalWidth)return;
 const m=motionAt(p,index,t),w=rect.w*(ref.width*p.scale/100)/100,h=w*im.naturalHeight/im.naturalWidth;
 let x=rect.x+rect.w*(p.x+m.dx)/100,y=rect.y+rect.h*(p.y+m.dy)/100;
 // Bóng nhẹ bám theo chân, giúp nhận biết nhân vật đang đi trên nền.
 if(!m.hasFly){ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#2c3d2f';ctx.beginPath();ctx.ellipse(x,y+h*.49,w*.31,Math.max(2,h*.019),0,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.save();ctx.translate(x,y);ctx.rotate((p.angle+m.rot)*Math.PI/180);
 const pulse=m.hasFly?(1+Math.sin(t*9+index)*.065):1;
 ctx.scale(1,pulse);
 if(m.doWalk){drawJointedSprite(ctx,im,w,h,m.phase,w*(m.isBuffalo?.025:.04)*motionStrength);}
 else ctx.drawImage(im,-w/2,-h/2,w,h);
 ctx.restore();
}
function animatedHorse(ctx,t,rect){
 if(!motionHorse.naturalWidth)return;
 const prof=motionProfiles.procession;
 const phase=t*prof.freq*Math.PI*2;
 const dx=easeTrack(t,prof.walk)*motionStrength;
 const dy=-Math.abs(Math.sin(phase))*.72*motionStrength;
 const x=rect.x+rect.w*(.52+dx/100),y=rect.y+rect.h*(.67+dy/100);
 const w=rect.w*.41,h=w*motionHorse.naturalHeight/motionHorse.naturalWidth;
 ctx.save();ctx.globalAlpha=.16;ctx.fillStyle='#2d2f20';ctx.beginPath();ctx.ellipse(x,y+h*.48,w*.35,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(phase)*.004*motionStrength);
 drawJointedSprite(ctx,motionHorse,w,h,phase,w*.045*motionStrength);
 ctx.restore();
}
function drawSceneCanvas(ctx,t,rect){
 const kit=studios.find(z=>z.id===state.studioId);
 const isProcession=state.studioId==='procession'&&state.placed.length>0;
 ctx.save();ctx.beginPath();ctx.rect(rect.x,rect.y,rect.w,rect.h);ctx.clip();
 ctx.fillStyle=['#f4e7d1','#dae6d4','#dce9e9','#f3ded4'][state.bg];ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
 if(state.bg===0){const bg=isProcession?motionProcessionBg:imgCache[kit?.background];if(bg?.naturalWidth){
  // Paper and ornament are kept static; only figures are animated.
  ctx.drawImage(bg,rect.x,rect.y,rect.w,rect.h);
 }}
 if(!state.placed.length){
  const im=movieArtwork();if(im?.width){const zoom=1.02+Math.sin(t*.22)*.013;const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height,sc=Math.min((rect.w-24)/iw,(rect.h-24)/ih)*zoom;ctx.drawImage(im,rect.x+(rect.w-iw*sc)/2,rect.y+(rect.h-ih*sc)/2,iw*sc,ih*sc);}
 }else{
  const ordered=[...state.placed].sort((a,b)=>a.z-b.z);
  ordered.forEach((p,i)=>{
   if(isProcession&&p.key==='procession_3')animatedHorse(ctx,t,rect);
   animatedSprite(ctx,p,i,t,rect);
  });
  if(isProcession&&!ordered.some(x=>x.key==='procession_3'))animatedHorse(ctx,t,rect);
 }
 // Frame shading protects the warm woodblock visual language.
 const grad=ctx.createLinearGradient(rect.x,rect.y,rect.x,rect.y+rect.h);
 grad.addColorStop(0,'rgba(255,251,232,.07)');grad.addColorStop(1,'rgba(88,56,29,.055)');ctx.fillStyle=grad;ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
 ctx.restore();
 ctx.strokeStyle='#b6a881';ctx.lineWidth=2;ctx.strokeRect(rect.x+.5,rect.y+.5,rect.w-1,rect.h-1);
}
function renderMovie(t){
 const c=$('#movieCanvas');if(!c)return;
 const ctx=c.getContext('2d'),w=c.width,h=c.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#efe7d5';ctx.fillRect(0,0,w,h);
 const rect={x:17,y:55,w:w*.66-34,h:h-109};
 ctx.fillStyle='#fdf5df';ctx.fillRect(rect.x-6,rect.y-6,rect.w+12,rect.h+12);
 drawSceneCanvas(ctx,t,rect);
 ctx.fillStyle='#203d32';ctx.fillRect(w*.66,0,w*.34,h);
 ctx.fillStyle='#e4bc82';ctx.font='700 16px Arial,sans-serif';ctx.fillText('ĐÔNG HỒ LAB · CHUYỂN ĐỘNG',w*.686,56);
 ctx.font='700 27px Arial,sans-serif';ctx.fillStyle='#fff8e8';
 const titleLines=fitMovieText(ctx,state.storyTitle||'Câu chuyện Đông Hồ',w*.285,3,27,20,'700');
 titleLines.forEach((line,i)=>ctx.fillText(line,w*.687,109+i*(titleLines.fontSize+10)));
 const sceneIdx=Math.min(3,Math.floor(clamp(t,0,11.999)/3)),at=storyboard()[sceneIdx];
 ctx.fillStyle='#9ac5b1';ctx.font='700 15px Arial,sans-serif';ctx.fillText('CẢNH '+(sceneIdx+1)+' / 4',w*.687,229);
 ctx.font='19px Arial,sans-serif';ctx.fillStyle='#f1f3dd';
 const narrativeLines=fitMovieText(ctx,at.text,w*.285,7,19,15);
 narrativeLines.forEach((line,i)=>ctx.fillText(line,w*.687,268+i*(narrativeLines.fontSize+9)));
 ctx.fillStyle='#d7b783';ctx.font='13px Arial,sans-serif';ctx.fillText('MINH HOẠ TÁI SÁNG TẠO',w*.686,h-41);
 ctx.fillStyle='#244537';ctx.fillRect(0,h-30,w*.66,30);
 ctx.fillStyle='#f5ecd3';ctx.font='14px Arial,sans-serif';
 ctx.fillText(state.placed.length?'Nhân vật đang di chuyển theo bố cục em đã ghép':'Để nhân vật di chuyển, hãy ghép tranh hoặc mở mẫu',18,h-10);
 ctx.fillStyle='#dfbb83';ctx.fillRect(0,0,w*Math.max(0,Math.min(1,t/12)),5);
 const seek=$('#videoSeek'),clock=$('#movieTime');
 if(seek){seek.value=clamp(t,0,12).toFixed(1);seek.setAttribute('aria-valuetext',`${Number(seek.value).toLocaleString('vi-VN')} trên 12 giây`);}
 if(clock){const sec=String(Math.min(12,Math.floor(t))).padStart(2,'0');clock.textContent='00:'+sec+' / 00:12';}
 const caption=$('#movieLiveCaption');const captionText='Cảnh '+(sceneIdx+1)+' · '+at.text;if(caption&&caption.textContent!==captionText)caption.textContent=captionText;
}
function lockMovieControls() {
 const controls = $$('button, input, select, textarea').map(element => ({element, disabled: element.disabled}));
 const stages = $$('.art-stage').map(element => ({element, inert: element.inert}));
 for (const {element} of controls) element.disabled = true;
 for (const {element} of stages) element.inert = true;
 const blockLinks = event => {
  if (event.target.closest?.('a')) { event.preventDefault(); event.stopImmediatePropagation(); }
 };
 const blockEdits = event => {
  const shortcut = (event.ctrlKey || event.metaKey) && /^[zy]$/i.test(event.key);
  const pieceKey = document.activeElement?.classList.contains('placed-piece') && /^Arrow/.test(event.key);
  if (shortcut || pieceKey || event.key === 'Delete' || event.key === 'Backspace') {
   event.preventDefault(); event.stopImmediatePropagation();
  }
 };
 document.addEventListener('click', blockLinks, true);
 document.addEventListener('keydown', blockEdits, true);
 return () => {
  document.removeEventListener('click', blockLinks, true);
  document.removeEventListener('keydown', blockEdits, true);
  for (const {element, disabled} of controls) if (element.isConnected) element.disabled = disabled;
  for (const {element, inert} of stages) if (element.isConnected) element.inert = inert;
 };
}

async function exportMovie() {
 if (recorderRunning) return;
 const canvas = $('#movieCanvas');
 if (!canvas.captureStream || !window.MediaRecorder) {
  alertToast('Trình duyệt chưa hỗ trợ xuất WebM. Hãy mở trang bằng Chrome hoặc Edge.');
  return;
 }
 const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
 if (!mime) { alertToast('Trình duyệt chưa có bộ mã hoá WebM phù hợp.'); return; }
 if (document.hidden) { alertToast('Hãy giữ trang này ở phía trước khi xuất hoạt ảnh.'); return; }
 stopMoviePreview();
 const releaseControls = lockMovieControls();
 const button = $('#saveVideoBtn');
 const buttonContent = button.innerHTML;
 const progress = $('#videoProgress');
 const message = $('#videoMessage');
 const chunks = [];
 let stream = null, recorder = null, frameId = null;
 let finished = false, completed = false, errorMessage = '', lastSecond = -1;
 recorderRunning = true;
 button.innerHTML = icon('download') + ' Đang xuất…';
 progress.hidden = false;
 progress.setAttribute('aria-valuenow', '0');
 $('#videoProgressBar').style.width = '0%';
 $('#videoProgressText').textContent = 'Đang chuẩn bị hình ảnh…';
 message.textContent = 'Giữ trang này ở phía trước trong 12 giây để ghi đủ hoạt ảnh.';
 const finish = () => {
  if (finished) return;
  finished = true;
  if (frameId !== null) cancelAnimationFrame(frameId);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (recorder) {
   recorder.ondataavailable = null;
   recorder.onerror = null;
   recorder.onstop = null;
   if (recorder.state !== 'inactive') { try { recorder.stop(); } catch (_) {} }
  }
  stream?.getTracks().forEach(track => track.stop());
  try {
   if (completed && !errorMessage && chunks.length) {
    saveBlob(new Blob(chunks, {type: mime}), 'dong-ho-lab-hoat-anh.webm');
    logEvent('export_video_webm');
    message.textContent = 'Đã xuất hoạt ảnh WebM 12 giây, không có giọng đọc.';
    alertToast('Đã tạo WebM. Kiểm tra mục Tải xuống.');
   } else message.textContent = errorMessage || 'Không ghi được dữ liệu video. Hãy thử lại.';
  } catch (error) { message.textContent = 'Không lưu được video: ' + error.message; }
  recorderRunning = false;
  progress.hidden = true;
  button.innerHTML = buttonContent;
  releaseControls();
  updatePreviewButton();
  window.donghoAI?.refreshControls?.();
 };
 const cancel = reason => {
  if (finished) return;
  completed = false;
  errorMessage = reason;
  if (recorder && recorder.state !== 'inactive') {
   try { recorder.stop(); } catch (_) { finish(); }
  } else finish();
 };
 const onVisibilityChange = () => {
  if (document.hidden) cancel('Đã dừng xuất vì trang chuyển sang nền. Chưa tải tệp; hãy giữ trang mở và xuất lại.');
 };
 document.addEventListener('visibilitychange', onVisibilityChange);
 try {
  await prepareMovieAssets();
  if (finished) return;
  renderMovie(0);
  stream = canvas.captureStream(24);
  recorder = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 2100000});
  recorder.ondataavailable = event => { if (!finished && event.data.size) chunks.push(event.data); };
  recorder.onerror = () => cancel('Trình duyệt gặp lỗi khi ghi video. Chưa tải tệp; em có thể xuất lại.');
  recorder.onstop = finish;
  recorder.start(150);
  let started = null;
  const frame = now => {
   if (finished) return;
   if (document.hidden) { onVisibilityChange(); return; }
   if (recorder.state !== 'recording') { cancel('Quá trình ghi bị gián đoạn. Hãy xuất lại hoạt ảnh.'); return; }
   if (started === null) started = now;
   const elapsed = Math.min(12, (now - started) / 1000);
   renderMovie(elapsed);
   $('#videoProgressBar').style.width = `${elapsed / 12 * 100}%`;
   progress.setAttribute('aria-valuenow', elapsed.toFixed(1));
   if (Math.floor(elapsed) !== lastSecond) {
    lastSecond = Math.floor(elapsed);
    $('#videoProgressText').textContent = `Đang xuất hoạt ảnh: ${lastSecond}/12 giây`;
   }
   if (elapsed < 12) frameId = requestAnimationFrame(frame);
   else { completed = true; recorder.stop(); }
  };
  frameId = requestAnimationFrame(frame);
 } catch (error) { cancel('Không thể tạo hoạt ảnh: ' + error.message); }
}
function assessmentInit(){
 const draw=()=>{$('#assessmentQuestions').innerHTML=questions.map((q,i)=>`<div class="question-block"><fieldset><legend>Câu ${i+1}. ${escapeHTML(q.title)}</legend>${q.answers.map((answer,j)=>`<label class="answer-option"><input type="radio" name="q${i}" value="${j}" required><span>${escapeHTML(answer)}</span></label>`).join('')}</fieldset></div>`).join('');$('#assessmentResult').hidden=true;$('#assessmentForm').reset();};
 draw();$('#newAssessmentBtn').onclick=()=>{questions=window.DongHoHeritageCore.sampleQuestions(window.HERITAGE_REQUIREMENTS.questions,10);state.quiz=null;draw();metrics();persist();};
 $('#assessmentForm').onsubmit=event=>{event.preventDefault();const fields=new FormData(event.currentTarget);const result=window.DongHoHeritageCore.scoreAssessment(questions,questions.map((_,i)=>fields.get('q'+i)));state.quiz=result.score;const panel=$('#assessmentResult');panel.hidden=false;panel.innerHTML=`<strong>Em trả lời đúng ${result.score}/${result.total} câu.</strong><p>${result.score===result.total?'Rất tốt! Em đã hoàn thành bài ôn tập.':'Đọc phần giải thích và thử một bộ câu hỏi mới khi sẵn sàng.'}</p>${result.wrong.length?`<ul>${result.wrong.map(item=>`<li><b>Câu ${item.index+1}:</b> ${escapeHTML(item.why)}</li>`).join('')}</ul>`:''}`;logEvent('learning_quiz',`${result.score}/${result.total}`);metrics();};
 $('#exportActivityBtn').onclick=()=>{const data={status:'DEMO_NOT_RESEARCH_DATA',exportedAt:new Date().toISOString(),source:'local device interaction only',events:state.logs,summary:{pieces:state.placed.length,quizScore:state.quiz},privacy:'No names or identifiers collected',notice:'Not related to previous 393-participant survey'};saveBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),'dong-ho-lab-nhat-ky-demo.json');alertToast('Đã xuất JSON nhật ký thao tác cục bộ.');};$('#eraseActivityBtn').onclick=()=>{if(!confirm('Xóa lịch sử thao tác và điểm bài thử trên thiết bị?'))return;state.logs=[];state.quiz=null;metrics();$('#assessmentResult').hidden=true;$('#assessmentForm').reset();persist();alertToast('Đã xóa nhật ký và điểm bài thử.');};}
function renderAll(){library();updateStudioShelf();renderStudio();$('#storyHeading').value=state.storyTitle;$('#themeSelect').value=state.storyTheme;$('#storyText').value=state.storyText;storyUI();$('#assessmentResult').hidden=true;$('#assessmentForm').reset();metrics();}
function overviewInit(){
 document.querySelectorAll('[data-lesson]').forEach(btn=>btn.onclick=()=>{
 const id=btn.dataset.lesson;
 document.querySelectorAll('[data-lesson]').forEach(b=>{b.classList.toggle('active',b.dataset.lesson===id);b.setAttribute('aria-selected',String(b.dataset.lesson===id));});
 document.querySelectorAll('[data-lesson-panel]').forEach(p=>p.hidden=p.dataset.lessonPanel!==id);
 });
}

const PRESENTATION_DEMOS = [{"id": "flock", "name": "Đàn gà mẹ con", "tag": "Gia đình · Sẻ chia", "story": "Một ngày nắng ấm, gà mẹ dẫn đàn con khám phá khu vườn. Một chú gà con nhìn thấy hạt thóc nhưng không giữ riêng mà gọi các bạn tới. Cả đàn quây quần, cùng sẻ chia thức ăn dưới cánh mẹ. Qua bức tranh, em hiểu thêm ước vọng sum vầy và muốn kể về nghề tranh Đông Hồ cho bạn bè.", "placements": [["flock_1", 50, 45, 106, 0], ["flock_2", 49, 16, 70, 0], ["flock_3", 85, 25, 71, -6], ["flock_4", 84, 55, 70, 5], ["flock_5", 65, 81, 68, 0], ["flock_6", 34, 76, 68, 0], ["flock_7", 18, 55, 66, 4], ["flock_8", 79, 78, 66, -5]]}, {"id": "scholar", "name": "Hiếu học – Chăn trâu đọc sách", "tag": "Hiếu học · Nỗ lực", "story": "Trong buổi chiều thanh bình, một bạn nhỏ đưa trâu ra đồng và mang theo cuốn sách yêu thích. Khi trâu thong thả gặm cỏ, bạn chăm chú đọc từng trang sách dưới bóng cây. Mỗi ngày học một điều mới, bạn dần mở rộng hiểu biết của mình. Từ hình tượng trong tranh, em nhớ đến tinh thần ham học và càng trân trọng di sản của người xưa.", "placements": [["scholar_2", 50, 68, 110, 0], ["scholar_1", 51, 28, 77, 0]]}, {"id": "procession", "name": "Vinh quy bái tổ", "tag": "Biết ơn · Quê hương", "story": "Cả làng vui mừng khi nghe tin người con đỗ đạt đang trở về. Đoàn rước với cờ, lọng và tiếng trống tiến qua con đường quen thuộc. Người trở về kính nhớ tổ tiên, cảm ơn cha mẹ và thầy dạy đã nâng đỡ mình. Câu chuyện sáng tạo từ tranh giúp em hiểu thêm ý nghĩa của lòng biết ơn và niềm tự hào quê hương.", "placements": [["procession_1", 18, 54, 86, -2], ["procession_2", 34, 53, 84, 0], ["procession_3", 51, 43, 104, 0], ["procession_4", 72, 53, 87, 1], ["procession_5", 86, 56, 83, 0]]}];
function loadPresentationDemo(demoId){
 const demo=PRESENTATION_DEMOS.find(x=>x.id===demoId);if(!demo)return;
 if(state.placed.length && !confirm('Mở sản phẩm mẫu sẽ thay thế bố cục đang mở. Em nên xuất PNG/JSON để lưu sản phẩm của mình. Tiếp tục?'))return;
 const kit=studios.find(x=>x.id===demo.id);if(!kit){alertToast('Bộ ghép chưa sẵn sàng.');return;}
 state.studioId=demo.id;state.paintingId=kit.paintingId||demo.id;
 state.placed=demo.placements.map((v,i)=>({id:i+1,key:v[0],x:v[1],y:v[2],scale:v[3],angle:v[4],z:i+1}));
 state.idCounter=state.placed.length;state.selected=null;state.bg=0;
 state.storyTitle='Chuyện tranh: '+demo.name;state.storyTheme='heritage';state.storyText=demo.story;
 undo=[];redo=[];compositionCache.key='';renderAll();logEvent('open_demo',demo.id);navigate('story');
 alertToast('Đã mở tranh ghép và câu chuyện. Chọn Tạo video AI để dựng video từ tranh gốc.');
}
document.querySelectorAll('[data-demo]').forEach(b=>b.addEventListener('click',()=>loadPresentationDemo(b.dataset.demo)));

window.donghoApp={navigate,getState:()=>state,getCatalog:()=>({paintings,pieces,studios}),asset:assets};
restore();applyIcons();overviewInit();initNavigation();studioInit();storyInit();assessmentInit();renderAll();$('#saveStatus').textContent='Đã sẵn sàng';
})();
