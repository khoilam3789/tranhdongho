(()=>{
  'use strict';
  const data=window.HERITAGE_REQUIREMENTS,app=window.donghoApp,core=window.DongHoHeritageCore;
  if(!data||!app||!core)return;
  const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function audio(item){return item.audio?`<div class="learning-audio"><span>Nghe bài bằng giọng Việt</span><audio controls preload="none" src="${escape(item.audio)}" aria-label="Nghe ${escape(item.title||item.name)}"></audio></div>`:`<p class="hint-text">Bản đọc tiếng Việt đang được bổ sung.</p>`;}
  function pauseMedia(){document.querySelectorAll('.learning-audio audio,#heritageIntroVideo').forEach(media=>media.pause());}
  document.addEventListener('play',event=>{if(event.target.matches('audio,video'))document.querySelectorAll('audio,video').forEach(media=>{if(media!==event.target)media.pause();});},true);
  document.querySelectorAll('.nav-link,[data-lesson]').forEach(button=>button.addEventListener('click',pauseMedia));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMedia();});

  for(const lesson of data.lessons){
    const panel=$(`[data-lesson-panel="${lesson.id}"]`);if(!panel)continue;
    panel.innerHTML=`<div class="lesson-reading"><div class="lesson-reading-copy"><span class="eyebrow">${escape(lesson.eyebrow)}</span><h3>${escape(lesson.title)}</h3>${audio(lesson)}${lesson.paragraphs.map(text=>`<p>${escape(text)}</p>`).join('')}${lesson.source?`<p class="learning-source">Đối chiếu: <a href="${escape(lesson.source)}" target="_blank" rel="noopener noreferrer">Hồ sơ UNESCO về nghề làm tranh Đông Hồ</a>.</p>`:''}</div><div class="lesson-photos">${lesson.images.map(image=>`<figure><img src="${escape(image.src)}" alt="${escape(image.caption)}" loading="lazy"><figcaption>${escape(image.caption)}</figcaption></figure>`).join('')}</div></div>`;
  }
  $('.knowledge-level').textContent='4 bài học · Có giọng đọc';

  const shortcuts=[['intro','🎬','Lời chào từ làng tranh','Video giới thiệu'],['history','📜','Làng Mái xưa','Lịch sử Đông Hồ'],['materials','🌾','Từ cây thành giấy','Giấy và nguyên liệu'],['colors','🎨','Năm sắc thiên nhiên','Màu sắc truyền thống'],['library','🖼️','Mỗi tranh một chuyện','Khám phá hình tượng'],['games','🧩','Chơi cùng di sản','3 trò chơi tương tác']];

  const mapLabels={intro:'Video giới thiệu',history:'Lịch sử làng tranh',materials:'Giấy và nguyên liệu',colors:'Năm sắc thiên nhiên',library:'Khám phá tranh',games:'Trò chơi di sản'};
  $('#view-home').insertAdjacentHTML('afterbegin','<section class="heritage-welcome map-welcome" aria-labelledby="heritageWelcomeTitle"><div class="map-heading"><span class="eyebrow">CÙNG EM VỀ LÀNG TRANH</span><h1 id="heritageWelcomeTitle">Một chuyến chơi Đông Hồ</h1><p>Chạm vào một điểm trên bản đồ để mở câu chuyện, nghe bài học và khám phá nghề tranh.</p></div><div class="heritage-map-scroll" tabindex="0" aria-label="Bản đồ làng tranh, có thể kéo ngang trên màn hình nhỏ"><div class="heritage-map"><img class="village-map-image" src="heritage/images/dongho-village-map-v3.webp" alt="Bản đồ minh họa chibi gồm sáu điểm khám phá làng tranh Đông Hồ"><nav class="map-destinations" aria-label="Sáu điểm khám phá làng tranh">'+shortcuts.map(([id],index)=>'<button class="map-destination destination-'+index+'" type="button" data-heritage-go="'+id+'"><span class="map-sign">'+mapLabels[id]+'</span></button>').join('')+'</nav></div></div><p class="map-pan-hint">Kéo ngang để khám phá bản đồ, hoặc chọn nhanh một mục bên dưới.</p><nav class="map-quick-links" aria-label="Chọn nhanh nội dung">'+shortcuts.map(([id])=>'<button type="button" data-heritage-go="'+id+'">'+mapLabels[id]+'</button>').join('')+'</nav></section>');
  $('#view-home').setAttribute('aria-labelledby','heritageWelcomeTitle');
  const projectMenu=document.createElement('details');projectMenu.className='project-menu';projectMenu.innerHTML='<summary>Dự án của em</summary>';projectMenu.appendChild($('.save-box'));$('.sidebar').appendChild(projectMenu);
  document.querySelectorAll('[data-heritage-go]').forEach(button=>button.addEventListener('click',()=>{
    pauseMedia();const target=button.dataset.heritageGo;
    if(target==='intro'){if(!introURL&&data.introVideo){const video=$('#heritageIntroVideo');video.src=data.introVideo.src;video.hidden=false;$('#introVideoStatus').textContent=data.introVideo.caption;}$('#heritageIntroDialog').showModal();return;}
    if(['history','materials','colors'].includes(target)){app.navigate('home');$(`[data-lesson="${target}"]`).click();$(`[data-lesson-panel="${target}"]`).scrollIntoView({behavior:'smooth',block:'start'});}
    else app.navigate(target);
  }));

  let introURL=null;
  $('#closeHeritageIntro').addEventListener('click',()=>{$('#heritageIntroVideo').pause();$('#heritageIntroDialog').close();});
  $('#heritageIntroFile').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(!file.type.startsWith('video/')||file.size>200*1024*1024){$('#introVideoStatus').textContent='Chọn tệp video không quá 200 MB.';return;}
    if(introURL)URL.revokeObjectURL(introURL);introURL=URL.createObjectURL(file);const video=$('#heritageIntroVideo');video.src=introURL;video.hidden=false;
    $('#introVideoStatus').textContent=`Đã chọn ${file.name}. Video chỉ mở trên máy này, chưa được tải lên website.`;
  });
  $('#heritageIntroDialog').addEventListener('close',()=>$('#heritageIntroVideo').pause());

  let referenceVisible=false;
  function refreshStudio(){
    const state=app.getState(),catalog=app.getCatalog(),kit=catalog.studios.find(item=>item.id===state.studioId),painting=catalog.paintings.find(item=>item.id===kit?.paintingId);
    let overlay=$('#studioReferenceOverlay');
    if(!overlay){overlay=document.createElement('img');overlay.id='studioReferenceOverlay';overlay.alt='Tranh chuẩn để tự đối chiếu vị trí';$('#workStage').appendChild(overlay);}
    if(painting)overlay.src=app.asset(painting.img);
    overlay.hidden=!referenceVisible||!painting;
    let puzzle=$('#pigPuzzleControls');
    if(!puzzle){puzzle=document.createElement('div');puzzle.id='pigPuzzleControls';const button=document.createElement('button');button.type='button';button.className='button button-outline-dark';button.textContent='Bắt đầu ghép 3×3 · Xáo trộn 9 mảnh';button.onclick=()=>app.startGridPuzzle();puzzle.append(button);const status=document.createElement('p');status.id='pigPuzzleStatus';status.setAttribute('aria-live','polite');puzzle.append(status);$('.composition-check').prepend(puzzle);}
    puzzle.hidden=!kit?.grid;
    if(kit?.grid){const old=state.placed.some(p=>catalog.pieces.find(b=>b.id===p.key)?.legacyOnly);const correct=state.placed.filter(p=>{const b=catalog.pieces.find(b=>b.id===p.key);return b?.gridTile&&Math.hypot(p.x-b.target.x,p.y-b.target.y)<.01&&p.scale===100&&p.angle===0;}).length;$('#pigPuzzleStatus').textContent=old?'Bố cục đang dùng mảnh cắt cũ. Bấm Bắt đầu ghép 3×3 để đổi sang 9 ô nguyên vẹn; có thể Hoàn tác.':'Đúng vị trí: '+correct+'/9. Kéo thả hoặc dùng phím mũi tên để đổi ô.';}
    let download=$('#downloadTeacherBackground');
    if(!download){download=document.createElement('a');download.id='downloadTeacherBackground';download.className='button button-neutral';download.href='heritage/images/teacher-background-provided.png';download.download='nen-thay-do-coc-co-cay-va-ban.png';download.textContent='Tải nền có cây và bàn';$('.composition-check').appendChild(download);}
    download.hidden=kit?.id!=='teacher';

    $('#checkCompositionBtn').setAttribute('aria-pressed',String(referenceVisible));
    $('#checkCompositionBtn').textContent=referenceVisible?'Ẩn hình chuẩn':'Kiểm tra · Hiện hình chuẩn';
    $('#compositionCheckHint').textContent=kit?.grid?'Lưới 3×3 giữ cố định kích thước và hướng mảnh để mép ảnh khớp nhau. Bật hình chuẩn khi cần gợi ý.':referenceVisible?'Hình chuẩn đang hiện mờ. Em vẫn kéo hoặc dùng phím mũi tên để tự căn lại từng mảnh.':'Bật hình chuẩn để đối chiếu; ứng dụng không tự di chuyển các mảnh hoặc chấm điểm bố cục.';
  }
  $('#checkCompositionBtn').addEventListener('click',()=>{referenceVisible=!referenceVisible;refreshStudio();});
  let currentPainting=null;
  function refreshPainting(){
    const id=app.getState().paintingId;if(id===currentPainting)return;currentPainting=id;
    const item=data.paintings[id],container=$('#paintingReading');
    container.hidden=!item;if(!item){container.replaceChildren();return;}
    container.innerHTML=`${audio(item)}<details class="painting-full-reading"><summary>Đọc đầy đủ ý nghĩa và các hình tượng</summary>${item.paragraphs.map(text=>`<p>${escape(text)}</p>`).join('')}</details>`;
  }
  window.donghoHeritage={refreshStudio,refreshPainting,pauseMedia};
  refreshStudio();refreshPainting();

  // Three self-contained learning games. No API, identity or payment is used.
  const gamePanels={crossword:$('#crosswordGame'),guess:$('#guessPaintingGame'),matching:$('#matchingGame')};
  document.querySelectorAll('[data-learning-game]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.learningGame;for(const [key,panel]of Object.entries(gamePanels))panel.hidden=key!==id;
    document.querySelectorAll('[data-learning-game]').forEach(tab=>{const selected=tab===button;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));});
  }));

  function crossword(){
    const rows=data.games.crossword;
    gamePanels.crossword.innerHTML='<h2>Giải mã 10 hàng ngang</h2><p>Mỗi ô điền một chữ cái. Em có thể dán cả đáp án; dấu và khoảng trắng sẽ được bỏ tự động.</p><form id="crosswordForm"><div class="crossword-rows">'+rows.map((row,index)=>'<fieldset class="crossword-word"><legend><b>'+(index+1)+'.</b> '+escape(row.clue)+'</legend><div class="letter-row">'+Array.from(core.normalizeAnswer(row.answer)).map((_,col)=>'<input class="crossword-cell" type="text" data-row="'+index+'" data-col="'+col+'" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Hàng '+(index+1)+', ô '+(col+1)+'">').join('')+'</div><span id="crossword-feedback-'+index+'" class="game-row-feedback" aria-live="polite"></span></fieldset>').join('')+'</div><button class="button button-primary" type="submit">Kiểm tra ô chữ</button><button class="button button-neutral" type="reset">Chơi lại</button></form><p id="crosswordScore" class="game-feedback" role="status" aria-live="polite"></p>';
    const form=$('#crosswordForm'),cells=row=>Array.from(form.querySelectorAll('[data-row="'+row+'"]'));
    const distribute=(input,text)=>{
      const group=cells(input.dataset.row),start=Number(input.dataset.col),letters=Array.from(core.normalizeAnswer(text));
      input.closest('fieldset').classList.remove('word-correct');group.forEach(cell=>cell.removeAttribute('aria-invalid'));$('#crossword-feedback-'+input.dataset.row).textContent='';$('#crosswordScore').textContent='';
      if(!letters.length){input.value='';return;}
      letters.slice(0,group.length-start).forEach((letter,i)=>group[start+i].value=letter);
      group[Math.min(group.length-1,start+letters.length)].focus();
    };
    form.querySelectorAll('.crossword-cell').forEach(input=>{
      input.addEventListener('input',event=>{if(!event.isComposing)distribute(input,input.value);});
      input.addEventListener('compositionend',()=>distribute(input,input.value));
      input.addEventListener('paste',event=>{event.preventDefault();distribute(input,event.clipboardData.getData('text'));});
      input.addEventListener('keydown',event=>{
        const group=cells(input.dataset.row),col=Number(input.dataset.col),row=Number(input.dataset.row);
        if(event.key==='Backspace'&&!input.value&&col>0){event.preventDefault();group[col-1].value='';distribute(group[col-1],'');group[col-1].focus();}
        if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
          event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?group.length-1:Math.max(0,Math.min(group.length-1,col+(event.key==='ArrowLeft'?-1:1)));group[target].focus();
        }
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const next=cells(Math.max(0,Math.min(rows.length-1,row+(event.key==='ArrowDown'?1:-1))));next[Math.min(col,next.length-1)].focus();}
      });
    });
    form.addEventListener('submit',event=>{event.preventDefault();let score=0;rows.forEach((row,index)=>{
      const group=cells(index),correct=group.map(input=>input.value).join('')===core.normalizeAnswer(row.answer);score+=Number(correct);
      group.forEach(input=>input.setAttribute('aria-invalid',String(!correct)));group[0].closest('fieldset').classList.toggle('word-correct',correct);
      $('#crossword-feedback-'+index).textContent=correct?'✓ Đúng':'Chưa đúng, em thử lại nhé.';
    });$('#crosswordScore').textContent=score===rows.length?'Em đã giải mã đủ 10 hàng ngang!':'Em đã giải đúng '+score+'/'+rows.length+' hàng ngang.';});
    form.addEventListener('reset',()=>{form.querySelectorAll('.crossword-cell').forEach(input=>input.removeAttribute('aria-invalid'));form.querySelectorAll('.word-correct').forEach(row=>row.classList.remove('word-correct'));rows.forEach((_,index)=>$('#crossword-feedback-'+index).textContent='');$('#crosswordScore').textContent='';});
  }
  let guessOrder=[],guessIndex=0,guessScore=0,guessAnswered=false;
  function renderGuess(){
    if(guessIndex>=guessOrder.length){gamePanels.guess.innerHTML=`<h2>Em đã khám phá đủ 5 bức tranh</h2><p class="game-feedback">Kết quả: ${guessScore}/5 câu đúng.</p><button id="restartGuess" class="button button-primary" type="button">Chơi lại với thứ tự mới</button>`;$('#restartGuess').onclick=startGuess;return;}
    const item=guessOrder[guessIndex];guessAnswered=false;
    gamePanels.guess.innerHTML=`<h2>Nhìn tranh đoán tên</h2><p>Câu ${guessIndex+1}/5 · Đã đúng ${guessScore} câu</p><img class="guess-painting" src="${escape(item.image)}" alt="Bức tranh cần đoán ở câu ${guessIndex+1}"><div class="guess-options">${core.shuffle(data.games.guess).map(option=>`<button type="button" class="button button-neutral" data-guess="${escape(option.name)}">${escape(option.name)}</button>`).join('')}</div><p id="guessFeedback" class="game-feedback" role="status" aria-live="polite"></p><button id="nextGuess" type="button" class="button button-primary" hidden>Câu tiếp theo</button>`;
    gamePanels.guess.querySelectorAll('[data-guess]').forEach(button=>button.onclick=()=>{if(guessAnswered)return;guessAnswered=true;const correct=button.dataset.guess===item.name;if(correct)guessScore++;$('#guessFeedback').textContent=correct?'✓ Chính xác!':'Tên tranh là: '+item.name;gamePanels.guess.querySelectorAll('[data-guess]').forEach(b=>b.disabled=true);$('#nextGuess').hidden=false;});
    $('#nextGuess').onclick=()=>{guessIndex++;renderGuess();};
  }
  function startGuess(){guessOrder=core.shuffle(data.games.guess);guessIndex=0;guessScore=0;renderGuess();}
  function matching(){
    const pairs=data.games.matching.map((item,index)=>({...item,id:index}));let selected=null;const matched=new Set();
    gamePanels.matching.innerHTML=`<h2>Nối thông tin với tên gọi</h2><p>Chọn một mô tả bên trái, rồi chọn tên gọi tương ứng bên phải. Có 6 cặp cần nối.</p><div class="matching-columns"><div>${core.shuffle(pairs).map(item=>`<button type="button" class="matching-item" data-match-left="${item.id}" aria-pressed="false">${escape(item.description)}</button>`).join('')}</div><div>${core.shuffle(pairs).map(item=>`<button type="button" class="matching-item" data-match-right="${item.id}">${escape(item.term)}</button>`).join('')}</div></div><p id="matchingFeedback" class="game-feedback" role="status" aria-live="polite">Đã nối 0/6 cặp.</p><button class="button button-neutral" id="restartMatching" type="button">Đảo lại và chơi mới</button>`;
    gamePanels.matching.querySelectorAll('[data-match-left]').forEach(button=>button.onclick=()=>{selected=Number(button.dataset.matchLeft);gamePanels.matching.querySelectorAll('[data-match-left]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
    gamePanels.matching.querySelectorAll('[data-match-right]').forEach(button=>button.onclick=()=>{
      if(selected===null){$('#matchingFeedback').textContent='Em hãy chọn một mô tả bên trái trước.';return;}
      const right=Number(button.dataset.matchRight);if(right!==selected){$('#matchingFeedback').textContent='Hai nội dung chưa khớp. Em thử chọn lại nhé.';return;}
      matched.add(right);button.disabled=true;button.classList.add('matched');const left=gamePanels.matching.querySelector(`[data-match-left="${right}"]`);left.disabled=true;left.classList.add('matched');left.setAttribute('aria-pressed','false');selected=null;
      $('#matchingFeedback').textContent=matched.size===6?'Em đã nối đúng cả 6 cặp!':`✓ Chính xác. Đã nối ${matched.size}/6 cặp.`;
    });$('#restartMatching').onclick=matching;
  }
  crossword();startGuess();matching();
  $('#preview2DTab').hidden=true;$('#preview2DPanel').hidden=true;
})();
