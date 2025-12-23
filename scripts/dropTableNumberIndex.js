/**
 * Script để xóa unique index tableNumber_1 khỏi collection tables
 * Chạy: node scripts/dropTableNumberIndex.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://admin:12345@cluster0.x98a7dd.mongodb.net/?appName=Cluster0';

async function dropTableNumberIndex() {
    try {
        console.log('Đang kết nối MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Đã kết nối MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('tables');

        // Lấy danh sách tất cả indexes
        const indexes = await collection.indexes();
        console.log('\n📋 Danh sách indexes hiện tại:');
        indexes.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        // Xóa index tableNumber_1 nếu tồn tại
        const tableNumberIndex = indexes.find(idx => idx.name === 'tableNumber_1');
        if (tableNumberIndex) {
            console.log('\n🗑️ Đang xóa index tableNumber_1...');
            await collection.dropIndex('tableNumber_1');
            console.log('✅ Đã xóa index tableNumber_1 thành công!');
        } else {
            console.log('\n⚠️ Không tìm thấy index tableNumber_1');
        }

        // Hiển thị danh sách indexes sau khi xóa
        const indexesAfter = await collection.indexes();
        console.log('\n📋 Danh sách indexes sau khi xóa:');
        indexesAfter.forEach(idx => {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
}

dropTableNumberIndex();
