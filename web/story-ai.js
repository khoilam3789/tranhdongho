(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const modelSelect = $('#aiModel');
  const durationSelect = $('#aiDuration');
  const aspectSelect = $('#aiAspectRatio');
  const generateButton = $('#generateAIVideoBtn');
  const checkButton = $('#checkAIConnectionBtn');
  const cancelButton = $('#cancelAIVideoBtn');
  const player = $('#aiVideoPlayer');
  let config = null;
  let busy = false;
  let checking = false;
  let checked = false;
  let controller = null;
  let resultURL = null;
  let resultStory = null;
  let configController = null;
  let sourceBlob = null;
  let sourceMeta = '';
  let busyStage = 'video';

  function readStory() {
    return {
      title: $('#storyHeading').value.trim(),
      message: $('#themeSelect').selectedOptions[0]?.textContent.trim() || '',
      narration: $('#storyText').value.trim(),
      painting: $('.painting-card.active strong')?.textContent.trim() || 'Tranh dân gian Đông Hồ'
    };
  }

  function status(message, isError = false) {
    $('#aiStatus').textContent = message;
    $('#aiStatus').classList.toggle('error', isError);
  }

  function updateControls() {
    if (window.donghoPlayback?.isRecording()) return;
    const ready = config?.configured && config.models?.length && modelSelect.value && (!config.freeQuotaRequired || config.freeQuotaConfirmed) && (!(isSiliconFlow() || isBytePlus()) || config.canGenerate === true);
    generateButton.disabled = busy || checking || !ready;
    checkButton.disabled = busy || checking;
    modelSelect.disabled = busy || checking || !config?.models?.length;
    durationSelect.disabled = busy || checking || !config?.models?.length;
    aspectSelect.disabled = busy || checking || !config?.models?.length;
    cancelButton.hidden = !busy;
    $('#addNarrationBtn').disabled = busy || !sourceBlob;
    $('#narrationVideoFile').disabled = busy;
    $('#narrationEnabled').disabled = busy;
    $('#narrationVoice').disabled = busy;
    $('#preview2DTab').disabled = busy;
    $('#aiBusyIndicator').hidden = !busy;
    generateButton.textContent = busy ? busyStage === 'narration' ? 'Đang ghép giọng đọc…' : 'Đang tạo video…' : 'Tạo video AI';
    $('.ai-generator').setAttribute('aria-busy', String(busy || checking));
  }

  function setMode(mode, focus = false, checkConnection = true) {
    if (busy && mode === '2d') return;
    if (mode === 'ai') window.donghoPlayback?.stopPreview?.();
    else player.pause();
    const isAI = mode === 'ai';
    $('#preview2DPanel').hidden = isAI;
    $('#previewAIPanel').hidden = !isAI;
    for (const [id, active] of [['preview2DTab', !isAI], ['previewAITab', isAI]]) {
      $("#" + id).setAttribute('aria-selected', String(active));
      $("#" + id).tabIndex = active ? 0 : -1;
      if (focus && active) $("#" + id).focus();
    }
    if (isAI && checkConnection && !checked && !checking) checkConfiguration();
  }

  function fillSelect(element, values, selected) {
    element.replaceChildren(...values.map(({value, label}) => new Option(label, value)));
    if (values.some(item => item.value === String(selected))) element.value = String(selected);
  }

  function selectedModel() { return config?.models?.find(model => model.id === modelSelect.value); }

  function isBytePlus() { return config?.providerId === 'byteplus'; }
  function isAlibaba() { return config?.providerId === 'alibaba'; }
  function isSiliconFlow() { return config?.providerId === 'siliconflow'; }

  function updateProviderUI() {
    if(config?.cloudMode){$('#narrationEnabled').checked=false;$('.narration-settings').hidden=true;}
    $('#byteplusSetupSteps').hidden = !isBytePlus();
    if (isBytePlus()) {
      $('#aiProviderLabel').textContent = 'BytePlus ModelArk · Singapore';
      for (const id of ['siliconflowSetupSteps', 'alibabaSetupSteps', 'pollinationsSetupSteps']) $('#' + id).hidden = true;
      $('#aiCreditSummary').hidden = false;
      $('#aiCreditSummary').textContent = config.keyValid === true ? 'Key BytePlus hợp lệ. Quota còn lại và hạn dùng cần xem trong Model activation.' : 'Chưa xác thực được key BytePlus.';
      $('#aiQuotaNotice').hidden = false;
      $('#aiQuotaNotice').textContent = config.canGenerate ? 'Đã ghi nhận xác nhận quota video và chế độ chỉ dùng miễn phí từ máy chủ. Đây là xác nhận thủ công, không phải số dư đọc qua API.' : 'Chưa xác nhận quota video và Free Credits Only Mode. Nút tạo đang khóa; kiểm tra tài khoản theo hướng dẫn bên dưới.';
      $('#aiDisclosure').textContent = 'Khi bấm tạo, tranh gốc đang chọn cùng tiêu đề, thông điệp và lời kể gửi đến BytePlus để tạo video từ ảnh Seedance 720p. Khi bật giọng đọc, lời kể gửi thêm đến Microsoft Edge để đọc tiếng Việt miễn phí. Không tự gửi lại hoặc đổi nhà cung cấp khi lỗi.';
      if(config.cloudMode){
        $('#aiDisclosure').textContent='Khi bấm tạo, tranh gốc và nội dung câu chuyện được gửi đến BytePlus. Bản online chỉ tạo video không có âm thanh; các đoạn dài được ghép trong trình duyệt. Không tự tạo lại tác vụ khi lỗi.';
        $('#byteplusSetupSteps').textContent='Kiểm tra Seedance còn quota và Free Credits Only Mode đang bật trong tài khoản BytePlus. Nếu dịch vụ chưa sẵn sàng, hãy báo người quản trị ứng dụng.';
      }
      return;
    }
    const alibaba = isAlibaba();
    const silicon = isSiliconFlow();
    $('#aiProviderLabel').textContent = silicon ? 'SiliconFlow · Quốc tế (.com)' : alibaba ? 'Alibaba Cloud Model Studio · Singapore' : (config?.provider || 'Pollinations');
    $('#siliconflowSetupSteps').hidden = !silicon;
    $('#alibabaSetupSteps').hidden = !alibaba;
    $('#pollinationsSetupSteps').hidden = alibaba || silicon;
    $('#aiCreditSummary').hidden = !silicon;
    const total = config?.credit?.totalBalance;
    $('#aiCreditSummary').textContent = typeof total === 'number' && Number.isFinite(total)
      ? `Số dư SiliconFlow: $${total.toFixed(4)} USD. Số dư không xác nhận riêng credit thưởng có áp dụng cho video hay không.`
      : config?.balanceCheckAvailable === false && config?.keyValid === true
        ? config.creditConfirmed
          ? 'Đã ghi nhận xác nhận credit/coupon từ cấu hình máy chủ. Đây là xác nhận thủ công; ứng dụng không xác minh số dư hoặc hạn coupon qua API.'
          : 'Key hợp lệ. API số dư cũ đã ngừng hoạt động; chưa biết số dư credit/coupon. Kiểm tra Account Overview trong tài khoản SiliconFlow.'
        : 'Chưa đọc được số dư SiliconFlow. Kiểm tra kết nối hoặc xem trong tài khoản.';
    $('#aiQuotaNotice').hidden = !silicon && !config?.freeQuotaRequired;
    $('#aiQuotaNotice').textContent = silicon
      ? 'SiliconFlow công bố $1 credit dùng thử cho tài khoản đủ điều kiện. Mỗi video trừ credit theo giá hiện tại; kiểm tra số dư và điều kiện credit thưởng trước khi tạo. Không phải API miễn phí vĩnh viễn.'
      : config?.freeQuotaConfirmed
      ? 'Đã ghi nhận xác nhận Free Quota Only cho Wan 2.7 và Qwen Flash từ cấu hình máy chủ. Ứng dụng không tự đọc được quota còn lại; em hãy kiểm tra trong Model Studio trước khi tạo.'
      : 'Chưa xác nhận quota và Free Quota Only cho Wan 2.7 và Qwen Flash. Nút tạo đang khóa; hoàn tất hướng dẫn bên dưới trước khi sử dụng.';
    $('#aiDisclosure').textContent = silicon
      ? 'Khi bấm tạo, tiêu đề, thông điệp và toàn bộ lời kể được gửi đến SiliconFlow và dùng credit tài khoản. Video có thể khác bố cục ghép; không tự chuyển sang Alibaba hoặc Pollinations khi hết credit.'
      : alibaba
      ? 'Khi bấm tạo, câu chuyện được gửi đến Alibaba Cloud: Qwen chuyển thành prompt tiếng Anh, Wan tạo video. Quota dùng thử phụ thuộc tài khoản. Giọng Việt được ghép riêng miễn phí; video có thể khác bố cục tranh đã ghép.'
      : 'Khi bấm tạo, nội dung câu chuyện được gửi đến Pollinations và dùng credit của tài khoản. Giọng Việt được ghép riêng miễn phí từ lời kể. Video có thể khác bố cục tranh đã ghép.';
  }

  function updateModelOptions() {
    const model = selectedModel();
    const durations = model?.durations?.filter(value => Number.isFinite(value) && value > 0) || [];
    fillSelect(durationSelect, durations.length ? durations.map(value => ({value: String(value), label: `${value} giây${model?.segmentDuration && value > model.nativeMaxDuration ? ' · ghép ' + Math.ceil(value / model.segmentDuration) + ' đoạn' : ''}`})) : [{value: '', label: 'Mặc định của model'}], model?.defaultDuration || durations[0]);
    const aspects = model?.aspectRatios?.length ? model.aspectRatios : ['16:9'];
    const labels = {'16:9': 'Ngang · 16:9', '9:16': 'Dọc · 9:16', '1:1': 'Vuông · 1:1'};
    fillSelect(aspectSelect, aspects.map(value => ({value, label: labels[value] || value})), aspects.includes('16:9') ? '16:9' : aspects[0]);
    $('#aiModelNote').textContent = isBytePlus()
      ? 'Seedance 1.0 Pro Fast · 720p · chọn 5–30 giây. Từ 15 giây sẽ ghép 2–3 đoạn AI (mỗi đoạn dùng quota riêng); có thể thấy điểm chuyển cảnh. ' + (config.cloudMode ? 'Bản online chưa ghép tiếng.' : 'Giọng Việt ghép riêng miễn phí; lời kể dài có thể kéo dài video.')
      : isSiliconFlow()
      ? 'Wan 2.2 tạo clip 5 giây theo khung hình đã chọn. Câu chuyện được gửi trực tiếp, không dịch bằng dịch vụ trả phí; chất lượng hiểu tiếng Việt chưa được nhà cung cấp bảo đảm.'
      : isAlibaba()
      ? 'Wan 2.7 tạo video 720p; Qwen Flash chuyển nội dung thành prompt tiếng Anh. Tài khoản mới đủ điều kiện có quota thử theo từng model, không phải hạn mức miễn phí vĩnh viễn.'
      : model?.paidOnly === true
      ? 'Model này yêu cầu credit đã mua; credit thưởng dùng thử có thể không áp dụng.'
      : 'Mỗi lần tạo dùng credit theo giá model. Kiểm tra số dư trong tài khoản Pollinations trước khi tạo.';
    updateControls();
  }

  function updateDurationNote() {
    if (!isBytePlus()) return;
    const seconds = Number(durationSelect.value) || 5;
    const count = Math.ceil(seconds / 10);
    $('#aiModelNote').textContent = `Seedance 1.0 Pro Fast · 720p · ${seconds} giây hình ảnh · ${count} lượt tạo AI, dùng quota cho từng đoạn. ${count > 1 ? 'Ghép các đoạn trên máy; có thể thấy điểm chuyển cảnh. ' : ''}${config.cloudMode ? 'Bản online chưa ghép tiếng.' : 'Giọng Việt ghép miễn phí; lời kể dài có thể kéo dài video.'}`;
  }

  async function checkConfiguration() {
    if (busy || checking) return;
    checked = true;
    config = null;
    if (location.protocol === 'file:') {
      status('Để dùng AI, chạy npm start rồi mở http://127.0.0.1:8787. Bản mở trực tiếp bằng tệp vẫn xem và xuất hoạt ảnh 2D.');
      $('#aiSetupHelp').open = true;
      updateControls();
      return;
    }
    checking = true;
    updateControls();
    status('Đang kiểm tra kết nối và danh sách model…');
    configController = new AbortController();
    const timeout = setTimeout(() => configController?.abort(), 25000);
    try {
      const response = await fetch('/api/video/config', {signal: configController.signal, cache: 'no-store'});
      if (!response.ok) throw new Error('Không kết nối được máy chủ tạo video. Kiểm tra npm start rồi thử lại.');
      config = await response.json();
      if (!Array.isArray(config.models)) config.models = [];
      updateProviderUI();
      $('#aiConnectionBadge').textContent = (isSiliconFlow() || isBytePlus()) && config.configured ? config.keyValid === true ? 'Key hợp lệ' : config.keyValid === false ? 'Key chưa hợp lệ' : 'Chưa xác thực key' : config.configured ? 'Đã cấu hình key' : 'Chưa cấu hình key';
      $('#aiConnectionBadge').classList.toggle('connected', Boolean(config.configured) && (!(isSiliconFlow() || isBytePlus()) || config.keyValid === true));
      if (!config.configured) {
        status(`Chưa có API key ${isBytePlus() ? 'BytePlus ModelArk' : isSiliconFlow() ? 'SiliconFlow quốc tế (.com)' : isAlibaba() ? 'Alibaba Cloud Singapore' : 'Pollinations'}. Thêm ${config.keyEnv || (isSiliconFlow() ? 'SILICONFLOW_API_KEY' : isAlibaba() ? 'DASHSCOPE_API_KEY' : 'POLLINATIONS_API_KEY')} vào .env, khởi động lại máy chủ rồi kiểm tra kết nối.`);
        $('#aiSetupHelp').open = true;
      } else if (isBytePlus() && config.canGenerate !== true) {
        status(config.error || 'BytePlus chưa sẵn sàng: kiểm tra key, quota và kích hoạt Seedance trong Model activation.', true);
        $('#aiSetupHelp').open = true;
      } else if (isSiliconFlow() && config.canGenerate !== true) {
        status(config.error || (config.creditConfirmationRequired && !config.creditConfirmed
          ? 'Key SiliconFlow hợp lệ; chưa xác nhận credit/coupon còn dùng được. Kiểm tra Account Overview rồi xác nhận trong .env trước khi tạo video.'
          : config.keyValid !== true
          ? 'Chưa xác thực được key SiliconFlow. Kiểm tra key quốc tế (.com) và kết nối mạng rồi thử kiểm tra lại.'
          : 'SiliconFlow chưa đủ số dư hoặc chưa xác nhận được credit khả dụng. Kiểm tra số dư và điều kiện credit thưởng trong tài khoản trước khi tạo.'), true);
        $('#aiSetupHelp').open = true;
      } else if (config.freeQuotaRequired && !config.freeQuotaConfirmed) {
        status('Đã đọc key Alibaba. Chưa xác nhận Free Quota Only và quota còn hiệu lực cho Wan 2.7 và Qwen Flash. Hoàn tất hướng dẫn bên dưới; nút tạo video đang khóa.');
        $('#aiSetupHelp').open = true;
      } else if (!config.models.length) {
        status(config.error || 'Chưa tải được model video. Kiểm tra Internet rồi bấm “Kiểm tra kết nối”.', true);
      } else {
        status(isBytePlus()
          ? 'Đã xác thực key BytePlus; ghi nhận xác nhận quota thủ công. Sẵn sàng khi em chủ động bấm tạo video.'
          : isSiliconFlow()
          ? config.balanceCheckAvailable === false
            ? 'Key SiliconFlow hợp lệ; đã ghi nhận xác nhận credit/coupon thủ công từ .env. Chưa xác minh số dư qua API. Mỗi lần tạo dùng credit tài khoản.'
            : 'Đã xác thực key SiliconFlow và đọc số dư. Sẵn sàng gửi một yêu cầu tạo video; mỗi lần tạo sẽ dùng credit tài khoản.'
          : isAlibaba()
          ? 'Máy chủ đã đọc cấu hình Alibaba và xác nhận quota từ .env. Kiểm tra quota thực tế trong Model Studio trước khi tạo; hết quota sẽ báo lỗi, không tự đổi nhà cung cấp.'
          : config.models.every(model => model.paidOnly === true)
          ? 'Đã kết nối danh sách model. Các model video hiện yêu cầu credit đã mua; kiểm tra số dư trước khi tạo.'
          : 'Sẵn sàng tạo video. Nội dung sẽ được gửi đến Pollinations khi em bấm tạo.');
        $('#aiSetupHelp').open = false;
      }
      const preferredModel = modelSelect.value || config.models.find(model => model.id === (isBytePlus() ? 'seedance-1-0-pro-fast-251015' : isSiliconFlow() ? 'Wan-AI/Wan2.2-T2V-A14B' : isAlibaba() ? 'wan2.7-t2v' : 'alibaba/wan-2.2-fast'))?.id;
      fillSelect(modelSelect, config.models.length ? config.models.map(model => ({value: model.id, label: (model.name || model.id) + (model.paidOnly ? ' · credit đã mua' : '')})) : [{value: '', label: 'Chưa có model khả dụng'}], preferredModel);
      updateModelOptions();
    } catch (error) {
      $('#aiConnectionBadge').textContent = 'Chưa kết nối';
      $('#aiConnectionBadge').classList.remove('connected');
      status(error.name === 'AbortError' ? 'Kiểm tra kết nối quá thời gian. Em có thể thử kiểm tra lại.' : error.message, true);
    } finally {
      clearTimeout(timeout);
      configController = null;
      checking = false;
      updateControls();
    }
  }

  async function generateVideo() {
    if (busy || generateButton.disabled) return;
    for (const id of ['storyHeading', 'storyText']) {
      const field = $('#' + id);
      field.setCustomValidity(field.value.trim() ? '' : 'Em hãy điền nội dung này trước khi tạo video.');
      if (!field.reportValidity()) { field.focus(); return; }
    }
    const story = readStory();
    const model = selectedModel();
    const options = {model: model.id, duration: durationSelect.value ? Number(durationSelect.value) : null, aspectRatio: aspectSelect.value};
    busyStage = 'video';
    busy = true;
    controller = new AbortController();
    const requestController = controller;
    setMode('ai');
    updateControls();
    $('#previewAIPanel').setAttribute('aria-busy', 'true');
    status(isBytePlus()
      ? `Đang tạo ${options.duration || 5} giây bằng ${Math.ceil((options.duration || 5) / 10)} đoạn BytePlus, mỗi đoạn dùng quota riêng. Các đoạn được tạo lần lượt rồi ghép trên máy; không tự tạo lại khi lỗi.`
      : isSiliconFlow()
      ? 'Đã gửi câu chuyện đến SiliconFlow. Video có thể cần vài phút; ứng dụng chỉ gửi một tác vụ và theo dõi kết quả, không tự tạo lại.'
      : isAlibaba()
      ? 'Đã gửi câu chuyện: Qwen chuẩn bị prompt, sau đó Wan tạo video. Có thể cần vài phút; chỉnh sửa nội dung bây giờ áp dụng cho lần tạo sau.'
      : 'Đã gửi câu chuyện. AI có thể cần vài phút; em có thể tiếp tục chỉnh sửa nội dung cho lần tạo sau.');
    const started = Date.now();
    const tick = () => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      $('#aiElapsed').textContent = `${busyStage === 'narration' ? 'Đang đọc và ghép tiếng Việt' : 'Đang chờ video'} · ${Math.floor(seconds / 60)} phút ${String(seconds % 60).padStart(2, '0')} giây`;
    };
    tick();
    const timer = setInterval(tick, 1000);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; requestController.abort(); }, 21 * 60 * 1000);
    try {
      const reference = isBytePlus() ? {preserveArtwork: true, referenceImage: await referenceFrame(aspectSelect.value)} : {};
      requestController.signal.throwIfAborted();
      const response = config?.cloudMode
        ? new Response(await window.donghoCloudGenerate({story,options,reference,signal:requestController.signal,onProgress:message=>status(message)}),{headers:{'Content-Type':'video/mp4'}})
        : await fetch('/api/video/generate', {method: 'POST', headers: {'Content-Type': 'application/json', ...(isBytePlus() ? {'X-Video-Reference': 'first-frame'} : {})}, body: JSON.stringify({...story, ...options, ...reference}), signal: requestController.signal});
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Chưa tạo được video. Kiểm tra kết nối và số dư trước khi thử lại.');
      }
      if (!response.headers.get('content-type')?.startsWith('video/')) throw new Error('Nhà cung cấp chưa trả về tệp video hợp lệ.');
      const blob = await response.blob();
      if (!blob.size) throw new Error('Video trả về không có dữ liệu.');
      sourceBlob = blob;
      showVideo(blob);
      resultStory = JSON.stringify(story);
      const download = $('#downloadAIVideoBtn');
      download.download = `${story.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'dong-ho-lab'}-ai.mp4`;
      $('#aiResultTitle').textContent = story.title;
      sourceMeta = `${model.name || model.id} · ${options.duration ? options.duration + ' giây hình ảnh' : 'Thời lượng theo model'} · ${options.aspectRatio}`;
      $('#aiResultMeta').textContent = sourceMeta;
      $('#aiEmptyState').hidden = true;
      $('#aiResult').hidden = false;
      updateStory();
      status('Video AI đã sẵn sàng. Bấm phát để xem và tải MP4 để lưu về thiết bị.');
      if ($('#narrationEnabled').checked) {
        try {await requestNarration(story, requestController.signal);}
        catch (error) {status(error.name === 'AbortError' ? 'Đã dừng ghép giọng. Video gốc được giữ; bấm ghép lại khi cần, không phải tạo video AI lại.' : `${error.message} Video gốc vẫn tải được; bấm ghép giọng lại để thử riêng phần tiếng.`, true);}
      }
    } catch (error) {
      status(error.name === 'AbortError'
        ? (timedOut ? 'Đã hết thời gian chờ.' : 'Đã ngừng chờ trên trang này.') + ' Nhà cung cấp có thể vẫn xử lý và tính credit. Kiểm tra tài khoản trước khi tạo lại.'
        : error.message, true);
    } finally {
      clearInterval(timer);
      clearTimeout(timeout);
      controller = null;
      busy = false;
      $('#previewAIPanel').setAttribute('aria-busy', 'false');
      updateControls();
    }
  }

  async function referenceFrame(aspectRatio) {
    const source = $('.painting-card.active img')?.getAttribute('src');
    if (!source?.startsWith('data:image/')) throw new Error('Chưa lấy được tranh gốc. Chọn một tranh ở phần Khám phá di sản trước khi tạo video.');
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = aspectRatio === '9:16' ? [720,1280] : aspectRatio === '1:1' ? [1024,1024] : [1280,720];
    const context = canvas.getContext('2d');
    context.fillStyle = '#f5eedc';
    context.fillRect(0,0,canvas.width,canvas.height);
    const scale = Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight);
    const width = image.naturalWidth*scale, height = image.naturalHeight*scale;
    context.drawImage(image,(canvas.width-width)/2,(canvas.height-height)/2,width,height);
    return canvas.toDataURL('image/png');
  }

  function showVideo(blob) {
    player.pause();
    if (resultURL) URL.revokeObjectURL(resultURL);
    resultURL = URL.createObjectURL(blob);
    player.src = resultURL;
    player.muted = false;
    player.volume = 1;
    $('#downloadAIVideoBtn').href = resultURL;
  }

  async function requestNarration(story, signal) {
    if (!story.narration || story.narration.length > 1600) throw new Error('Điền lời kể tiếng Việt, tối đa 1600 ký tự.');
    busyStage = 'narration';
    updateControls();
    status('AI đang đọc lời kể tiếng Việt miễn phí và ghép vào MP4 trên máy. Không tạo tác vụ BytePlus mới.');
    const form = new FormData();
    form.append('video', sourceBlob, 'input.mp4');
    form.append('narration', story.narration);
    form.append('voice', $('#narrationVoice').value || 'vi-VN-NamMinhNeural');
    const response = await fetch('/api/video/narrate', {method: 'POST', body: form, signal});
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Chưa ghép được giọng Việt miễn phí.');
    }
    if (!response.headers.get('content-type')?.startsWith('video/mp4')) throw new Error('Máy chủ chưa trả về MP4 có giọng đọc.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('MP4 sau ghép không có dữ liệu.');
    showVideo(blob);
    resultStory = JSON.stringify(story);
    const seconds = Number(response.headers.get('x-video-duration'));
    $('#aiResultMeta').textContent = `${sourceMeta} · Giọng đọc tiếng Việt${seconds > 0 ? ' · ' + Math.ceil(seconds) + ' giây sau ghép' : ''}`;
    $('#aiResultTitle').textContent = story.title || 'Video có giọng đọc tiếng Việt';
    $('#downloadAIVideoBtn').download = 'dong-ho-lab-giong-viet.mp4';
    updateStory();
    status('MP4 đã có giọng đọc tiếng Việt. Bấm phát để nghe hoặc tải video có tiếng. Phần đọc và ghép không dùng quota BytePlus.');
  }

  async function narrateExistingVideo() {
    if (busy || !sourceBlob) return;
    const story = readStory();
    if (!story.narration || story.narration.length > 1600) {status('Điền lời kể tiếng Việt, tối đa 1600 ký tự.', true); return;}
    busy = true;
    busyStage = 'narration';
    controller = new AbortController();
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), 240000);
    setMode('ai', false, false);
    updateControls();
    $('#aiElapsed').textContent = 'Đang tạo giọng đọc và ghép MP4…';
    try {await requestNarration(story, requestController.signal);}
    catch (error) {status(error.name === 'AbortError' ? 'Đã dừng chờ ghép giọng. Video trước đó vẫn được giữ; bấm ghép lại khi cần.' : error.message, true);}
    finally {clearTimeout(timeout); controller = null; busy = false; updateControls();}
  }

  async function loadNarrationVideo() {
    if (busy) return;
    const file = $('#narrationVideoFile').files?.[0];
    if (!file) return;
    if (!/\.mp4$/i.test(file.name) || !file.size || file.size > 128 * 1024 * 1024) {status('Chọn MP4 không rỗng, tối đa 128 MB.', true); return;}
    sourceBlob = file;
    sourceMeta = 'MP4 đã chọn';
    resultStory = JSON.stringify(readStory());
    showVideo(file);
    $('#aiResultTitle').textContent = file.name;
    $('#aiResultMeta').textContent = sourceMeta;
    $('#downloadAIVideoBtn').download = file.name;
    $('#aiEmptyState').hidden = true;
    $('#aiResult').hidden = false;
    setMode('ai', false, false);
    updateStory();
    updateControls();
    status('Đã chọn MP4. Bấm “Ghép lời kể vào video hiện có” để thêm tiếng miễn phí.');
  }

  function updateStory() {
    $('#aiStaleNotice').hidden = !resultStory || resultStory === JSON.stringify(readStory());
    for (const id of ['storyHeading', 'storyText']) $('#' + id).setCustomValidity('');
  }

  window.donghoAI = {updateStory, refreshControls: updateControls, activate:()=>setMode('ai')};
  $('#preview2DTab').addEventListener('click', () => setMode('2d'));
  $('#previewAITab').addEventListener('click', () => setMode('ai'));
  $('.preview-mode-switch').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const aiActive = $('#previewAITab').getAttribute('aria-selected') === 'true';
    setMode(event.key === 'Home' ? '2d' : event.key === 'End' ? 'ai' : aiActive ? '2d' : 'ai', true);
  });
  checkButton.addEventListener('click', checkConfiguration);
  modelSelect.addEventListener('change', updateModelOptions);
  durationSelect.addEventListener('change', updateDurationNote);
  generateButton.addEventListener('click', generateVideo);
  $('#addNarrationBtn').addEventListener('click', narrateExistingVideo);
  $('#narrationVideoFile').addEventListener('change', loadNarrationVideo);
  cancelButton.addEventListener('click', () => controller?.abort());
  player.addEventListener('error', () => {
    if (resultURL && player.getAttribute('src')) status('Trình duyệt chưa phát được video này. Em vẫn có thể tải MP4 để xem bằng trình phát trên thiết bị.', true);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) player.pause(); });
  document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => { if (button.dataset.view !== 'story') player.pause(); }));
  window.addEventListener('beforeunload', event => {
    if (busy) { event.preventDefault(); event.returnValue = ''; }
  });
})();
