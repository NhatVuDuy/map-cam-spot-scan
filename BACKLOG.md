# Backlog

## Search theo vùng hành chính Việt Nam

**Mô tả:** Cho phép người dùng chọn Tỉnh/Thành phố → Quận/Huyện → Phường/Xã thay vì nhập tọa độ thủ công. Hệ thống tự động căn chỉnh tâm và bán kính cho vùng được chọn.

**Approach:**
- Dùng [Nominatim API](https://nominatim.openstreetmap.org/search) (OpenStreetMap) để search tên hành chính VN
  - `q=Quận 1, TP. Hồ Chí Minh&countrycodes=vn&format=json`
  - Response trả về `boundingbox` → tính tâm + bán kính tự động
- Hoặc dùng dataset tĩnh [Vietnam Administrative Units](https://github.com/daotrungkien/vietnam-provinces) (JSON, offline)
- UI: 3 dropdown cascading (Tỉnh → Huyện → Xã) hoặc search box autocomplete
- Khi chọn xong: gọi `setArea({ lat, lng, radiusM })` tương ứng với bbox của đơn vị hành chính

**Ưu tiên:** Medium
