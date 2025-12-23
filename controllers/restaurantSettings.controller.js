const { restaurantSettingsModel } = require('../model/restaurantSettings.model');
const { userModel } = require('../model/user.model');
const bcrypt = require('bcryptjs');

// Lấy thông tin cài đặt nhà hàng
const getRestaurantSettings = async (req, res) => {
    try {
        let settings = await restaurantSettingsModel.findOne({ isSingleton: true });

        // Nếu chưa có settings, tạo mới với giá trị mặc định
        if (!settings) {
            settings = new restaurantSettingsModel({
                restaurantName: 'Nhà Hàng',
                address: '',
                phoneNumber: '',
                email: '',
                openingTime: '10:00',
                closingTime: '22:00',
                description: '',
                logo: '',
                taxRate: 0,
                serviceCharge: 0,
                currency: 'VND',
                timezone: 'Asia/Ho_Chi_Minh',
                isSingleton: true
            });
            await settings.save();
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error getting restaurant settings:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin nhà hàng',
            error: error.message
        });
    }
};

// Cập nhật thông tin cài đặt nhà hàng
const updateRestaurantSettings = async (req, res) => {
    try {
        const {
            restaurantName,
            address,
            phoneNumber,
            email,
            openingTime,
            closingTime,
            description,
            logo,
            taxRate,
            serviceCharge,
            currency,
            timezone
        } = req.body;

        let settings = await restaurantSettingsModel.findOne({ isSingleton: true });

        if (!settings) {
            // Tạo mới nếu chưa có
            settings = new restaurantSettingsModel({
                isSingleton: true
            });
        }

        // Cập nhật các trường
        if (restaurantName !== undefined) settings.restaurantName = restaurantName;
        if (address !== undefined) settings.address = address;
        if (phoneNumber !== undefined) settings.phoneNumber = phoneNumber;
        if (email !== undefined) settings.email = email;
        if (openingTime !== undefined) settings.openingTime = openingTime;
        if (closingTime !== undefined) settings.closingTime = closingTime;
        if (description !== undefined) settings.description = description;
        if (logo !== undefined) settings.logo = logo;
        if (taxRate !== undefined) settings.taxRate = taxRate;
        if (serviceCharge !== undefined) settings.serviceCharge = serviceCharge;
        if (currency !== undefined) settings.currency = currency;
        if (timezone !== undefined) settings.timezone = timezone;

        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin nhà hàng thành công',
            data: settings
        });
    } catch (error) {
        console.error('Error updating restaurant settings:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật thông tin nhà hàng',
            error: error.message
        });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;

        // Validate input
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin'
            });
        }

        // Kiểm tra độ dài mật khẩu mới
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        // Tìm user
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Kiểm tra mật khẩu cũ
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu cũ không đúng'
            });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Cập nhật mật khẩu
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi đổi mật khẩu',
            error: error.message
        });
    }
};

// Đổi mật khẩu cho admin (không cần mật khẩu cũ)
const adminResetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        // Validate input
        if (!userId || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin'
            });
        }

        // Kiểm tra độ dài mật khẩu mới
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }

        // Tìm user
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Cập nhật mật khẩu
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Reset mật khẩu thành công'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi reset mật khẩu',
            error: error.message
        });
    }
};

module.exports = {
    getRestaurantSettings,
    updateRestaurantSettings,
    changePassword,
    adminResetPassword
};
