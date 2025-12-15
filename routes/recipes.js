const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');

// GET routes - specific paths first, then parameterized paths
router.get('/', recipeController.getAllRecipes);

router.get('/menu/:menuItemId', recipeController.getRecipeByMenuItemId);

router.get('/:id/total-time', recipeController.calculateTotalTime);

router.get('/:id/check-ingredients', recipeController.checkIngredientsAvailability);

router.get('/:id', recipeController.getRecipeById);

// POST, PUT, DELETE routes
router.post('/', recipeController.createRecipe);

router.put('/:id', recipeController.updateRecipe);

router.delete('/:id', recipeController.deleteRecipe);

module.exports = router;
