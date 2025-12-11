// Script để tạo nhiều đơn hàng mẫu từ đầu tháng 12 đến bây giờ
const { orderModel } = require('./model/order.model');
const { menuModel } = require('./model/menu.model');
const { userModel } = require('./model/user.model');
const db = require('./model/db');

// Danh sách phương thức thanh toán
const paymentMethods = ['cash', 'card', 'momo', 'banking'];

// Hàm random số trong khoảng
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hàm random element từ array
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Hàm tạo random date từ startDate đến endDate
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Hàm tạo random giờ trong ngày (8h-22h)
function setRandomBusinessHour(date) {
    const hour = randomInt(8, 22); // 8am - 10pm
    const minute = randomInt(0, 59);
    date.setHours(hour, minute, 0, 0);
    return date;
}

async function generateSampleOrders() {
    try {
        console.log('🚀 Bắt đầu tạo đơn hàng mẫu...\n');

        // Lấy danh sách menu items
        const menuItems = await menuModel.find();
        console.log(`📋 Tìm thấy ${menuItems.length} món ăn`);

        // Lấy danh sách users
        const users = await userModel.find();
        const cashiers = users.filter(u => u.role === 'cashier' || u.role === 'admin');
        const servers = users.filter(u => u.role === 'order' || u.role === 'admin');

        console.log(`👥 Tìm thấy ${cashiers.length} cashiers và ${servers.length} servers`);

        if (menuItems.length === 0 || cashiers.length === 0 || servers.length === 0) {
            console.log('❌ Không đủ dữ liệu để tạo orders!');
            process.exit(1);
        }

        // Khoảng thời gian: từ đầu tháng 12 đến bây giờ
        const startDate = new Date('2025-12-01T00:00:00');
        const endDate = new Date(); // Bây giờ

        console.log(`📅 Tạo orders từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}\n`);

        const ordersToCreate = [];
        const numberOfOrders = 150; // Tạo 150 đơn hàng

        for (let i = 0; i < numberOfOrders; i++) {
            // Random ngày và giờ
            const orderDate = setRandomBusinessHour(randomDate(startDate, endDate));

            // Random table number (1-20)
            const tableNumber = randomInt(1, 20);

            // Random server và cashier
            const server = randomElement(servers);
            const cashier = randomElement(cashiers);

            // Random số lượng món (1-5 món)
            const numberOfItems = randomInt(1, 5);
            const items = [];
            let totalAmount = 0;

            // Chọn random các món
            for (let j = 0; j < numberOfItems; j++) {
                const menuItem = randomElement(menuItems);
                const quantity = randomInt(1, 3);
                const itemTotal = menuItem.price * quantity;

                items.push({
                    menuItem: menuItem._id,
                    menuItemName: menuItem.name,
                    imageUrl: menuItem.image || '',
                    quantity: quantity,
                    price: menuItem.price,
                    status: 'ready'
                });

                totalAmount += itemTotal;
            }

            // Random discount (0-20%)
            const discountPercent = randomInt(0, 20);
            const discount = Math.floor(totalAmount * discountPercent / 100);
            const finalAmount = totalAmount - discount;

            // Random payment method
            const paymentMethod = randomElement(paymentMethods);

            // Tạo order object
            const order = {
                tableNumber,
                server: server._id,
                cashier: cashier._id,
                items,
                totalAmount,
                discount,
                finalAmount,
                paidAmount: finalAmount,
                change: 0,
                paymentMethod,
                orderStatus: 'paid',
                createdAt: orderDate,
                paidAt: new Date(orderDate.getTime() + randomInt(30, 120) * 60000) // Paid sau 30-120 phút
            };

            ordersToCreate.push(order);
        }

        // Insert tất cả orders
        console.log(`💾 Đang tạo ${ordersToCreate.length} đơn hàng...`);
        const result = await orderModel.insertMany(ordersToCreate);

        console.log(`\n✅ Đã tạo thành công ${result.length} đơn hàng!`);

        // Thống kê
        const totalRevenue = ordersToCreate.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalDiscount = ordersToCreate.reduce((sum, order) => sum + order.discount, 0);
        const avgOrderValue = totalRevenue / ordersToCreate.length;

        console.log('\n📊 THỐNG KÊ:');
        console.log(`   Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
        console.log(`   Tổng giảm giá: ${totalDiscount.toLocaleString('vi-VN')} VNĐ`);
        console.log(`   Giá trị TB/đơn: ${Math.round(avgOrderValue).toLocaleString('vi-VN')} VNĐ`);

        // Thống kê theo phương thức thanh toán
        const paymentStats = {};
        ordersToCreate.forEach(order => {
            paymentStats[order.paymentMethod] = (paymentStats[order.paymentMethod] || 0) + 1;
        });

        console.log('\n💳 PHƯƠNG THỨC THANH TOÁN:');
        Object.entries(paymentStats).forEach(([method, count]) => {
            console.log(`   ${method}: ${count} đơn (${((count / ordersToCreate.length) * 100).toFixed(1)}%)`);
        });

        // Thống kê theo ngày
        const dailyStats = {};
        ordersToCreate.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
        });

        console.log(`\n📅 PHÂN BỐ THEO NGÀY: ${Object.keys(dailyStats).length} ngày có đơn hàng`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

// Chạy script
generateSampleOrders();
