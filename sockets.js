// sockets.js - PHIÊN BẢN HOÀN CHỈNH
let io;

module.exports = {
  /**
   * Initialize socket.io with HTTP server instance. 
   */
  init: function (server) {
    const socketIo = require('socket.io');
    io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', socket => {
      console.log('✅ Socket connected:', socket.id);

      // Join station (for kitchen)
      socket.on('join_station', ({ restaurantId, stationId, token }) => {
        const room = `restaurant: ${restaurantId}:station: ${stationId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
      });

      // Join table room
      socket.on('join_table', payload => {
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ?  payload.tableNumber : null);
          if (tn !== null) {
            const room = `table_${tn}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
          }
        } catch (e) {
          console.warn('join_table error', e && e.message);
        }
      });

      socket.on('join', payload => {
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ? payload.tableNumber : null);
          if (tn !== null) {
            socket.join(`table_${tn}`);
            console.log(`Socket ${socket.id} join(${tn})`);
          }
        } catch (e) {
          console.warn('join error', e && e.message);
        }
      });

      socket.on('subscribeOrder', payload => {
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ? payload.tableNumber : null);
          if (tn !== null) {
            socket.join(`table_${tn}`);
            console.log(`Socket ${socket.id} subscribeOrder(${tn})`);
          }
        } catch (e) {
          console.warn('subscribeOrder error', e && e.message);
        }
      });

      socket.on('ack_order', ({ orderId, stationId, kitchenUserId }) => {
        console.log('ack_order', orderId, stationId, kitchenUserId);
      });

      socket.on('update_status', payload => {
        console.log('update_status', payload);
        try {
          const tn = payload && (payload.tableNumber || payload.tableNumber === 0) ? payload.tableNumber : null;
          if (tn !== null) {
            io.to(`table_${tn}`).emit('order_updated', { tableNumber: tn, items: [payload] });
            console.log(`Forwarded update_status to table_${tn}`);
          } else {
            io.emit('order_updated', { items:  [payload] });
          }
        } catch (e) {
          console.warn('update_status error', e && e. message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },

  /**
   * Get IO instance
   */
  getIO:  function () {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  /**
   * ✅ GENERIC:  Emit any event
   */
  emit: function (eventName, payload) {
    if (!io) {
      console.warn(`⚠️ emit: io not initialized, skipping ${eventName}`);
      return;
    }
    try {
      io.emit(eventName, payload);
      
      // If payload has tableNumber, also emit to that table room
      if (payload && (typeof payload. tableNumber !== 'undefined')) {
        const tn = payload.tableNumber;
        io. to(`table_${tn}`).emit(eventName, payload);
      }
      
      console.log(`✅ emit: ${eventName}`, payload?.tableNumber ? `(table ${payload.tableNumber})` : '');
    } catch (e) {
      console.warn(`❌ emit error: ${eventName}`, e && e.message);
    }
  },

  /**
   * ✅ ORDER EVENTS
   */
  emitOrderCreated: function (payload) {
    this.emit('order_created', payload);
  },

  emitOrderUpdated: function (payload) {
    this.emit('order_updated', payload);
  },

  emitOrderDeleted: function (payload) {
    this.emit('order_deleted', payload);
  },

  emitOrderPaid: function (payload) {
    this.emit('order_paid', payload);
  },

  /**
   * ✅ TABLE EVENTS
   */
  emitTableUpdated: function (payload) {
    this.emit('table_updated', payload);
  },

  emitTableCreated: function (payload) {
    this.emit('table_created', payload);
  },

  emitTableDeleted: function (payload) {
    this.emit('table_deleted', payload);
  },

  emitTableReserved: function (payload) {
    this.emit('table_reserved', payload);
  },

  emitTableAutoReleased: function (payload) {
    this.emit('table_auto_released', payload);
  },

  /**
   * ✅ CHECK ITEMS EVENTS
   */
  emitCheckItemsRequest: function (payload) {
    this.emit('check_items_request', payload);
  },

  emitCheckItemsCompleted: function (payload) {
    this.emit('check_items_completed', payload);
  },

  /**
   * ✅ TEMP CALCULATION EVENTS
   */
  emitTempCalculationRequest: function (payload) {
    this.emit('temp_calculation_request', payload);
  },

  emitTempBillPrinted: function (payload) {
    this.emit('temp_bill_printed', payload);
  },

  /**
   * ✅ KITCHEN EVENTS
   */
  emitDishCancelled: function (payload) {
    this.emit('dish_cancelled', payload);
  },

  emitCancelDishRequest: function (payload) {
    this.emit('cancel_dish_request', payload);
  },

  emitItemStatusChanged:  function (payload) {
    this.emit('item_status_changed', payload);
  },

  /**
   * ✅ MENU EVENTS
   */
  emitMenuItemCreated: function (payload) {
    this.emit('menu_item_created', payload);
  },

  emitMenuItemUpdated: function (payload) {
    this.emit('menu_item_updated', payload);
  },

  emitMenuItemDeleted: function (payload) {
    this.emit('menu_item_deleted', payload);
  },

  /**
   * ✅ INGREDIENT EVENTS
   */
  emitIngredientLowStock: function (payload) {
    this.emit('ingredient_low_stock', payload);
  },

  emitIngredientTaken: function (payload) {
    this.emit('ingredient_taken', payload);
  },

  emitIngredientUpdated: function (payload) {
    this.emit('ingredient_updated', payload);
  },

  /**
   * ✅ USER EVENTS
   */
  emitUserCreated: function (payload) {
    this.emit('user_created', payload);
  },

  emitUserUpdated: function (payload) {
    this.emit('user_updated', payload);
  },

  /**
   * ✅ SHIFT EVENTS
   */
  emitShiftCreated: function (payload) {
    this.emit('shift_created', payload);
  },

  emitShiftUpdated: function (payload) {
    this.emit('shift_updated', payload);
  },

  emitEmployeeCheckedIn: function (payload) {
    this.emit('employee_checked_in', payload);
  },

  /**
   * Emit to specific room only
   */
  emitToRoom: function (room, eventName, payload) {
    if (! io) {
      console.warn(`emitToRoom: io not initialized`);
      return;
    }
    try {
      io. to(room).emit(eventName, payload);
      console.log(`✅ emitToRoom: ${eventName} to ${room}`);
    } catch (e) {
      console.warn(`emitToRoom error`, e && e.message);
    }
  },

  /**
   * Emit to specific table
   */
  emitToTable: function (tableNumber, eventName, payload) {
    this.emitToRoom(`table_${tableNumber}`, eventName, payload);
  }
};