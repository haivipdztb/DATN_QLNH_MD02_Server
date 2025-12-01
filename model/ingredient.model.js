const db = require('./db');

const ingredientSchema = new db.mongoose.Schema(
  {
    name: { type: String, required: true }, // Tên nguyên liệu (ví dụ: Thịt bò, Gạo, Trứng)
    unit: { type: String, required: true }, // Đơn vị tính (kg, g, lít, quả, lon)

    category: {
      type: String,
      enum: ['tuoi', 'kho', 'bia', 'ruou', 'gia_vi', 'do_uong', 'khac'],
      default: 'khac'
    }, // Phân loại kho: tươi, khô, bia, rượu, khác

    tag: { type: String, default: '' }, // Tag phụ (thịt, hải sản, rau củ, v.v.)

    quantity: { type: Number, default: 0 }, // Số lượng tồn kho hiện tại

    minQuantity: { type: Number, default: 0 }, // Số lượng tối thiểu cần có

    minThreshold: { type: Number, default: 5 }, // Ngưỡng cảnh báo (nếu quantity < minThreshold thì báo sắp hết)

    importPrice: { type: Number, default: 0 }, // Giá nhập trung bình (để tính cost)

    supplier: { type: String, default: '' }, // Nhà cung cấp (tùy chọn)

    image: { type: String, default: '' }, // Hình ảnh nguyên liệu

    description: { type: String, default: '' }, // Mô tả

    status: {
      type: String,
      enum: ['available', 'low_stock', 'out_of_stock'],
      default: 'available'
<<<<<<< HEAD
    }, // Trạng thái: còn hàng, sắp hết, hết hàng
    image: { 
      type: String 
    }, // Link ảnh nguyên liệu
    description: { 
      type: String 
    }, // Mô tả
    supplier: { 
      type: String 
    }, // Nhà cung cấp
    lastRestocked: { 
      type: Date 
    }, // Lần nhập kho gần nhất
    createdAt: { 
      type: Date, 
      default: () => new Date() 
    },
    updatedAt: { 
      type: Date, 
      default: () => new Date() 
    },
=======
    },

    lastRestocked: { type: Date }, // Lần nhập hàng gần nhất
    lastImportDate: { type: Date }, // Ngày nhập hàng gần nhất (deprecated, dùng lastRestocked)
    expirationDate: { type: Date }, // Hạn sử dụng (nếu cần quản lý lô)
>>>>>>> 4cf1959092632681952335885d6eb6f8bb886346
  },
  {
    collection: 'ingredients',
    timestamps: true // Tự động tạo createdAt và updatedAt
  }
);

// Middleware: Tự động cập nhật status dựa trên số lượng trước khi lưu
ingredientSchema.pre('save', function (next) {
  if (this.quantity <= 0) {
    this.status = 'out_of_stock';
  } else if (this.quantity <= this.minThreshold) {
    this.status = 'low_stock';
  } else {
    this.status = 'available';
  }
<<<<<<< HEAD
  this.updatedAt = new Date();
=======
>>>>>>> 4cf1959092632681952335885d6eb6f8bb886346
  next();
});

let ingredientModel = db.mongoose.model('ingredientModel', ingredientSchema);
module.exports = { ingredientModel };