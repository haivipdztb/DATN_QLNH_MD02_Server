// controllers/ingredient.controller.js
const { ingredientModel } = require('../model/ingredient.model');

// Lấy tất cả nguyên liệu
exports.getAllIngredients = async (req, res) => {
  try {
    const { status, tag } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (tag) filter.tag = tag;

    const ingredients = await ingredientModel
      .find(filter)
      .sort({ name: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      data: ingredients,
      count: ingredients.length
    });
  } catch (error) {
    console.error('getAllIngredients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách nguyên liệu',
      error: error.message
    });
  }
};

// Lấy chi tiết một nguyên liệu
exports.getIngredientById = async (req, res) => {
  try {
    const ingredient = await ingredientModel.findById(req.params.id).lean().exec();

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nguyên liệu'
      });
    }

    return res.status(200).json({
      success: true,
      data: ingredient
    });
  } catch (error) {
    console.error('getIngredientById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết nguyên liệu',
      error: error.message
    });
  }
};

// Tạo nguyên liệu mới (Admin)
exports.createIngredient = async (req, res) => {
  try {
    const {
      name,
      tag,
      unit,
      quantity,
      minQuantity,
      image,
      description,
      supplier,
      minThreshold,
      importPrice,
      category
    } = req.body;

        const newIngredient = new ingredientModel({
      name,
      tag,
      unit,
      quantity,
      minQuantity,
      image,
      description,
      supplier,
      minThreshold,
      importPrice,
      category,
      lastRestocked: quantity > 0 ? new Date() : null
        });

    const saved = await newIngredient.save();

    return res.status(201).json({
      success: true,
      message: 'Tạo nguyên liệu thành công',
      data: saved
    });
  } catch (error) {
    console.error('createIngredient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo nguyên liệu',
      error: error.message
    });
  }
};

// Bếp lấy nguyên liệu (trừ số lượng)
exports.takeIngredient = async (req, res) => {
  try {
    const { amount } = req.body; // Số lượng cần lấy
    const ingredientId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng lấy phải lớn hơn 0'
      });
    }

    const ingredient = await ingredientModel.findById(ingredientId);

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nguyên liệu'
      });
    }

    // Kiểm tra số lượng còn đủ không
    if (ingredient.quantity < amount) {
      return res.status(400).json({
        success: false,
        message: `Không đủ nguyên liệu. Chỉ còn ${ingredient.quantity} ${ingredient.unit}`,
        data: {
          available: ingredient.quantity,
          requested: amount,
          unit: ingredient.unit
        }
      });
    }

    // Trừ số lượng
    ingredient.quantity -= amount;

    // Middleware sẽ tự động cập nhật status
    await ingredient.save();

    // Kiểm tra nếu hết hàng hoặc sắp hết
    let notification = null;
    if (ingredient.status === 'out_of_stock') {
      notification = {
        type: 'OUT_OF_STOCK',
        message: `⚠️ CẢNH BÁO: Nguyên liệu "${ingredient.name}" đã HẾT!`,
        ingredientId: ingredient._id,
        ingredientName: ingredient.name
      };
    } else if (ingredient.status === 'low_stock') {
      notification = {
        type: 'LOW_STOCK',
        message: `⚠️ CẢNH BÁO: Nguyên liệu "${ingredient.name}" sắp hết. Còn ${ingredient.quantity} ${ingredient.unit}`,
        ingredientId: ingredient._id,
        ingredientName: ingredient.name,
        quantity: ingredient.quantity
      };
    }

    return res.status(200).json({
      success: true,
      message: `Đã lấy ${amount} ${ingredient.unit} ${ingredient.name}`,
      data: ingredient,
      notification
    });
  } catch (error) {
    console.error('takeIngredient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy nguyên liệu',
      error: error.message
    });
  }
};

// Nhập thêm nguyên liệu (Admin)
exports.restockIngredient = async (req, res) => {
  try {
    const { amount } = req.body;
    const ingredientId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng nhập phải lớn hơn 0'
      });
    }

    const ingredient = await ingredientModel.findById(ingredientId);

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nguyên liệu'
      });
    }

    // Cộng số lượng
    ingredient.quantity += amount;
    ingredient.lastRestocked = new Date();
    await ingredient.save();

    return res.status(200).json({
      success: true,
      message: `Đã nhập thêm ${amount} ${ingredient.unit} ${ingredient.name}`,
      data: ingredient
    });
  } catch (error) {
    console.error('restockIngredient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi nhập nguyên liệu',
      error: error.message
    });
  }
};
// {
//         "minThreshold": 5,
//         "importPrice": 0,
//         "_id": "69233fc9294b4d25676cd879",
//         "name": "Hàu",
//         "tag": "hai_san",
//         "unit": "kg",
//         "quantity": 19,
//         "minQuantity": 10,
//         "status": "out_of_stock",
//         "image": "https://example.com/thit-bo.jpg",
//         "description": "Thịt bò tươi nhập khẩu",
//         "supplier": "Công ty ABC D",
//         "lastRestocked": "2025-11-23T17:09:29.317Z",
//         "createdAt": "2025-11-23T17:09:29.318Z",
//         "updatedAt": "2025-11-28T09:01:36.814Z",
//         "__v": 0
//     }
// Cập nhật thông tin nguyên liệu (Admin)
exports.updateIngredient = async (req, res) => {
  try {
    const {
      name,
      tag,
      unit,
      quantity,
      minQuantity,
      image,
      description,
      supplier,
      minThreshold,
      importPrice,
      category
    } = req.body;

    const updated = await ingredientModel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        tag,
        unit,
        quantity,
        minQuantity,
        image,
        description,
        supplier,
        minThreshold,
        importPrice,
        category,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nguyên liệu'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật nguyên liệu thành công',
      data: updated
    });
  } catch (error) {
    console.error('updateIngredient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật nguyên liệu',
      error: error.message
    });
  }
};

// Xóa nguyên liệu (Admin)
exports.deleteIngredient = async (req, res) => {
  try {
    const deleted = await ingredientModel.findByIdAndDelete(req.params.id).exec();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nguyên liệu'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Xóa nguyên liệu thành công',
      data: deleted
    });
  } catch (error) {
    console.error('deleteIngredient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa nguyên liệu',
      error: error.message
    });
  }
};

// Lấy danh sách nguyên liệu cảnh báo (hết hoặc sắp hết)
exports.getWarningIngredients = async (req, res) => {
  try {
    const warnings = await ingredientModel
      .find({
        status: { $in: ['low_stock', 'out_of_stock'] }
      })
      .sort({ quantity: 1, name: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      data: warnings,
      count: warnings.length
    });
  } catch (error) {
    console.error('getWarningIngredients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách cảnh báo',
      error: error.message
    });
  }
};
