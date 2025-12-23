const { menuModel } = require('../model/menu.model');
const { recipeModel } = require('../model/recipe.model');
const { ingredientModel } = require('../model/ingredient.model');

/**
 * Kiểm tra xem một món ăn có đủ nguyên liệu không
 * @param {String} menuItemId - ID của món ăn
 * @returns {Promise<Boolean>} - true nếu đủ nguyên liệu, false nếu thiếu
 */
async function checkMenuItemAvailability(menuItemId) {
    try {
        // 1. Tìm recipe của món ăn
        const recipe = await recipeModel.findOne({ menuItemId: menuItemId });

        // Nếu không có recipe, coi như món luôn available
        if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
            return true;
        }

        // 2. Kiểm tra từng nguyên liệu trong recipe
        for (const recipeIngredient of recipe.ingredients) {
            const ingredient = await ingredientModel.findById(recipeIngredient.ingredientId);

            // Nếu không tìm thấy ingredient hoặc đã bị xóa
            if (!ingredient) {
                continue;
            }

            // Kiểm tra số lượng tồn kho
            const requiredQuantity = recipeIngredient.quantity || 0;
            const availableQuantity = ingredient.quantity || 0;

            // Nếu thiếu nguyên liệu
            if (availableQuantity < requiredQuantity) {
                console.log(`❌ Món thiếu nguyên liệu: ${ingredient.name} (cần: ${requiredQuantity}, có: ${availableQuantity})`);
                return false;
            }
        }

        // Tất cả nguyên liệu đều đủ
        return true;
    } catch (error) {
        console.error('Error checking menu item availability:', error);
        // Nếu có lỗi, coi như món vẫn available để tránh ảnh hưởng
        return true;
    }
}

/**
 * Cập nhật trạng thái tất cả món ăn dựa trên nguyên liệu
 * @returns {Promise<Object>} - Thống kê số món đã cập nhật
 */
async function updateAllMenuAvailability() {
    try {
        console.log('🔄 Bắt đầu cập nhật trạng thái món ăn...');

        // Lấy tất cả món ăn
        const allMenuItems = await menuModel.find({});

        let updatedCount = 0;
        let availableCount = 0;
        let soldoutCount = 0;

        // Kiểm tra từng món
        for (const menuItem of allMenuItems) {
            const isAvailable = await checkMenuItemAvailability(menuItem._id);
            const newStatus = isAvailable ? 'available' : 'soldout';

            // Chỉ update nếu status thay đổi
            if (menuItem.status !== newStatus) {
                menuItem.status = newStatus;
                await menuItem.save();
                updatedCount++;
                console.log(`✅ Cập nhật món "${menuItem.name}": ${menuItem.status} → ${newStatus}`);
            }

            if (newStatus === 'available') {
                availableCount++;
            } else {
                soldoutCount++;
            }
        }

        const result = {
            total: allMenuItems.length,
            updated: updatedCount,
            available: availableCount,
            soldout: soldoutCount,
            timestamp: new Date()
        };

        console.log('✅ Hoàn thành cập nhật trạng thái món ăn:', result);
        return result;
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật trạng thái món ăn:', error);
        throw error;
    }
}

/**
 * Cập nhật trạng thái một món ăn cụ thể
 * @param {String} menuItemId - ID của món ăn
 * @returns {Promise<Object>} - Thông tin món đã cập nhật
 */
async function updateMenuItemAvailability(menuItemId) {
    try {
        const menuItem = await menuModel.findById(menuItemId);

        if (!menuItem) {
            throw new Error('Không tìm thấy món ăn');
        }

        const isAvailable = await checkMenuItemAvailability(menuItemId);
        const oldStatus = menuItem.status;
        const newStatus = isAvailable ? 'available' : 'soldout';

        if (oldStatus !== newStatus) {
            menuItem.status = newStatus;
            await menuItem.save();
            console.log(`✅ Cập nhật món "${menuItem.name}": ${oldStatus} → ${newStatus}`);
        }

        return {
            menuItem: menuItem.name,
            oldStatus,
            newStatus,
            changed: oldStatus !== newStatus
        };
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật món:', error);
        throw error;
    }
}

module.exports = {
    checkMenuItemAvailability,
    updateAllMenuAvailability,
    updateMenuItemAvailability
};
