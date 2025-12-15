const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://admin:12345@cluster0.x98a7dd.mongodb.net/?appName=Cluster0';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Đã kết nối MongoDB');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error);
        process.exit(1);
    }
};

// Migration function
const migrateUserRoles = async () => {
    try {
        await connectDB();

        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            password: String,
            role: String,
            name: String,
            phoneNumber: String,
            email: String,
            isActive: Boolean,
            createdAt: Date
        }), 'users');

        // Các role cũ cần được chuyển thành 'waiter'
        const oldRoles = ['manager', 'staff', 'order'];

        // Đếm số lượng user cần update
        const count = await User.countDocuments({ role: { $in: oldRoles } });
        console.log(`\n📊 Tìm thấy ${count} user với role cũ cần cập nhật`);

        if (count === 0) {
            console.log('✅ Không có user nào cần cập nhật');
            await mongoose.connection.close();
            return;
        }

        // Hiển thị danh sách user sẽ được update
        const usersToUpdate = await User.find({ role: { $in: oldRoles } }).select('username name role');
        console.log('\n📋 Danh sách user sẽ được cập nhật:');
        usersToUpdate.forEach(user => {
            console.log(`   - ${user.username} (${user.name}): ${user.role} → waiter`);
        });

        // Thực hiện update
        const result = await User.updateMany(
            { role: { $in: oldRoles } },
            { $set: { role: 'waiter' } }
        );

        console.log(`\n✅ Đã cập nhật thành công ${result.modifiedCount} user`);
        console.log(`   - Matched: ${result.matchedCount}`);
        console.log(`   - Modified: ${result.modifiedCount}`);

        // Hiển thị thống kê role sau khi update
        const roleStats = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📊 Thống kê role sau khi cập nhật:');
        roleStats.forEach(stat => {
            console.log(`   - ${stat._id}: ${stat.count} user`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Migration hoàn tất!');
    } catch (error) {
        console.error('❌ Lỗi khi migration:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Chạy migration
migrateUserRoles();
