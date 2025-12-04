const { attendanceModel } = require('../model/attendance.model');
const { shiftAssignmentModel } = require('../model/shiftAssignment.model');

exports.checkIn = async (req, res) => {
  try {
    const { userId, shiftId, workDate, wifiBSSID, deviceId, checkInType } = req.body;
    // Kiểm tra phân ca
    const assignment = await shiftAssignmentModel.findOne({ userId, shiftId, workDate, status: 'active' });
    if (!assignment) return res.status(400).json({ success: false, message: 'Bạn chưa được phân ca hôm nay!' });
    // Kiểm tra đã check-in chưa
    const exist = await attendanceModel.findOne({ userId, shiftId, workDate, checkIn: { $ne: null } });
    if (exist) return res.status(400).json({ success: false, message: 'Đã check-in ca này!' });
    // TODO: Kiểm tra wifiBSSID hợp lệ ở đây nếu cần
    const attendance = new attendanceModel({ userId, shiftId, workDate, wifiBSSID, deviceId, checkInType: checkInType || 'wifi', checkIn: new Date() }); // Đã đúng thời gian thực
    await attendance.save();
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { userId, shiftId, workDate, wifiBSSID, deviceId, checkOutType } = req.body;
    const attendance = await attendanceModel.findOne({ userId, shiftId, workDate, checkOut: null });
    if (!attendance) return res.status(400).json({ success: false, message: 'Chưa check-in hoặc đã check-out!' });
    attendance.checkOut = new Date(); // Đã đúng thời gian thực
    attendance.checkOutType = checkOutType || 'wifi';
    attendance.wifiBSSID = wifiBSSID;
    attendance.deviceId = deviceId;
    await attendance.save();
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { userId, month } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (month) filter.workDate = { $regex: `^${month}` };
    const data = await attendanceModel.find(filter).populate('userId', 'fullName username').populate('shiftId').sort({ workDate: 1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
