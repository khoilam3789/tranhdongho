"""Embed editable story UI sources into the existing portable HTML."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
path = ROOT / 'Dongho.html'
html = path.read_text(encoding='utf-8')

def replace_once(old, new):
    global html
    if html.count(old) != 1:
        raise RuntimeError(f'Expected one matching UI fragment: {old[:80]}')
    html = html.replace(old, new, 1)

if '<!-- STORY_AI_UI -->' not in html:
    replace_once('<div class="story-right"><div class="surface video-surface">', '<div class="story-right"><div class="surface video-surface">')
    start = html.index('<p class="demo-story-note">', html.index('id="view-story"'))
    end = html.index('</p>', start) + len('</p>')
    html = html[:start] + '<p class="demo-story-note"><strong>Chọn cách kể chuyện:</strong> xem và xuất hoạt ảnh 2D miễn phí trên thiết bị, hoặc kết nối API để tạo video AI từ nội dung em viết.</p>' + html[end:]
    replace_once('Viết câu chuyện, cho các nhân vật di chuyển theo từng cảnh và xuất phim ngắn từ tác phẩm em ghép.', 'Viết tiêu đề, chọn thông điệp và thêm lời kể. Biến câu chuyện của em thành hoạt ảnh hoặc một thước phim AI.')
    replace_once('12 giây · nhân vật chuyển động', '2D trên máy · AI qua API')
    replace_once('<div class="story-right"><div class="surface video-surface"><div class="surface-header compact"><div><span class="eyebrow">XEM TRƯỚC HOẠT ẢNH</span><h2>Phim ngắn của em</h2></div></div>', '<div class="story-right"><div class="surface video-surface"><div class="surface-header compact"><div><span class="eyebrow">XEM TRƯỚC & XUẤT VIDEO</span><h2>Phim ngắn của em</h2></div></div><!-- STORY_PREVIEW_UI --><!-- /STORY_PREVIEW_UI --><div id="preview2DPanel" role="tabpanel" aria-labelledby="preview2DTab">')
    replace_once('Chuyển động kiểu hoạt hình 2D: nhân vật di chuyển riêng, nghiêng, nhún bước và tương tác; không phải phim quay người thật hoặc video AI. Xuất WebM bằng Chrome/Edge.</p></div>', 'Hoạt ảnh 2D dài 12 giây, không có âm thanh. Lời kể hiển thị dưới dạng chữ. Xuất WebM bằng Chrome/Edge.</p></div></div>')
    replace_once('Nội dung sáng tạo cần phân biệt với chú giải truyền thống.</span></div></div>', 'Nội dung sáng tạo cần phân biệt với chú giải truyền thống.</span></div><!-- STORY_AI_UI --><!-- /STORY_AI_UI --></div>')
    replace_once('<div class="surface prompt-surface"><div><span class="eyebrow">TIẾP TỤC VỚI AI BÊN NGOÀI</span><h2>Storyboard & prompt video</h2><p>Ứng dụng sẽ soạn 4 cảnh từ câu chuyện của em và tạo hoạt ảnh từ bố cục tranh đã ghép (nếu có), kèm nguyên tắc tôn trọng tư liệu gốc.</p></div>', '<details class="surface prompt-surface storyboard-details"><summary><div><span class="eyebrow">KỊCH BẢN TỪ LỜI KỂ</span><h2>4 cảnh của câu chuyện</h2></div></summary><p>Toàn bộ lời kể được chia vào 4 cảnh cho hoạt ảnh 12 giây. Prompt TXT có thể dùng với công cụ AI khác.</p>')
    replace_once('Xuất prompt AI dạng TXT</button></div></div></div>', 'Xuất prompt AI dạng TXT</button></details></div></div>')
    replace_once('id="storyText" class="field story-text"', 'id="storyText" aria-describedby="storyCharCount" class="field story-text"')

def embed(marker, text):
    global html
    html, count = re.subn(r'<!-- ' + marker + r' -->.*?<!-- /' + marker + r' -->', lambda _: '<!-- ' + marker + ' -->\n' + text + '\n<!-- /' + marker + ' -->', html, flags=re.S)
    if count != 1:
        raise RuntimeError(f'Missing embedding marker: {marker}')

if 'id="movieLiveCaption"' not in html:
    canvas_end = '<canvas id="movieCanvas" class="movie-canvas" width="960" height="540" aria-label="Khung xem trước hoạt ảnh"></canvas>'
    replace_once(canvas_end, canvas_end + '<p id="movieLiveCaption" class="movie-caption" aria-label="Lời kể của cảnh đang xem"></p>')
    clock_line = "if(clock){const sec=String(Math.min(12,Math.floor(t))).padStart(2,'0');clock.textContent='00:'+sec+' / 00:12';}"
    replace_once(clock_line, clock_line + "\n const caption=$('#movieLiveCaption');const captionText='Cảnh '+(sceneIdx+1)+' · '+at.text;if(caption&&caption.textContent!==captionText)caption.textContent=captionText;")

embed('STORY_AI_UI', (ROOT / 'web/story-ai-panel.html').read_text(encoding='utf-8'))
embed('STORY_PREVIEW_UI', (ROOT / 'web/story-preview.html').read_text(encoding='utf-8'))
css = '<style id="story-ui-style">\n' + (ROOT / 'web/story-ui.css').read_text(encoding='utf-8') + '\n</style>'
js = '<script id="story-ai-script">\n' + (ROOT / 'web/story-ai.js').read_text(encoding='utf-8') + '\n</script>'
if '<style id="story-ui-style">' in html:
    html = re.sub(r'<style id="story-ui-style">.*?</style>', lambda _: css, html, flags=re.S)
else:
    html = html.replace('</head>', css + '\n</head>', 1)
if '<script id="story-ai-script">' in html:
    html = re.sub(r'<script id="story-ai-script">.*?</script>', lambda _: js, html, flags=re.S)
else:
    html = html.replace('</body>', js + '\n</body>', 1)
for old, new in {
    '<title>Đông Hồ Lab 2.2 | Xưởng tranh chuyển động</title>': '<title>Đông Hồ Lab 2.3 | Kể chuyện & video AI</title>',
    'PHIÊN BẢN 2.0 · HỌC LIỆU DI SẢN': 'PHIÊN BẢN 2.3 · HỌC LIỆU DI SẢN',
    'Tác phẩm được lưu trên thiết bị này, không gửi lên máy chủ.': 'Bản thảo lưu trên thiết bị. Nội dung chỉ gửi đến API khi em chọn tạo video AI.',
    'Hoạt động ngoại tuyến</span>': '2D ngoại tuyến · AI trực tuyến</span>',
    '<strong>100%</strong><span>chạy cục bộ trên máy</span>': '<strong>2 chế độ</strong><span>2D tại máy · video AI</span>',
    'Hình tượng được tách thủ công; phần kể chuyện hiện chưa tích hợp mô hình AI.': 'Hình tượng được tách thủ công. Video AI là diễn giải sáng tạo, cần đối chiếu với tư liệu gốc.',
}.items():
    html = html.replace(old, new)
path.write_text(html, encoding='utf-8')
print('Updated embedded story UI, preserving original media assets.')
