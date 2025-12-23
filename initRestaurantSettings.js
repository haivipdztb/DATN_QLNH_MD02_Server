// Script để khởi tạo Restaurant Settings
const { restaurantSettingsModel } = require('./model/restaurantSettings.model');
const db = require('./model/db');

// Wait for connection to be ready
setTimeout(async () => {
    console.log('✅ Using existing MongoDB connection');
    await initRestaurantSettings();
}, 2000);

async function initRestaurantSettings() {
    try {
        console.log('🏪 Initializing restaurant settings...');

        // Kiểm tra xem đã có settings chưa
        const existingSettings = await restaurantSettingsModel.findOne({ isSingleton: true });

        if (existingSettings) {
            console.log('ℹ️  Restaurant settings already exist:');
            console.log('   - Name:', existingSettings.restaurantName);
            console.log('   - Address:', existingSettings.address);
            console.log('   - Phone:', existingSettings.phoneNumber);
            console.log('   - Opening:', existingSettings.openingTime);
            console.log('   - Closing:', existingSettings.closingTime);
            console.log('✅ No action needed');
            process.exit(0);
            return;
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

        console.log('✅ Created default restaurant settings:');
        console.log('   - Name:', settings.restaurantName);
        console.log('   - Address:', settings.address);
        console.log('   - Phone:', settings.phoneNumber);
        console.log('   - Email:', settings.email);
        console.log('   - Opening:', settings.openingTime);
        console.log('   - Closing:', settings.closingTime);
        console.log('   - Tax Rate:', settings.taxRate + '%');
        console.log('   - Service Charge:', settings.serviceCharge + '%');
        console.log('🎉 Restaurant settings initialized successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing restaurant settings:', error);
        process.exit(1);
    }
}
