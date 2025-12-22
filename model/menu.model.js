const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');


// định nghĩa khuôn mẫu cho model
const menuSchema = new db.mongoose.Schema(
   {
       name: {type: String, required: true},
       price: {type: Number, required: true},
       category: {type: String, required: true},
       image: {type: String, required: false}, // URL hoặc đường dẫn hình ảnh
       status: {type: String, required: true, default: 'available'},
       createdAt: {type: Date, default: Date.now}
   },
   {
       collection:'menu' // tên bảng dữ liệu
   }
)

// Thêm soft delete plugin
menuSchema.plugin(softDeletePlugin);

// tạo model
let menuModel = db.mongoose.model('menuModel', menuSchema);
module.exports = {menuModel};
