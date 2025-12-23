# 🏪 Quản Lý Nhà Hàng & Đổi Mật Khẩu

## 📝 Tổng Quan

Tính năng quản lý thông tin nhà hàng và đổi mật khẩu đã được thêm vào hệ thống, bao gồm cả Backend và Frontend.

## ✅ Các Tính Năng

### 1. Quản Lý Thông Tin Nhà Hàng
- ✅ Tên nhà hàng
- ✅ Địa chỉ
- ✅ Số điện thoại
- ✅ Email
- ✅ **Giờ mở cửa**
- ✅ **Giờ đóng cửa**
- ✅ Mô tả
- ✅ Thuế VAT (%)
- ✅ Phí phục vụ (%)

### 2. Đổi Mật Khẩu
- ✅ Yêu cầu mật khẩu cũ
- ✅ Xác nhận mật khẩu mới
- ✅ Validation (tối thiểu 6 ký tự)
- ✅ Admin reset mật khẩu (không cần mật khẩu cũ)

## 🗂️ Cấu Trúc File

### Backend

```
DATN_QLNH_MD02_Server/
├── model/
│   └── restaurantSettings.model.js       # Model cho cài đặt nhà hàng
├── controllers/
│   └── restaurantSettings.controller.js  # Controller xử lý logic
├── routes/
│   └── restaurantSettings.js             # Routes định nghĩa endpoints
├── app.js                                # Đăng ký route
└── test-restaurant-settings.http         # File test API
```

### Frontend

```
DATN_QLNH_MD02_WEB_ADMIN/
├── src/
│   ├── api/
│   │   └── restaurantSettings.service.ts  # Service gọi API
│   ├── components/
│   │   ├── modules/
│   │   │   └── RestaurantManagement.tsx   # Component quản lý
│   │   └── layout/
│   │       └── MainLayout.tsx             # Thêm menu item
│   └── App.tsx                            # Đăng ký route
```

## 🚀 API Endpoints

### 1. Lấy Thông Tin Nhà Hàng
```http
GET /restaurant-settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "restaurantName": "Nhà Hàng Món Ngon",
    "address": "123 Đường ABC, Quận 1, TP.HCM",
    "phoneNumber": "0901234567",
    "email": "contact@nhahang.com",
    "openingTime": "09:00",
    "closingTime": "23:00",
    "description": "Nhà hàng chuyên các món ăn Việt Nam",
    "taxRate": 10,
    "serviceCharge": 5,
    "currency": "VND",
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

### 2. Cập Nhật Thông Tin Nhà Hàng
```http
PUT /restaurant-settings
Content-Type: application/json

{
  "restaurantName": "Nhà Hàng ABC",
  "address": "123 Đường XYZ",
  "phoneNumber": "0901234567",
  "email": "info@restaurant.com",
  "openingTime": "10:00",
  "closingTime": "22:00",
  "description": "Mô tả nhà hàng",
  "taxRate": 10,
  "serviceCharge": 5
}
```

### 3. Đổi Mật Khẩu
```http
POST /restaurant-settings/change-password
Content-Type: application/json

{
  "userId": "676889e4a5e1234567890abc",
  "oldPassword": "oldpass123",
  "newPassword": "newpass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công"
}
```

### 4. Admin Reset Mật Khẩu
```http
POST /restaurant-settings/admin-reset-password
Content-Type: application/json

{
  "userId": "676889e4a5e1234567890abc",
  "newPassword": "resetpass123"
}
```

## 💻 Sử Dụng Frontend

### 1. Truy Cập Trang Quản Lý

Sau khi đăng nhập, click vào menu **"Nhà hàng"** trên sidebar.

### 2. Tab Thông Tin Nhà Hàng

- Điền các thông tin cần thiết
- Chọn giờ mở/đóng cửa bằng TimePicker
- Click **"Lưu Thay Đổi"** để cập nhật

### 3. Tab Đổi Mật Khẩu

- Nhập mật khẩu cũ
- Nhập mật khẩu mới (tối thiểu 6 ký tự)
- Xác nhận mật khẩu mới
- Click **"Đổi Mật Khẩu"**

## 🔒 Validation

### Thông Tin Nhà Hàng
- ✅ Tên nhà hàng: Bắt buộc
- ✅ Địa chỉ: Bắt buộc
- ✅ Số điện thoại: 10-11 số
- ✅ Email: Định dạng email hợp lệ
- ✅ Giờ mở/đóng cửa: Bắt buộc

### Đổi Mật Khẩu
- ✅ Mật khẩu cũ: Bắt buộc
- ✅ Mật khẩu mới: Tối thiểu 6 ký tự
- ✅ Xác nhận mật khẩu: Phải khớp với mật khẩu mới

## 🧪 Test API

Sử dụng file `test-restaurant-settings.http`:

```bash
# 1. Lấy thông tin
GET http://localhost:3000/restaurant-settings

# 2. Cập nhật thông tin
PUT http://localhost:3000/restaurant-settings
# (với body JSON)

# 3. Đổi mật khẩu
POST http://localhost:3000/restaurant-settings/change-password
# (với body JSON)
```

## 📊 Database Schema

### Restaurant Settings Collection

```javascript
{
  restaurantName: String (required),
  address: String (required),
  phoneNumber: String,
  email: String,
  openingTime: String (HH:mm format),
  closingTime: String (HH:mm format),
  description: String,
  logo: String,
  taxRate: Number (default: 0),
  serviceCharge: Number (default: 0),
  currency: String (default: 'VND'),
  timezone: String (default: 'Asia/Ho_Chi_Minh'),
  isSingleton: Boolean (unique: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Lưu ý:** Chỉ có **1 document duy nhất** trong collection này (singleton pattern).

## 🎨 UI Components

### Ant Design Components Sử Dụng
- ✅ `Card` - Container cho form
- ✅ `Form` - Form validation
- ✅ `Input` - Text input
- ✅ `TimePicker` - Chọn giờ
- ✅ `InputNumber` - Nhập số
- ✅ `Tabs` - Tab navigation
- ✅ `Button` - Actions
- ✅ `Divider` - Phân chia sections

## 🔐 Security

### Password Hashing
- Sử dụng `bcryptjs` với salt rounds = 10
- Mật khẩu được mã hóa trước khi lưu vào database

### Validation
- Backend validation cho tất cả inputs
- Frontend validation với Ant Design Form
- Error messages rõ ràng

## 📱 Responsive Design

- ✅ Mobile-friendly
- ✅ Tablet-friendly
- ✅ Desktop-optimized
- ✅ Grid system với Row/Col

## 🎯 Tính Năng Nổi Bật

1. **Singleton Pattern**: Chỉ 1 document settings duy nhất
2. **Auto-create**: Tự động tạo settings nếu chưa tồn tại
3. **Partial Update**: Chỉ cập nhật các trường được gửi lên
4. **Password Confirmation**: Xác nhận mật khẩu mới
5. **User-friendly UI**: Giao diện trực quan, dễ sử dụng

## 🐛 Troubleshooting

### Lỗi "Không tìm thấy thông tin người dùng"
- Đảm bảo đã đăng nhập
- Kiểm tra localStorage có chứa thông tin user

### Lỗi "Mật khẩu cũ không đúng"
- Kiểm tra lại mật khẩu cũ
- Đảm bảo không có khoảng trắng thừa

### Lỗi "Mật khẩu phải có ít nhất 6 ký tự"
- Nhập mật khẩu mới có ít nhất 6 ký tự

## 📝 Changelog

### Version 1.0.0 (23/12/2025)
- ✅ Thêm model RestaurantSettings
- ✅ Thêm controller và routes
- ✅ Thêm API endpoints
- ✅ Thêm frontend component
- ✅ Thêm service layer
- ✅ Thêm menu item vào sidebar
- ✅ Thêm validation
- ✅ Thêm password change functionality

---

**Tạo bởi**: Development Team  
**Ngày tạo**: 23/12/2025  
**Version**: 1.0.0
