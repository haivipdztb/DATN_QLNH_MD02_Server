const db = require('./db');
const { softDeletePlugin } = require('../utils/softDelete');

const recipeSchema = new db.mongoose.Schema(
    {
        menuItemId: {
            type: db.mongoose.Schema.Types.ObjectId,
            ref: 'menuModel',
            required: true
        },
        menuItemName: { type: String, required: true },

        ingredients: [
            {
                ingredientId: {
                    type: db.mongoose.Schema.Types.ObjectId,
                    ref: 'ingredientModel',
                    required: true
                },
                ingredientName: { type: String, required: true },
                quantity: { type: Number, required: true },
                unit: { type: String, required: true }
            }
        ],

        instructions: [
            {
                step: { type: Number, required: true },
                description: { type: String, required: true },
                image: { type: String, default: '' },
                duration: { type: Number, default: 0 }
            }
        ],

        preparationTime: { type: Number, default: 0 },
        cookingTime: { type: Number, default: 0 },
        servings: { type: Number, default: 1 },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium'
        },

        notes: { type: String, default: '' },
        tips: [{ type: String }],

        category: { type: String, default: '' },
        tags: [{ type: String }],

        image: { type: String, default: '' },
        video: { type: String, default: '' },

        status: {
            type: String,
            enum: ['active', 'inactive', 'draft'],
            default: 'active'
        },

        createdBy: {
            type: db.mongoose.Schema.Types.ObjectId,
            ref: 'userModel'
        },
        updatedBy: {
            type: db.mongoose.Schema.Types.ObjectId,
            ref: 'userModel'
        }
    },
    {
        collection: 'recipes',
        timestamps: true
    }
);



recipeSchema.plugin(softDeletePlugin);

let recipeModel = db.mongoose.model('recipeModel', recipeSchema);
module.exports = { recipeModel };
