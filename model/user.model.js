const db = require('./db');


// định nghĩa khuôn mẫu cho model
const userSchema = new db.mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, required: true },
        name: { type: String, required: true },
        phoneNumber: { type: String, required: false },
        email: { type: String, required: false, unique: true },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now }
    },
    {
        collection: 'users' // tên bảng dữ liệu
    }
)
// tạo model
let userModel = db.mongoose.model('userModel', userSchema);
module.exports = { userModel };