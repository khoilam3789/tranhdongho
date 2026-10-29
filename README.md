# Kết nối BytePlus ModelArk

Backend hỗ trợ `VIDEO_PROVIDER=byteplus`, `BYTEPLUS_API_KEY` và `BYTEPLUS_FREE_QUOTA_CONFIRMED=false` trong `.env`. Key được giữ trên máy chủ, không gửi ra HTML. Khởi động lại bằng `npm start`, mở http://127.0.0.1:8787 rồi kiểm tra kết nối.

Kiểm tra kết nối dùng GET danh sách tác vụ video (chỉ đọc), xác thực key mà không tạo video. API này không cung cấp quota còn lại và không chứng minh Seedance đã kích hoạt. Nút tạo khóa cho tới khi xác nhận quota còn hiệu lực, Seedance 1.0 Pro Fast đã kích hoạt và Free Credits Only Mode áp dụng. Chỉ khi đủ các điều kiện đó mới đặt `BYTEPLUS_FREE_QUOTA_CONFIRMED=true`. Đây là xác nhận thủ công, không phải kiểm tra số dư tự động.

Model tích hợp: `seedance-1-0-pro-fast-251015`, 720p, 5/10 giây, ngang/dọc/vuông, không âm thanh. Câu chuyện gửi trực tiếp trong prompt; tài liệu chỉ xác nhận prompt tiếng Anh cho model này. Không gọi thêm API dịch, không tự đổi nhà cung cấp, không tự gửi lại POST tạo tác vụ. Dừng chờ không hủy tác vụ phía BytePlus; kiểm tra lịch sử trước khi tạo lại.

Kiểm tra trực tiếp ngày 29/10/2026 tại ModelArk → Model activation → Media (Johor): Seedance 1.0 Pro Fast còn **2.000.000 / 2.000.000 token**, Free Credits Only Mode **Enabled**; Seedance 1.0 Pro Fast **Activated**. Đã xác nhận chế độ chỉ dùng miễn phí trên chính dòng model và bật cờ BYTEPLUS_FREE_QUOTA_CONFIRMED trong .env. Trang chưa hiển thị ngày hết hạn trong bảng. Giữ cờ false đến khi xác nhận kích hoạt và chế độ chỉ dùng miễn phí hỗ trợ model này. Chưa thực hiện tác vụ tạo video thật trong quá trình cấu hình.

Tài liệu: [Tạo tác vụ](https://console.byteplus.com/ark/region:ap-southeast-1/docs/create-video-generation-task-api), [danh sách tác vụ](https://console.byteplus.com/ark/region:ap-southeast-1/docs/list-video-generation-tasks-api), [bảng giá](https://www.byteplus.com/en/product/modelark/pricing).

---

# Đông Hồ Lab — kể chuyện và video

Tab **Kể chuyện & video** hỗ trợ hoạt ảnh 2D trên máy và video AI qua **SiliconFlow quốc tế (.com)**. Backend dùng Node.js 20 trở lên, không cần cài thêm thư viện npm.

## Kết nối SiliconFlow

1. Đăng nhập [SiliconFlow quốc tế](https://cloud.siliconflow.com). Kiểm tra số dư và điều kiện credit thưởng trong tài khoản.
2. Vào [API Keys](https://cloud.siliconflow.com/account/ak), tạo key riêng cho backend.
3. Trong tệp `.env` tại thư mục dự án, điền:

```dotenv
VIDEO_PROVIDER=siliconflow
SILICONFLOW_API_KEY=your_siliconflow_key
SILICONFLOW_CREDIT_CONFIRMED=false
PORT=8787
```

Key của `.cn`, Alibaba hoặc Pollinations không dùng thay key `.com`. Không dán key vào HTML, câu chuyện hoặc chat. Nếu chưa có `.env`, tạo từ `.env.example`; không ghi đè tệp đã chứa key.

4. Chạy backend hoặc khởi động lại sau khi đổi key:

```powershell
cd D:\lamho\genvideo
npm start
```

5. Mở [ứng dụng](http://127.0.0.1:8787), chọn **Kể chuyện & video** → **Kiểm tra kết nối**. Backend thử đọc số dư bằng `/v1/user/info`. Hiện endpoint này trả HTTP 410 (đã ngừng hoạt động), nên ứng dụng dùng API chỉ đọc `/v1/models?sub_type=text-to-video` để xác thực key và quyền dùng Wan. Không gọi API tạo nội dung khi kiểm tra kết nối. Số dư/coupon không đọc được sẽ hiển thị là chưa biết, không coi là 0 hoặc key sai.

## Credit dùng thử và chi phí

Ngày đối chiếu: 29/10/2026. [Bảng giá SiliconFlow](https://www.siliconflow.com/pricing) công bố $1 credit dùng thử và model Wan 2.2 giá $0.29/video. Khoảng ba video là phép tính dựa trên mức giá đó, **không phải số video được bảo đảm**. Credit có được cấp, còn hiệu lực và áp dụng cho model video hay không cần xác nhận trong tài khoản.

- Tạo API key miễn phí không đồng nghĩa tạo video miễn phí vĩnh viễn.
- Khi API số dư hoạt động, ứng dụng hiển thị tổng số dư; tổng số dư không chứng minh riêng phần credit thưởng được dùng cho video. SiliconFlow đã chuyển bonus balance sang **coupon**; kiểm tra **Account Overview / Coupons** trong tài khoản để biết giá trị, thời hạn và phạm vi dùng video. [Release notes](https://docs.siliconflow.com/en/release-notes/overview).
- Mỗi lần bấm tạo sẽ trừ credit theo giá hiện tại. Giá hiển thị trên website có thể thay đổi; kiểm tra trong tài khoản trước khi dùng.
- Khi không xác thực được key hoặc API trả số dư thực tế bằng 0, backend không gửi tác vụ video. Nếu API số dư trả 410, chỉ sau khi tự xác nhận credit/coupon còn dùng được cho video, đặt `SILICONFLOW_CREDIT_CONFIRMED=true` rồi khởi động lại Node. Cờ này là xác nhận thủ công, không phải bằng chứng API đã kiểm tra số dư. Backend vẫn xác thực key/model trước khi tạo. Cờ không bỏ qua lỗi mạng, key sai, thiếu model hoặc số dư 0 khi API còn hoạt động.
- Không tự chuyển sang Alibaba, Pollinations hoặc gọi thêm mô hình văn bản để dịch khi SiliconFlow lỗi hoặc hết credit.

## Luồng tạo video

Model: `Wan-AI/Wan2.2-T2V-A14B`, clip 5 giây. Chọn ngang 16:9, dọc 9:16 hoặc vuông 1:1. API không có tham số tùy chỉnh thời lượng hoặc FPS cho model này; giao diện ghi 5 giây và backend không gửi tham số không được hỗ trợ.

Tiêu đề, thông điệp, toàn bộ lời kể và tên tranh được ghép vào prompt có hướng dẫn phong cách Đông Hồ. Nội dung được gửi trực tiếp đến SiliconFlow, không gọi thêm dịch vụ dịch trả phí. Nhà cung cấp chưa xác nhận hỗ trợ tiếng Việt; prompt tiếng Anh có thể cho kết quả tốt hơn. Chưa có giọng đọc tiếng Việt hoặc ảnh bố cục ghép làm tham chiếu, nên video có thể khác tranh ghép.

Backend gửi đúng một `POST /v1/video/submit`, theo dõi bằng `/v1/video/status`, rồi tải MP4 vào trình duyệt. Không tự gửi lại yêu cầu tạo khi lỗi. Link kết quả có hạn nên backend tải ngay sau khi hoàn tất.

**Ngừng chờ** ngắt kết nối và dừng theo dõi; tác vụ phía nhà cung cấp có thể vẫn hoàn tất và tính credit. Kiểm tra Usage/Activity trước khi tạo lại. Video giữ tạm trong tab; tải MP4 trước khi đóng hoặc tải lại trang. Tệp dự án JSON chưa chứa video AI.

Tài liệu: [gửi tác vụ](https://docs.siliconflow.com/en/api-reference/videos/videos_submit), [theo dõi kết quả](https://docs.siliconflow.com/en/api-reference/videos/get_videos_status), [thông tin số dư](https://docs.siliconflow.com/en/api-reference/userinfo/get-user-info), [model Wan 2.2](https://www.siliconflow.com/models/wan2-2-t2v-a14b).

## Hoạt ảnh 2D

Xem thử, tạm dừng, tua và xuất WebM 12 giây miễn phí trên thiết bị, không cần key. Lời kể hiển thị bằng chữ, không có âm thanh. Mở trực tiếp `Dongho.html` vẫn dùng phần này; AI cần backend Node.js.

Khi chuyển từ tệp `file:` sang localhost, dữ liệu lưu trình duyệt thuộc vùng khác. Xuất JSON ở bản cũ rồi nhập vào bản localhost để chuyển dự án.

## Nhà cung cấp trước đây

Các adapter cũ được giữ để lựa chọn thủ công, không tự dùng làm dự phòng:

- `VIDEO_PROVIDER=alibaba`: `DASHSCOPE_API_KEY`, key Singapore/International. Chỉ đặt `ALIBABA_FREE_QUOTA_CONFIRMED=true` sau khi xác nhận còn quota và bật **Free Quota Only** cho cả `wan2.7-t2v` và `qwen-flash`. Cờ này là xác nhận cục bộ, không đọc được công tắc/quota trên Alibaba. Tài khoản hiện chưa hiển thị quota; không coi bảng marketing là hạn mức đã được cấp. [Hướng dẫn quota](https://www.alibabacloud.com/help/en/model-studio/new-free-quota).
- `VIDEO_PROVIDER=pollinations`: `POLLINATIONS_API_KEY`. Danh mục video hiện cần Pollen đã mua. Budget lúc tạo key là giới hạn chi tiêu, không phải số dư được tặng.

## Kiểm thử và chỉnh giao diện

```powershell
npm test
```

Các bài kiểm tra dùng API giả lập, không tiêu credit. Đã xác thực key/model thật qua API danh mục chỉ đọc (key thật trả 200, key giả đối chứng trả 401); endpoint số dư trả 410. Chưa gọi tạo video thật hoặc xác nhận credit/coupon của tài khoản.

Máy chủ chỉ lắng nghe tại `127.0.0.1`, không phục vụ `.env` và các tệp nguồn. Key chỉ gửi trong header đến API của nhà cung cấp được chọn; không gửi kèm key khi tải MP4 từ kho media.

Giao diện và mã AI có nguồn trong `web/`, được nhúng vào HTML:

```powershell
python scripts/update-story-ui.py
```

`scripts/patch-playback.py` là bản vá một lần cho mã hoạt ảnh cũ, đã áp dụng. HTML ban đầu được giữ tại `backups/Dongho.original.html`.

## Giọng kể tiếng Việt miễn phí

Bật “Tự ghép giọng đọc tiếng Việt miễn phí” để thêm tiếng sau khi AI tạo hình ảnh. Mặc định giọng Nam Minh (nam), có thể chọn Hoài My (nữ). Lời kể được gửi đến dịch vụ đọc trực tuyến Microsoft Edge qua [edge-tts](https://github.com/rany2/edge-tts), không cần API key hoặc tài khoản trả phí cho giọng đọc. Dịch vụ miễn phí có thể tạm lỗi hoặc thay đổi; ứng dụng không chuyển sang TTS trả phí. Giọng đọc này khác giọng của ChatGPT trong cuộc trò chuyện.

FFmpeg ghép âm thanh AAC vào MP4 H.264 ngay trên máy. Nếu lời kể dài hơn clip, giữ hình cuối đến hết lời; nếu lời kể ngắn hơn, giữ đủ clip gốc. Không tăng tốc hoặc cắt bỏ lời kể. Phần ghép thay âm thanh gốc bằng giọng kể, chưa thêm nhạc nền. Giới hạn đầu vào 128 MB, lời kể 1600 ký tự, thời lượng tối đa 5 phút.

Bấm “Ghép lời kể vào video hiện có” để đổi giọng hoặc thử lại riêng phần tiếng. Có thể chọn MP4 đã tải từ máy. Đường dẫn `/api/video/narrate` không cần key video và không gọi BytePlus, không tiêu token video. Nếu giọng đọc lỗi, video gốc vẫn tải được; không tự tạo video AI lại. MP4 chỉ giữ trong phiên trình duyệt, hãy tải trước khi đóng trang. Tệp tạm được xóa sau xử lý; file người dùng chọn không bị sửa.

Cài bộ đọc riêng trong dự án (Python 3.12 đã có trên máy):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-narration.txt
npm start
```

Có thể đặt biến môi trường tiến trình `NARRATION_PYTHON` trỏ đến Python khác đã cài đủ gói. Cần Internet để tạo giọng; FFmpeg chạy cục bộ từ wheel imageio-ffmpeg. `/api/narration/config` kiểm tra bộ đọc/FFmpeg đã cài, không hứa dịch vụ online luôn khả dụng.

## Video AI tối đa 30 giây

Bộ chọn thời lượng hỗ trợ 5, 10, 15, 20, 25, 30 giây cho Seedance 1.0 Pro Fast. Theo tài liệu BytePlus, model hỗ trợ tối đa 12 giây mỗi tác vụ; ứng dụng dùng đoạn 5/10 giây và ghép cục bộ cho các mức dài hơn. Ví dụ 30 giây = 3 tác vụ 10 giây, mỗi tác vụ dùng quota riêng. Không gửi duration=30 trực tiếp lên model và không tự tạo lại khi lỗi. Đoạn được tạo lần lượt theo mở đầu, diễn biến, kết thúc; có thể có khác biệt nhân vật/bối cảnh giữa các đoạn.

Trước khi gửi tác vụ dài, backend kiểm tra bộ FFmpeg đã cài. Giữ nguyên Free Credits Only Mode trong tài khoản. Không chạy tác vụ thật để thử tính năng này; kiểm tra ghép 30 giây bằng ba clip màu được tạo tại máy. Nếu lời kể dài hơn thời lượng hình ảnh, tính năng ghép giọng vẫn giữ hình cuối để đọc hết lời kể như trước.

## Giữ hình ảnh tranh Đông Hồ

FE gửi ảnh tranh gốc đang chọn (không dùng video AI trước đó) làm `image_url` với `role=first_frame` cho mọi đoạn Seedance. Ảnh được đặt trọn trong khung hình đã chọn, thêm nền giấy khi cần, không cắt hoặc kéo méo tranh. Prompt ưu tiên bố cục, số lượng/diện mạo nhân vật, nét khắc, màu phẳng, chất giấy và nền gốc; cấm vẽ lại theo 3D/ảnh thật, thêm người/vật/bối cảnh, đổi góc máy hoặc thay cảnh. Lời kể hướng dẫn cảm xúc, không được dùng để thêm yếu tố vắng mặt trong tranh. Không lấy được ảnh thì FE dừng trước khi gửi tác vụ; không tự chuyển sang tạo video chỉ từ chữ.

Tham chiếu khung hình đầu giúp bám tranh, không bảo đảm model giữ mọi chi tiết chính xác ở tất cả các khung hình. Đã kiểm tra payload ảnh/prompt bằng API giả lập, chưa chạy tác vụ thật để đánh giá độ bám tranh hoặc tiêu quota.

## Deploy Vercel: chỉ tạo video, chưa ghép tiếng

Import repository vào Vercel, Framework Preset Other, build `npm run build`, Output Directory `public`, Node.js 22.x. `vercel.json` đã đặt vùng Singapore và tuyến API.

Biến môi trường server cần có:
- `BYTEPLUS_API_KEY`: key ModelArk Singapore, chỉ lưu trên Vercel.
- `BYTEPLUS_FREE_QUOTA_CONFIRMED=true`: chỉ đặt sau khi tài khoản còn quota và bật Free Credits Only Mode cho model.

Bản cloud ẩn tính năng ghép giọng vào video; giọng đọc bài học được tạo sẵn vẫn nghe được. FE tạo từng tác vụ, hỏi trạng thái qua API ngắn và tải MP4 qua phản hồi streaming. Các mức 15–30 giây ghép bằng FFmpeg WebAssembly single-thread trong trình duyệt, tải khoảng 32 MB ở lần đầu. Không cần Python hoặc Railway. Bộ ghép được tải trước khi gửi các tác vụ dài. Máy yếu có thể ghép chậm. API key không được nhúng vào HTML/JS và không đưa `.env` lên GitHub.

Video AI vẫn có thể làm lệch chi tiết so với ảnh đầu, dù prompt giữ tranh và mỗi đoạn đều dùng cùng tranh gốc. API công khai dùng quota tài khoản được cấu hình; quản lý quyền chia sẻ đường dẫn và quota tại Vercel/BytePlus.

### Nối tiếp cảnh trong video dài

Đoạn đầu dùng tranh gốc. Sau mỗi đoạn, FFmpeg lấy khung cuối làm ảnh đầu cho đoạn tiếp theo; prompt yêu cầu tiếp tục đúng vị trí/tư thế và hướng chuyển động, không quay lại khung gốc hoặc đổi góc máy. Cả bản local và cloud dùng cách nối tiếp này. Không lấy được khung nối thì dừng trước khi gửi đoạn kế tiếp, không tự tạo lại. Đây là ràng buộc ảnh/prompt, không bảo đảm AI giữ nguyên tuyệt đối mọi chi tiết giữa các đoạn.


## Học liệu, giọng đọc và trò chơi di sản

Nội dung bài học và chú giải sáu tranh nằm trong `heritage/content.json`; ảnh gốc nằm ở `heritage/images/`. Các bản đọc tiếng Việt được tạo sẵn bằng Microsoft Edge, lưu thành MP3 trong `heritage/audio/`. Người học nghe bằng trình phát HTML, không gọi dịch vụ TTS hoặc dùng quota BytePlus khi nghe. Dịch vụ Edge có thể tạm thời không khả dụng khi cần tạo lại giọng đọc.

Trang chủ có sáu lối vào bài học và trò chơi. Phần giới thiệu cho chọn video từ máy để xem thử vì học liệu chưa kèm tệp video; video chọn tại đây không tự tải lên máy chủ. Danh mục đã bỏ Đám cưới chuột, Vinh hoa – Phú quý và gộp hai mục Đàn gà trùng nhau.

Xưởng ghép có nút bật hình chuẩn mờ để tự đối chiếu. Các mảnh vẫn kéo hoặc di chuyển bằng phím mũi tên được; nút này không tự xếp hay chấm bố cục. Bộ Gia đình gà dùng ô cắt SVG tham chiếu trực tiếp ảnh gốc, không vẽ lại các hình tượng.

Ba trò chơi gồm giải 10 hàng ngang, đoán tên 5 tranh và nối 6 cặp thông tin. Bài ôn tập chọn 10 câu từ ngân hàng 37 câu, đảo lựa chọn và chấm đúng theo thứ tự mới; có thể bắt đầu bộ câu hỏi khác. Bài ôn tập chỉ phục vụ tự học.

`node scripts/update-heritage-ui.mjs` nhúng các nguồn `web/app.js`, `web/heritage-*.js`, CSS và học liệu vào HTML. Lệnh build tự cập nhật HTML và sao chép ảnh/MP3 vào `public/heritage/`. Chỉnh giao diện video ở `web/story-ai.js` thì chạy `python scripts/update-story-ui.py` trước khi build như trước.


## Hoàn thiện bản đồ và bộ ghép

Trang chủ dùng nền bản đồ chibi riêng ở heritage/images/dongho-village-map-v3.webp với sáu điểm bấm và danh sách chọn nhanh trên điện thoại. Prompt ở heritage/map-design.txt. Ảnh tranh gốc không đổi.

heritage/object-masks.json chứa đa giác của 12 hình tượng Thầy đồ cóc và 10 hình tượng Thư hùng. web/heritage-masks.js dùng điểm ảnh gốc cho mảnh và nền, không vẽ bù phần bị che. Mảnh cũ được giữ để mở bản thảo đã lưu, không xuất hiện trong bộ mảnh mới.

Ô chữ có 80 ô cho 10 hàng, nhận nhập có dấu hoặc dán nguyên đáp án, hỗ trợ phím mũi tên và Backspace. Video giới thiệu là bản minh họa 76 giây dựng tại máy từ học liệu và giọng đọc có sẵn, có thể thay bằng video gốc sau. Hai bản đọc có câu chỉ dẫn đã được tạo lại sau biên tập.
