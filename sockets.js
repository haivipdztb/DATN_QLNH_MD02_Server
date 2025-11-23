// sockets.js
let io;

module.exports = {
  /**
   * Initialize socket.io with HTTP server instance.
   * Returns the io instance.
   */
  init: function (server) {
    const socketIo = require('socket.io');
    io = socketIo(server, {
      cors: {
        origin: "*", // chỉnh lại origin production
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', socket => {
      console.log('Socket connected:', socket.id);

      // existing join pattern in your app (restaurant + station)
      socket.on('join_station', ({ restaurantId, stationId, token }) => {
        // TODO: kiểm tra token nếu cần
        const room = `restaurant:${restaurantId}:station:${stationId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
      });

      // common join patterns used by various clients (table rooms etc.)
      socket.on('join_table', payload => {
        // payload can be a number or an object { tableNumber: ... }
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ? payload.tableNumber : null);
          if (tn !== null) {
            const room = `table_${tn}`;
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
          }
        } catch (e) {
          console.warn('join_table handler error', e && e.message);
        }
      });

      socket.on('join', payload => {
        // support both join(number) and join({ tableNumber })
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ? payload.tableNumber : null);
          if (tn !== null) {
            const room = `table_${tn}`;
            socket.join(room);
            console.log(`Socket ${socket.id} join(${tn}) -> joined ${room}`);
          }
        } catch (e) {
          console.warn('join handler error', e && e.message);
        }
      });

      socket.on('subscribeOrder', payload => {
        try {
          const tn = (typeof payload === 'number') ? payload : (payload && payload.tableNumber ? payload.tableNumber : null);
          if (tn !== null) {
            const room = `table_${tn}`;
            socket.join(room);
            console.log(`Socket ${socket.id} subscribeOrder(${tn}) -> joined ${room}`);
          }
        } catch (e) {
          console.warn('subscribeOrder handler error', e && e.message);
        }
      });

      // kitchen ack nhận order
      socket.on('ack_order', ({ orderId, stationId, kitchenUserId }) => {
        console.log('ack_order', orderId, stationId, kitchenUserId);
        // Optionally notify waitstaff or other rooms
        // io.to(`restaurant:${restaurantId}:waitstaff`).emit('order_ack', { orderId, stationId });
      });

      // kitchen cập nhật trạng thái món (server-side may forward/update DB)
      socket.on('update_status', payload => {
        // payload = { orderId, itemId, status, updatedBy, tableNumber? }
        console.log('update_status', payload);
        try {
          // If payload contains tableNumber we forward to table room
          const tn = payload && (payload.tableNumber || payload.tableNumber === 0) ? payload.tableNumber : null;
          if (tn !== null) {
            io.to(`table_${tn}`).emit('order_updated', { tableNumber: tn, items: [payload] });
            console.log(`Forwarded update_status to table_${tn}`);
          } else {
            // broadcast fallback
            io.emit('order_updated', { items: [payload] });
            console.log('Broadcasted update_status as order_updated');
          }
        } catch (e) {
          console.warn('update_status forward error', e && e.message);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },

  /**
   * Returns io instance or throws if not initialized.
   */
  getIO: function () {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  /**
   * Emit a generic event to all clients and (optionally) to a specific table room.
   * payload is expected to contain tableNumber when you want to target a room.
   */
  emitOrderEvent: function (eventName, payload) {
    if (!io) {
      console.warn('emitOrderEvent: io not initialized, skipping emit', eventName);
      return;
    }
    try {
      // global broadcast
      io.emit(eventName, payload);
      // if payload contains tableNumber, also emit to the specific table room
      if (payload && (typeof payload.tableNumber !== 'undefined' || payload.tableNumber === 0)) {
        const tn = payload.tableNumber;
        io.to(`table_${tn}`).emit(eventName, payload);
      }
      console.log(`emitOrderEvent: emitted ${eventName} (tableNumber=${payload && payload.tableNumber})`);
    } catch (e) {
      console.warn('emitOrderEvent error', e && e.message);
    }
  },

  /**
   * Convenience: emit order_created
   */
  emitOrderCreated: function (payload) {
    this.emitOrderEvent('order_created', payload);
  },

  /**
   * Convenience: emit order_updated
   */
  emitOrderUpdated: function (payload) {
    this.emitOrderEvent('order_updated', payload);
  },

  /**
   * Emit to a specific table room only.
   */
  emitToTable: function (tableNumber, eventName, payload) {
    if (!io) {
      console.warn('emitToTable: io not initialized, skipping emit', eventName);
      return;
    }
    try {
      const room = `table_${tableNumber}`;
      io.to(room).emit(eventName, payload);
      console.log(`emitToTable: emitted ${eventName} to ${room}`);
    } catch (e) {
      console.warn('emitToTable error', e && e.message);
    }
  }
};