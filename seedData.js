// Import models (they will use the existing connection from db.js)
const { userModel } = require('./model/user.model');
const { menuModel } = require('./model/menu.model');
const { tableModel } = require('./model/table.model');
const { orderModel } = require('./model/order.model');
const { Revenue } = require('./model/revenue.model');
const { ingredientModel } = require('./model/ingredient.model');
const { voucherModel } = require('./model/voucher.model');
const { restaurantSettingsModel } = require('./model/restaurantSettings.model');
const db = require('./model/db');

// Wait for connection to be ready
setTimeout(() => {
    console.log('✅ Using existing MongoDB connection');
    seedDatabase();
}, 2000);

// Helper function to generate random date between two dates
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random number in range
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random item from array
function randomItem(arr) {
    return arr[randomInt(0, arr.length - 1)];
}

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing orders and revenue data to regenerate with correct dates
        console.log('🗑️  Clearing old orders and revenue data...');
        await orderModel.deleteMany({});
        await Revenue.deleteMany({});
        console.log('✅ Cleared old data');

        // 1. Create Users
        console.log('👥 Creating users...');
        const users = await createUsers();
        console.log(`✅ Created ${users.length} users`);

        // 2. Create Menu Items
        console.log('🍽️  Creating menu items...');
        const menuItems = await createMenuItems();
        console.log(`✅ Created ${menuItems.length} menu items`);

        // 3. Create Tables
        console.log('🪑 Creating tables...');
        const tables = await createTables();
        console.log(`✅ Created ${tables.length} tables`);

        // 4. Create Ingredients
        console.log('🥬 Creating ingredients...');
        const ingredients = await createIngredients();
        console.log(`✅ Created ${ingredients.length} ingredients`);

        // 5. Create Vouchers
        console.log('🎫 Creating vouchers...');
        const vouchers = await createVouchers();
        console.log(`✅ Created ${vouchers.length} vouchers`);

        // 6. Create Restaurant Settings
        console.log('🏪 Creating restaurant settings...');
        await createRestaurantSettings();
        console.log('✅ Created restaurant settings');

        // 7. Create Orders and Revenue (Dec 1-22, 2025)
        console.log('📝 Creating orders and revenue data...');
        await createOrdersAndRevenue(users, menuItems, tables, vouchers);
        console.log('✅ Created orders and revenue data');

        console.log('🎉 Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

async function createUsers() {
    const usersData = [
        {
            username: 'admin01',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q', // password: admin123
            role: 'admin',
            name: 'Nguyễn Văn Admin',
            phoneNumber: '0901234567',
            email: 'admin@restaurant.com',
            isActive: true,
        },
        {
            username: 'cashier01',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'cashier',
            name: 'Trần Thị Thu',
            phoneNumber: '0902345678',
            email: 'cashier01@restaurant.com',
            isActive: true,
        },
        {
            username: 'cashier02',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'cashier',
            name: 'Lê Văn Tài',
            phoneNumber: '0903456789',
            email: 'cashier02@restaurant.com',
            isActive: true,
        },
        {
            username: 'waiter01',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'waiter',
            name: 'Phạm Thị Lan',
            phoneNumber: '0904567890',
            email: 'waiter01@restaurant.com',
            isActive: true,
        },
        {
            username: 'waiter02',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'waiter',
            name: 'Hoàng Văn Nam',
            phoneNumber: '0905678901',
            email: 'waiter02@restaurant.com',
            isActive: true,
        },
        {
            username: 'waiter03',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'waiter',
            name: 'Vũ Thị Hoa',
            phoneNumber: '0906789012',
            email: 'waiter03@restaurant.com',
            isActive: true,
        },
        {
            username: 'kitchen01',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'kitchen',
            name: 'Đỗ Văn Bếp',
            phoneNumber: '0907890123',
            email: 'kitchen01@restaurant.com',
            isActive: true,
        },
        {
            username: 'kitchen02',
            password: '$2a$10$rZ8qNqZ5qZ5qZ5qZ5qZ5qeqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
            role: 'kitchen',
            name: 'Bùi Thị Minh',
            phoneNumber: '0908901234',
            email: 'kitchen02@restaurant.com',
            isActive: true,
        },
    ];

    const existingUsers = await userModel.find({});
    if (existingUsers.length > 0) {
        console.log('ℹ️  Users already exist, skipping user creation');
        return existingUsers;
    }

    return await userModel.insertMany(usersData);
}

async function createMenuItems() {
    const menuData = [
        // Món chính
        { name: 'Phở Bò Đặc Biệt', price: 65000, category: 'Món chính', image: '/images/pho-bo.jpg', status: 'available' },
        { name: 'Bún Chả Hà Nội', price: 55000, category: 'Món chính', image: '/images/bun-cha.jpg', status: 'available' },
        { name: 'Cơm Tấm Sườn Bì', price: 50000, category: 'Món chính', image: '/images/com-tam.jpg', status: 'available' },
        { name: 'Mì Xào Hải Sản', price: 70000, category: 'Món chính', image: '/images/mi-xao.jpg', status: 'available' },
        { name: 'Bún Bò Huế', price: 60000, category: 'Món chính', image: '/images/bun-bo-hue.jpg', status: 'available' },
        { name: 'Cơm Gà Xối Mỡ', price: 55000, category: 'Món chính', image: '/images/com-ga.jpg', status: 'available' },
        { name: 'Hủ Tiếu Nam Vang', price: 58000, category: 'Món chính', image: '/images/hu-tieu.jpg', status: 'available' },
        { name: 'Bánh Mì Thịt Nướng', price: 35000, category: 'Món chính', image: '/images/banh-mi.jpg', status: 'available' },

        // Món phụ
        { name: 'Gỏi Cuốn Tôm Thịt', price: 40000, category: 'Món phụ', image: '/images/goi-cuon.jpg', status: 'available' },
        { name: 'Chả Giò Rế', price: 45000, category: 'Món phụ', image: '/images/cha-gio.jpg', status: 'available' },
        { name: 'Nem Nướng Nha Trang', price: 50000, category: 'Món phụ', image: '/images/nem-nuong.jpg', status: 'available' },
        { name: 'Súp Cua', price: 35000, category: 'Món phụ', image: '/images/sup-cua.jpg', status: 'available' },
        { name: 'Salad Rau Củ', price: 30000, category: 'Món phụ', image: '/images/salad.jpg', status: 'available' },

        // Đồ uống
        { name: 'Trà Đá', price: 5000, category: 'Đồ uống', image: '/images/tra-da.jpg', status: 'available' },
        { name: 'Nước Ngọt Coca', price: 15000, category: 'Đồ uống', image: '/images/coca.jpg', status: 'available' },
        { name: 'Nước Ngọt Pepsi', price: 15000, category: 'Đồ uống', image: '/images/pepsi.jpg', status: 'available' },
        { name: 'Bia Tiger', price: 20000, category: 'Đồ uống', image: '/images/bia-tiger.jpg', status: 'available' },
        { name: 'Bia Heineken', price: 25000, category: 'Đồ uống', image: '/images/bia-heineken.jpg', status: 'available' },
        { name: 'Nước Cam Ép', price: 25000, category: 'Đồ uống', image: '/images/nuoc-cam.jpg', status: 'available' },
        { name: 'Cà Phê Đen', price: 20000, category: 'Đồ uống', image: '/images/ca-phe-den.jpg', status: 'available' },
        { name: 'Cà Phê Sữa', price: 25000, category: 'Đồ uống', image: '/images/ca-phe-sua.jpg', status: 'available' },
        { name: 'Trà Sữa Trân Châu', price: 30000, category: 'Đồ uống', image: '/images/tra-sua.jpg', status: 'available' },

        // Tráng miệng
        { name: 'Chè Ba Màu', price: 25000, category: 'Tráng miệng', image: '/images/che-ba-mau.jpg', status: 'available' },
        { name: 'Bánh Flan', price: 20000, category: 'Tráng miệng', image: '/images/banh-flan.jpg', status: 'available' },
        { name: 'Kem Dừa', price: 30000, category: 'Tráng miệng', image: '/images/kem-dua.jpg', status: 'available' },
    ];

    const existingMenu = await menuModel.find({});
    if (existingMenu.length > 0) {
        console.log('ℹ️  Menu items already exist, using existing items');
        return existingMenu;
    }

    return await menuModel.insertMany(menuData);
}

async function createTables() {
    const tablesData = [];
    for (let i = 1; i <= 20; i++) {
        tablesData.push({
            tableNumber: i,
            capacity: i <= 10 ? 4 : (i <= 15 ? 6 : 8),
            status: 'available',
            location: i <= 10 ? 'Tầng 1' : 'Tầng 2',
        });
    }

    const existingTables = await tableModel.find({});
    if (existingTables.length > 0) {
        console.log('ℹ️  Tables already exist, using existing tables');
        return existingTables;
    }

    return await tableModel.insertMany(tablesData);
}

async function createIngredients() {
    const ingredientsData = [
        // Thịt
        { name: 'Thịt Bò', unit: 'kg', category: 'tuoi', tag: 'thịt', quantity: 50, minThreshold: 10, importPrice: 250000, supplier: 'Công ty Thịt Sạch ABC', status: 'available' },
        { name: 'Thịt Heo', unit: 'kg', category: 'tuoi', tag: 'thịt', quantity: 60, minThreshold: 15, importPrice: 120000, supplier: 'Công ty Thịt Sạch ABC', status: 'available' },
        { name: 'Thịt Gà', unit: 'kg', category: 'tuoi', tag: 'thịt', quantity: 40, minThreshold: 10, importPrice: 80000, supplier: 'Trang trại Gà Sạch', status: 'available' },

        // Hải sản
        { name: 'Tôm Sú', unit: 'kg', category: 'tuoi', tag: 'hải sản', quantity: 25, minThreshold: 5, importPrice: 350000, supplier: 'Chợ Hải Sản Tươi Sống', status: 'available' },
        { name: 'Cua Biển', unit: 'kg', category: 'tuoi', tag: 'hải sản', quantity: 15, minThreshold: 5, importPrice: 200000, supplier: 'Chợ Hải Sản Tươi Sống', status: 'available' },
        { name: 'Mực Tươi', unit: 'kg', category: 'tuoi', tag: 'hải sản', quantity: 20, minThreshold: 5, importPrice: 150000, supplier: 'Chợ Hải Sản Tươi Sống', status: 'available' },

        // Rau củ
        { name: 'Rau Sống', unit: 'kg', category: 'tuoi', tag: 'rau củ', quantity: 30, minThreshold: 8, importPrice: 20000, supplier: 'Vườn Rau Sạch Đà Lạt', status: 'available' },
        { name: 'Hành Tây', unit: 'kg', category: 'tuoi', tag: 'rau củ', quantity: 25, minThreshold: 5, importPrice: 15000, supplier: 'Vườn Rau Sạch Đà Lạt', status: 'available' },
        { name: 'Cà Chua', unit: 'kg', category: 'tuoi', tag: 'rau củ', quantity: 35, minThreshold: 10, importPrice: 18000, supplier: 'Vườn Rau Sạch Đà Lạt', status: 'available' },
        { name: 'Dưa Leo', unit: 'kg', category: 'tuoi', tag: 'rau củ', quantity: 20, minThreshold: 5, importPrice: 12000, supplier: 'Vườn Rau Sạch Đà Lạt', status: 'available' },

        // Gia vị
        { name: 'Nước Mắm', unit: 'lít', category: 'gia_vi', tag: 'gia vị', quantity: 40, minThreshold: 10, importPrice: 50000, supplier: 'Công ty Gia Vị Việt', status: 'available' },
        { name: 'Dầu Ăn', unit: 'lít', category: 'gia_vi', tag: 'gia vị', quantity: 50, minThreshold: 10, importPrice: 45000, supplier: 'Công ty Gia Vị Việt', status: 'available' },
        { name: 'Muối', unit: 'kg', category: 'gia_vi', tag: 'gia vị', quantity: 30, minThreshold: 5, importPrice: 8000, supplier: 'Công ty Gia Vị Việt', status: 'available' },
        { name: 'Đường', unit: 'kg', category: 'gia_vi', tag: 'gia vị', quantity: 35, minThreshold: 8, importPrice: 20000, supplier: 'Công ty Gia Vị Việt', status: 'available' },

        // Đồ khô
        { name: 'Gạo', unit: 'kg', category: 'kho', tag: 'đồ khô', quantity: 200, minThreshold: 50, importPrice: 18000, supplier: 'Công ty Lương Thực', status: 'available' },
        { name: 'Mì Sợi', unit: 'kg', category: 'kho', tag: 'đồ khô', quantity: 80, minThreshold: 20, importPrice: 25000, supplier: 'Công ty Lương Thực', status: 'available' },
        { name: 'Bánh Phở', unit: 'kg', category: 'kho', tag: 'đồ khô', quantity: 60, minThreshold: 15, importPrice: 22000, supplier: 'Công ty Lương Thực', status: 'available' },

        // Đồ uống
        { name: 'Bia Tiger', unit: 'lon', category: 'bia', tag: 'đồ uống', quantity: 150, minThreshold: 30, importPrice: 12000, supplier: 'Công ty Bia Rượu', status: 'available' },
        { name: 'Bia Heineken', unit: 'lon', category: 'bia', tag: 'đồ uống', quantity: 120, minThreshold: 30, importPrice: 15000, supplier: 'Công ty Bia Rượu', status: 'available' },
        { name: 'Coca Cola', unit: 'lon', category: 'do_uong', tag: 'đồ uống', quantity: 200, minThreshold: 50, importPrice: 8000, supplier: 'Công ty Nước Giải Khát', status: 'available' },
        { name: 'Pepsi', unit: 'lon', category: 'do_uong', tag: 'đồ uống', quantity: 180, minThreshold: 50, importPrice: 8000, supplier: 'Công ty Nước Giải Khát', status: 'available' },
    ];

    const existingIngredients = await ingredientModel.find({});
    if (existingIngredients.length > 0) {
        console.log('ℹ️  Ingredients already exist, using existing ingredients');
        return existingIngredients;
    }

    return await ingredientModel.insertMany(ingredientsData);
}

async function createVouchers() {
    const vouchersData = [
        {
            code: 'WELCOME10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderValue: 100000,
            maxDiscount: 50000,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-31'),
            usageLimit: 100,
            usedCount: 0,
            isActive: true,
            description: 'Giảm 10% cho đơn hàng từ 100k',
        },
        {
            code: 'FREESHIP',
            discountType: 'fixed',
            discountValue: 20000,
            minOrderValue: 150000,
            maxDiscount: 0,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-31'),
            usageLimit: 50,
            usedCount: 0,
            isActive: true,
            description: 'Miễn phí ship cho đơn từ 150k',
        },
        {
            code: 'BIGDEAL',
            discountType: 'percentage',
            discountValue: 20,
            minOrderValue: 300000,
            maxDiscount: 100000,
            startDate: new Date('2025-12-01'),
            endDate: new Date('2025-12-31'),
            usageLimit: 30,
            usedCount: 0,
            isActive: true,
            description: 'Giảm 20% cho đơn hàng từ 300k',
        },
    ];

    const existingVouchers = await voucherModel.find({});
    if (existingVouchers.length > 0) {
        console.log('ℹ️  Vouchers already exist, using existing vouchers');
        return existingVouchers;
    }

    return await voucherModel.insertMany(vouchersData);
}

async function createRestaurantSettings() {
    try {
        // Kiểm tra xem đã có settings chưa
        const existingSettings = await restaurantSettingsModel.findOne({ isSingleton: true });

        if (existingSettings) {
            console.log('ℹ️  Restaurant settings already exist, skipping creation');
            return existingSettings;
        }

        // Tạo settings mặc định
        const settingsData = {
            restaurantName: 'Nhà Hàng Món Ngon',
            address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
            phoneNumber: '0901234567',
            email: 'contact@nhahangmonngon.com',
            openingTime: '09:00',
            closingTime: '23:00',
            description: 'Nhà hàng chuyên phục vụ các món ăn Việt Nam truyền thống với hương vị đặc trưng, không gian ấm cúng và phục vụ tận tình.',
            logo: '/images/logo.png',
            taxRate: 10,
            serviceCharge: 5,
            currency: 'VND',
            timezone: 'Asia/Ho_Chi_Minh',
            isSingleton: true
        };

        const settings = new restaurantSettingsModel(settingsData);
        await settings.save();

        console.log('✅ Created default restaurant settings');
        return settings;
    } catch (error) {
        console.error('Error creating restaurant settings:', error);
        throw error;
    }
}

async function createOrdersAndRevenue(users, menuItems, tables, vouchers) {
    const startDate = new Date('2025-12-01T00:00:00');
    const endDate = new Date('2025-12-22T23:59:59');

    const waiters = users.filter(u => u.role === 'waiter');
    const cashiers = users.filter(u => u.role === 'cashier');

    const paymentMethods = ['Tiền mặt', 'QR', 'Thẻ', 'Card'];

    let totalOrders = 0;

    // Generate orders for each day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const currentDate = new Date(date);

        // Số lượng đơn hàng mỗi ngày (15-35 đơn)
        const ordersPerDay = randomInt(15, 35);

        for (let i = 0; i < ordersPerDay; i++) {
            // Random time during business hours (10:00 - 22:00)
            const hour = randomInt(10, 21);
            const minute = randomInt(0, 59);
            const orderDate = new Date(currentDate);
            orderDate.setHours(hour, minute, 0, 0);

            // Random table, waiter, cashier
            const table = randomItem(tables);
            const waiter = randomItem(waiters);
            const cashier = randomItem(cashiers);

            // Random number of items (1-5)
            const numItems = randomInt(1, 5);
            const orderItems = [];
            let totalAmount = 0;

            for (let j = 0; j < numItems; j++) {
                const menuItem = randomItem(menuItems);
                const quantity = randomInt(1, 3);
                const price = menuItem.price;

                orderItems.push({
                    menuItem: menuItem._id,
                    menuItemName: menuItem.name,
                    imageUrl: menuItem.image,
                    quantity: quantity,
                    price: price,
                    status: 'served',
                    note: '',
                });

                totalAmount += price * quantity;
            }

            // Random discount (0-20%)
            let discount = 0;
            let discountPercent = 0;

            // 30% chance to apply voucher
            if (Math.random() < 0.3 && vouchers.length > 0) {
                const voucher = randomItem(vouchers);
                if (totalAmount >= voucher.minOrderValue) {
                    if (voucher.discountType === 'percentage') {
                        discountPercent = voucher.discountValue;
                        discount = Math.min((totalAmount * discountPercent) / 100, voucher.maxDiscount || totalAmount);
                    } else {
                        discount = voucher.discountValue;
                    }
                }
            } else {
                // Random discount
                discountPercent = randomInt(0, 20);
                discount = (totalAmount * discountPercent) / 100;
            }

            const finalAmount = totalAmount - discount;
            const paidAmount = Math.ceil(finalAmount / 1000) * 1000; // Round up to nearest 1000
            const change = paidAmount - finalAmount;
            const paymentMethod = randomItem(paymentMethods);

            // Create order
            const order = new orderModel({
                tableNumber: table.tableNumber,
                tableNumbers: [table.tableNumber],
                server: waiter._id,
                cashier: cashier._id,
                items: orderItems,
                totalAmount: totalAmount,
                discount: discount,
                finalAmount: finalAmount,
                paidAmount: paidAmount,
                change: change,
                paymentMethod: paymentMethod,
                orderStatus: 'paid',
                createdAt: orderDate,
                paidAt: new Date(orderDate.getTime() + randomInt(30, 90) * 60000), // Paid 30-90 minutes after order
            });

            await order.save();

            // Create revenue record
            const revenue = new Revenue({
                orderId: order._id,
                tableNumber: table.tableNumber,
                amount: finalAmount,
                paymentMethod: paymentMethod,
                paidAt: order.paidAt,
                createdAt: order.paidAt,
                updatedAt: order.paidAt,
            });

            await revenue.save();

            totalOrders++;
        }

        console.log(`✅ Created orders for ${currentDate.toLocaleDateString('vi-VN')}`);
    }

    console.log(`📊 Total orders created: ${totalOrders}`);
}

// Run the seeder
// node seedData.js
