// controllers/voucher.controller.js
const { voucherModel } = require('../model/voucher.model');

// Lấy tất cả voucher
exports.getAllVouchers = async (req, res) => {
    try {
        const { isActive } = req.query;
        const filter = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const vouchers = await voucherModel
            .find(filter)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        return res.status(200).json({
            success: true,
            data: vouchers,
            count: vouchers.length
        });
    } catch (error) {
        console.error('getAllVouchers error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách voucher',
            error: error.message
        });
    }
};

// Lấy chi tiết voucher
exports.getVoucherById = async (req, res) => {
    try {
        const voucher = await voucherModel.findById(req.params.id).lean().exec();

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy voucher'
            });
        }

        return res.status(200).json({
            success: true,
            data: voucher
        });
    } catch (error) {
        console.error('getVoucherById error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết voucher',
            error: error.message
        });
    }
};

// Tạo voucher mới
exports.createVoucher = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            description
        } = req.body;

        // Kiểm tra mã voucher đã tồn tại chưa
        const existingVoucher = await voucherModel.findOne({ code });
        if (existingVoucher) {
            return res.status(400).json({
                success: false,
                message: 'Mã voucher đã tồn tại'
            });
        }

        const newVoucher = new voucherModel({
            code,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            description
        });

        const saved = await newVoucher.save();

        return res.status(201).json({
            success: true,
            message: 'Tạo voucher thành công',
            data: saved
        });
    } catch (error) {
        console.error('createVoucher error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo voucher',
            error: error.message
        });
    }
};

// Cập nhật voucher
exports.updateVoucher = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscount,
            startDate,
            endDate,
            usageLimit,
            isActive,
            description
        } = req.body;

        const updated = await voucherModel.findByIdAndUpdate(
            req.params.id,
            {
                code,
                discountType,
                discountValue,
                minOrderValue,
                maxDiscount,
                startDate,
                endDate,
                usageLimit,
                isActive,
                description,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        ).exec();

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy voucher'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật voucher thành công',
            data: updated
        });
    } catch (error) {
        console.error('updateVoucher error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật voucher',
            error: error.message
        });
    }
};

// Xóa voucher
exports.deleteVoucher = async (req, res) => {
    try {
        const deleted = await voucherModel.softDelete(req.params.id).exec();

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy voucher'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa voucher thành công',
            data: deleted
        });
    } catch (error) {
        console.error('deleteVoucher error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa voucher',
            error: error.message
        });
    }
};

// Validate voucher (kiểm tra voucher có hợp lệ không)
exports.validateVoucher = async (req, res) => {
    try {
        const { code, orderValue } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu mã voucher'
            });
        }

        const voucher = await voucherModel.findOne({ code }).lean().exec();

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Mã voucher không tồn tại'
            });
        }

        // Kiểm tra các điều kiện
        const now = new Date();
        const errors = [];

        if (!voucher.isActive) {
            errors.push('Voucher đã bị vô hiệu hóa');
        }

        if (now < new Date(voucher.startDate)) {
            errors.push('Voucher chưa đến ngày sử dụng');
        }

        if (now > new Date(voucher.endDate)) {
            errors.push('Voucher đã hết hạn');
        }

        if (voucher.usageLimit > 0 && voucher.usedCount >= voucher.usageLimit) {
            errors.push('Voucher đã hết lượt sử dụng');
        }

        if (orderValue && orderValue < voucher.minOrderValue) {
            errors.push(`Giá trị đơn hàng tối thiểu là ${voucher.minOrderValue}`);
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Voucher không hợp lệ',
                errors: errors
            });
        }

        // Tính toán giá trị giảm
        let discountAmount = 0;
        if (voucher.discountType === 'percentage') {
            discountAmount = (orderValue * voucher.discountValue) / 100;
            if (voucher.maxDiscount > 0 && discountAmount > voucher.maxDiscount) {
                discountAmount = voucher.maxDiscount;
            }
        } else {
            discountAmount = voucher.discountValue;
        }

        return res.status(200).json({
            success: true,
            message: 'Voucher hợp lệ',
            data: {
                voucher: voucher,
                discountAmount: discountAmount,
                finalAmount: orderValue - discountAmount
            }
        });
    } catch (error) {
        console.error('validateVoucher error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi validate voucher',
            error: error.message
        });
    }
};

// Áp dụng voucher (tăng usedCount)
exports.applyVoucher = async (req, res) => {
    try {
        const { code } = req.body;

        const voucher = await voucherModel.findOne({ code });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: 'Mã voucher không tồn tại'
            });
        }

        voucher.usedCount += 1;
        await voucher.save();

        return res.status(200).json({
            success: true,
            message: 'Áp dụng voucher thành công',
            data: voucher
        });
    } catch (error) {
        console.error('applyVoucher error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi áp dụng voucher',
            error: error.message
        });
    }
};
