const {menuModel} = require('../model/menu.model');
const sockets = require('../sockets'); // ✅ THÊM IMPORT

// Xem danh sách tất cả menu items
exports.getAllMenuItems = async (req, res) => {
    try {
        const menuItems = await menuModel.find();
        res.status(200).json({
            success: true,
            data: menuItems
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách menu',
            error: error.message
        });
    }
};

// Xem chi tiết một menu item theo ID
exports.getMenuItemById = async (req, res) => {
    try {
        const menuItem = await menuModel.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy menu item'
            });
        }
        res.status(200).json({
            success: true,
            data: menuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết menu',
            error: error.message
        });
    }
};

// ✅ Thêm menu item mới - ĐÃ THÊM SOCKET EMIT
exports.createMenuItem = async (req, res) => {
    try {
        const { name, price, category, image, status } = req.body;
        // Kiểm tra trùng tên menu item ko phân biệt hoa thường
        const existingItem = await menuModel.findOne({ name: { $regex: new RegExp('^' + name + '$', 'i') } });
        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: 'Menu item với tên này đã tồn tại'
            });
        }
        
       

        const newMenuItem = new menuModel({
            name,
            price,
            category,
            image,
            status:  status || 'available'
        });
        await newMenuItem.save();

        // ✅✅✅ THÊM:  Emit menu_item_created
        try {
            sockets.emitMenuItemCreated({
                _id: newMenuItem._id,
                name: newMenuItem.name,
                price: newMenuItem.price,
                category: newMenuItem.category,
                status: newMenuItem.status
            });
            console.log(`✅ Emitted menu_item_created:  ${newMenuItem.name}`);
        } catch (emitError) {
            console.warn('⚠️ Failed to emit menu_item_created:', emitError);
        }

        res. status(201).json({
            success: true,
            message:  'Thêm menu item thành công',
            data: newMenuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message:  'Lỗi khi thêm menu item',
            error: error.message
        });
    }
};

// ✅ Sửa menu item theo ID - ĐÃ THÊM SOCKET EMIT
exports. updateMenuItem = async (req, res) => {
    try {
        const {name, price, category, image, status} = req. body;
        const updatedMenuItem = await menuModel.findByIdAndUpdate(
            req.params.id,
            { name, price, category, image, status },
            { new: true, runValidators: true }
        );
        if (!updatedMenuItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy menu item'
            });
        }

        // ✅✅✅ THÊM: Emit menu_item_updated
        try {
            sockets.emitMenuItemUpdated({
                _id: updatedMenuItem._id,
                name: updatedMenuItem. name,
                price: updatedMenuItem.price,
                category: updatedMenuItem.category,
                status: updatedMenuItem.status
            });
            console.log(`✅ Emitted menu_item_updated: ${updatedMenuItem.name}`);
        } catch (emitError) {
            console.warn('⚠️ Failed to emit menu_item_updated:', emitError);
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật menu item thành công',
            data: updatedMenuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message:  'Lỗi khi cập nhật menu item',
            error: error.message
        });
    }
};

// ✅ Xóa menu item theo ID - ĐÃ THÊM SOCKET EMIT
exports.deleteMenuItem = async (req, res) => {
    try {
        const deletedMenuItem = await menuModel.softDelete(req.params.id);
        if (!deletedMenuItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy menu item'
            });
        }

        // ✅✅✅ THÊM: Emit menu_item_deleted
        try {
            sockets.emitMenuItemDeleted({
                _id: deletedMenuItem._id,
                name: deletedMenuItem. name
            });
            console.log(`✅ Emitted menu_item_deleted: ${deletedMenuItem.name}`);
        } catch (emitError) {
            console.warn('⚠️ Failed to emit menu_item_deleted:', emitError);
        }

        res.status(200).json({
            success: true,
            message: 'Xóa menu item thành công',
            data: deletedMenuItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa menu item',
            error: error.message
        });
    }
};