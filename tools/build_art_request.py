# Builds the art request workbook for "Can You Fix Her"
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter
import sys

OUT = sys.argv[1]
F = 'Arial'
GIRLS = [('prim', 'Prim', 'Jirai Kei', 'P1'), ('trix', 'Trix', 'E-Girl', 'P1'), ('paige', 'Paige', 'Goth', 'P2'), ('vel', 'Vel', 'Gyaru', 'P2'), ('myne', 'Myne', 'Tomboy', 'P2')]
EMOS = [('neutral', 'bình thường'), ('happy', 'vui'), ('sad', 'buồn'), ('angry', 'cáu'), ('surprised', 'ngạc nhiên'), ('shy', 'ngại / đỏ mặt'), ('pain', 'đau'), ('wince', 'nhăn mặt (đau nhẹ)')]

rows = []
def add(group, screen, name, desc, variants, count, size, fmt, file, prio, note=''):
    rows.append([group, screen, name, desc, variants, count, size, fmt, file, prio, note])

# ---------------- 1. Branding & system screens ----------------
G = '1. Thương hiệu & màn hình hệ thống'
add(G, 'Title screen', 'Logo "Can You Fix Her"', 'Logo chữ của game, hiện giữa màn hình tiêu đề. Dễ thương, hơi rợn (cute + creepy), hợp tông pastel.', 'Bản màu + bản 1 màu (trắng) để đặt trên nền tối', 2, '640×240', 'PNG nền trong', 'logo_cyfh.png / logo_cyfh_white.png', 'P1')
add(G, 'Title screen', 'Nền màn hình tiêu đề', 'Nền phía sau logo và menu Continue / New game / Test chamber.', '1 bản, có thể có lớp chuyển động (layer) riêng', 1, '1920×1080', 'PNG', 'bg_title.png', 'P1')
add(G, 'Title screen', 'Khung menu tiêu đề', 'Khung chứa 3 nút Continue / New game / Test chamber.', '1 khung 9-slice', 1, '480×260 (9-slice)', 'PNG', 'ui_title_menu.png', 'P2')
add(G, 'Boot', 'Logo DIVE OS', 'Logo hệ điều hành giả "DIVE OS" (hiện lúc khởi động và góc desktop). Chữ "DIVE OS ♡".', 'Bản lớn + bản nhỏ watermark góc desktop', 2, '640×200 / 320×100', 'PNG nền trong', 'logo_diveos.png / logo_diveos_small.png', 'P1')
add(G, 'Boot', 'Màn hình khởi động', 'Màn boot: logo DIVE OS, dòng "v2.4 ♡ patient care network", thanh loading.', 'Nền + thanh loading (khung + phần chạy)', 3, '1920×1080 / thanh 480×24', 'PNG', 'bg_boot.png, ui_loadbar_frame.png, ui_loadbar_fill.png', 'P1')
add(G, 'Day 0', 'Màn tạo nhân vật – nền & khung', 'Màn "Choose desired appearance": khung xem trước avatar, các nhóm lựa chọn (tóc, màu tóc, mắt, da, trang phục, phụ kiện), nút Random/Confirm.', 'Nền + khung preview + ô chọn màu', 3, '1920×1080 / khung 320×320', 'PNG', 'bg_creator.png, ui_creator_preview.png, ui_swatch.png', 'P1')
add(G, 'Day 0', 'Màn "Creating avatar… / Overriding memor…"', 'Thẻ loading khi tạo avatar, sau đó chữ glitch "Overriding memor…" rồi tối đen.', 'Thẻ loading + lớp nhiễu glitch (3–4 frame)', 5, '600×200 / glitch 1920×1080', 'PNG / sprite sheet', 'ui_loadcard.png, fx_glitch_sheet.png', 'P2')
add(G, 'Login', 'Màn đăng nhập / khoá máy', 'Màn login giữa các buổi (lunch break, "Shift over"). Có thẻ người dùng (avatar + tên) và dòng "Probation · day N of 14".', 'Nền + thẻ người dùng + nút', 3, '1920×1080 / thẻ 360×220', 'PNG', 'bg_login.png, ui_login_card.png, ui_login_btn.png', 'P1')
add(G, 'Chuyển ngày', 'Thẻ chuyển ngày / đặc biệt', 'Banner hiện khi sang ngày mới và các ngày đặc biệt: HOBBY SHOWCASE (ngày 3), POSTCARD DAY (ngày 7), INSPECTION DAY (ngày 10).', 'Ngày thường + 3 ngày đặc biệt', 4, '960×240', 'PNG', 'banner_day.png, banner_showcase.png, banner_postcard.png, banner_inspection.png', 'P2')
add(G, 'Sự kiện', 'Hiệu ứng động đất', 'Overlay nứt màn hình / nhiễu khi có động đất (ngày 5, 8, 11, 13).', '3–4 frame nứt + 1 lớp nhiễu', 4, '1920×1080', 'PNG sprite sheet', 'fx_quake_sheet.png', 'P2')
add(G, 'Kết thúc', 'Màn kết thúc (ending)', 'Màn hình cuối game sau khi đọc journal của Boss. Cần hỏi biên kịch về nội dung từng ending trước khi vẽ.', 'Theo số ending (tạm tính 2)', 2, '1920×1080', 'PNG', 'bg_ending_a.png, bg_ending_b.png', 'P3', 'Chờ chốt kịch bản Act V')
add(G, 'Hệ thống', 'Icon ứng dụng / favicon', 'Icon của game (tab trình duyệt, file .exe sau này).', '16, 32, 64, 256', 4, '16/32/64/256', 'PNG + ICO', 'app_icon_*.png', 'P2')
add(G, 'Hệ thống', 'Bộ con trỏ chuột', 'Con trỏ pixel: thường, trỏ tay (bấm), kéo, chờ (busy, có animation), cấm.', '5 loại, busy 4–6 frame', 9, '32×32', 'PNG / CUR', 'cursor_*.png', 'P3')

# ---------------- 2. Desktop & window kit ----------------
G = '2. Desktop & bộ khung cửa sổ'
add(G, 'Desktop', 'Hình nền desktop', 'Nền desktop DIVE OS. Hiện tại là caro hồng–tím + họa tiết tim/sao pixel. Cần bản lặp (tile) liền mạch.', 'Ngày + tối (night) + bản mất màu (khi game có hiệu ứng desaturate)', 3, 'tile 240×240', 'PNG tile', 'bg_desktop_day.png, bg_desktop_night.png', 'P1')
add(G, 'Desktop', 'Watermark góc desktop', 'Chữ "DIVE OS ♡" lớn mờ ở góc dưới phải desktop.', '1', 1, '480×120', 'PNG nền trong', 'desktop_watermark.png', 'P2')
add(G, 'Taskbar', 'Thanh taskbar', 'Thanh dưới cùng: nút Start, các nút cửa sổ đang mở, khay đồng hồ (ngày + giờ, nốt nhạc bật/tắt tiếng).', 'Nền thanh + nút cửa sổ (thường/đang chọn) + khay đồng hồ', 4, 'cao 48, 9-slice', 'PNG', 'ui_taskbar_*.png', 'P1')
add(G, 'Taskbar', 'Nút Start + menu Start', 'Nút Start (thường/hover/nhấn) và menu Start (khung + highlight dòng).', 'Nút 3 trạng thái + khung menu + highlight', 5, 'nút 96×36 / menu 9-slice', 'PNG', 'ui_start_*.png', 'P1')
add(G, 'Cửa sổ', 'Khung cửa sổ', 'Khung cửa sổ kiểu Win98 pastel: thanh tiêu đề (đang chọn / không chọn), viền, vùng nội dung.', 'Active + inactive, 9-slice', 2, '9-slice (góc 16×16)', 'PNG', 'ui_window_active.png, ui_window_inactive.png', 'P1')
add(G, 'Cửa sổ', 'Nút trên thanh tiêu đề', 'Nút thu nhỏ (_) và đóng (×).', '2 nút × 3 trạng thái (thường/hover/nhấn)', 6, '24×24', 'PNG', 'ui_tbtn_min_*.png, ui_tbtn_close_*.png', 'P1')
add(G, 'Điều khiển', 'Nút bấm', 'Nút thường và nút chính (primary, màu hồng).', '2 kiểu × 4 trạng thái (thường/hover/nhấn/disabled)', 8, '9-slice', 'PNG', 'ui_btn_*.png', 'P1')
add(G, 'Điều khiển', 'Checkbox, radio, ô nhập, thanh cuộn', 'Bộ điều khiển chung: checkbox (bật/tắt), radio, ô nhập chữ, thanh cuộn (rãnh + con trượt + mũi tên).', 'Theo mô tả', 10, '16–24 px', 'PNG', 'ui_check_*.png, ui_input.png, ui_scroll_*.png', 'P2')
add(G, 'Điều khiển', 'Khung lõm (sunken) & khung nổi (bevel)', 'Hai kiểu khung dùng khắp nơi trong cửa sổ: lõm vào (ô chứa) và nổi lên (thẻ).', '2 kiểu 9-slice', 2, '9-slice', 'PNG', 'ui_sunken.png, ui_bevel.png', 'P1')
add(G, 'Thông báo', 'Toast thông báo', 'Popup góc màn hình khi có tin nhắn / mail / memento mới.', 'Khung + icon chuông', 2, '360×96 9-slice', 'PNG', 'ui_toast.png', 'P1')
add(G, 'Thông báo', 'Huy hiệu "new" & chấm ping', 'Huy hiệu "N new" trên icon desktop và chấm nhấp nháy (ping) để gợi ý bấm.', 'Badge + ping (3 frame)', 4, '48×20 / 16×16', 'PNG', 'ui_badge_new.png, ui_ping_sheet.png', 'P2')
add(G, 'Hộp thoại', 'Hộp thoại xác nhận', 'Hộp thoại hỏi xác nhận (ví dụ New game sẽ xoá save, Shut down).', 'Khung + icon cảnh báo', 2, '9-slice / icon 32×32', 'PNG', 'ui_dialog.png, ic_warning.png', 'P2')

# ---------------- 3. Icons ----------------
G = '3. Icon (desktop, file, ứng dụng)'
ICONS = [
    ('chat', 'Yappy Yappy (app nhắn tin)', 'P1'), ('mail', 'DiveMail (app thư)', 'P1'), ('wrench', 'Fix-it (app chữa trị)', 'P1'),
    ('box', 'MementoBox (hộp kỷ vật) + ô trống trong hộp', 'P1'), ('tmp', 'file session_<girl>.tmp (đang có buổi)', 'P1'), ('trash', 'Recycle Bin – rỗng & có rác', 'P1'),
    ('lockdoc', 'personal_log.txt (file bị khoá / khôi phục)', 'P2'), ('gallery', 'Showcase.exe', 'P2'), ('conv', 'UnitConv.exe', 'P2'), ('atlas', 'Atlas.exe', 'P2'),
    ('brain', 'PROJECT3D.EXE / máy chiếu não', 'P1'), ('img', 'Magnifier.exe (kính lúp) / ảnh', 'P1'), ('feed', 'VideoFeed.exe (camera phòng)', 'P1'),
    ('puzzle', 'Test chamber / bảng puzzle', 'P2'), ('folder', 'Thư mục', 'P2'), ('folderlock', 'Thư mục bị khoá', 'P2'), ('doc', 'Tài liệu / Notepad', 'P2'),
    ('journal', 'Journal của Boss', 'P2'), ('exe', 'File .exe chung', 'P3'), ('lock', 'Khoá', 'P3'), ('drive', 'Ổ đĩa', 'P3'), ('soul', 'Linh hồn / lõi (core)', 'P2'),
    ('charm', 'Bùa (charm)', 'P3'), ('flower', 'Memento: pressed_flower.mem', 'P1'), ('dice', 'Memento: lucky_d20.mem', 'P1'), ('thread', 'Memento: tracing_paper.mem', 'P1'),
    ('hourglass', 'Memento: hourglass.mem', 'P1'), ('queen', 'Memento: queen_piece.mem', 'P1'), ('sketch', 'Memento: sketch_of_you.mem (bức vẽ của Prim)', 'P1'),
]
for k, d, pr in ICONS:
    n = 3 if k == 'trash' else 2
    add(G, 'Icon', f'Icon "{k}"', f'{d}. Pixel art, đọc rõ ở cỡ nhỏ. Hiện đang là placeholder vẽ bằng code.', 'Cỡ 32 (desktop) + cỡ 16 (taskbar / tiêu đề cửa sổ)' + (' · rỗng/đầy' if k == 'trash' else ''), n, '32×32 + 16×16', 'PNG nền trong', f'ic_{k}_32.png, ic_{k}_16.png', pr)

# ---------------- 4. Characters ----------------
G = '4. Nhân vật'
for g, name, tag, pr in GIRLS:
    add(G, name, f'{name} – sprite toàn thân ngồi ghế', f'{name} ({tag}) ngồi trên ghế trị liệu trong phòng, nhìn từ camera. Dùng ở VideoFeed / Live feed. Prim, Trix đang có bản tạm (82×170, 124×170).', 'Tư thế ngồi + mắt nhắm/mở (blink) + trạng thái "discharged" (đã xuất viện, mờ/ghế trống)', 4, '~160×340 (pixel art ×2 của bản hiện tại)', 'PNG nền trong', f'{g}_body.png, {g}_body_blink.png, {g}_body_gone.png', pr)
    for e, vi in EMOS:
        add(G, name, f'{name} – chân dung {e}', f'Avatar chat của {name}, biểu cảm {vi}. Dùng ở Yappy Yappy, MementoBox, Showcase, chat trong máy chiếu.', '1 khung + bản blink (riêng neutral)' if e == 'neutral' else '1 khung', 2 if e == 'neutral' else 1, '64×64 (hiện tại 48×48)', 'PNG', f'{g}_face_{e}.png', pr)
    add(G, name, f'{name} – mặt cận (Magnifier)', f'Ảnh cận mặt {name} khi Magnifier zoom vào trước khi quét não.', '1', 1, '256×256', 'PNG', f'{g}_closeup.png', 'P2')
add(G, 'Boss (Ray)', 'Avatar Boss "?"', 'Avatar ẩn danh của Boss (@r.admin): dấu "?" trong khung. Không lộ mặt.', '1 + bản có chấm "đang gõ"', 2, '64×64', 'PNG', 'boss_face_unknown.png', 'P1')
add(G, 'Boss (Ray)', 'Ray – chân dung lộ diện', 'Chỉ dùng ở ending / journal cuối (twist: Boss chưa từng rời khỏi thành phố). Cần hỏi biên kịch về ngoại hình.', 'neutral + sad + happy', 3, '64×64 + 256×256', 'PNG', 'ray_face_*.png', 'P3', 'Chờ chốt kịch bản')
add(G, 'DIVE Administration', 'Logo / avatar DIVE Administration', 'Avatar của tài khoản hệ thống (no-reply) gửi mail / thông báo kiểm tra.', '1', 1, '64×64', 'PNG', 'dive_admin_face.png', 'P2')
add(G, 'Phòng trị liệu', 'Nền phòng (room 0)', 'Phòng nơi các cô gái ngồi ghế, nhìn qua camera (VideoFeed / Live feed). Có ghế trị liệu ở giữa.', 'Ngày + tối (nếu có ca đêm)', 2, '640×480', 'PNG', 'bg_room0.png', 'P1')
add(G, 'Phòng trị liệu', 'Lớp phủ camera', 'Khung camera: chữ "● REC · room 0", góc viền, nhiễu scanline, kính lúp di chuyển vào đầu nhân vật.', 'Khung + kính lúp', 2, '640×480 / kính 96×96', 'PNG', 'ui_cam_overlay.png, ui_lens.png', 'P2')

# ---------------- 5. Player avatar ----------------
G = '5. Avatar người chơi (Day 0)'
add(G, 'Thân', 'Thân & đầu cơ bản', 'Thân người chơi, vẽ thành lớp (layer) để ghép. 3 màu da: Light, Warm, Deep.', '3 màu da', 3, '64×64 mỗi lớp', 'PNG theo lớp', 'av_base_skin{1-3}.png', 'P1', 'Tất cả lớp avatar cùng khung 64×64 và cùng điểm gốc để ghép chồng')
add(G, 'Tóc', 'Kiểu tóc', '4 kiểu: Short, Messy, Long, Ponytail (+ 2 kiểu dành cho NPC: twin tails của Prim, tóc dài có mái của Trix). Tóc vẽ màu xám để đổi màu bằng code, hoặc vẽ đủ 6 màu: Ink, Cocoa, Honey, Sakura, Sky, Snow.', '4 kiểu (×6 màu nếu không đổi màu bằng code); mỗi kiểu có lớp trước + lớp sau', 8, '64×64', 'PNG theo lớp', 'av_hair_{short,messy,long,ponytail}_{front,back}.png', 'P1')
add(G, 'Mắt & mặt', 'Bộ biểu cảm khuôn mặt', 'Mắt + miệng + má hồng cho 8 biểu cảm (neutral, happy, sad, angry, surprised, shy, pain, wince) + chớp mắt. Mắt 4 màu: Violet, Mint, Ruby, Ocean (đổi bằng code hoặc vẽ đủ).', '8 biểu cảm + blink', 9, '64×64', 'PNG theo lớp', 'av_face_{neutral,happy,sad,angry,surprised,shy,pain,wince,blink}.png', 'P1')
add(G, 'Trang phục', 'Trang phục', '4 bộ: Hoodie, Cardigan, Shirt & tie, Sweater.', '4', 4, '64×64', 'PNG theo lớp', 'av_outfit_{hoodie,cardigan,shirt,sweater}.png', 'P1')
add(G, 'Phụ kiện', 'Phụ kiện', 'Glasses, Bandage (băng dán), Hairclip (kẹp tóc). Ô "None" không cần vẽ.', '3', 3, '64×64', 'PNG theo lớp', 'av_acc_{glasses,bandage,hairclip}.png', 'P1')
add(G, 'Avatar creator', 'Icon nhóm lựa chọn', 'Icon nhỏ cho từng nhóm trong màn tạo nhân vật: tóc, màu tóc, mắt, da, trang phục, phụ kiện, ngẫu nhiên.', '7', 7, '24×24', 'PNG', 'ic_creator_*.png', 'P3')

# ---------------- 6. Apps ----------------
G = '6. Ứng dụng & nội dung cửa sổ'
add(G, 'Yappy Yappy', 'Giao diện app chat', 'App nhắn tin: danh sách liên hệ (Boss, các cô gái, session), khung chat, ô chọn câu trả lời, chỉ báo "đang gõ…".', 'Khung danh bạ + dòng liên hệ (thường/đang chọn/có tin) + thanh tiêu đề chat', 5, '9-slice', 'PNG', 'ui_yap_*.png', 'P1')
add(G, 'Yappy Yappy', 'Bong bóng chat', 'Bong bóng của: người chơi, cô gái, Boss, tin hệ thống (sys, căn giữa). Có đuôi.', '4 kiểu 9-slice', 4, '9-slice', 'PNG', 'ui_bubble_{me,her,boss,sys}.png', 'P1')
add(G, 'Yappy Yappy', 'Biểu cảm nhỏ (emote)', 'Ký hiệu cảm xúc nổi cạnh avatar: ♪ vui, … buồn, ! ngạc nhiên, # cáu, !! đau, >_< nhăn, /// ngại.', '7', 7, '24×24', 'PNG', 'emote_*.png', 'P2')
add(G, 'Yappy Yappy', 'Chỉ báo "đang gõ"', 'Ba chấm nhảy.', '3–4 frame', 4, '48×16', 'PNG sprite sheet', 'ui_typing_sheet.png', 'P2')
add(G, 'DiveMail', 'Giao diện hộp thư', 'Danh sách thư (đã đọc / chưa đọc), khung đọc thư, thẻ file đính kèm (memento / phần mềm) + nút Download.', 'Dòng thư 2 trạng thái + khung đọc + thẻ đính kèm', 4, '9-slice', 'PNG', 'ui_mail_*.png', 'P1')
add(G, 'DiveMail', 'Bưu thiếp (Postcard Day)', 'Bưu thiếp các cô gái gửi ngày 7: mặt sau có ô tem + dòng chữ. Mỗi cô gái một tem riêng.', '1 nền bưu thiếp + 5 tem', 6, '480×300 / tem 64×64', 'PNG', 'postcard_bg.png, stamp_{girl}.png', 'P2')
add(G, 'Fix-it', 'Giao diện Fix-it', 'App chọn bệnh nhân để bắt đầu buổi: thẻ từng cô gái (avatar, mã PRIM_01…, 3 layer: memory / feeling / self và trạng thái khoá/mở/xong).', 'Thẻ bệnh nhân (khả dụng / khoá / đã xuất viện) + biểu tượng layer', 6, 'thẻ 280×120 / icon layer 24×24', 'PNG', 'ui_fixit_card_*.png, ic_layer_*.png', 'P1')
add(G, 'MementoBox', 'Thẻ memento', 'Lưới ô memento: ô có đồ (icon + tên + mô tả) và ô trống "???.mem".', 'Ô đầy + ô trống', 2, '160×120', 'PNG', 'ui_mem_slot.png, ui_mem_empty.png', 'P1')
add(G, 'Showcase.exe', 'Tranh triển lãm của các cô gái', 'Ngày 3 (Hobby Showcase): mỗi cô gái có 1 tác phẩm, 2 phiên bản. Ví dụ Prim: bản "bị ép" là bông hồng vẽ "từ hư không" (gượng gạo); bản "thật lòng" là tô màu vào nét của người khác (rất đẹp). Trix: bản "bị ép" là clip stream 3 giây nói "uwu"; bản "thật lòng" là bảng trắng chứng minh toán "Lemma 3".', '2 bản × 5 cô gái (Paige, Vel, Myne chờ kịch bản)', 10, '320×240', 'PNG', 'exhibit_{girl}_forced.png / _true.png', 'P2', 'Prim, Trix: P1 khi làm ngày 3')
add(G, 'Showcase.exe', 'Khung triển lãm', 'Khung tranh + nhãn mô tả + nút "Talk about it".', '1', 1, '9-slice', 'PNG', 'ui_exhibit_frame.png', 'P2')
add(G, 'UnitConv.exe', 'Giao diện đổi đơn vị', 'App đổi mi↔km, °F↔°C, lb↔kg. Giao diện máy tính cầm tay kiểu cũ.', 'Khung + nút', 2, '440×380', 'PNG', 'ui_conv_*.png', 'P2')
add(G, 'Atlas.exe', 'Bản đồ thế giới', 'App tra địa danh. Cần 1 bản đồ thế giới pixel pastel + ghim vị trí.', 'Bản đồ + ghim + khung tìm kiếm', 3, '800×480 / ghim 24×24', 'PNG', 'atlas_map.png, ic_pin.png', 'P2')
add(G, 'Notepad', 'Cửa sổ Notepad', 'Giấy kẻ dòng cho personal_log.txt và các file ghi chú. Bản khoá (mờ, mã hoá) và bản đã khôi phục.', 'Giấy thường + giấy bị mã hoá', 2, 'tile 400×400', 'PNG', 'ui_notepad_*.png', 'P2')
add(G, 'Recycle Bin', 'Nội dung thùng rác', 'Danh sách file đã xoá (session_xxx.tmp…).', 'Dòng file', 1, '9-slice', 'PNG', 'ui_bin_row.png', 'P3')
add(G, 'Journal', 'Sổ nhật ký của Boss', 'Journal hiện ở cuối game: bìa sổ + trang giấy viết tay + dấu trang theo ngày.', 'Bìa + trang trái/phải + dấu trang', 4, '1280×800', 'PNG', 'journal_cover.png, journal_page_*.png', 'P2')
add(G, 'Phiên trị liệu', 'Hiệu ứng xoá session', 'Chuỗi "session_x.tmp will be deleted in 3… 2… 1…": icon file bị xoá (vỡ/tan).', '4–6 frame', 6, '64×64', 'PNG sprite sheet', 'fx_tmp_delete_sheet.png', 'P3')

# ---------------- 7. Brain scan (Magnifier) ----------------
G = '7. Quét não (Magnifier.exe)'
add(G, 'Magnifier', 'Hình não (nhìn ngang)', 'Hình não phong cách neon (viền hồng, nếp não tím) trên nền tối, dùng làm hình chính của bảng quét. Đánh dấu rõ 5 vùng: Prefrontal, Amygdala, Hippocampus, Thalamus, Visual.', 'Não + lớp từng vùng sáng (5 lớp) để code bật từng vùng', 6, '400×320', 'PNG theo lớp', 'scan_brain.png, scan_region_*.png', 'P1')
add(G, 'Magnifier', 'Khung bảng quét', 'Các ô màn hình nhỏ kiểu thiết bị y tế retro: khung ô lõm tối, nhãn chữ, đèn REC nhấp nháy.', 'Khung ô + đèn REC', 2, '9-slice / 16×16', 'PNG', 'ui_scan_panel.png, ui_rec_dot.png', 'P2')
add(G, 'Magnifier', 'Callout chỉ vùng não', 'Chấm + đường dẫn + nhãn cho từng vùng (thường / vùng đang quét nhấp nháy hồng).', '2 trạng thái', 2, '24×24', 'PNG', 'ui_callout_*.png', 'P3')
add(G, 'Magnifier', 'Bảng màu heat map', 'Dải màu cho bản đồ nhiệt (tím than → tím → hồng → cam → vàng nhạt).', '1 dải', 1, '256×8', 'PNG', 'scan_heat_ramp.png', 'P3')
add(G, 'Magnifier', 'Thanh LOCK', 'Thanh khoá mục tiêu chạy tới 100% thì mở nút Project ▸ (khung + phần chạy có sọc hồng/xanh).', 'Khung + phần chạy', 2, '360×16', 'PNG', 'ui_lock_*.png', 'P2')
add(G, 'Magnifier', 'Tia chiếu (beam)', 'Tia sáng bắn từ Magnifier sang cửa sổ máy chiếu khi bấm Project.', '4–6 frame', 6, '400×32', 'PNG sprite sheet', 'fx_beam_sheet.png', 'P3')

# ---------------- 8. PROJECT3D.EXE window & world ----------------
G = '8. Máy chiếu 3D – cửa sổ & không gian'
add(G, 'Cửa sổ máy chiếu', 'Thanh menu File / View / Help', 'Thanh menu kiểu Win98 + menu thả xuống (dòng thường/hover, vạch ngăn, ô tick).', 'Thanh + menu + tick', 4, '9-slice / tick 16×16', 'PNG', 'ui_menu_*.png', 'P2')
add(G, 'Cửa sổ máy chiếu', 'Thanh trạng thái', 'Các ô lõm dưới đáy: trạng thái, layer, số nước, fps.', '1 ô 9-slice', 1, '9-slice', 'PNG', 'ui_statusbar_cell.png', 'P2')
add(G, 'Cửa sổ máy chiếu', 'Khung viewport + HUD', 'Viền màn chiếu (lõm, đen), chữ HUD "◉ DIVE·PROJ 3D · LINE/BOX MODE", tag "NEW · <mechanic>", lớp scanline CRT.', 'Khung + tag NEW + lớp scanline', 3, '9-slice / tile 4×4', 'PNG', 'ui_viewport.png, ui_tag_new.png, fx_scanline.png', 'P1')
add(G, 'Không gian ảo', 'Bầu trời', 'Bầu trời vaporwave: tím than → tím → hồng → cam ở đường chân trời.', '1 (có thể thêm bản riêng cho từng cô gái)', 1, '2048×1024', 'PNG', 'sky_gradient.png', 'P1', '3D: dùng làm texture nền')
add(G, 'Không gian ảo', 'Mặt trời sọc', 'Mặt trời tròn vàng→hồng, nửa dưới bị cắt sọc ngang (kiểu synthwave).', '1', 1, '512×512', 'PNG nền trong', 'sun_striped.png', 'P1')
add(G, 'Không gian ảo', 'Núi wireframe & sàn lưới neon', 'Dãy núi khung dây hồng ở chân trời + sàn lưới neon (đang vẽ bằng code). Artist vẽ concept / texture lưới.', 'Núi + texture ô lưới', 2, 'núi 2048×256 / lưới 256×256 tile', 'PNG', 'mountains_wire.png, grid_tile.png', 'P2')
add(G, 'Không gian ảo', 'Bầu trời sao / hạt', 'Sao nhỏ, hạt lấp lánh trôi.', '3–4 kiểu hạt', 4, '16×16', 'PNG', 'fx_star_*.png', 'P3')
add(G, 'Không gian ảo', 'Bản theo từng cô gái (tuỳ chọn)', 'Mỗi cô gái một tông không gian riêng (ví dụ Prim hồng nhạt, Trix xanh, Paige tím đen, Vel cam nắng, Myne xanh lá neon).', '5 bộ màu sky + sun', 10, 'như trên', 'PNG', 'sky_{girl}.png, sun_{girl}.png', 'P3')
add(G, 'Hiệu ứng thắng / thua', 'Chữ "◆ BELIEF ERASED ◆"', 'Chữ lớn hiện khi giải xong (glow vàng/hồng).', '1 + glow', 1, '720×120', 'PNG nền trong', 'txt_belief_erased.png', 'P2')
add(G, 'Hiệu ứng thắng / thua', 'Chữ "RULE VIOLATION"', 'Chữ hiện khi về đích mà sai luật (đỏ/hồng, rung).', '1', 1, '640×100', 'PNG nền trong', 'txt_rule_violation.png', 'P2')
add(G, 'Hiệu ứng thắng / thua', 'Vệt bay lên & mảnh vỡ', 'Khối bay thẳng lên trời để lại vệt sáng; bàn chơi vỡ thành mảnh. Code đã làm chuyển động, artist vẽ vệt sáng + tia lấp lánh.', 'Vệt sáng + 4–6 frame lấp lánh', 7, '64×256 / 32×32', 'PNG', 'fx_flyup_trail.png, fx_sparkle_sheet.png', 'P2')
add(G, 'Chat trong máy chiếu', 'Khung chat giữa các map', 'Khung Yappy Yappy nhỏ góc dưới màn chiếu (avatar + tên + bong bóng + nút "Next map ▸"), dùng ở chế độ cốt truyện.', 'Khung + đầu khung', 2, '9-slice', 'PNG', 'ui_pj_chat.png', 'P2')

# ---------------- 9. Gameplay: the box board (every girl) ----------------
G = '9. Gameplay – bàn chơi HỘP (mọi cô gái)'
note3d = 'Game render 3D bằng code. Artist giao: concept nhìn trên + nhìn nghiêng, và texture mặt trên. Dev dựng hình khối đơn giản theo concept.'
B = [
    ('Ô sàn (tile)', 'Ô vuông nổi có độ dày, viền neon hồng mờ (giống các khối trong ảnh tham khảo isometric).', 'Mặt trên + mặt bên', 2, '256×256', 'P1'),
    ('Ô goal', 'Ô có khung sáng, nhịp thở; sáng mạnh khi có hộp đúng màu đứng trong. Goal viền trắng nhận mọi hộp; goal có màu (hồng / đỏ / tím / vàng / xanh) chỉ nhận hộp cùng màu.', '6 kiểu × (thường + có hộp)', 12, '256×256', 'P1'),
    ('Tường kính', 'Tấm kính trắng trung tính đứng giữa hai ô (không mang màu nào trong 5 màu, để khác cửa khoá và hộp).', '1', 1, 'texture 256×128', 'P1'),
    ('Hộp thường', 'Khối lập phương lăn từng ô. Game chỉ có 5 màu, mỗi cô gái một màu: hồng (Prim), đỏ (Trix), tím (Paige), vàng (Vel), xanh (Myne). Hộp mặc định mang màu của cô gái; một bàn có thể có hộp nhiều màu, hộp màu nào phải vào goal màu đó.', '5 màu', 5, 'concept 256×256 + texture 6 mặt', 'P1'),
    ('Hộp dây (rope)', 'Hộp để lại sợi dây sau lưng; dây là tường với mọi hộp, kể cả chính nó. Hiện quấn 3 vòng dây quanh thân. Dây sáng cùng màu với hộp (1 trong 5 màu).', 'Concept + vòng dây + texture dây × 4 màu', 6, '256×256 / dây 64×16', 'P1'),
    ('Hộp song sinh ngược', 'Hộp làm ngược mọi phím (trái↔phải, lên↔xuống). Hiện có dấu X trên nóc; artist có thể thiết kế ký hiệu dễ hiểu hơn (ví dụ hai mũi tên ngược).', 'Ký hiệu nóc hộp', 1, '128×128', 'P1'),
    ('Hộp tên lửa', 'Hộp có cụm 2 tên lửa phía sau; ấn phím thì quay về hướng bay, phun lửa và trượt tới khi đụng tường, hộp, dây hoặc cửa đóng.', 'Concept + lửa phụt (4–6 frame)', 7, 'concept 256×256 / lửa 64×128', 'P1'),
    ('Bom trên hộp', 'Hộp ôm một quả bom có ngòi cháy và số đếm ngược; mỗi lần ấn phím số giảm 1, còn 1 thì bom đỏ lên, về 0 là nổ.', 'Bom + ngòi + tia lửa (2–3 frame) + bom đỏ + nhãn số 0–9', 15, '128×128 / 64×64', 'P1'),
    ('Hộp nổ', 'Hộp hết nước mà vẫn phải đi: nổ tung thành mảnh vụn + chớp sáng, chữ "✹ BOOM ✹".', 'Chớp sáng 6 frame + mảnh vụn + chữ', 8, '256×256 / 720×120', 'P1'),
    ('Ô đèn (light)', 'Bóng đèn nhỏ trên ô: tối khi chưa có dây; sáng vàng có quầng khi dây nằm trên đó. Thắng cần mọi đèn sáng.', 'Tắt + sáng (+ quầng)', 3, '256×256', 'P1'),
    ('Khối cảm biến (Trix)', 'Khối console thấp đặt trên ô (không đi vào được), mặt trên là màn hình hiện "đã chạm/cần" (ví dụ 1/3): xanh dương = chưa đủ, xanh lá = đúng, đỏ = thừa. Dây phải chạm đúng ngần ấy cạnh của khối.', 'Khối + màn hình × 3 trạng thái + số 0–4 và dấu /', 12, 'concept 256×256 / màn hình 128×128'),
    ('Xúc xắc (Paige)', 'Xúc xắc lăn: 6 mặt chấm (1–6), màu tím hoặc xanh; nhãn ▼n cho biết mặt đang úp xuống (mặt sẽ in).', '6 mặt × 2 màu + nhãn ▼', 14, 'texture mặt 128×128', 'P1'),
    ('Ô giấy trắng + vết in', 'Ô trắng cần in. Khi xúc xắc đáp xuống thì in số chấm của mặt úp: xanh lá nếu đúng đề, đỏ nếu sai.', 'Ô trắng + chấm 1–6 × 2 màu', 13, '256×256', 'P1'),
    ('Khung ĐỀ BÀI + xúc xắc nháp', 'Khung bên phải bàn chơi: bản đồ thu nhỏ có các ô trắng ghi số cần in; dưới là xúc xắc nháp xoay bằng 5 nút (▲◀▶▼⟲).', 'Khung + nút', 6, '160×320', 'P1'),
    ('Ô mũi tên (arrow tile)', 'Ô xanh có mũi tên: hộp đi vào bị đẩy trượt theo mũi tên tới cuối đường. Mũi tên nhấp nháy chạy.', '1 (code xoay 4 hướng) + 2 frame sáng', 3, '256×256', 'P1'),
    ('Ô chốt (switch)', 'Nút tròn lớn trên ô, màu xanh / vàng / đỏ: hộp đi vào là mở hẳn mọi cửa cùng màu (nút lún xuống, sáng).', '3 màu × (chưa mở + đã mở)', 6, 'concept 256×256', 'P1'),
    ('Công tắc hai màu', 'Nút ở giữa = màu tường đang dựng (giẫm vào sẽ hạ), vòng ngoài = màu kia, có ký hiệu mũi tên xoay. Giẫm vào: tường màu đang hiện hạ xuống, tường màu kia trồi lên, công tắc đổi sang màu kia.', '3 cặp màu', 3, 'concept 256×256', 'P1'),
    ('Cửa khoá (door)', 'Tấm chắn giữa hai ô, màu xanh / vàng / đỏ, có 2 sọc đen để khác tường. Mở = chìm xuống sàn (2D: nét đứt mờ).', '3 màu × (đóng + mở)', 6, 'concept 256×256', 'P1'),
    ('Ô nứt (crack)', 'Ô có vết nứt; hộp rời khỏi là ô sụp xuống thành lỗ (rơi xuống khoảng không).', 'Nứt + đang sụp (3–4 frame) + lỗ', 6, '256×256', 'P1'),
    ('Ô sơn (paint)', 'Vệt sơn loang trên ô: hộp đi vào bị đổi sang màu đó.', '5 màu', 5, '256×256', 'P1'),
    ('Khe một chiều', 'Mũi tên vàng giữa hai ô: chỉ đi qua theo chiều đó.', '1', 1, '64×64', 'P2'),
    ('Portal', 'Cặp cổng cùng màu: vòng tròn nằm sàn + đĩa sáng + vòng nhỏ lơ lửng xoay. 3 màu cặp: vàng, xanh trời, xanh mint.', '3 màu', 3, '256×256', 'P2'),
    ('Lỗ trên map (holes)', 'Ô bị khuyết, nhìn xuống khoảng không (có thể có viền mép vỡ).', 'Viền mép', 1, '256×256', 'P3'),
    ('Dây lời giải / gợi ý', 'Dây ở chế độ lời giải (xanh dương), thắng (vàng).', '2 trạng thái', 2, 'texture 64×16 tile', 'P2'),
]
BF = ['tile_{top,side}.png', 'tile_goal_{gold,pink,blue,green}.png (+_on)', 'wall_glass.png', 'box_{plain,pink,blue,green}.png', 'box_rope_concept.png, box_rope_coil.png, rope_{pink,blue,green,plain}.png',
      'box_mark_twin.png', 'box_rocket_concept.png, fx_flame_sheet.png', 'box_bomb.png, box_bomb_hot.png, fx_fuse_spark_sheet.png, count_{0-9}.png', 'fx_boom_sheet.png, fx_boom_bits.png, txt_boom.png',
      'tile_light_{off,on}.png, fx_light_halo.png', 'sensor_block.png, sensor_screen_{idle,ok,bad}.png, sensor_digits.png', 'dice_faces_{purple,blue}.png, dice_under_badge.png', 'paper_tile.png, print_pips_{ok,bad}.png', 'brief_frame.png, practice_die_buttons.png', 'tile_arrow.png, tile_arrow_glow_sheet.png',
      'switch_{pink,blue,green}_{up,down}.png', 'switch_double_{pink-blue,blue-green,green-pink}.png', 'door_{pink,blue,green}.png (+_open)', 'tile_crack.png, tile_crack_fall_sheet.png, hole_fallen.png',
      'tile_paint_{pink,blue,green}.png', 'arrow_oneway_gap.png', 'tile_portal_{yellow,sky,mint}.png', 'hole_edge.png', 'rope_{sol,win}.png']
for (nm, d, v, n, sz, *pr), fn in zip(B, BF):
    add(G, 'Bàn chơi', nm, d, v, n, sz, 'PNG', fn, pr[0] if pr else 'P1', note3d)

# ---------------- 10. Mechanic icons (tutorials) ----------------
G = '10. Icon mechanic (tutorial & danh sách level)'
MECH = [('basic', 'Hộp dây tới ô goal'), ('boxes', 'Mọi phím điều khiển mọi hộp'), ('lights', 'Ô đèn'), ('touch', 'Khối cảm biến'), ('dice', 'Xúc xắc in đề bài'), ('switches', 'Ô chốt & cửa khoá'), ('dbl', 'Công tắc hai màu'),
        ('colors', 'Hộp màu & goal màu'), ('paints', 'Ô sơn'), ('cracks', 'Ô nứt'), ('ends', 'Goal ở bất kỳ đâu'), ('holes', 'Map có lỗ'), ('oneway', 'Một chiều'),
        ('portals', 'Portal'), ('pads', 'Ô mũi tên'), ('dash', 'Hộp tên lửa'), ('helpers', 'Hộp chắn (thừa)'),
        ('many', 'Nhiều hộp'), ('budget', 'Hộp ôm bom'), ('twin', 'Hộp song sinh ngược'), ('twinrope', 'Hai hộp dây song sinh'), ('nolock', 'Hộp không bị khoá ở goal'), ('trail', 'Hộp dây')]
for k, vi in MECH:
    add(G, 'Icon mechanic', f'Icon mechanic "{k}"', f'{vi}. Hiện ở tag "NEW · …" khi gặp mechanic mới và có thể dùng trong danh sách level.', '1', 1, '32×32', 'PNG nền trong', f'ic_mech_{k}.png', 'P2')

# ---------------- 11. Test chamber ----------------
G = '11. Test chamber (công cụ nội bộ)'
add(G, 'Test chamber', 'Thẻ level', 'Thẻ trong danh sách level: số thứ tự, ảnh thu nhỏ bàn chơi (code vẽ), trạng thái đã giải/chưa giải/đã xem lời giải, dấu tutorial.', '3 trạng thái + dấu tutorial', 4, '100×110 9-slice', 'PNG', 'ui_chamber_card_*.png', 'P3', 'Chỉ dùng nội bộ, ưu tiên thấp')
add(G, 'Test chamber', 'Avatar chưa có art', 'Ô "?" cho cô gái chưa có hình.', '1', 1, '64×64', 'PNG', 'ui_unknown_face.png', 'P3')

# ---------------- 12. Old story board ----------------
G = '12. Bảng nối màu cũ (story hiện tại)'
add(G, 'Fix-it · board', 'Bảng nối cặp màu', 'Bảng chơi cũ trong cốt truyện (nối các cặp chấm cùng màu, không cắt nhau). Sẽ được thay bằng máy chiếu 3D: chỉ vẽ nếu bản cũ còn được giữ.', 'Ô lưới + chấm (8 màu) + đoạn đường + huy hiệu S/A/B/C + thanh thời gian', 16, '64×64', 'PNG', 'old_board_*.png', 'P3', 'Hỏi lại trước khi vẽ')

# ================= workbook =================
wb = Workbook()
ink, pink, lav, cream = '4A2D6E', 'FF8CC6', 'F5EEFF', 'FFF8FC'
hdr_font = Font(name=F, bold=True, color='FFFFFF', size=11)
hdr_fill = PatternFill('solid', fgColor='6B4A9E')
thin = Side(style='thin', color='CDB6EC')
border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical='top')

# --- guide
ws = wb.active; ws.title = 'Hướng dẫn'
guide = [
    ('YÊU CẦU ART – CAN YOU FIX HER', None),
    ('Mục đích', 'Danh sách toàn bộ hình ảnh cần vẽ lại bằng tay cho game (không dùng AI). Mỗi dòng ở tab "Danh sách art" là một asset hoặc một bộ asset nhỏ.'),
    ('Cách dùng', 'Artist / lead điền các ô màu vàng: Trạng thái, Người vẽ, Hạn, Ghi chú. Các cột khác là yêu cầu, sửa khi đổi yêu cầu. Tab "Tổng quan" tự đếm tiến độ.'),
    ('Ưu tiên', 'P1 = cần cho bản chơi thử (Prim, Trix, desktop, gameplay chính). P2 = các cô gái còn lại, app phụ, hiệu ứng. P3 = trau chuốt, ending, công cụ nội bộ.'),
    ('Trạng thái', 'Chưa bắt đầu → Đang vẽ → Chờ duyệt → Cần sửa → Xong.'),
    ('Phong cách chung', 'Hệ điều hành giả "DIVE OS": Windows 98 pastel dễ thương (hồng, tím lavender, kem), pixel art nét gọn, không khử răng cưa. Dưới vẻ dễ thương có chút rợn (game tâm lý).'),
    ('Phong cách gameplay', 'Riêng cửa sổ máy chiếu (PROJECT3D.EXE): không gian ảo vaporwave tối (tím than, magenta, cyan, vàng), các khối nổi như puzzle 3D. Tham khảo: ảnh isometric khối hộp và màn hacking neon đã gửi.'),
    ('Pixel art', 'Vẽ đúng kích thước ghi trong cột "Kích thước" (×1), game sẽ phóng to theo số nguyên. Không dùng hiệu ứng mờ / anti-alias trừ hiệu ứng ánh sáng. Bảng màu tham khảo ở tab "Bảng màu".'),
    ('Asset 3D', 'Gameplay render 3D bằng code (three.js). Với dòng ghi "concept", artist giao: hình nhìn trên + nhìn nghiêng (và nhìn trước nếu cần) + texture mặt trên; dev dựng khối đơn giản theo đó.'),
    ('9-slice', 'Khung co giãn: vẽ một khung nhỏ có 4 góc cố định, cạnh và giữa lặp được. Ghi rõ kích thước góc trong ghi chú.'),
    ('Định dạng giao', 'PNG nền trong (RGBA). Animation: sprite sheet ngang, các frame bằng nhau, ghi số frame và tốc độ (fps) trong cột ghi chú. Giữ file gốc (.aseprite / .psd / .clip).'),
    ('Đặt tên file', 'chữ thường, gạch dưới, không dấu, theo cột "Tên file giao". Biến thể thêm hậu tố: _hover, _pressed, _disabled, _blink, _gone, tên biểu cảm…'),
    ('Nhân vật', 'Prim (Jirai Kei), Trix (E-girl), Paige (Goth), Vel (Gyaru), Myne (Tomboy). Boss (Ray) không lộ mặt cho tới ending. Chi tiết tính cách xem tài liệu nhân vật / sheet "Nhân vật" trong file dialogue.xlsx.'),
    ('Biểu cảm', 'Mỗi cô gái 8 biểu cảm: neutral, happy, sad, angry, surprised, shy, pain, wince (+ chớp mắt cho neutral).'),
]
ws.column_dimensions['A'].width = 22; ws.column_dimensions['B'].width = 110
for i, (a, b) in enumerate(guide, 1):
    ws.cell(i, 1, a).font = Font(name=F, bold=True, size=16 if i == 1 else 11, color=ink)
    if b:
        c = ws.cell(i, 2, b); c.font = Font(name=F, size=11); c.alignment = Alignment(wrap_text=True, vertical='top')
        ws.cell(i, 1).alignment = Alignment(vertical='top')
        ws.row_dimensions[i].height = max(18, 15 * (len(b) // 105 + 1))
ws.row_dimensions[1].height = 28

# --- main list
ws = wb.create_sheet('Danh sách art')
cols = [('ID', 8), ('Nhóm', 30), ('Màn hình / khu vực', 20), ('Tên asset', 34), ('Mô tả & yêu cầu', 60), ('Biến thể / trạng thái cần vẽ', 36),
        ('Số file', 8), ('Kích thước (px)', 22), ('Định dạng', 16), ('Tên file giao', 36), ('Ưu tiên', 8),
        ('Trạng thái', 14), ('Người vẽ', 14), ('Hạn', 12), ('Ghi chú / feedback', 40)]
for j, (h, w) in enumerate(cols, 1):
    c = ws.cell(1, j, h); c.font = hdr_font; c.fill = hdr_fill; c.alignment = Alignment(wrap_text=True, vertical='center'); c.border = border
    ws.column_dimensions[get_column_letter(j)].width = w
ws.row_dimensions[1].height = 32
inp = PatternFill('solid', fgColor='FFF6C2')
gfill = {}
palette = ['FFE0F1', 'EFE0FF', 'E3F6FF', 'E8FBEF', 'FFF3D6', 'FDE7EF', 'EDE7FF', 'E0F2FF', 'F0FFF4', 'FFF0E0', 'F5EEFF', 'FFE8F3', 'EAF7FF']
for i, r in enumerate(rows, 2):
    group, screen, name, desc, variants, count, size, fmt, file, prio, note = r
    vals = [f'A{i-1:03d}', group, screen, name, desc, variants, count, size, fmt, file, prio, 'Chưa bắt đầu', None, None, note or None]
    if group not in gfill: gfill[group] = PatternFill('solid', fgColor=palette[len(gfill) % len(palette)])
    for j, v in enumerate(vals, 1):
        c = ws.cell(i, j, v); c.font = Font(name=F, size=10); c.alignment = wrap; c.border = border
        if j in (2, 3): c.fill = gfill[group]
        if j in (12, 13, 14, 15): c.fill = inp
    ws.cell(i, 7).alignment = Alignment(horizontal='center', vertical='top')
    ws.cell(i, 11).alignment = Alignment(horizontal='center', vertical='top')
    ws.cell(i, 14).number_format = 'dd/mm/yyyy'
last = len(rows) + 1
ws.freeze_panes = 'E2'
ws.auto_filter.ref = f'A1:O{last}'
dv = DataValidation(type='list', formula1='"Chưa bắt đầu,Đang vẽ,Chờ duyệt,Cần sửa,Xong"', allow_blank=True); ws.add_data_validation(dv); dv.add(f'L2:L{last}')
dv2 = DataValidation(type='list', formula1='"P1,P2,P3"', allow_blank=True); ws.add_data_validation(dv2); dv2.add(f'K2:K{last}')
dv3 = DataValidation(type='date', allow_blank=True); ws.add_data_validation(dv3); dv3.add(f'N2:N{last}')
for txt, col in [('Xong', 'C8F2D6'), ('Đang vẽ', 'D6ECFF'), ('Chờ duyệt', 'FFE9B8'), ('Cần sửa', 'FFC9D6')]:
    ws.conditional_formatting.add(f'L2:L{last}', FormulaRule(formula=[f'$L2="{txt}"'], fill=PatternFill('solid', fgColor=col)))
for txt, col in [('P1', 'FF5FA8'), ('P2', 'B693EF'), ('P3', '9AA0B4')]:
    ws.conditional_formatting.add(f'K2:K{last}', FormulaRule(formula=[f'$K2="{txt}"'], font=Font(name=F, bold=True, color=col)))

# --- summary
sm = wb.create_sheet('Tổng quan', 1)
sm.column_dimensions['A'].width = 46
for c in 'BCDEFGHI': sm.column_dimensions[c].width = 13
heads = ['Nhóm', 'Số dòng', 'Số file', 'P1 (dòng)', 'Chưa bắt đầu', 'Đang vẽ', 'Chờ duyệt / sửa', 'Xong', '% xong']
for j, h in enumerate(heads, 1):
    c = sm.cell(1, j, h); c.font = hdr_font; c.fill = hdr_fill; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = border
D = "'Danh sách art'!"
groups = list(dict.fromkeys(r[0] for r in rows))
for i, g in enumerate(groups, 2):
    sm.cell(i, 1, g)
    sm.cell(i, 2, f'=COUNTIF({D}$B$2:$B${last},$A{i})')
    sm.cell(i, 3, f'=SUMIF({D}$B$2:$B${last},$A{i},{D}$G$2:$G${last})')
    sm.cell(i, 4, f'=COUNTIFS({D}$B$2:$B${last},$A{i},{D}$K$2:$K${last},"P1")')
    sm.cell(i, 5, f'=COUNTIFS({D}$B$2:$B${last},$A{i},{D}$L$2:$L${last},"Chưa bắt đầu")')
    sm.cell(i, 6, f'=COUNTIFS({D}$B$2:$B${last},$A{i},{D}$L$2:$L${last},"Đang vẽ")')
    sm.cell(i, 7, f'=COUNTIFS({D}$B$2:$B${last},$A{i},{D}$L$2:$L${last},"Chờ duyệt")+COUNTIFS({D}$B$2:$B${last},$A{i},{D}$L$2:$L${last},"Cần sửa")')
    sm.cell(i, 8, f'=COUNTIFS({D}$B$2:$B${last},$A{i},{D}$L$2:$L${last},"Xong")')
    sm.cell(i, 9, f'=IF(B{i}=0,0,H{i}/B{i})')
t = len(groups) + 2
sm.cell(t, 1, 'TỔNG')
for j in range(2, 9):
    L_ = get_column_letter(j); sm.cell(t, j, f'=SUM({L_}2:{L_}{t-1})')
sm.cell(t, 9, f'=IF(B{t}=0,0,H{t}/B{t})')
for i in range(2, t + 1):
    for j in range(1, 10):
        c = sm.cell(i, j); c.font = Font(name=F, size=10, bold=(i == t)); c.border = border
        if j > 1: c.alignment = Alignment(horizontal='center')
    sm.cell(i, 9).number_format = '0%'
    if i == t:
        for j in range(1, 10): sm.cell(i, j).fill = PatternFill('solid', fgColor='F5EEFF')
sm.cell(t + 2, 1, 'Tổng theo ưu tiên').font = Font(name=F, bold=True, color=ink)
for k, pr in enumerate(['P1', 'P2', 'P3']):
    r = t + 3 + k
    sm.cell(r, 1, pr).font = Font(name=F, size=10)
    sm.cell(r, 2, f'=COUNTIF({D}$K$2:$K${last},$A{r})').font = Font(name=F, size=10)
    sm.cell(r, 3, f'=SUMIF({D}$K$2:$K${last},$A{r},{D}$G$2:$G${last})').font = Font(name=F, size=10)
    sm.cell(r, 8, f'=COUNTIFS({D}$K$2:$K${last},$A{r},{D}$L$2:$L${last},"Xong")').font = Font(name=F, size=10)
    sm.cell(r, 9, f'=IF(B{r}=0,0,H{r}/B{r})').number_format = '0%'
sm.cell(t + 7, 1, 'Cột "Số dòng" = số dòng yêu cầu; "Số file" = tổng số file ảnh ước tính (cột G tab Danh sách art).').font = Font(name=F, size=9, italic=True, color='8A6FB0')
sm.freeze_panes = 'B2'

# --- palette
pl = wb.create_sheet('Bảng màu')
pl.column_dimensions['A'].width = 26; pl.column_dimensions['B'].width = 12; pl.column_dimensions['C'].width = 14; pl.column_dimensions['D'].width = 60
for j, h in enumerate(['Tên', 'Mẫu', 'Mã màu', 'Dùng cho'], 1):
    c = pl.cell(1, j, h); c.font = hdr_font; c.fill = hdr_fill; c.border = border
PAL = [
    ('Nền desktop A', 'FFE0F1', 'Caro desktop'), ('Nền desktop B', 'EFE0FF', 'Caro desktop'), ('Viền / chữ đậm', '6B4A9E', 'Viền cửa sổ, nút'),
    ('Viền nhạt', 'CDB6EC', 'Viền khung lõm'), ('Hồng chính', 'FF8CC6', 'Nút primary, line, highlight'), ('Hồng nhạt', 'FFD3EA', 'Nền nhẹ, bong bóng'),
    ('Hồng đậm', 'E2458F', 'Nhấn mạnh, gạch belief'), ('Lavender', 'D8C6F4', 'Nền phụ'), ('Lavender nhạt', 'F5EEFF', 'Nền thẻ'), ('Lavender đậm', '9A7BD0', 'Nét phụ'),
    ('Xanh trời', '8FDCF7', 'Lời giải, thông tin'), ('Xanh trời đậm', '1F9FCF', 'Tên Boss'), ('Mint', '2FAE72', 'Đúng / xong'), ('Vàng bơ', 'FFD86E', 'Goal, cổng ra, portal'),
    ('Đỏ cảnh báo', 'FF4D7A', 'Sai luật, lỗi'), ('Mực chữ', '4A2D6E', 'Chữ chính'), ('Chữ phụ', '8A6FB0', 'Chữ mờ'), ('Kem', 'FFF8FC', 'Nền khung nổi'),
    ('3D · trời trên', '12062B', 'Không gian ảo'), ('3D · tím', '3B1063', 'Không gian ảo'), ('3D · magenta', 'A2287F', 'Chân trời'), ('3D · hồng neon', 'FF6FB5', 'Chân trời, tường kính'),
    ('3D · cam', 'FFB36B', 'Đường chân trời'), ('3D · lưới', 'FF4FD8', 'Sàn lưới neon'), ('3D · ô sàn', '3B2560', 'Mặt ô'), ('3D · mép ô', '1C0F30', 'Mặt bên ô'),
    ('Hồng · Prim', 'FF7EB6', 'Hộp / dây / goal / ô sơn màu hồng'), ('Đỏ · Trix', 'FF4D5E', 'Hộp / dây / goal / ô sơn màu đỏ; tường & công tắc đỏ'), ('Tím · Paige', 'A46BFF', 'Hộp / dây / goal / ô sơn màu tím'),
    ('Vàng · Vel', 'FFD23F', 'Hộp / dây / goal / ô sơn màu vàng; tường & công tắc vàng'), ('Xanh · Myne', '4FA8FF', 'Hộp / dây / goal / ô sơn màu xanh; tường & công tắc xanh'), ('Goal nhận mọi hộp', 'FFF4FB', 'Viền goal trắng'), ('Tường kính', 'D8D0F0', 'Tường thường giữa hai ô (kính trắng trung tính)'),
    ('Đèn sáng', 'FFD86E', 'Ô đèn đã sáng'), ('Ô mũi tên', '7BE3A4', 'Mũi tên ô mũi tên'), ('Nổ', 'FFA040', 'Hiệu ứng hộp nổ'),
]
for i, (n, hx, use) in enumerate(PAL, 2):
    pl.cell(i, 1, n).font = Font(name=F, size=10)
    pl.cell(i, 2).fill = PatternFill('solid', fgColor=hx)
    pl.cell(i, 3, '#' + hx).font = Font(name=F, size=10)
    pl.cell(i, 4, use).font = Font(name=F, size=10)
    for j in range(1, 5): pl.cell(i, j).border = border
pl.cell(len(PAL) + 3, 1, 'Màu lấy từ bản prototype hiện tại; artist có thể đề xuất bảng màu mới, cập nhật tab này khi chốt.').font = Font(name=F, size=9, italic=True, color='8A6FB0')

wb.save(OUT)
print('rows', len(rows), 'files', sum(r[5] for r in rows), 'groups', len(groups))
