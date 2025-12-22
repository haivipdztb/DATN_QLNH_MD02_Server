const { orderModel } = require('../model/order.model');
const sockets = require('../sockets');

/**
 * controllers/kitchen.controller.js
 * - Hỗ trợ tìm item bằng _id hoặc menuItem/menuItemId
 * - Normalize status từ các dạng VN/EN sang values chuẩn: pending, preparing, ready, soldout
 * - Broadcast 'order_updated', 'dish_cancelled', 'cancel_dish_request' tới đúng room qua sockets
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
  if (s === 'cancel_requested' || s === 'yeu cau huy' || s === 'yêu cầu hủy') return 'cancel_requested';
  if (s === 'served' || s === 'đã phục vụ' || s === 'da phuc vu') return 'served';
  return s;
}

// Helper để tìm OrderItem trong order (hỗ trợ subdoc _id hoặc match menuItem/menuItemId)
function findOrderItem(order, itemId) {
  if (!order || !order.items) return null;
  try {
    const bySubId = order.items.id(itemId);
    if (bySubId) return bySubId;
  } catch (e) {}
  const found = order.items.find(it => {
    if (!it) return false;
    try {
      const menuRef = it.menuItem || it.menuItemId || (it.menuItem && it.menuItem._id) || (it.menuItem && it.menuItem.id);
      if (!menuRef) return false;
      return String(menuRef) === String(itemId);
    } catch (e) {
      return false;
    }
  });
  return found || null;
}

// --- MAIN HANDLERS ---

async function getAllKitchenOrders(req, res) {
  try {
    const orders = await orderModel.find({ orderStatus: { $in: ['pending', 'preparing'] } })
      .populate('items.menuItem')
      .populate('server', 'name')
      .sort({ createdAt: 1 })
      .lean().exec();
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
      .lean().exec();
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
    const validStatuses = ['pending', 'preparing', 'ready', 'soldout', 'cancel_requested', 'served'];
    if (!validStatuses.includes(normalized)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
        received: status,
        normalized
      });
    }

    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy order' });

    let item = findOrderItem(order, itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy món trong order' });

    item.status = normalized;
    await order.save();
    try { await updateOrderStatus(order); } catch (e) {}

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean().exec();

    // ✅ Emit order_updated tới đúng các client (room table và toàn bộ - cho realtime notifications trên app)
    try {
      sockets.emitOrderUpdated({
        orderId: String(orderId),
        itemId: String(itemId),
        status: normalized,
        tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined,
        updatedOrder,
      });
    } catch (emitError) {
      console.warn('Socket emit failed in updateItemStatus:', emitError);
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
    const validStatuses = ['pending', 'preparing', 'ready', 'soldout', 'cancel_requested'];
    if (!validStatuses.includes(normalized)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ', received: status, normalized });
    }

    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy order' });

    order.items.forEach(item => { item.status = normalized; });
    await order.save();
    try { await updateOrderStatus(order); } catch (e) {}

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('server', 'name')
      .lean().exec();

    try {
      sockets.emitOrderUpdated({
        orderId: String(orderId),
        status: normalized,
        tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined,
        updatedOrder,
      });
    } catch (emitError) {
      console.warn('Socket emit failed in updateAllItemsStatus:', emitError);
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
      .lean().exec();

    try {
      sockets.emitOrderUpdated({
        orderId: String(orderId),
        status: 'preparing',
        tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined,
        updatedOrder,
      });
    } catch (emitError) {
      console.warn('Socket emit failed in startPreparing:', emitError);
    }

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
      .lean().exec();

    try {
      sockets.emitOrderUpdated({
        orderId: String(orderId),
        status: 'ready',
        tableNumber: updatedOrder ? updatedOrder.tableNumber : undefined,
        updatedOrder,
      });
    } catch (emitError) {
      console.warn('Socket emit failed in markOrderReady:', emitError);
    }

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
      .lean().exec();

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

// --- DISH CANCEL HANDLERS ---

// Hủy món ăn (Bếp bấm hủy)
async function cancelDish(req, res) {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy order' });

    const item = findOrderItem(order, itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn trong order' });

    if (item.status === 'ready') {
      return res.status(400).json({ success: false, message: 'Không thể hủy món đã hoàn thành' });
    }

    const cancelInfo = `[HỦY] ${reason || 'Khách không muốn nữa'}`;
    item.note = item.note ? `${item.note} | ${cancelInfo}` : cancelInfo;
    item.status = 'soldout';

    let newTotal = 0;
    order.items.forEach(it => {
      if (it.status !== 'soldout') {
        newTotal += (it.price || 0) * (it.quantity || 0);
      }
    });

    order.totalAmount = newTotal;
    order.finalAmount = newTotal - (order.discount || 0);

    await order.save();

    // ✅ Emit dish_cancelled event
    try {
      sockets.emitDishCancelled({
        orderId: order._id,
        itemId: item._id,
        itemName: item.menuItemName,
        reason: reason || 'Khách không muốn nữa',
        tableNumber: order.tableNumber
      });
    } catch (emitError) {
      console.warn('Socket emit failed in cancelDish:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: `Đã hủy món: ${item.menuItemName}`,
      data: {
        order,
        cancelledItem: {
          id: item._id,
          name: item.menuItemName,
          reason: cancelInfo
        }
      }
    });
  } catch (error) {
    console.error('cancelDish error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi hủy món', error: error.message });
  }
}

// Nhân viên phục vụ yêu cầu hủy món
async function requestCancelDish(req, res) {
  try {
    const { orderId, itemId } = req.params;
    const { requestedBy, reason } = req.body;

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    const item = findOrderItem(order, itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món ăn trong order' });
    }

    if (item.status === 'ready') {
      return res.status(400).json({ success: false, message: 'Món đã hoàn thành, không thể yêu cầu hủy' });
    }
    if (item.status === 'soldout') {
      return res.status(400).json({ success: false, message: 'Món đã bị hủy trước đó' });
    }
    if (item.status === 'cancel_requested') {
      return res.status(400).json({ success: false, message: 'Món đã được yêu cầu hủy trước đó' });
    }

    item.status = 'cancel_requested';
    item.cancelRequestedBy = requestedBy || null;
    item.cancelRequestedAt = new Date();
    item.cancelReason = reason || 'Khách yêu cầu hủy';

    await order.save();

    const updatedOrder = await orderModel.findById(orderId)
      .populate('items.menuItem')
      .populate('items.cancelRequestedBy', 'name username')
      .populate('server', 'name')
      .lean().exec();

    // ✅ Emit cancel_dish_request socket event cho bếp (và phục vụ)
    try {
      sockets.emitCancelDishRequest({
        orderId: order._id,
        itemId: item._id,
        itemName: item.menuItemName,
        tableNumber: order.tableNumber,
        reason: item.cancelReason,
        requestedBy,
        requestedAt: item.cancelRequestedAt
      });
      sockets.emitOrderUpdated({
        orderId: order._id,
        tableNumber: order.tableNumber,
        itemId: item._id,
        status: item.status
      });
    } catch (emitError) {
      console.warn('Socket emit failed in requestCancelDish:', emitError);
    }

    return res.status(200).json({
      success: true,
      message: `Đã gửi yêu cầu hủy món: ${item.menuItemName}`,
      data: {
        order: updatedOrder,
        requestedItem: {
          id: item._id,
          name: item.menuItemName,
          status: item.status,
          reason: item.cancelReason,
          requestedAt: item.cancelRequestedAt
        }
      }
    });
  } catch (error) {
    console.error('requestCancelDish error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi yêu cầu hủy món', error: error.message });
  }
}

// Export all handlers
module.exports = {
  getAllKitchenOrders,
  getKitchenOrderById,
  updateItemStatus,
  updateAllItemsStatus,
  startPreparing,
  markOrderReady,
  getOrdersByStatus,
  cancelDish,
  requestCancelDish
};