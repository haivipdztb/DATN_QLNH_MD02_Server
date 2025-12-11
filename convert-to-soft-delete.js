// Script để tự động thay thế findByIdAndDelete thành softDelete trong tất cả controllers
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const controllerFiles = [
    'user.controller.js',
    'menu.controller.js',
    'ingredient.controller.js',
    'table.controller.js',
    'voucher.controller.js',
    'shift.controller.js',
    'order.controller.js',
    'report.controller.js'
];

function updateControllerToSoftDelete(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);

        // Đếm số lần thay thế
        const matches = content.match(/findByIdAndDelete/g);
        if (!matches) {
            console.log(`⏭️  Skipped ${fileName} - no findByIdAndDelete found`);
            return;
        }

        // Thay thế findByIdAndDelete thành softDelete
        // Pattern 1: await Model.findByIdAndDelete(id)
        content = content.replace(
            /await\s+(\w+Model)\.findByIdAndDelete\(([^)]+)\)/g,
            'await $1.softDelete($2)'
        );

        // Pattern 2: Model.findByIdAndDelete(id).exec()
        content = content.replace(
            /(\w+Model)\.findByIdAndDelete\(([^)]+)\)\.exec\(\)/g,
            '$1.softDelete($2)'
        );

        // Pattern 3: Model.findByIdAndDelete(id).select(...)
        content = content.replace(
            /(\w+Model)\.findByIdAndDelete\(([^)]+)\)\.select\([^)]+\)/g,
            '$1.softDelete($2)'
        );

        // Write back
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${fileName} - replaced ${matches.length} occurrence(s)`);

    } catch (error) {
        console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    }
}

console.log('🚀 Converting hard delete to soft delete in controllers...\n');

controllerFiles.forEach(file => {
    const filePath = path.join(controllersDir, file);
    if (fs.existsSync(filePath)) {
        updateControllerToSoftDelete(filePath);
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
});

console.log('\n✅ Done! All controllers now use soft delete.');
console.log('\n📝 Note: Soft delete will:');
console.log('   - Set deleted=true instead of removing from database');
console.log('   - Set deletedAt timestamp');
console.log('   - Automatically filter deleted items in queries');
