const { recipeModel } = require('../model/recipe.model');
const { menuModel } = require('../model/menu.model');
const { ingredientModel } = require('../model/ingredient.model');

// Lấy tất cả công thức
exports.getAllRecipes = async (req, res) => {
    try {
        const { status, category, difficulty, menuItemId } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (difficulty) filter.difficulty = difficulty;
        if (menuItemId) filter.menuItemId = menuItemId;

        const recipes = await recipeModel
            .find(filter)
            .populate('menuItemId', 'name price category image')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: recipes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách công thức',
            error: error.message
        });
    }
};

// Lấy công thức theo ID
exports.getRecipeById = async (req, res) => {
    try {
        const recipe = await recipeModel
            .findById(req.params.id)
            .populate('menuItemId', 'name price category image')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức'
            });
        }

        res.status(200).json({
            success: true,
            data: recipe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết công thức',
            error: error.message
        });
    }
};

// Lấy công thức theo menu item ID
exports.getRecipeByMenuItemId = async (req, res) => {
    try {
        const recipe = await recipeModel
            .findOne({ menuItemId: req.params.menuItemId })
            .populate('menuItemId', 'name price category image')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức cho món ăn này'
            });
        }

        res.status(200).json({
            success: true,
            data: recipe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy công thức',
            error: error.message
        });
    }
};

// Tạo công thức mới
exports.createRecipe = async (req, res) => {
    try {
        const {
            menuItemId,
            menuItemName,
            ingredients,
            instructions,
            preparationTime,
            cookingTime,
            servings,
            difficulty,
            notes,
            tips,
            category,
            tags,
            image,
            video,
            status,
            createdBy
        } = req.body;

        // Kiểm tra menu item có tồn tại không
        const menuItem = await menuModel.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy món ăn'
            });
        }

        // Kiểm tra các nguyên liệu có tồn tại không
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                const ingredient = await ingredientModel.findById(ing.ingredientId);
                if (!ingredient) {
                    return res.status(404).json({
                        success: false,
                        message: `Không tìm thấy nguyên liệu: ${ing.ingredientName}`
                    });
                }
            }
        }

        const newRecipe = new recipeModel({
            menuItemId,
            menuItemName: menuItemName || menuItem.name,
            ingredients,
            instructions,
            preparationTime,
            cookingTime,
            servings,
            difficulty,
            notes,
            tips,
            category: category || menuItem.category,
            tags,
            image: image || menuItem.image,
            video,
            status: status || 'active',
            createdBy
        });

        await newRecipe.save();

        const populatedRecipe = await recipeModel
            .findById(newRecipe._id)
            .populate('menuItemId', 'name price category image')
            .populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Tạo công thức thành công',
            data: populatedRecipe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo công thức',
            error: error.message
        });
    }
};

// Cập nhật công thức
exports.updateRecipe = async (req, res) => {
    try {
        const {
            menuItemId,
            menuItemName,
            ingredients,
            instructions,
            preparationTime,
            cookingTime,
            servings,
            difficulty,
            notes,
            tips,
            category,
            tags,
            image,
            video,
            status,
            updatedBy
        } = req.body;

        // Nếu có menuItemId mới, kiểm tra xem có tồn tại không
        if (menuItemId) {
            const menuItem = await menuModel.findById(menuItemId);
            if (!menuItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy món ăn'
                });
            }
        }

        // Kiểm tra các nguyên liệu có tồn tại không
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                const ingredient = await ingredientModel.findById(ing.ingredientId);
                if (!ingredient) {
                    return res.status(404).json({
                        success: false,
                        message: `Không tìm thấy nguyên liệu: ${ing.ingredientName}`
                    });
                }
            }
        }

        const updateData = {
            ...(menuItemId && { menuItemId }),
            ...(menuItemName && { menuItemName }),
            ...(ingredients && { ingredients }),
            ...(instructions && { instructions }),
            ...(preparationTime !== undefined && { preparationTime }),
            ...(cookingTime !== undefined && { cookingTime }),
            ...(servings !== undefined && { servings }),
            ...(difficulty && { difficulty }),
            ...(notes !== undefined && { notes }),
            ...(tips && { tips }),
            ...(category && { category }),
            ...(tags && { tags }),
            ...(image !== undefined && { image }),
            ...(video !== undefined && { video }),
            ...(status && { status }),
            ...(updatedBy && { updatedBy })
        };

        const updatedRecipe = await recipeModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('menuItemId', 'name price category image')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!updatedRecipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật công thức thành công',
            data: updatedRecipe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật công thức',
            error: error.message
        });
    }
};

// Xóa công thức (soft delete)
exports.deleteRecipe = async (req, res) => {
    try {
        const deletedRecipe = await recipeModel.softDelete(req.params.id);
        if (!deletedRecipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa công thức thành công',
            data: deletedRecipe
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa công thức',
            error: error.message
        });
    }
};

// Tính toán tổng thời gian nấu
exports.calculateTotalTime = async (req, res) => {
    try {
        const recipe = await recipeModel.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức'
            });
        }

        const totalTime = recipe.preparationTime + recipe.cookingTime;

        res.status(200).json({
            success: true,
            data: {
                preparationTime: recipe.preparationTime,
                cookingTime: recipe.cookingTime,
                totalTime
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tính toán thời gian',
            error: error.message
        });
    }
};

// Kiểm tra nguyên liệu có đủ để nấu không
exports.checkIngredientsAvailability = async (req, res) => {
    try {
        const recipe = await recipeModel.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công thức'
            });
        }

        const servings = req.query.servings || recipe.servings;
        const multiplier = servings / recipe.servings;

        const availability = [];
        let allAvailable = true;

        for (const recipeIng of recipe.ingredients) {
            const ingredient = await ingredientModel.findById(recipeIng.ingredientId);
            const requiredQuantity = recipeIng.quantity * multiplier;

            const isAvailable = ingredient && ingredient.quantity >= requiredQuantity;
            if (!isAvailable) allAvailable = false;

            availability.push({
                ingredientId: recipeIng.ingredientId,
                ingredientName: recipeIng.ingredientName,
                required: requiredQuantity,
                available: ingredient ? ingredient.quantity : 0,
                unit: recipeIng.unit,
                isAvailable
            });
        }

        res.status(200).json({
            success: true,
            data: {
                recipeId: recipe._id,
                recipeName: recipe.menuItemName,
                servings,
                allAvailable,
                ingredients: availability
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra nguyên liệu',
            error: error.message
        });
    }
};
exports.consumeRecipe = async (req, res) => {
  const mongoose = require('mongoose'); // sử dụng session nếu có
  try {
    const { menuItemId, quantity = 1, orderId } = req.body;
    if (!menuItemId) {
      return res.status(400).json({ success: false, message: 'Thiếu menuItemId' });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    // Tìm recipe theo menuItemId
    const recipe = await recipeModel.findOne({ menuItemId: menuItemId });
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy công thức' });
    }

    // Tính multiplier
    const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
    const multiplier = qty / servings;

    // Chuẩn bị kiểm tra tất cả nguyên liệu trước khi trừ
    const shortages = [];
    const toConsume = []; // { ingredient, requiredQuantity, recipeIng }

    for (const recipeIng of recipe.ingredients) {
      const requiredQuantity = recipeIng.quantity * multiplier;

      const ingredient = await ingredientModel.findById(recipeIng.ingredientId);
      if (!ingredient) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy nguyên liệu: ${recipeIng.ingredientName || recipeIng.ingredientId}`
        });
      }

      if (ingredient.quantity < requiredQuantity) {
        shortages.push({
          ingredientId: ingredient._id,
          ingredientName: ingredient.name,
          required: requiredQuantity,
          available: ingredient.quantity,
          unit: ingredient.unit
        });
      } else {
        toConsume.push({ ingredient, requiredQuantity, recipeIng });
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không đủ nguyên liệu',
        data: { shortages }
      });
    }

    // Nếu đến đây là đủ -> thực hiện cập nhật trong transaction (nếu mongo hỗ trợ)
    let session = null;
    let consumedResults = [];
    try {
      // Tạo session nếu mongoose hỗ trợ
      if (mongoose.connection && mongoose.connection.startSession) {
        session = await mongoose.startSession();
        session.startTransaction();
      }

      for (const item of toConsume) {
        const ing = await ingredientModel.findById(item.ingredient._id).session(session);
        // Kiểm tra lại (nâng cấp an toàn)
        if (!ing) {
          throw new Error('Nguyên liệu bị mất trong quá trình xử lý: ' + item.recipeIng.ingredientName);
        }
        if (ing.quantity < item.requiredQuantity) {
          throw new Error(`Nguyên liệu không đủ khi thực hiện: ${ing.name}`);
        }

        ing.quantity = (ing.quantity - item.requiredQuantity);
        await ing.save({ session });

        consumedResults.push({
          ingredientId: ing._id,
          ingredientName: ing.name,
          deducted: item.requiredQuantity,
          remaining: ing.quantity,
          unit: ing.unit
        });
      }

      if (session) await session.commitTransaction();
    } catch (txErr) {
      if (session) {
        try { await session.abortTransaction(); } catch (e) { /* ignore */ }
      }
      // Ghi log và trả lỗi
      console.error('consumeRecipe transaction error:', txErr);
      return res.status(500).json({ success: false, message: 'Lỗi khi trừ nguyên liệu', error: txErr.message });
    } finally {
      if (session) session.endSession();
    }

    // Thành công
    return res.status(200).json({
      success: true,
      message: 'Đã trừ nguyên liệu thành công',
      data: {
        menuItemId: recipe.menuItemId,
        menuItemName: recipe.menuItemName,
        orderId: orderId || null,
        quantity: qty,
        consumed: consumedResults
      }
    });

  } catch (error) {
    console.error('consumeRecipe error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xử lý consumeRecipe', error: error.message });
  }
};