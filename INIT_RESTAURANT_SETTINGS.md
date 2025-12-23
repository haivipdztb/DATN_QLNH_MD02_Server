# 🏪 Restaurant Settings - Khởi Tạo Dữ Liệu Mẫu

## 📝 Tổng Quan

Hướng dẫn khởi tạo và cập nhật dữ liệu mẫu cho Restaurant Settings.

## 🚀 Scripts Có Sẵn

### 1. **initRestaurantSettings.js** - Khởi tạo mới
Tạo restaurant settings nếu chưa tồn tại.

```bash
node initRestaurantSettings.js
```

**Khi nào dùng:**
- Lần đầu tiên setup hệ thống
- Chưa có settings trong database

**Output:**
```
✅ Created default restaurant settings:
   - Name: Nhà Hàng Món Ngon
   - Address: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh
   - Phone: 0901234567
   - Email: contact@nhahangmonngon.com
   - Opening: 09:00
   - Closing: 23:00
   - Tax Rate: 10%
   - Service Charge: 5%
```

### 2. **updateRestaurantSettings.js** - Cập nhật
Cập nhật settings hiện có với dữ liệu mẫu đầy đủ.

```bash
node updateRestaurantSettings.js
```

**Khi nào dùng:**
- Settings đã tồn tại nhưng thiếu thông tin
- Muốn reset về dữ liệu mẫu mặc định
- Sau khi gặp lỗi validation

**Output:**
```
✅ Updated restaurant settings successfully:
   📝 Name: Nhà Hàng Món Ngon
   📍 Address: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh
   📞 Phone: 0901234567
   📧 Email: contact@nhahangmonngon.com
   🕐 Opening: 09:00
   🕐 Closing: 23:00
   💰 Tax Rate: 10%
   💵 Service Charge: 5%
```

### 3. **seedData.js** - Seed toàn bộ database
Tạo tất cả dữ liệu mẫu bao gồm cả restaurant settings.

```bash
node seedData.js
```

**Bao gồm:**
- ✅ Users (8 nhân viên)
- ✅ Menu items (26 món)
- ✅ Tables (20 bàn)
- ✅ Ingredients (21 loại)
- ✅ Vouchers (3 mã)
- ✅ **Restaurant Settings**
- ✅ Orders & Revenue (589 đơn từ 1/12-22/12/2025)

## 📊 Dữ Liệu Mẫu Mặc Định

```javascript
{
  restaurantName: "Nhà Hàng Món Ngon",
  address: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
  phoneNumber: "0901234567",
  email: "contact@nhahangmonngon.com",
  openingTime: "09:00",
  closingTime: "23:00",
  description: "Nhà hàng chuyên phục vụ các món ăn Việt Nam truyền thống...",
  logo: "/images/logo.png",
  taxRate: 10,
  serviceCharge: 5,
  currency: "VND",
  timezone: "Asia/Ho_Chi_Minh"
}
```

## 🐛 Xử Lý Lỗi

### Lỗi: "address: Path `address` is required"

**Nguyên nhân:** Settings cũ được tạo khi field `address` còn required.

**Giải pháp:**

```bash
# Cách 1: Cập nhật settings hiện có
node updateRestaurantSettings.js

# Cách 2: Xóa và tạo lại
# Vào MongoDB và xóa collection restaurant_settings
# Sau đó chạy:
node initRestaurantSettings.js
```

### Lỗi: "isSingleton: duplicate key error"

**Nguyên nhân:** Đã có settings trong database.

**Giải pháp:**

```bash
# Dùng script update thay vì init
node updateRestaurantSettings.js
```

## 🔄 Workflow Khuyến Nghị

### Setup Lần Đầu
```bash
# 1. Seed toàn bộ database
node seedData.js

# 2. Kiểm tra settings
node initRestaurantSettings.js
```

### Cập Nhật Settings
```bash
# Cập nhật với dữ liệu mẫu
node updateRestaurantSettings.js
```

### Reset Toàn Bộ
```bash
# Xóa database và seed lại
# (Cẩn thận: Sẽ mất tất cả dữ liệu!)
node seedData.js
```

## 📝 Tùy Chỉnh Dữ Liệu

### Sửa Dữ Liệu Mẫu

Mở file `updateRestaurantSettings.js` hoặc `initRestaurantSettings.js` và sửa:

```javascript
settings.restaurantName = 'Tên Nhà Hàng Của Bạn';
settings.address = 'Địa chỉ của bạn';
settings.phoneNumber = '0123456789';
settings.email = 'email@example.com';
settings.openingTime = '08:00';
settings.closingTime = '22:00';
// ... các trường khác
```

Sau đó chạy lại script:
```bash
node updateRestaurantSettings.js
```

## 🎯 Kiểm Tra Kết Quả

### Qua API
```bash
# Test với file HTTP
GET http://localhost:3000/restaurant-settings
```

### Qua Frontend
1. Đăng nhập vào web admin
2. Click menu "Nhà hàng"
3. Xem thông tin đã được điền sẵn

### Qua MongoDB
```javascript
// Trong MongoDB shell hoặc Compass
db.restaurant_settings.findOne({ isSingleton: true })
```

## 📚 Tham Khảo

- Model: `model/restaurantSettings.model.js`
- Controller: `controllers/restaurantSettings.controller.js`
- Routes: `routes/restaurantSettings.js`
- Test API: `test-restaurant-settings.http`

## ✅ Checklist

- [ ] Chạy `node updateRestaurantSettings.js`
- [ ] Kiểm tra API: `GET /restaurant-settings`
- [ ] Kiểm tra Frontend: Menu "Nhà hàng"
- [ ] Verify dữ liệu đầy đủ (tên, địa chỉ, giờ mở/đóng cửa)

---

**Cập nhật**: 23/12/2025  
**Version**: 1.0.0
