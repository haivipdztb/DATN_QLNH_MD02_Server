// Script để thêm field deleted: false cho tất cả documents hiện có
const { userModel } = require('./model/user.model');
const { menuModel } = require('./model/menu.model');
const { ingredientModel } = require('./model/ingredient.model');
const { tableModel } = require('./model/table.model');
const { voucherModel } = require('./model/voucher.model');
const { shiftModel } = require('./model/shift.model');
const { salaryConfigModel, salaryLogModel } = require('./model/salary.model');
const { orderModel } = require('./model/order.model');
const { reportModel } = require('./model/report.model');
const { attendanceModel } = require('./model/attendance.model');
const { payrollModel } = require('./model/payroll.model');
const { shiftAssignmentModel } = require('./model/shiftAssignment.model');
const db = require('./model/db');

async function addDeletedFieldToAllDocuments() {
    try {
        console.log('🚀 Thêm field deleted: false cho tất cả documents hiện có...\n');

        const models = [
            { name: 'users', model: userModel },
            { name: 'menu', model: menuModel },
            { name: 'ingredients', model: ingredientModel },
            { name: 'tables', model: tableModel },
            { name: 'vouchers', model: voucherModel },
            { name: 'shifts', model: shiftModel },
            { name: 'salaryConfigs', model: salaryConfigModel },
            { name: 'salaryLogs', model: salaryLogModel },
            { name: 'orders', model: orderModel },
            { name: 'reports', model: reportModel },
            { name: 'attendances', model: attendanceModel },
            { name: 'payrolls', model: payrollModel },
            { name: 'shiftAssignments', model: shiftAssignmentModel },
        ];

        let totalUpdated = 0;

        for (const { name, model } of models) {
            try {
                // Update tất cả documents không có field deleted
                const result = await model.updateMany(
                    { deleted: { $exists: false } },
                    {
                        $set: {
                            deleted: false,
                            deletedAt: null,
                            deletedBy: null
                        }
                    }
                );

                console.log(`✅ ${name}: Updated ${result.modifiedCount} documents`);
                totalUpdated += result.modifiedCount;
            } catch (error) {
                console.error(`❌ Error updating ${name}:`, error.message);
            }
        }

        console.log(`\n🎉 Tổng cộng: Đã cập nhật ${totalUpdated} documents`);
        console.log('\n✅ Tất cả dữ liệu hiện có đã được đánh dấu là chưa xóa!');
        console.log('📊 Bây giờ bạn có thể query data bình thường.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

// Chạy script
addDeletedFieldToAllDocuments();
