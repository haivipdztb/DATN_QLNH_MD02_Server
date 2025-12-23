# 📊 Dữ Liệu Mẫu - Hệ Thống Quản Lý Nhà Hàng

## 📝 Tổng Quan

Script `seedData.js` đã tạo dữ liệu mẫu cho hệ thống quản lý nhà hàng từ **1/12/2025 đến 22/12/2025**.

## ✅ Dữ Liệu Đã Tạo

### 👥 Nhân Viên (8 người)
- **1 Admin**: Nguyễn Văn Admin
- **2 Thu Ngân**: Trần Thị Thu, Lê Văn Tài
- **3 Phục Vụ**: Phạm Thị Lan, Hoàng Văn Nam, Vũ Thị Hoa
- **2 Bếp**: Đỗ Văn Bếp, Bùi Thị Minh

**Thông tin đăng nhập mẫu:**
- Username: `admin01`, `cashier01`, `waiter01`, `kitchen01`, v.v.
- Password: `admin123` (cho tất cả tài khoản)

### 🍽️ Thực Đơn (26 món)
- **Món chính** (8 món): Phở Bò, Bún Chả, Cơm Tấm, Mì Xào, v.v.
- **Món phụ** (5 món): Gỏi Cuốn, Chả Giò, Nem Nướng, v.v.
- **Đồ uống** (9 món): Trà Đá, Coca, Pepsi, Bia, Cà Phê, v.v.
- **Tráng miệng** (3 món): Chè Ba Màu, Bánh Flan, Kem Dừa

### 🪑 Bàn Ăn (20 bàn)
- **Tầng 1** (10 bàn): Sức chứa 4 người/bàn
- **Tầng 2** (10 bàn): Sức chứa 6-8 người/bàn

### 🥬 Nguyên Liệu (21 loại)
- **Thịt**: Bò, Heo, Gà
- **Hải sản**: Tôm, Cua, Mực
- **Rau củ**: Rau sống, Hành tây, Cà chua, Dưa leo
- **Gia vị**: Nước mắm, Dầu ăn, Muối, Đường
- **Đồ khô**: Gạo, Mì, Bánh phở
- **Đồ uống**: Bia Tiger, Bia Heineken, Coca, Pepsi

### 🎫 Voucher (3 mã)
- **WELCOME10**: Giảm 10% cho đơn từ 100k (tối đa 50k)
- **FREESHIP**: Giảm 20k cho đơn từ 150k
- **BIGDEAL**: Giảm 20% cho đơn từ 300k (tối đa 100k)

### 📦 Đơn Hàng & Doanh Thu
- **Tổng số đơn**: **589 đơn hàng**
- **Thời gian**: 1/12/2025 - 22/12/2025 (22 ngày)
- **Trung bình**: 15-35 đơn/ngày
- **Giờ hoạt động**: 10:00 - 22:00
- **Phương thức thanh toán**: Tiền mặt, QR, Thẻ, Card
- **Giảm giá**: Ngẫu nhiên 0-20% hoặc áp dụng voucher

## 🚀 Cách Sử Dụng

### 1. Chạy Script Tạo Dữ Liệu

```bash
cd /Users/thanh/Documents/quydatn/DATN_QLNH_MD02_Server
node seedData.js
```

**Lưu ý**: 
- Script sẽ **XÓA** tất cả orders và revenue cũ trước khi tạo mới
- Các dữ liệu khác (users, menu, tables, ingredients, vouchers) sẽ được giữ nguyên nếu đã tồn tại

### 2. Test API với File HTTP

Mở file `test-statistics.http` và sử dụng REST Client extension trong VS Code để test các API:

```http
### Ví dụ: Lấy thống kê doanh thu theo ngày
GET http://localhost:3000/api/revenue/statistics?startDate=2025-12-01&endDate=2025-12-22&timeFrame=daily
```

## 📊 Các API Thống Kê Có Sẵn

### 💰 Revenue APIs
1. `GET /api/revenue/statistics` - Thống kê doanh thu (daily/weekly/monthly)
2. `GET /api/revenue/by-payment-method` - Doanh thu theo phương thức thanh toán
3. `GET /api/revenue/total` - Tổng doanh thu
4. `GET /api/revenue/compare` - So sánh doanh thu giữa 2 kỳ
5. `GET /api/revenue/export` - Xuất báo cáo Excel

### 📝 Order APIs
6. `GET /api/orders` - Danh sách đơn hàng
7. `GET /api/orders/statistics` - Thống kê đơn hàng
8. `GET /api/orders/top-selling` - Món bán chạy nhất
9. `GET /api/orders/compare` - So sánh đơn hàng
10. `GET /api/orders/export` - Xuất báo cáo Excel

### 📈 Dashboard APIs
11. `GET /api/dashboard/overview` - Tổng quan dashboard
12. `GET /api/dashboard/today` - Tổng quan hôm nay
13. `GET /api/dashboard/week` - Tổng quan tuần này
14. `GET /api/dashboard/month` - Tổng quan tháng này

### 📋 Report APIs
15. `POST /api/reports/generate` - Tạo báo cáo
16. `GET /api/reports` - Danh sách báo cáo

### 🍽️ Menu APIs
17. `GET /api/menu` - Danh sách món ăn
18. `GET /api/menu/performance` - Hiệu suất món ăn

### 🪑 Table APIs
19. `GET /api/tables` - Danh sách bàn
20. `GET /api/tables/utilization` - Tỷ lệ sử dụng bàn

### 🥬 Ingredient APIs
21. `GET /api/ingredients` - Danh sách nguyên liệu
22. `GET /api/ingredients?status=low_stock` - Nguyên liệu sắp hết

### 🎫 Voucher APIs
23. `GET /api/vouchers` - Danh sách voucher
24. `GET /api/vouchers/statistics` - Thống kê sử dụng voucher

### 👥 User/Staff APIs
25. `GET /api/users` - Danh sách nhân viên
26. `GET /api/users/performance` - Hiệu suất nhân viên

## 📅 Khoảng Thời Gian Dữ Liệu

- **Từ ngày**: 1/12/2025 00:00:00
- **Đến ngày**: 22/12/2025 23:59:59
- **Tổng số ngày**: 22 ngày
- **Tổng đơn hàng**: 589 đơn

## 🔄 Tạo Lại Dữ Liệu

Nếu muốn tạo lại dữ liệu với khoảng thời gian khác:

1. Mở file `seedData.js`
2. Sửa dòng 328-329:
```javascript
const startDate = new Date('2025-12-01T00:00:00');
const endDate = new Date('2025-12-22T23:59:59');
```
3. Chạy lại: `node seedData.js`

## 💡 Tips

- Dữ liệu được tạo ngẫu nhiên nhưng có tính thực tế
- Mỗi đơn hàng có 1-5 món
- Giờ đặt hàng: 10:00 - 22:00
- Thời gian thanh toán: 30-90 phút sau khi đặt
- 30% đơn hàng có áp dụng voucher
- Giá trị đơn hàng dao động từ vài chục nghìn đến vài trăm nghìn

## 🎯 Mục Đích

Dữ liệu mẫu này giúp:
- ✅ Test các tính năng thống kê và báo cáo
- ✅ Demo hệ thống cho khách hàng
- ✅ Kiểm tra hiệu năng với dữ liệu thực tế
- ✅ Phát triển và debug các tính năng mới

---

**Tạo bởi**: Script tự động `seedData.js`  
**Ngày tạo**: 23/12/2025  
**Tổng đơn hàng**: 589 đơn  
**Khoảng thời gian**: 1/12/2025 - 22/12/2025
