// controllers/order.controller.js
const { orderModel } = require('../model/order.model');
const { menuModel } = require('../model/menu.model'); // đảm bảo đường dẫn đúng trong project

/**
 * Helper: enrich incoming items array by looking up menuModel when menuItem id provided.
 * - Produces items shaped to match orderSchema (menuItem, menuItemName, imageUrl, price, quantity, status, note)
 * - If client provided snapshot fields already, prefer them; otherwise fill from menuModel document when available.
 */
async function enrichItemsWithMenuData(rawItems = []) {
  const out = [];

  for (const it of rawItems) {
    try {
      if (!it) continue;

      // accept several possible keys for menu id
      const menuId = it.menuItem || it.menuItemId || it.menuId || null;
      let menuDoc = null;

      if (menuId) {
        try {
          menuDoc = await menuModel.findById(menuId).select('name price image imageUrl thumbnail').lean().exec();
        } catch (e) {
          // lookup failed - continue with client-provided data if any
          console.warn('enrichItemsWithMenuData: menu lookup failed for id=', menuId, e && e.message);
        }
      }

      // quantity default to 1
      const quantity = (typeof it.quantity === 'number' && it.quantity > 0) ? it.quantity : 1;

      // price: prefer explicit client-provided numeric price, otherwise menuDoc.price, otherwise 0
      let price = 0;
      if (typeof it.price === 'number' && !isNaN(it.price)) {
        price = it.price;
      } else if (menuDoc && typeof menuDoc.price === 'number') {
        price = menuDoc.price;
      }

      // menuItemName: prefer client-provided menuItemName or name; fallback to menuDoc.name
      let menuItemName = '';
      if (it.menuItemName && String(it.menuItemName).trim()) {
        menuItemName = String(it.menuItemName).trim();
      } else if (it.name && String(it.name).trim()) {
        menuItemName = String(it.name).trim();
      } else if (menuDoc && menuDoc.name) {
        menuItemName = menuDoc.name;
      }

      // imageUrl: prefer client-provided imageUrl / image, otherwise menuDoc.image / imageUrl / thumbnail
      let imageUrl = '';
      if (it.imageUrl && String(it.imageUrl).trim()) imageUrl = String(it.imageUrl).trim();
      if (!imageUrl && it.image && String(it.image).trim()) imageUrl = String(it.image).trim();
      if (!imageUrl && menuDoc) {
        imageUrl = menuDoc.image || menuDoc.imageUrl || menuDoc.thumbnail || '';
      }

      // status and note
      const status = it.status ? String(it.status) : 'pending';
      const note = it.note ? String(it.note) : '';

      out.push({
        menuItem: menuId || null,
        menuItemName: menuItemName || '',
        imageUrl: imageUrl || '',
        quantity,
        price,
        status,
        note
      });
    } catch (e) {
      // Skip problematic item but don't break the whole request
      console.warn('enrichItemsWithMenuData: failed to process item', e && e.message);
    }
  }

  return out;
}

/**
 * Convenience helper to populate server/cashier and items.menuItem with image fields
 */
function populateOrderQuery(query) {
  return query
    .populate('server', 'name username')
    .populate('cashier', 'name username')
    .populate({
      path: 'items.menuItem',
      // include all possible image field names your menu model might use
      select: 'name price image imageUrl thumbnail'
    });
}

/**
 * GET /orders?tableNumber=...
 */
exports.getAllOrders = async (req, res) => {
  try {
    // Support optional tableNumber filter: /orders?tableNumber=1
    const filter = {};
    if (req.query && typeof req.query.tableNumber !== 'undefined' && req.query.tableNumber !== '') {
      const tn = Number(req.query.tableNumber);
      if (!isNaN(tn)) filter.tableNumber = tn;
      else filter.tableNumber = req.query.tableNumber;
    }

    let query = orderModel.find(filter).sort({ createdAt: -1 });
    query = populateOrderQuery(query);
    const orders = await query.lean().exec();

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getAllOrders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách orders',
      error: error.message
    });
  }
};

/**
 * GET /orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    let query = orderModel.findById(req.params.id);
    query = populateOrderQuery(query);
    query = query.populate('mergedFrom').populate('splitTo');
    const order = await query.lean().exec();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết order',
      error: error.message
    });
  }
};

/**
 * POST /orders
 * - Enrich items if menuItem ids are present (server will save snapshot fields).
 * - Return populated order.
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      tableNumber, server, cashier, items,
      totalAmount, discount, finalAmount,
      paymentMethod, orderStatus
    } = req.body;

    // Enrich items with menu data when possible (client may already have provided snapshot fields)
    const safeItems = Array.isArray(items) ? items : [];
    const enrichedItems = await enrichItemsWithMenuData(safeItems);

    // compute totals if not provided
    const computedTotal = enrichedItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
    const total = (typeof totalAmount === 'number' && !isNaN(totalAmount)) ? totalAmount : computedTotal;
    const final = (typeof finalAmount === 'number' && !isNaN(finalAmount)) ? finalAmount : total;

    const newOrder = new orderModel({
      tableNumber,
      server,
      cashier,
      items: enrichedItems,
      totalAmount: total,
      discount: discount || 0,
      finalAmount: final,
      paymentMethod,
      orderStatus: orderStatus || 'pending'
    });

    // debug: show preview of what will be saved
    if (process.env.NODE_ENV !== 'production') {
      console.log('createOrder: enrichedItems preview:', enrichedItems.slice(0, 10));
    }

    const saved = await newOrder.save();

    // Return populated order so client receives menu item details
    let query = orderModel.findById(saved._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

    return res.status(201).json({
      success: true,
      message: 'Tạo order thành công',
      data: populated || saved
    });
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo order',
      error: error.message
    });
  }
};

/**
 * PUT /orders/:id
 * - If items provided we enrich them before saving so snapshots are stored.
 * - Return populated updated order.
 */
exports.updateOrder = async (req, res) => {
  try {
    const {
      tableNumber, items, totalAmount, discount,
      finalAmount, paidAmount, change,
      paymentMethod, orderStatus, paidAt
    } = req.body;

    // If items provided, enrich them before saving
    let enrichedItems = undefined;
    if (Array.isArray(items)) {
      enrichedItems = await enrichItemsWithMenuData(items);
    }

    const updateData = {
      tableNumber,
      items: (typeof enrichedItems !== 'undefined') ? enrichedItems : items,
      totalAmount,
      discount,
      finalAmount,
      paidAmount,
      change,
      paymentMethod,
      orderStatus
    };

    if (orderStatus === 'paid' && paidAt) {
      updateData.paidAt = paidAt;
    }

    const updated = await orderModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).exec();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    let query = orderModel.findById(updated._id);
    query = populateOrderQuery(query);
    const populated = await query.lean().exec();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật order thành công',
      data: populated || updated
    });
  } catch (error) {
    console.error('updateOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật order',
      error: error.message
    });
  }
};

/**
 * DELETE /orders/:id
 */
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await orderModel.findByIdAndDelete(req.params.id).exec();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }
    return res.status(200).json({ success: true, message: 'Xóa order thành công', data: deleted });
  } catch (error) {
    console.error('deleteOrder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa order',
      error: error.message
    });
  }
};