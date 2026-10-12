# Viết hội thoại bằng CSV

Mọi câu thoại của các hệ thống dưới đây nằm trong thư mục `data/`. Game đọc thẳng từ các file này, không cần sửa code.

| File | Dùng cho |
|---|---|
| `session.csv` | Yappy Yappy tạm thời trong lúc sửa: câu mở đầu, câu kết, phản ứng sau mỗi level, lúc vỡ layer, câu đố toán |
| `morning.csv` | Hội thoại Boss đầu ngày, kể cả buổi briefing Day 1 |
| `night_boss.csv` | Boss nhắn buổi tối: chào, hỏi về từng cô, lúc cô ấy được xuất viện, chúc ngủ ngon |
| `night_index.csv` | **Danh sách và điều kiện** của các cuộc chat tối với các cô gái |
| `night_lines.csv` | Lời thoại của các cuộc chat tối đó |

## Quy trình làm việc

1. Mở file CSV bằng Google Sheets (File → Import → Upload) hoặc Excel.
2. Viết, sửa hoặc thêm dòng.
3. Xuất lại thành CSV:
   - Google Sheets: File → Download → **Comma-separated values (.csv)**.
   - Excel: Save As → **CSV UTF-8**. Phải là bản UTF-8, nếu không các ký tự như ♡ hay ∫ sẽ hỏng.
4. Lên GitHub, vào thư mục `data/` → **Add file → Upload files**. Kéo file vào (giữ **đúng tên cũ**) rồi bấm **Commit changes**.
5. Đợi khoảng 1 phút để GitHub Pages cập nhật. Mở game và tải lại trang bằng Ctrl+F5.

Cũng có thể sửa trực tiếp trên GitHub: mở file → biểu tượng bút chì → sửa → Commit.

**Kiểm tra lỗi:** thêm `?check` vào cuối link game, ví dụ `https://feeva2498.github.io/can-you-fix-her/?check`. Game sẽ mở `dialogue_check.txt`, liệt kê số đoạn đã đọc được và từng lỗi kèm tên file và số dòng (đúng số dòng trong Sheets). Nếu có lỗi, file này cũng tự bật lên mà không cần `?check`.

> Muốn chơi lại từ đầu để thử: Start → New game…

## Quy tắc chung (áp dụng cho mọi file)

- **Mỗi dòng là một câu.**
- **Các dòng có cùng `id` tạo thành một đoạn hội thoại**, chạy theo thứ tự từ trên xuống.
- Các cột thông tin của đoạn (`girl`, `day`, `if`, `kind`…) **chỉ cần ghi ở dòng đầu tiên** của đoạn.
- Ô `id` để trống nghĩa là dòng đó thuộc đoạn ngay phía trên.
- Không đổi tên hay xoá cột. Thứ tự cột không quan trọng. Cột `note` là ghi chú tự do, game bỏ qua.

### Cột `type`: loại dòng

| type | Nghĩa |
|---|---|
| `line` | Nhân vật nói một câu. Để trống cũng được hiểu là `line`. |
| `choice` | Một lựa chọn của người chơi. Các `choice` liền nhau tạo thành một bộ lựa chọn. |
| `reply` | Câu nhân vật đáp lại **lựa chọn ngay phía trên**. |

Sau phần `reply`, một dòng `line` mới sẽ bắt đầu đoạn tiếp theo, sau khi người chơi đã chọn. Ví dụ:

| id | type | emo | text |
|---|---|---|---|
| prim_2 | line | surprised | oh. hi. you messaged first. |
| | choice | | What do you like to draw? |
| | reply | shy | ...i'm not really an artist. |
| | reply | sad | please don't tell boss. |
| | choice | | Just checking in. |
| | reply | happy | that's nice. thanks. |
| | line | neutral | do you draw too? |

### Các cột khác

- **`who`**: ai nói câu này.
  - Để trống: chủ của cuộc chat (cô gái đó, hoặc Boss).
  - `sys`: dòng hệ thống, ví dụ `*** Prim updated her exhibit ***`.
  - Có thể ghi `boss`, `prim`, `trix`.
- **`emo`**: biểu cảm, hiện trên avatar và live feed. Dùng một trong: `neutral`, `happy`, `sad`, `angry`, `surprised`, `shy`, `pain`, `wince`.
- **`text`**: nội dung câu. Có thể chèn biến:

  | Biến | Thành |
  |---|---|
  | `{name}` | tên người chơi đặt ở Day 0 |
  | `{day}` | ngày hiện tại |
  | `{days_left}` | "13 days", "1 day" |
  | `{kpi}` | "KPI 3/6 layers" |
  | `{patients}` | tên các cô có thể sửa hôm nay, ví dụ "Prim, Trix" (hoặc "nobody") |
  | `{girl}` | tên cô gái đang được hỏi (chỉ dùng trong `night_boss.csv`) |

- **`requires`** (chỉ dùng ở dòng `choice`): điều kiện để mở lựa chọn. Chưa đủ thì lựa chọn hiện thành ô đen có ổ khoá, không lộ nội dung. Cú pháp xem phần Điều kiện bên dưới.
- **`effects`**: việc xảy ra khi người chơi chọn (dòng `choice`), hoặc ngay trước khi câu hiện ra (dòng `line`). Nhiều hiệu ứng thì ngăn cách bằng dấu `;`.

  | Hiệu ứng | Nghĩa |
  |---|---|
  | `know:prim_sea` | người chơi biết thêm một điều (dùng để mở khoá chỗ khác) |
  | `flag:ten_co` / `unflag:ten_co` | bật / tắt một cờ tự đặt tên |
  | `pause:900` | dừng 900 ms trước câu này |
  | `glitch` | màn hình nhiễu một chút |
  | `probation` | lộ thông tin thử việc 14 ngày (Day 1) |
  | `ping:brain` | Fix-it nhấp nháy (Day 1) |

- **`journal`**: câu Boss ghi vào nhật ký khi người chơi chọn lựa chọn này. Nhật ký được lộ ra ở ending.

## Điều kiện (cột `if` và `requires`)

Nhiều điều kiện ngăn cách bằng `;` và phải đúng **tất cả**. Dùng `|` để chỉ cần **một trong** các điều kiện. Thêm `!` phía trước để phủ định.

| Điều kiện | Đúng khi |
|---|---|
| `know:trix_math` | người chơi đã biết điều đó |
| `flag:abc` | cờ `abc` đã bật |
| `app:Atlas.exe` | đã tải phần mềm từ email |
| `used:UnitConv.exe` | đã **mở dùng** phần mềm đó |
| `memento:pressed_flower.mem` | đang có memento đó |
| `met:trix` | đã gặp cô ấy |
| `gone:prim` | cô ấy đã xuất viện |
| `worked:prim` | hôm nay có sửa cho cô ấy |
| `special:showcase` | hôm nay là ngày đặc biệt (`showcase`, `postcard`, `inspection`, hoặc `none`) |
| `day>=5`, `day=7`, `day<10` | so sánh ngày |
| `layers.trix>=1` | số layer của cô ấy đã vỡ |
| `sessions.prim>=3` | số buổi đã sửa cho cô ấy |
| `quakes>=2`, `kpi>=4`, `patients=0` | số trận động đất, tổng layer đã vỡ, số cô có thể sửa hôm nay |

Ví dụ:
- `know:prim_traces|prim_color`: biết một trong hai điều.
- `day>=5; !flag:told_boss`: từ ngày 5 trở đi, và cờ `told_boss` chưa bật.

Các điều đang có trong game: `prim_traces`, `prim_hand`, `prim_sea`, `prim_color`, `trix_math`, `trix_chess`, `trix_proofs`, `trix_soft`, `trix_ocd`, `boss_travel`, `boss_lie`. Bạn có thể đặt tên mới tuỳ ý bằng `know:` trong effects.

## session.csv: chat tạm thời lúc sửa

Cột: `id, girl, kind, layer, trigger, if` + các cột hội thoại.

| kind | Khi nào | layer | trigger |
|---|---|---|---|
| `intro` | đầu mỗi buổi sửa, chọn ngẫu nhiên 1 đoạn | — | — |
| `react` | sau mỗi level, ngẫu nhiên trong các đoạn khớp | layer **đang sửa** (1, 2, 3) | kết quả level (bảng dưới) |
| `break` | khi vừa vỡ một layer | layer **vừa vỡ** (1, 2, 3) | — |
| `outro` | hết 5 level | — | — |
| `quiz` | thỉnh thoảng (30%) chen sau `react` khi qua màn; thứ tự lựa chọn tự xáo | — | — |

`trigger` cho `react`:

| trigger | Nghĩa |
|---|---|
| `WIN_HIGH` / `WIN_LOW` | qua màn, điểm cao (S/A) hoặc thấp (B/C) |
| `PERFECT_HIGH` / `PERFECT_LOW` | qua màn, không thừa nét nào, điểm cao / thấp |
| `FAIL_MOVES` / `FAIL_TIME` | thua vì hết lượt / hết giờ |

Để trống `layer` hoặc `trigger` nghĩa là "mọi trường hợp" (dùng làm câu dự phòng).

Nhớ quy tắc: các cô **không nhìn thấy** bảng chơi, chỉ **cảm thấy** (nhói, đau, ù tai…).

## morning.csv: Boss đầu ngày

Cột: `id, day, if, group, once` + các cột hội thoại.

Mỗi sáng, game đi **từ trên xuống dưới** và nối tất cả các đoạn thoả điều kiện thành một cuộc trò chuyện.

- **`day`**: `3` hoặc khoảng `2-14`. Để trống là mọi ngày. Đoạn có `day` = 1 là buổi briefing Day 1.
- **`if`**: điều kiện thêm.
- **`group`**: trong cùng một group, mỗi sáng **chỉ đoạn đầu tiên khớp** được dùng. Ví dụ group `menu`: hỏi một câu chưa hỏi, hết câu thì dùng đoạn thường.
- **`once`**: ghi `yes` thì đoạn chỉ xuất hiện một lần trong cả game.

## night_boss.csv: Boss buổi tối

Cột: `id, kind, girl, day, if` + các cột hội thoại.

Boss nhắn theo thứ tự: `opening` → `ask` (cho mỗi cô đã sửa hôm nay) → `extra` → `closing`.

| kind | Cách chọn |
|---|---|
| `opening` | đoạn khớp đầu tiên (thường mỗi ngày một câu kể chuyện du lịch) |
| `ask` | câu hỏi về **từng cô** đã sửa hôm nay. Ưu tiên: đúng cô + đúng ngày → đúng cô, `day` trống → `girl` trống (dùng chung, có `{girl}`) |
| `farewell` | thay phần câu hỏi vào đêm cô ấy xuất viện. Nhật ký tự thêm "Her last day · " |
| `extra` | mọi đoạn khớp, ví dụ ngày Showcase |
| `closing` | đoạn khớp đầu tiên |

Nhớ ghi `journal` cho từng lựa chọn của `ask`: đó là thứ được viết vào nhật ký của Boss.

## night_index.csv + night_lines.csv: chat tối với các cô

`night_index.csv` là danh sách, mỗi cuộc chat **một dòng**:

| Cột | Nghĩa |
|---|---|
| `id` | tên cuộc chat, trùng với `id` trong `night_lines.csv` |
| `girl` | `prim`, `trix`… |
| `order` | thứ tự kể chuyện của cô ấy (1, 2, 3…) |
| `starts` | `girl`: cô ấy nhắn trước, hiện "đang gõ…", nếu người chơi không đọc thì vẫn chờ sang đêm sau. `me`: người chơi phải chủ động nhắn. |
| `layers_broken` | số layer cô ấy **phải vỡ rồi** thì chat này mới mở (người chơi không thấy điều kiện này) |
| `if` | điều kiện thêm, ví dụ `know:trix_math` hoặc `day>=6` |

Cách hoạt động:
- Mỗi cô chạy lần lượt theo `order`.
- Chat tiếp theo chưa đủ điều kiện thì cô ấy "offline" tới khi đủ, không nhảy cóc.
- Mỗi đêm nói chuyện tối đa 2 cô. Đã bắt đầu thì phải nói hết.
- Cô nào đã được sửa ít nhất một lần thì buổi tối mới có thể chat.

Game nhớ những chat đã xem theo `id`, nên có thể chèn chat mới vào giữa mà không hỏng save cũ. Chỉ cần đặt `order` phù hợp, ví dụ 2.5.

`night_lines.csv` chứa lời thoại với các cột hội thoại chung. Mọi `id` ở đây phải có trong `night_index.csv`; nếu không, `?check` sẽ báo.

## Mẹo

- Trong Google Sheets, có thể gộp 5 file thành 5 tab của cùng một bảng. Khi xuất, tải từng tab thành CSV (Download chỉ xuất tab đang mở).
- Dấu phẩy hay xuống dòng trong câu thoại không sao: Sheets và Excel tự bọc ngoặc kép khi xuất CSV.
- Nếu bạn mở file `index.html` trực tiếp trên máy (không qua link GitHub Pages), game dùng bản CSV được đóng gói sẵn trong file. Muốn cập nhật bản đóng gói thì chạy `python3 build.py`.
