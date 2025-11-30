const { shiftAssignmentModel } = require('../model/shiftAssignment.model');

exports.assignShift = async (req, res) => {
  try {
    const { userId, shiftId, workDate, assignedBy } = req.body;
    const exist = await shiftAssignmentModel.findOne({ userId, shiftId, workDate });
    if (exist) return res.status(400).json({ success: false, message: 'Đã phân ca này cho nhân viên!' });
    const assignment = new shiftAssignmentModel({ userId, shiftId, workDate, assignedBy });
    await assignment.save();
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssignmentsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = date ? { workDate: date } : {};
    const assignments = await shiftAssignmentModel.find(filter).populate('userId', 'fullName username').populate('shiftId').sort({ workDate: 1 });
    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
