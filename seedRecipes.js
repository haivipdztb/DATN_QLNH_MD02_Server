const { recipeModel } = require('./model/recipe.model');
const { menuModel } = require('./model/menu.model');
const { ingredientModel } = require('./model/ingredient.model');
require('./model/db');

// 10 Công thức món ăn mẫu bổ sung
const additionalRecipes = [
    {
        menuItemName: 'Tenderloin',
        ingredients: [
            { ingredientName: 'Thịt bò', quantity: 250, unit: 'g' },
            { ingredientName: 'Bơ', quantity: 30, unit: 'g' },
            { ingredientName: 'Tỏi', quantity: 2, unit: 'tép' },
            { ingredientName: 'Rau thơm', quantity: 10, unit: 'g' },
            { ingredientName: 'Dầu olive', quantity: 20, unit: 'ml' }
        ],
        instructions: [
            { step: 1, description: 'Ướp thịt với muối, tiêu, dầu olive trong 20 phút', duration: 20 },
            { step: 2, description: 'Làm nóng chảo với nhiệt độ cao', duration: 3 },
            { step: 3, description: 'Áp chảo thịt mỗi mặt 2-3 phút cho medium rare', duration: 6 },
            { step: 4, description: 'Thêm bơ, tỏi, rau thơm, rưới lên thịt', duration: 3 },
            { step: 5, description: 'Để thịt nghỉ 5 phút trước khi cắt', duration: 5 }
        ],
        preparationTime: 25,
        cookingTime: 12,
        servings: 1,
        difficulty: 'medium',
        notes: 'Tenderloin là phần thịt mềm nhất của bò, rất thích hợp cho steak',
        tips: [
            'Không nấu quá chín sẽ làm thịt khô',
            'Medium rare là độ chín lý tưởng cho tenderloin',
            'Ăn kèm với rau củ nướng và khoai tây nghiền'
        ],
        category: 'Món chính',
        tags: ['bò', 'steak', 'mềm', 'cao cấp'],
        status: 'active'
    },
    {
        menuItemName: 'Salmon',
        ingredients: [
            { ingredientName: 'Cá hồi', quantity: 200, unit: 'g' },
            { ingredientName: 'Bơ', quantity: 30, unit: 'g' },
            { ingredientName: 'Chanh', quantity: 1, unit: 'quả' },
            { ingredientName: 'Tỏi', quantity: 2, unit: 'tép' },
            { ingredientName: 'Rau thơm', quantity: 10, unit: 'g' }
        ],
        instructions: [
            { step: 1, description: 'Ướp cá hồi với muối, tiêu, nước cốt chanh 15 phút', duration: 15 },
            { step: 2, description: 'Làm nóng chảo với dầu olive', duration: 2 },
            { step: 3, description: 'Chiên cá hồi mặt da trước 4 phút cho da giòn', duration: 4 },
            { step: 4, description: 'Lật mặt, chiên thêm 3 phút', duration: 3 },
            { step: 5, description: 'Cho bơ chanh, tỏi băm, rưới lên cá', duration: 2 }
        ],
        preparationTime: 20,
        cookingTime: 10,
        servings: 1,
        difficulty: 'easy',
        notes: 'Cá hồi giàu omega-3, rất tốt cho tim mạch và não bộ',
        tips: [
            'Chiên mặt da trước để da giòn và thịt cá không bị vỡ',
            'Không chiên quá lâu sẽ làm cá khô',
            'Bơ chanh làm tăng hương vị và giảm mùi tanh'
        ],
        category: 'Món chính',
        tags: ['cá', 'healthy', 'omega-3', 'hải sản'],
        status: 'active'
    },
    {
        menuItemName: 'Mỳ Ý',
        ingredients: [
            { ingredientName: 'Mỳ Ý', quantity: 200, unit: 'g' },
            { ingredientName: 'Nấm', quantity: 150, unit: 'g' },
            { ingredientName: 'Kem tươi', quantity: 200, unit: 'ml' },
            { ingredientName: 'Phô mai', quantity: 50, unit: 'g' },
            { ingredientName: 'Tỏi', quantity: 3, unit: 'tép' }
        ],
        instructions: [
            { step: 1, description: 'Luộc mỳ Ý trong nước sôi có muối theo hướng dẫn', duration: 10 },
            { step: 2, description: 'Phi thơm tỏi băm, cho nấm thái lát vào xào', duration: 5 },
            { step: 3, description: 'Thêm kem tươi, đun sôi nhẹ, nêm nếm', duration: 3 },
            { step: 4, description: 'Cho mỳ đã luộc vào trộn đều với sốt', duration: 2 },
            { step: 5, description: 'Rắc phô mai Parmesan bào lên trên', duration: 1 }
        ],
        preparationTime: 5,
        cookingTime: 20,
        servings: 2,
        difficulty: 'easy',
        notes: 'Món mỳ Ý đơn giản nhưng ngon miệng, phù hợp cho bữa trưa nhanh',
        tips: [
            'Luộc mỳ al dente (còn dai chút) để ngon hơn',
            'Giữ lại 1 cốc nước luộc mỳ để pha sốt nếu cần',
            'Dùng kem tươi béo để sốt ngon và mịn hơn'
        ],
        category: 'Món chính',
        tags: ['mỳ Ý', 'pasta', 'kem', 'nấm'],
        status: 'active'
    },
    {
        menuItemName: 'Espresso',
        ingredients: [
            { ingredientName: 'Cà phê', quantity: 18, unit: 'g' },
            { ingredientName: 'Nước', quantity: 30, unit: 'ml' }
        ],
        instructions: [
            { step: 1, description: 'Xay cà phê hạt thành bột mịn', duration: 2 },
            { step: 2, description: 'Cho bột cà phê vào portafilter, nén chặt', duration: 1 },
            { step: 3, description: 'Lắp portafilter vào máy espresso', duration: 1 },
            { step: 4, description: 'Pha espresso trong 25-30 giây', duration: 1 },
            { step: 5, description: 'Rót vào tách nhỏ, thưởng thức ngay', duration: 1 }
        ],
        preparationTime: 3,
        cookingTime: 2,
        servings: 1,
        difficulty: 'medium',
        notes: 'Espresso là nền tảng của nhiều loại cà phê khác',
        tips: [
            'Dùng cà phê hạt tươi rang trong vòng 2 tuần',
            'Nhiệt độ nước lý tưởng là 90-96°C',
            'Crema màu nâu vàng là dấu hiệu của espresso ngon'
        ],
        category: 'Đồ uống',
        tags: ['cà phê', 'espresso', 'đậm đà'],
        status: 'active'
    },
    {
        menuItemName: 'Cabernet',
        ingredients: [
            { ingredientName: 'Rượu vang đỏ Cabernet Sauvignon', quantity: 150, unit: 'ml' }
        ],
        instructions: [
            { step: 1, description: 'Mở nắp chai rượu vang', duration: 1 },
            { step: 2, description: 'Để rượu thở (decant) 30-60 phút', duration: 45 },
            { step: 3, description: 'Rót rượu vào ly vang đỏ', duration: 1 },
            { step: 4, description: 'Xoay nhẹ ly để rượu tiếp xúc không khí', duration: 1 },
            { step: 5, description: 'Thưởng thức ở nhiệt độ 16-18°C', duration: 1 }
        ],
        preparationTime: 50,
        cookingTime: 0,
        servings: 1,
        difficulty: 'easy',
        notes: 'Cabernet Sauvignon là giống nho đỏ phổ biến nhất thế giới',
        tips: [
            'Để rượu thở để hương vị mở ra',
            'Nhiệt độ phục vụ lý tưởng 16-18°C',
            'Kết hợp tuyệt vời với thịt đỏ và phô mai'
        ],
        category: 'Đồ uống',
        tags: ['rượu vang', 'đỏ', 'cao cấp'],
        status: 'active'
    },
    {
        menuItemName: 'Bruschetta',
        ingredients: [
            { ingredientName: 'Cà chua', quantity: 200, unit: 'g' },
            { ingredientName: 'Olive', quantity: 50, unit: 'g' },
            { ingredientName: 'Bánh mì', quantity: 4, unit: 'lát' },
            { ingredientName: 'Tỏi', quantity: 2, unit: 'tép' },
            { ingredientName: 'Dầu olive', quantity: 30, unit: 'ml' }
        ],
        instructions: [
            { step: 1, description: 'Cắt cà chua thành hạt lựu nhỏ, trộn với olive băm', duration: 5 },
            { step: 2, description: 'Nướng bánh mì đến khi vàng giòn hai mặt', duration: 3 },
            { step: 3, description: 'Chà tỏi tươi lên mặt bánh mì nướng', duration: 1 },
            { step: 4, description: 'Xếp hỗn hợp cà chua olive lên bánh mì', duration: 2 },
            { step: 5, description: 'Rưới dầu olive, rắc húng quế tươi', duration: 1 }
        ],
        preparationTime: 10,
        cookingTime: 5,
        servings: 2,
        difficulty: 'easy',
        notes: 'Món khai vị truyền thống của Ý, đơn giản nhưng ngon',
        tips: [
            'Bánh mì phải nướng giòn',
            'Cà chua nên chọn loại chín đỏ và ngọt',
            'Ăn ngay sau khi làm để bánh không bị ướt'
        ],
        category: 'Khai vị',
        tags: ['Ý', 'khai vị', 'dễ làm', 'cà chua'],
        status: 'active'
    },
    {
        menuItemName: 'Soup',
        ingredients: [
            { ingredientName: 'Bí đỏ', quantity: 500, unit: 'g' },
            { ingredientName: 'Kem tươi', quantity: 100, unit: 'ml' },
            { ingredientName: 'Hành tây', quantity: 1, unit: 'củ' },
            { ingredientName: 'Tỏi', quantity: 2, unit: 'tép' },
            { ingredientName: 'Bơ', quantity: 30, unit: 'g' }
        ],
        instructions: [
            { step: 1, description: 'Gọt vỏ bí đỏ, cắt miếng vuông vừa ăn', duration: 10 },
            { step: 2, description: 'Phi thơm hành tây, tỏi băm với bơ', duration: 5 },
            { step: 3, description: 'Cho bí đỏ vào xào cùng, thêm nước', duration: 3 },
            { step: 4, description: 'Ninh mềm bí đỏ khoảng 20 phút', duration: 20 },
            { step: 5, description: 'Xay nhuyễn, thêm kem tươi, nêm nếm', duration: 5 }
        ],
        preparationTime: 15,
        cookingTime: 30,
        servings: 4,
        difficulty: 'easy',
        notes: 'Soup bí đỏ béo ngậy, thơm ngon, rất bổ dưỡng',
        tips: [
            'Ninh bí đỏ đến khi thật mềm mới xay',
            'Xay nhuyễn để soup mịn màng',
            'Có thể thêm hạt bí rang để trang trí'
        ],
        category: 'Khai vị',
        tags: ['soup', 'bí đỏ', 'healthy', 'kem'],
        status: 'active'
    },
    {
        menuItemName: 'Salad',
        ingredients: [
            { ingredientName: 'Rau', quantity: 150, unit: 'g' },
            { ingredientName: 'Phô mai', quantity: 50, unit: 'g' },
            { ingredientName: 'Dầu olive', quantity: 30, unit: 'ml' },
            { ingredientName: 'Giấm', quantity: 15, unit: 'ml' },
            { ingredientName: 'Hạt', quantity: 30, unit: 'g' }
        ],
        instructions: [
            { step: 1, description: 'Rửa sạch rau rocket, để ráo nước hoàn toàn', duration: 5 },
            { step: 2, description: 'Rang hạt óc chó đến thơm và giòn', duration: 3 },
            { step: 3, description: 'Bào mỏng phô mai Parmesan', duration: 2 },
            { step: 4, description: 'Trộn rau với dầu olive và giấm balsamic', duration: 2 },
            { step: 5, description: 'Rắc phô mai và hạt óc chó lên trên', duration: 1 }
        ],
        preparationTime: 10,
        cookingTime: 3,
        servings: 2,
        difficulty: 'easy',
        notes: 'Salad tươi mát, giàu dinh dưỡng, phù hợp cho người ăn kiêng',
        tips: [
            'Rau phải thật tươi và khô ráo',
            'Trộn salad ngay trước khi ăn',
            'Có thể thêm cà chua bi hoặc dưa chuột'
        ],
        category: 'Khai vị',
        tags: ['salad', 'healthy', 'tươi', 'rau'],
        status: 'active'
    },
    {
        menuItemName: 'Tiramisu',
        ingredients: [
            { ingredientName: 'Phô mai', quantity: 250, unit: 'g' },
            { ingredientName: 'Trứng', quantity: 3, unit: 'quả' },
            { ingredientName: 'Đường', quantity: 100, unit: 'g' },
            { ingredientName: 'Cà phê', quantity: 200, unit: 'ml' },
            { ingredientName: 'Bánh', quantity: 200, unit: 'g' }
        ],
        instructions: [
            { step: 1, description: 'Tách lòng trắng và lòng đỏ trứng', duration: 5 },
            { step: 2, description: 'Đánh lòng đỏ với đường, trộn với mascarpone', duration: 10 },
            { step: 3, description: 'Đánh bông lòng trắng, trộn nhẹ vào hỗn hợp', duration: 10 },
            { step: 4, description: 'Nhúng bánh ladyfinger vào cà phê, xếp lớp', duration: 10 },
            { step: 5, description: 'Phủ kem mascarpone, lặp lại, rắc bột cacao', duration: 10 }
        ],
        preparationTime: 45,
        cookingTime: 0,
        servings: 6,
        difficulty: 'medium',
        notes: 'Để tủ lạnh ít nhất 4 giờ hoặc qua đêm trước khi ăn',
        tips: [
            'Dùng cà phê espresso đậm đà',
            'Không nhúng bánh quá lâu sẽ bị nhão',
            'Để qua đêm sẽ ngon hơn và kem đặc lại'
        ],
        category: 'Tráng miệng',
        tags: ['Ý', 'tráng miệng', 'cà phê', 'không nướng'],
        status: 'active'
    },
    {
        menuItemName: 'Cheesecake',
        ingredients: [
            { ingredientName: 'Phô mai', quantity: 500, unit: 'g' },
            { ingredientName: 'Đường', quantity: 150, unit: 'g' },
            { ingredientName: 'Trứng', quantity: 3, unit: 'quả' },
            { ingredientName: 'Kem tươi', quantity: 200, unit: 'ml' },
            { ingredientName: 'Bánh quy', quantity: 200, unit: 'g' }
        ],
        instructions: [
            { step: 1, description: 'Nghiền nhỏ bánh quy, trộn với bơ chảy, lót đáy', duration: 10 },
            { step: 2, description: 'Đánh mềm cream cheese với đường', duration: 5 },
            { step: 3, description: 'Thêm trứng từng quả một, đánh đều sau mỗi lần', duration: 5 },
            { step: 4, description: 'Thêm kem tươi, trộn đều, đổ vào khuôn', duration: 5 },
            { step: 5, description: 'Nướng 160°C trong 50 phút, để nguội từ từ', duration: 60 }
        ],
        preparationTime: 25,
        cookingTime: 60,
        servings: 8,
        difficulty: 'medium',
        notes: 'Để tủ lạnh qua đêm trước khi ăn để bánh đặc lại',
        tips: [
            'Cream cheese phải ở nhiệt độ phòng',
            'Nướng cách thủy để bánh không bị nứt',
            'Để nguội từ từ trong lò tắt'
        ],
        category: 'Tráng miệng',
        tags: ['bánh', 'phô mai', 'nướng', 'ngọt'],
        status: 'active'
    }
];

async function seedRecipes() {
    try {
        console.log('🌱 Bắt đầu seed 10 công thức bổ sung...');

        const menuItems = await menuModel.find({ isDeleted: { $ne: true } });
        const ingredients = await ingredientModel.find({ isDeleted: { $ne: true } });

        console.log(`📋 Tìm thấy ${menuItems.length} món ăn và ${ingredients.length} nguyên liệu`);

        if (menuItems.length === 0 || ingredients.length === 0) {
            console.log('⚠️  Không đủ dữ liệu. Cần có món ăn và nguyên liệu.');
            process.exit(1);
        }

        let successCount = 0;
        let skipCount = 0;

        for (const recipeData of additionalRecipes) {
            try {
                const menuItem = menuItems.find(m => {
                    const menuNameLower = m.name.toLowerCase();
                    const recipeNameLower = recipeData.menuItemName.toLowerCase();
                    return menuNameLower.includes(recipeNameLower) ||
                        recipeNameLower.includes(menuNameLower) ||
                        menuNameLower.split(' ').some(word => recipeNameLower.includes(word));
                });

                if (!menuItem) {
                    console.log(`⏭️  Bỏ qua: Không tìm thấy món "${recipeData.menuItemName}"`);
                    skipCount++;
                    continue;
                }

                const existingRecipe = await recipeModel.findOne({
                    menuItemId: menuItem._id,
                    isDeleted: { $ne: true }
                });

                if (existingRecipe) {
                    console.log(`⏭️  Bỏ qua: Công thức cho "${menuItem.name}" đã tồn tại`);
                    skipCount++;
                    continue;
                }

                const mappedIngredients = recipeData.ingredients.map(ing => {
                    const ingredient = ingredients.find(i => {
                        const ingNameLower = i.name.toLowerCase();
                        const recipeIngLower = ing.ingredientName.toLowerCase();
                        return ingNameLower.includes(recipeIngLower) ||
                            recipeIngLower.includes(ingNameLower) ||
                            ingNameLower.split(' ').some(word => recipeIngLower.includes(word));
                    });

                    if (ingredient) {
                        return {
                            ingredientId: ingredient._id,
                            ingredientName: ingredient.name,
                            quantity: ing.quantity,
                            unit: ingredient.unit
                        };
                    }
                    return null;
                }).filter(ing => ing !== null);

                const recipe = new recipeModel({
                    menuItemId: menuItem._id,
                    menuItemName: menuItem.name,
                    ingredients: mappedIngredients,
                    instructions: recipeData.instructions,
                    preparationTime: recipeData.preparationTime,
                    cookingTime: recipeData.cookingTime,
                    servings: recipeData.servings,
                    difficulty: recipeData.difficulty,
                    notes: recipeData.notes,
                    tips: recipeData.tips,
                    category: recipeData.category || menuItem.category,
                    tags: recipeData.tags,
                    image: menuItem.image,
                    status: recipeData.status
                });

                await recipe.save();
                console.log(`✅ Đã tạo công thức: ${menuItem.name} (${mappedIngredients.length} nguyên liệu)`);
                successCount++;

            } catch (error) {
                console.error(`❌ Lỗi khi tạo công thức "${recipeData.menuItemName}":`, error.message);
            }
        }

        console.log('\n📊 Kết quả:');
        console.log(`   ✅ Thành công: ${successCount} công thức`);
        console.log(`   ⏭️  Bỏ qua: ${skipCount} công thức`);
        console.log(`   ❌ Thất bại: ${additionalRecipes.length - successCount - skipCount} công thức`);
        console.log('\n🎉 Hoàn thành seed dữ liệu!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi seed dữ liệu:', error);
        process.exit(1);
    }
}

seedRecipes();
