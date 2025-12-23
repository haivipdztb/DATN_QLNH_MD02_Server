// Script để cập nhật Restaurant Settings với dữ liệu mẫu đầy đủ
const { restaurantSettingsModel } = require('./model/restaurantSettings.model');
const db = require('./model/db');

// Wait for connection to be ready
setTimeout(async () => {
    console.log('✅ Using existing MongoDB connection');
    await updateRestaurantSettings();
}, 2000);

async function updateRestaurantSettings() {
    try {
        console.log('🏪 Updating restaurant settings...');

        // Tìm settings hiện có
        let settings = await restaurantSettingsModel.findOne({ isSingleton: true });

        if (!settings) {
            console.log('ℹ️  No existing settings found, creating new one...');
            settings = new restaurantSettingsModel({
                isSingleton: true
            });
        }

        // Cập nhật với dữ liệu mẫu đầy đủ
        settings.restaurantName = 'Nhà Hàng Món Ngon';
        settings.address = '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh';
        settings.phoneNumber = '0901234567';
        settings.email = 'contact@nhahangmonngon.com';
        settings.openingTime = '09:00';
        settings.closingTime = '23:00';
        settings.description = 'Nhà hàng chuyên phục vụ các món ăn Việt Nam truyền thống với hương vị đặc trưng, không gian ấm cúng và phục vụ tận tình.';
        settings.logo = '/images/logo.png';
        settings.taxRate = 10;
        settings.serviceCharge = 5;
        settings.currency = 'VND';
        settings.timezone = 'Asia/Ho_Chi_Minh';

        await settings.save();

        console.log('✅ Updated restaurant settings successfully:');
        console.log('   📝 Name:', settings.restaurantName);
        console.log('   📍 Address:', settings.address);
        console.log('   📞 Phone:', settings.phoneNumber);
        console.log('   📧 Email:', settings.email);
        console.log('   🕐 Opening:', settings.openingTime);
        console.log('   🕐 Closing:', settings.closingTime);
        console.log('   💰 Tax Rate:', settings.taxRate + '%');
        console.log('   💵 Service Charge:', settings.serviceCharge + '%');
        console.log('   📄 Description:', settings.description);
        console.log('🎉 Restaurant settings updated successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating restaurant settings:', error);
        process.exit(1);
    }
}
