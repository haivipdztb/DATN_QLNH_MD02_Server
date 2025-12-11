# Hướng Dẫn Thêm Soft Delete Vào Models

## Bước 1: Thêm vào từng model file

Với mỗi model file trong `/model`, thêm 2 dòng sau:

### 1. Thêm import ở đầu file (sau dòng `const db = require('./db');`):
```javascript
const { softDeletePlugin } = require('../utils/softDelete');
```

### 2. Thêm plugin sau schema definition (trước dòng `let xxxModel = ...`):
```javascript
// Thêm soft delete plugin
xxxSchema.plugin(softDeletePlugin);
```

## Ví dụ cho ingredient.model.js:

### TRƯỚC:
```javascript
const db = require('./db');

const ingredientSchema = new db.mongoose.Schema({
  // ... fields
});

let ingredientModel = db.mongoose.model('ingredientModel', ingredientSchema);
module.exports = { ingredientModel };
```

### SAU:
```javascript
const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

const ingredientSchema = new db.mongoose.Schema({
  // ... fields
});

// Thêm soft delete plugin
ingredientSchema.plugin(softDeletePlugin);

let ingredientModel = db.mongoose.model('ingredientModel', ingredientSchema);
module.exports = { ingredientModel };
```

## Danh sách models cần cập nhật:

- [x] user.model.js ✅
- [x] menu.model.js ✅
- [x] order.model.js ✅
- [x] report.model.js ✅
- [ ] ingredient.model.js
- [ ] table.model.js
- [ ] voucher.model.js
- [ ] shift.model.js
- [ ] salary.model.js
- [ ] attendance.model.js
- [ ] payroll.model.js
- [ ] shiftAssignment.model.js

## Bước 2: Cập nhật Controllers

Thay đổi từ `findByIdAndDelete` sang `softDelete`:

### TRƯỚC:
```javascript
await Model.findByIdAndDelete(id);
```

### SAU:
```javascript
await Model.softDelete(id);
```

## Bước 3: Cập nhật Queries

Các query tự động filter deleted documents:
```javascript
// Tự động loại bỏ deleted
await Model.find({});
await Model.findOne({});
await Model.findById(id);

// Bao gồm cả deleted
await Model.find({}).setOptions({ includeDeleted: true });
```

## Các phương thức có sẵn sau khi thêm plugin:

### Instance methods:
- `document.softDelete(userId)` - Xóa mềm document
- `document.restore()` - Khôi phục document đã xóa

### Static methods:
- `Model.softDelete(id, userId)` - Xóa mềm by ID
- `Model.restore(id)` - Khôi phục by ID
- `Model.findNotDeleted(filter)` - Tìm tất cả chưa xóa
- `Model.findOneNotDeleted(filter)` - Tìm một chưa xóa
- `Model.findByIdNotDeleted(id)` - Tìm by ID chưa xóa
- `Model.countNotDeleted(filter)` - Đếm chưa xóa

## Fields được thêm tự động:
- `deleted` (Boolean) - Đã xóa hay chưa
- `deletedAt` (Date) - Thời gian xóa
- `deletedBy` (ObjectId) - User thực hiện xóa
