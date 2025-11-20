const { orderModel } = require('../model/order.model');

/**
 * controllers/kitchen.controller.js
 * - Hỗ trợ tìm item bằng _id hoặc menuItem/menuItemId
 * - Normalize status từ các dạng VN/EN sang values chuẩn: pending, preparing, ready, soldout
 * - Broadcast 'order_updated' tới room 'phucvu' nếu io được set trên app
 */

// Helper: chuẩn hóa trạng thái nhận được từ client
function normalizeStatus(input) {
  if (!input) return '';
  const s = String(input).trim().toLowerCase();
  if (s === 'received' || s === 'đã nhận' || s === 'da nhan' || s === 'dan nhan') return 'pending';
  if (s === 'pending') return 'pending';
  if (s === 'dang lam' || s === 'đang làm' || s === 'đang lam' || s === 'danglam') return 'preparing';
  if (s === 'preparing' || s === 'processing') return 'preparing';
  if (s === 'ready' || s === 'xong' || s === 'đã xong' || s === 'da xong') return 'ready';
  if (s === 'soldout' || s === 'het' || s === 'hết' || s === 'đã hết') return 'soldout';
  return s; // trả về nguyên dạng đã lowercase nếu không map được (sẽ validate sau)
}

// Helper để tìm OrderItem trong order (hỗ trợ subdoc _id hoặc match menuItem/menuItemId)
function findOrderItem(order, itemId) {
  if (!order || !order.items) return null;
  // 1) thử tìm theo subdocument _id
  try {
    const bySubId = order.items.id(itemId);
    if (bySubId) return bySubId;
  } catch (e) {
    // ignore
  }

  // 2) thử match theo menuItem (ObjectId) hoặc menuItemId field hoặc nested id
  const found = order.items.find(it => {
    if (!it) return false;
    try {
      // it.menuItem có thể là ObjectId hoặc object; try common variants
      const menuRef = it.menuItem || it.menuItemId || (it.menuItem && it.menuItem._id) || (it.menuItem && it.menuItem.id);
      if (!menuRef) return false;
      return String(menuRef) === String(itemId);
    } catch (e) {
      return false;
    }
  });
  return found || null;
}

// Các handler:

async function getAllKitchenOrders(req, res) {
  try {
    const orders = await orderModel.find({
      orderStatus: { $in: ['pending', 'preparing'] }
    })
      .populate('items.menuItem')
      .populate('server', 'name')
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getAllKitchenOrders error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách order', error: error.message });
  }
}

async function getKitchenOrderById(req, res) {
  try {
    const order = await orderModel.findById(req.params.id)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean()
      .exec();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('getKitchenOrderById error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết order', error: error.message });
  }
}

async function updateItemStatus(req, res) {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    console.log('updateItemStatus called', { orderId, itemId, body: req.body });

    const normalized = normalizeStatus(status);
    const validStatuses = ['pending', 'preparing', 'ready', 'soldout'];
    if (!validStatuses.includes(normalized)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
        received: status,
        normalized
      });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    // Tìm item theo nhiều cách
    let item = findOrderItem(order, itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món trong order' });
    }

    item.status = normalized;
    await order.save();

    // Cập nhật trạng thái order tổng thể
    try { await updateOrderStatus(order); } catch (e) { console.warn('updateOrderStatus warning', e); }

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean()
      .exec();

    // Broadcast tới room 'phucvu' nếu server expose io
    try {
      const io = req.app && req.app.get ? req.app.get('io') : null;
      if (io) {
        const payload = {
          orderId: String(orderId),
          itemId: String(itemId),
          status: normalized,
          tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined
        };
        io.to('phucvu').emit('order_updated', payload);
      }
    } catch (e) {
      console.warn('Socket emit failed in updateItemStatus:', e);
    }

    return res.status(200).json({ success: true, message: 'Cập nhật trạng thái món thành công', data: updatedOrder });
  } catch (error) {
    console.error('updateItemStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái món', error: error.message });
  }
}

async function updateAllItemsStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    console.log('updateAllItemsStatus called', { orderId, body: req.body });

    const normalized = normalizeStatus(status);
    const validStatuses = ['pending', 'preparing', 'ready', 'soldout'];
    if (!validStatuses.includes(normalized)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ', received: status, normalized });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    order.items.forEach(item => { item.status = normalized; });
    await order.save();
    try { await updateOrderStatus(order); } catch (e) { console.warn('updateOrderStatus warning', e); }

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean()
      .exec();

    try {
      const io = req.app && req.app.get ? req.app.get('io') : null;
      if (io) {
        const payload = { orderId: String(orderId), status: normalized, tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined };
        io.to('phucvu').emit('order_updated', payload);
      }
    } catch (e) {
      console.warn('Socket emit failed in updateAllItemsStatus:', e);
    }

    return res.status(200).json({ success: true, message: 'Cập nhật trạng thái tất cả món thành công', data: updatedOrder });
  } catch (error) {
    console.error('updateAllItemsStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái', error: error.message });
  }
}

async function startPreparing(req, res) {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy order' });

    order.items.forEach(item => { if (item.status === 'pending') item.status = 'preparing'; });
    order.orderStatus = 'preparing';
    await order.save();

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean()
      .exec();

    return res.status(200).json({ success: true, message: 'Đã bắt đầu chuẩn bị order', data: updatedOrder });
  } catch (error) {
    console.error('startPreparing error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi bắt đầu chuẩn bị', error: error.message });
  }
}

async function markOrderReady(req, res) {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy order' });

    order.items.forEach(item => { item.status = 'ready'; });
    order.orderStatus = 'ready';
    await order.save();

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean()
      .exec();

    return res.status(200).json({ success: true, message: 'Order đã sẵn sàng phục vụ', data: updatedOrder });
  } catch (error) {
    console.error('markOrderReady error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi đánh dấu order sẵn sàng', error: error.message });
  }
}

async function getOrdersByStatus(req, res) {
  try {
    const { status } = req.params;
    const orders = await orderModel.find({ orderStatus: status })
      .populate('items.menuItem')
      .populate('server', 'name')
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getOrdersByStatus error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách order', error: error.message });
  }
}

// Helper cập nhật trạng thái order tổng thể
async function updateOrderStatus(order) {
  try {
    const allSoldOut = order.items.every(item => item.status === 'soldout');
    const allReady = order.items.every(item => item.status === 'ready' || item.status === 'soldout');
    const anyPreparing = order.items.some(item => item.status === 'preparing');
    const allPending = order.items.every(item => item.status === 'pending');

    if (allSoldOut) order.orderStatus = 'soldout';
    else if (allReady) order.orderStatus = 'ready';
    else if (anyPreparing) order.orderStatus = 'preparing';
    else if (allPending) order.orderStatus = 'pending';

    await order.save();
  } catch (e) {
    console.warn('updateOrderStatus helper error:', e);
  }
}

module.exports = {
  getAllKitchenOrders,
  getKitchenOrderById,
  updateItemStatus,
  updateAllItemsStatus,
  startPreparing,
  markOrderReady,
  getOrdersByStatus
};