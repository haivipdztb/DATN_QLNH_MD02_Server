const crypto = require('crypto');
const qs = require('qs');
const { orderModel } = require('../model/order.model');

const {
  vnp_TmnCode,
  vnp_HashSecret = '',
  vnp_Url,
  vnp_ReturnUrl
} = process.env;

function buildSignData(params) {
  return Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
}

// ✅ Trim secret để loại bỏ khoảng trắng
const SECRET = vnp_HashSecret.trim();

console.log('ENV CHECK:', {
  tmn: vnp_TmnCode,
  secretLength: SECRET.length,
  secretFirst4: SECRET.substring(0, 4),
  secretLast4: SECRET.substring(SECRET.length - 4),
  url: vnp_Url
});

/* format YYYYMMDDHHmmss */
function formatDate(date) {
  const p = (n) => n.toString().padStart(2, '0');
  return (
    date.getFullYear() +
    p(date.getMonth() + 1) +
    p(date.getDate()) +
    p(date.getHours()) +
    p(date.getMinutes()) +
    p(date.getSeconds())
  );
}

/**
 * ✅ LẤY IP THỰC CỦA CLIENT (IPv4 only)
 */
function getClientIp(req) {
  let ip = req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  // ✅ Convert IPv6 localhost to IPv4
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // ✅ Remove IPv6 prefix if exists
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  return ip;
}

/**
 * TẠO LINK THANH TOÁN THẺ
 */
exports.createCardPayment = async (req, res) => {
  console.log('CREATE CARD PAYMENT REQUEST:', req.body);
  try {
    const { orderId, orderIds, voucherId } = req.body;
    let finalOrderId = orderId;

    if (!finalOrderId && orderIds && orderIds.length > 0) {
      // Try to find merged order that contains these orderIds in mergedFrom
      console.log('TRYING TO FIND MERGED ORDER for orderIds:', orderIds);
      const mergedOrder = await orderModel.findOne({
        mergedFrom: { $in: orderIds }
      });
      console.log('MERGED ORDER FOUND:', mergedOrder ? mergedOrder._id : 'none');
      if (mergedOrder) {
        finalOrderId = mergedOrder._id.toString();
      } else {
        // Try each orderId until find one that exists
        console.log('TRYING INDIVIDUAL ORDER IDS...');
        for (const id of orderIds.reverse()) {  // Try from last to first
          console.log('CHECKING ORDER ID:', id);
          const testOrder = await orderModel.findById(id);
          console.log('ORDER EXISTS:', !!testOrder);
          if (testOrder) {
            finalOrderId = id;
            break;
          }
        }
      }
    }

    console.log('FINAL ORDER ID:', finalOrderId);

    if (!finalOrderId) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy order hợp lệ' });
    }

    const order = await orderModel.findById(finalOrderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy order' });
    }

    // ✅ Fix finalAmount nếu null/undefined
    if (order.finalAmount === null || order.finalAmount === undefined) {
      order.finalAmount = order.totalAmount - (order.discount || 0);
      await order.save();
      console.log('FIXED finalAmount:', order.finalAmount);
    }

    console.log('ORDER DEBUG:', {
      orderId,
      totalAmount: order.totalAmount,
      discount: order.discount,
      finalAmount: order.finalAmount,
      orderStatus: order.orderStatus
    });

    // ✅ Kiểm tra finalAmount hợp lệ
    console.log('CHECKING finalAmount:', {
      finalAmount: order.finalAmount,
      isNull: order.finalAmount === null,
      isUndefined: order.finalAmount === undefined,
      isNaN: isNaN(order.finalAmount),
      isNegative: order.finalAmount < 0
    });

    // ✅ AMOUNT PHẢI LÀ SỐ NGUYÊN (VNĐ * 100)
    const amount = parseInt(order.finalAmount, 10) * 100;

    // ✅ Nếu finalAmount <= 0 (do voucher giảm 100%), tự động thanh toán
    if (amount <= 0) {
      const orderController = require('./order.controller');
      const result = await orderController.payOrder({
        body: {
          orderId,
          paidAmount: 0,
          paymentMethod: 'Voucher 100%',
          cashier: 'system'
        }
      });

      if (result.success) {
        return res.json({
          success: true,
          message: 'Thanh toán thành công bằng voucher 100%',
          data: result.data
        });
      } else {
        return res.status(400).json({ success: false, message: result.message });
      }
    }


    // ✅ TxnRef phải unique
    const txnRef = `${orderId}_${Date.now()}`;




    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnp_TmnCode,
      vnp_Amount: amount,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh_toan_don_${orderId}`,  // ✅ Không dùng ký tự đặc biệt
      vnp_OrderType: 'billpayment',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: vnp_ReturnUrl,
      vnp_IpAddr: getClientIp(req),  // ✅ Sử dụng IP thực của client
      vnp_CreateDate: formatDate(new Date())
    };

    // ✅ SORT A-Z
    vnp_Params = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = vnp_Params[key];
        return obj;
      }, {});

    // ✅ TẠO CHỮ KÝ (với encodeURIComponent)
    const signData = buildSignData(vnp_Params);

    const secureHash = crypto
      .createHmac('sha512', vnp_HashSecret.trim())
      .update(signData, 'utf8')
      .digest('hex');

    console.log('🔥 CREATE PAYMENT DEBUG:');
    console.log('Amount:', amount);
    console.log('TxnRef:', txnRef);
    console.log('CreateDate:', vnp_Params.vnp_CreateDate);
    console.log('IP Address:', vnp_Params.vnp_IpAddr);
    console.log('SignData:', signData);
    console.log('SecureHash:', secureHash);
    console.log('---');


    vnp_Params.vnp_SecureHash = secureHash

    // ✅ TẠO URL (CÓ encode)
    const paymentUrl = vnp_Url + '?' + qs.stringify(vnp_Params, { encode: true });




    return res.json({
      success: true,
      paymentUrl
    });

  } catch (err) {
    console.error('createCardPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * ✅ VNPay RETURN → XÁC NHẬN CHỮ KÝ
 */
exports.vnpayReturn = async (req, res) => {
  try {
    const vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash;

    // ✅ Xóa các field không hash
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // ✅ Sort A-Z
    const sorted = Object.keys(vnpParams).sort().reduce((r, k) => {
      r[k] = vnpParams[k];
      return r;
    }, {});

    // ✅ Tạo lại chữ ký
    const signData = buildSignData(sorted);
    const checkHash = crypto
      .createHmac('sha512', SECRET)
      .update(signData)
      .digest('hex');

    console.log('📝 Return Sign Data:', signData);
    console.log('🔐 VNPay Hash:', secureHash);
    console.log('🔐 Our Hash:', checkHash);

    if (secureHash !== checkHash) {
      return res.send('❌ Chữ ký không hợp lệ');
    }

    if (vnpParams.vnp_ResponseCode !== '00') {
      return res.send(`❌ Thanh toán thất bại - Mã lỗi: ${vnpParams.vnp_ResponseCode}`);
    }

    // ✅ PARSE orderId từ TxnRef
    const orderId = vnpParams.vnp_TxnRef.split('_')[0];
    console.log('✅ Thanh toán thành công cho orderId:', orderId);


    // ✅ GỌI payOrder logic
    const orderController = require('./order.controller');

    await orderController.payOrder(
      {
        body: {
          orderId,
          paidAmount: parseInt(vnpParams.vnp_Amount) / 100,  // ✅ Chia 100 để về VNĐ
          paymentMethod: 'Thẻ ngân hàng',
          cashier: 'vnpay'
        }
      },
      {
        status: () => ({
          json: () => { }
        })
      }
    );

    res.send('✅ Thanh toán thẻ thành công');

  } catch (err) {
    console.error('vnpayReturn error:', err);
    res.send('❌ Lỗi xử lý thanh toán');
  }
};