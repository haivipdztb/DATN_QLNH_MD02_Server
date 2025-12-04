const db = require('./db');


// định nghĩa khuôn mẫu cho model
const reportSchema = new db.mongoose.Schema(
   {
       reportType: {type: String, required: true},
       date: {type: Date, required: true},
       timeFrame: {type: String, required: true},
       totalRevenue: {type: Number, required: true},
       totalOrders: {type: Number, required: true},
       totalDiscountGiven: {type: Number, default: 0},
       averageOrderValue: {type: Number, required: true},
       details: {type: Object},
    generatedAt: {type: Date, default: () => new Date()}
   },
   {
       collection:'reports' // tên bảng dữ liệu
   }
)
// tạo model
let reportModel = db.mongoose.model('reportModel', reportSchema);
module.exports = {reportModel};