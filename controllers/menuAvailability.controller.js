const { updateAllMenuAvailability, updateMenuItemAvailability } = require('../services/menuAvailability.service');

/**
 * Cập nhật trạng thái tất cả món ăn
 * GET /api/menu/update-availability
 */
exports.updateAllAvailability = async (req, res) => {
    try {
        const result = await updateAllMenuAvailability();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái tất cả món ăn',
            data: result
        });
    } catch (error) {
        console.error('updateAllAvailability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái món ăn',
            error: error.message
        });
    }
};

/**
 * Cập nhật trạng thái một món ăn cụ thể
 * GET /api/menu/:id/update-availability
 */
exports.updateMenuAvailability = async (req, res) => {
    try {
        const result = await updateMenuItemAvailability(req.params.id);

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái món ăn',
            data: result
        });
    } catch (error) {
        console.error('updateMenuAvailability error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật trạng thái món ăn',
            error: error.message
        });
    }
};
