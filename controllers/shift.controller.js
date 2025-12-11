// controllers/shift.controller.js
const { shiftModel } = require('../model/shift.model');

// Lấy tất cả ca làm việc
exports.getAllShifts = async (req, res) => {
    try {
        const { date, status, employeeId } = req.query;
        const filter = {};

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            filter.date = { $gte: startDate, $lte: endDate };
        }

        if (status) filter.status = status;

        if (employeeId) {
            filter['employees.employeeId'] = employeeId;
        }

        const shifts = await shiftModel
            .find(filter)
            .populate('employees.employeeId', 'name username role')
            .sort({ date: -1, startTime: 1 })
            .lean()
            .exec();

        return res.status(200).json({
            success: true,
            data: shifts,
            count: shifts.length
        });
    } catch (error) {
        console.error('getAllShifts error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách ca làm việc',
            error: error.message
        });
    }
};

// Lấy chi tiết ca làm việc
exports.getShiftById = async (req, res) => {
    try {
        const shift = await shiftModel
            .findById(req.params.id)
            .populate('employees.employeeId', 'name username role phoneNumber email')
            .lean()
            .exec();

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ca làm việc'
            });
        }

        return res.status(200).json({
            success: true,
            data: shift
        });
    } catch (error) {
        console.error('getShiftById error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy chi tiết ca làm việc',
            error: error.message
        });
    }
};

// Tạo ca làm việc mới
exports.createShift = async (req, res) => {
    try {
        const { name, startTime, endTime, date, employees, notes } = req.body;

        const newShift = new shiftModel({
            name,
            startTime,
            endTime,
            date,
            employees: employees || [],
            notes
        });

        const saved = await newShift.save();

        return res.status(201).json({
            success: true,
            message: 'Tạo ca làm việc thành công',
            data: saved
        });
    } catch (error) {
        console.error('createShift error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo ca làm việc',
            error: error.message
        });
    }
};

// Cập nhật ca làm việc
exports.updateShift = async (req, res) => {
    try {
        const { name, startTime, endTime, date, employees, status, notes } = req.body;

        const updated = await shiftModel.findByIdAndUpdate(
            req.params.id,
            {
                name,
                startTime,
                endTime,
                date,
                employees,
                status,
                notes,
                updatedAt: Date.now()
            },
            { new: true, runValidators: true }
        )
            .populate('employees.employeeId', 'name username role')
            .exec();

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ca làm việc'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật ca làm việc thành công',
            data: updated
        });
    } catch (error) {
        console.error('updateShift error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật ca làm việc',
            error: error.message
        });
    }
};

// Xóa ca làm việc
exports.deleteShift = async (req, res) => {
    try {
        const deleted = await shiftModel.softDelete(req.params.id).exec();

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ca làm việc'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa ca làm việc thành công',
            data: deleted
        });
    } catch (error) {
        console.error('deleteShift error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa ca làm việc',
            error: error.message
        });
    }
};

// Nhân viên check-in
exports.checkin = async (req, res) => {
    try {
        const { employeeId } = req.body;
        const shiftId = req.params.id;

        const shift = await shiftModel.findById(shiftId);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ca làm việc'
            });
        }

        // Tìm nhân viên trong ca
        const employeeIndex = shift.employees.findIndex(
            emp => emp.employeeId.toString() === employeeId
        );

        if (employeeIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Nhân viên không có trong ca này'
            });
        }

        // Kiểm tra đã check-in chưa
        if (shift.employees[employeeIndex].checkinTime) {
            return res.status(400).json({
                success: false,
                message: 'Nhân viên đã check-in rồi'
            });
        }

        // Cập nhật check-in
        const checkinTime = new Date();
        shift.employees[employeeIndex].checkinTime = checkinTime;
        shift.employees[employeeIndex].status = 'present';

        // Kiểm tra đi muộn (so sánh với startTime)
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const shiftStartTime = new Date(shift.date);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);

        if (checkinTime > shiftStartTime) {
            shift.employees[employeeIndex].status = 'late';
        }

        await shift.save();

        return res.status(200).json({
            success: true,
            message: 'Check-in thành công',
            data: shift
        });
    } catch (error) {
        console.error('checkin error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi check-in',
            error: error.message
        });
    }
};

// Nhân viên check-out
exports.checkout = async (req, res) => {
    try {
        const { employeeId } = req.body;
        const shiftId = req.params.id;

        const shift = await shiftModel.findById(shiftId);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ca làm việc'
            });
        }

        // Tìm nhân viên trong ca
        const employeeIndex = shift.employees.findIndex(
            emp => emp.employeeId.toString() === employeeId
        );

        if (employeeIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Nhân viên không có trong ca này'
            });
        }

        // Kiểm tra đã check-in chưa
        if (!shift.employees[employeeIndex].checkinTime) {
            return res.status(400).json({
                success: false,
                message: 'Nhân viên chưa check-in'
            });
        }

        // Kiểm tra đã check-out chưa
        if (shift.employees[employeeIndex].checkoutTime) {
            return res.status(400).json({
                success: false,
                message: 'Nhân viên đã check-out rồi'
            });
        }

        // Cập nhật check-out
        const checkoutTime = new Date();
        shift.employees[employeeIndex].checkoutTime = checkoutTime;

        // Tính số giờ làm việc thực tế
        const checkinTime = shift.employees[employeeIndex].checkinTime;
        const diffMs = checkoutTime - checkinTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        shift.employees[employeeIndex].actualHours = Math.round(diffHours * 100) / 100;

        await shift.save();

        return res.status(200).json({
            success: true,
            message: 'Check-out thành công',
            data: shift
        });
    } catch (error) {
        console.error('checkout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi check-out',
            error: error.message
        });
    }
};

// Lấy lịch sử ca làm việc của nhân viên
exports.getEmployeeShiftHistory = async (req, res) => {
    try {
        const employeeId = req.params.employeeId;
        const { startDate, endDate } = req.query;

        const filter = {
            'employees.employeeId': employeeId
        };

        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const shifts = await shiftModel
            .find(filter)
            .populate('employees.employeeId', 'name username role')
            .sort({ date: -1 })
            .lean()
            .exec();

        // Lọc chỉ lấy thông tin của nhân viên này
        const employeeShifts = shifts.map(shift => {
            const employeeData = shift.employees.find(
                emp => emp.employeeId._id.toString() === employeeId
            );
            return {
                ...shift,
                employeeData: employeeData
            };
        });

        // Tính tổng giờ làm
        const totalHours = employeeShifts.reduce((sum, shift) => {
            return sum + (shift.employeeData?.actualHours || 0);
        }, 0);

        return res.status(200).json({
            success: true,
            data: employeeShifts,
            count: employeeShifts.length,
            totalHours: Math.round(totalHours * 100) / 100
        });
    } catch (error) {
        console.error('getEmployeeShiftHistory error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử ca làm việc',
            error: error.message
        });
    }
};
