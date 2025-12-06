const { History } = require('../model/history.model');

/**
 * Tạo history mới
 */
exports.createHistory = async (data) => {
  try {
    const history = new History(data);
    return await history.save();
  } catch (err) {
    console.error('createHistory error:', err);
    return null;
  }
};

/**
 * GET /history
 * Lấy danh sách history, có thể filter theo orderId, tableNumber, action
 */
exports.getHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.query.orderId) filter.orderId = req.query.orderId;
    if (req.query.tableNumber) filter.tableNumber = Number(req.query.tableNumber);
    if (req.query.action) filter.action = req.query.action;

    const histories = await History.find(filter).sort({ createdAt: -1 }).lean().exec();

    res.status(200).json({ success: true, data: histories });
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /history/:id
 * Lấy chi tiết một history
 */
exports.getHistoryById = async (req, res) => {
  try {
    const history = await History.findById(req.params.id).lean().exec();
    if (!history) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy history' });
    }
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    console.error('getHistoryById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
