var express = require('express');
var router = express.Router();
const ingredientController = require('../controllers/ingredient.controller.js'); 

// GET - Lấy danh sách tất cả nguyên liệu trong kho
router.get('/', ingredientController.getAllIngredients);

// GET - Lấy chi tiết một nguyên liệu theo ID
router.get('/:id', ingredientController.getIngredientById);

// POST - Thêm nguyên liệu mới vào kho
router.post('/', ingredientController.createIngredient);

// PUT - Cập nhật thông tin nguyên liệu (số lượng, giá, tên...)
router.put('/:id', ingredientController.updateIngredient);

// DELETE - Xóa nguyên liệu khỏi kho
router.delete('/:id', ingredientController.deleteIngredient);

module.exports = router;