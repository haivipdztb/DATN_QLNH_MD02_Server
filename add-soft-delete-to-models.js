// Script để tự động thêm soft delete plugin vào tất cả models
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'model');
const modelFiles = [
    'menu.model.js',
    'ingredient.model.js',
    'order.model.js',
    'table.model.js',
    'voucher.model.js',
    'shift.model.js',
    'salary.model.js',
    'report.model.js',
    'attendance.model.js',
    'payroll.model.js',
    'shiftAssignment.model.js'
];

function addSoftDeleteToModel(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if already has soft delete
        if (content.includes('softDeletePlugin')) {
            console.log(`⏭️  Skipped ${path.basename(filePath)} - already has soft delete`);
            return;
        }

        // Add import
        if (!content.includes("require('../utils/softDelete')")) {
            content = content.replace(
                "const db = require('./db');",
                "const db = require('./db');\nconst { softDeletePlugin } = require('../utils/softDelete');"
            );
        }

        // Find schema definition and add plugin
        // Look for pattern: const xxxSchema = new db.mongoose.Schema(...)
        const schemaMatch = content.match(/const\s+(\w+Schema)\s*=\s*new\s+db\.mongoose\.Schema\(/);

        if (schemaMatch) {
            const schemaName = schemaMatch[1];

            // Find the closing of schema definition
            // Look for the pattern: )\n or );\n followed by // tạo model
            const modelCommentIndex = content.indexOf('// tạo model');

            if (modelCommentIndex > -1) {
                // Insert plugin before model creation
                const pluginCode = `\n// Thêm soft delete plugin\n${schemaName}.plugin(softDeletePlugin);\n\n`;
                content = content.slice(0, modelCommentIndex) + pluginCode + content.slice(modelCommentIndex);

                // Write back
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Updated ${path.basename(filePath)}`);
            } else {
                console.log(`⚠️  Could not find model creation in ${path.basename(filePath)}`);
            }
        } else {
            console.log(`⚠️  Could not find schema in ${path.basename(filePath)}`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    }
}

console.log('🚀 Adding soft delete to all models...\n');

modelFiles.forEach(file => {
    const filePath = path.join(modelsDir, file);
    if (fs.existsSync(filePath)) {
        addSoftDeleteToModel(filePath);
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
});

console.log('\n✅ Done!');
