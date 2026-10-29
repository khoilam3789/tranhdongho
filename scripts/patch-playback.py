"""Apply focused playback fixes to the standalone Đông Hồ Lab document.

Run: python scripts/patch-playback.py [path/to/Dongho.html]
The root agent runs this after the independently prepared interface changes.
"""

from pathlib import Path
import sys


STORY_FUNCTIONS = r'''
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
'''


WRAP_FUNCTIONS = r'''
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
'''


EXPORT_FUNCTIONS = r'''
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
'''


def replace_segment(source: str, start: str, end: str, replacement: str) -> str:
    if source.count(start) != 1 or source.count(end) != 1:
        raise RuntimeError(f"Expected exactly one patch boundary: {start!r} / {end!r}")
    first = source.index(start)
    last = source.index(end, first)
    return source[:first] + replacement.strip() + "\n" + source[last:]


def replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise RuntimeError(f"Expected exactly one occurrence: {old[:90]!r}")
    return source.replace(old, new, 1)


def patch(source: str) -> str:
    if "function toggleMoviePreview()" in source:
        raise RuntimeError("Playback patch has already been applied.")
    source = replace_segment(source, "function storyInit(){", "function promptText(){", STORY_FUNCTIONS)
    source = replace_segment(source, "function wrapLines(ctx,", "let compositionCache=", WRAP_FUNCTIONS)
    source = replace_segment(source, "async function exportMovie(){", "function assessmentInit(){", EXPORT_FUNCTIONS)
    source = replace_once(source, "function navigate(view){if(!$('#view-'+view))return;", "function navigate(view){if(recorderRunning){alertToast('Đang xuất hoạt ảnh. Hãy chờ xuất xong rồi chuyển trang.');return;}if(!$('#view-'+view))return;stopMoviePreview();")
    source = replace_once(source, "window.scrollTo({top:0,behavior:'auto'});}", "window.scrollTo({top:0,behavior:'auto'});const heading=$('#view-'+view+' h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}")
    source = replace_once(source, "wrapLines(ctx,state.storyTitle||'Câu chuyện Đông Hồ',w*.285,3).forEach((line,i)=>ctx.fillText(line,w*.687,109+i*37));", "const titleLines=fitMovieText(ctx,state.storyTitle||'Câu chuyện Đông Hồ',w*.285,3,27,20,'700');\n titleLines.forEach((line,i)=>ctx.fillText(line,w*.687,109+i*(titleLines.fontSize+10)));")
    source = replace_once(source, "wrapLines(ctx,at.text,w*.285,7).forEach((line,i)=>ctx.fillText(line,w*.687,268+i*30));", "const narrativeLines=fitMovieText(ctx,at.text,w*.285,7,19,15);\n narrativeLines.forEach((line,i)=>ctx.fillText(line,w*.687,268+i*(narrativeLines.fontSize+9)));")
    source = replace_once(source, "if(seek){seek.value=clamp(t,0,12).toFixed(1);}", "if(seek){seek.value=clamp(t,0,12).toFixed(1);seek.setAttribute('aria-valuetext',`${Number(seek.value).toLocaleString('vi-VN')} trên 12 giây`);}")
    return source


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "Dongho.html"
    original = target.read_text(encoding="utf-8")
    updated = patch(original)
    target.write_text(updated, encoding="utf-8", newline="\n")
    print(f"Applied playback/storyboard fixes: {target}")
