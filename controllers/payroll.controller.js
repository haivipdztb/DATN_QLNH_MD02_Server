const { payrollModel } = require('../model/payroll.model');

exports.getPayroll = async (req, res) => {
  try {
    const { userId, month } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (month) filter.month = month;
    const data = await payrollModel.find(filter).populate('userId', 'fullName username').sort({ month: 1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// TODO: Thêm API tính lương tự động theo attendance nếu cần
