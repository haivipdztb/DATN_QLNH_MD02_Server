// Script để update tất cả orders thành paid
const { orderModel } = require('./model/order.model');
const db = require('./model/db');

async function updateAllOrdersToPaid() {
    try {
        console.log('Đang kết nối database...');

        // Đếm số orders hiện tại
        const totalOrders = await orderModel.countDocuments();
        console.log(`Tổng số orders: ${totalOrders}`);

        const pendingOrders = await orderModel.countDocuments({ orderStatus: { $ne: 'paid' } });
        console.log(`Số orders chưa paid: ${pendingOrders}`);

        // Update tất cả orders thành paid
        const result = await orderModel.updateMany(
            { orderStatus: { $ne: 'paid' } },
            {
                $set: {
                    orderStatus: 'paid',
                    paidAt: new Date()
                }
            }
        );

        console.log(`\n✅ Đã update ${result.modifiedCount} orders thành paid!`);

        // Kiểm tra lại
        const paidOrders = await orderModel.countDocuments({ orderStatus: 'paid' });
        console.log(`Tổng số orders đã paid: ${paidOrders}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

// Chạy script
updateAllOrdersToPaid();
