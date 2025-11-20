// sockets.js
let io;

module.exports = {
  init: function(server) {
    const socketIo = require('socket.io');
    io = socketIo(server, {
      cors: {
        origin: "*", // chỉnh lại origin production
        methods: ["GET","POST"]
      }
    });

    io.on('connection', socket => {
      console.log('Socket connected:', socket.id);

      // client gửi: join room (restaurant + station)
      socket.on('join_station', ({ restaurantId, stationId, token }) => {
        // TODO: kiểm tra token nếu cần
        const room = `restaurant:${restaurantId}:station:${stationId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
      });

      // kitchen ack nhận order
      socket.on('ack_order', ({ orderId, stationId, kitchenUserId }) => {
        console.log('ack_order', orderId, stationId, kitchenUserId);
        // forward ack tới server-side logic via event emit or update DB directly
        // bạn có thể emit tới room phục vụ nếu muốn:
        // io.to(`restaurant:${restaurantId}:waitstaff`).emit('order_ack', { orderId, stationId });
      });

      // kitchen cập nhật trạng thái món
      socket.on('update_status', payload => {
        // payload = { orderId, itemId, status, updatedBy }
        // bạn có thể cập nhật DB ở đây (gọi controller hoặc emit event nội bộ)
        console.log('update_status', payload);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
      });
    });

    return io;
  },

  getIO: function() {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};