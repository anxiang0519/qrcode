const express = require('express');
const router = express.Router();
const { AlipaySdk } = require('alipay-sdk');
const config = require('../config/alipay');

const alipaySdk = new AlipaySdk({
  appId: config.appId,
  gateway: config.gateway,
  privateKey: config.privateKey,
  alipayPublicKey: config.alipayPublicKey,
  signType: config.signType
});

// 存储订单状态（生产环境用 Redis/数据库）
const orders = new Map();

/**
 * 创建订单 - 生成支付二维码
 * POST /api/pay/create
 */
router.post('/create', async (req, res) => {
    console.log('api create');
  const { amount = '0.01', subject = '测试商品' } = req.body;
  
  // 生成唯一订单号
  const orderNo = `ORDER${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
  
  try {
    const result = await alipaySdk.exec('alipay.trade.precreate', {
      notify_url: config.notifyUrl,
      bizContent: {
        out_trade_no: orderNo,
        total_amount: amount,
        subject: subject,
        timeout_express: '5m'  // 5分钟过期
      }
    });

    console.log('创建订单响应:', result);

    if (result.code === '10000') {
      // 保存订单信息
      orders.set(orderNo, {
        status: 'WAIT_PAY',
        amount: amount,
        subject: subject,
        createTime: new Date()
      });

      res.json({
        success: true,
        orderNo: orderNo,
        qrCode: result.qrCode,      // 二维码内容
        qrCodeUrl: result.qrCode    // 二维码链接
      });
    } else {
      res.json({
        success: false,
        code: result.code,
        msg: result.msg || '创建订单失败'
      });
    }
  } catch (err) {
    console.error('创建订单错误:', err);
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
});

/**
 * 查询订单状态
 * GET /api/pay/query?orderNo=xxx
 */
router.get('/query', async (req, res) => {
  const { orderNo } = req.query;
  
  if (!orderNo) {
    return res.status(400).json({ success: false, msg: '缺少订单号' });
  }

  try {
    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: orderNo
      }
    });

    console.log('查询订单响应:', result);

    // 更新本地订单状态
    const order = orders.get(orderNo);
    if (order) {
      order.status = result.trade_status;
      order.alipayTradeNo = result.trade_no;
    }

    res.json({
      success: true,
      orderNo: orderNo,
      status: result.trade_status,     // WAIT_BUYER_PAY / TRADE_SUCCESS / TRADE_CLOSED
      amount: result.total_amount,
      buyerPayAmount: result.buyer_pay_amount,
      payTime: result.send_pay_date
    });
  } catch (err) {
    console.error('查询订单错误:', err);
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
});

/**
 * 异步通知 - 支付宝回调
 * POST /api/pay/notify
 */
router.post('/notify', async (req, res) => {
  console.log('收到支付宝通知:', req.body);
  
  try {
    // 验证签名
    const sign = req.body.sign;
    const body = { ...req.body };
    delete body.sign;
    
    const verify = alipaySdk.checkNotifySign(req.body);
    
    if (!verify) {
      console.error('签名验证失败');
      return res.send('fail');
    }

    const { out_trade_no, trade_status, trade_no, total_amount } = req.body;

    // 处理支付成功
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      const order = orders.get(out_trade_no);
      if (order) {
        order.status = 'PAID';
        order.alipayTradeNo = trade_no;
        order.payTime = new Date();
        console.log(`订单 ${out_trade_no} 支付成功`);
      }
    }

    // 必须返回 success，否则支付宝会重复通知
    res.send('success');
  } catch (err) {
    console.error('处理通知错误:', err);
    res.send('fail');
  }
});

/**
 * 关闭订单
 * POST /api/pay/close
 */
router.post('/close', async (req, res) => {
  const { orderNo } = req.body;
  
  try {
    const result = await alipaySdk.exec('alipay.trade.close', {
      bizContent: {
        out_trade_no: orderNo
      }
    });

    if (result.code === '10000') {
      const order = orders.get(orderNo);
      if (order) {
        order.status = 'CLOSED';
      }
      res.json({ success: true, msg: '订单已关闭' });
    } else {
      res.json({ success: false, msg: result.msg });
    }
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

/**
 * 申请退款
 * POST /api/pay/refund
 */
router.post('/refund', async (req, res) => {
  const { orderNo, refundAmount, refundReason = '用户申请退款' } = req.body;
  
  const order = orders.get(orderNo);
  if (!order || order.status !== 'PAID') {
    return res.json({ success: false, msg: '订单不存在或未支付' });
  }

  const refundNo = `REFUND${Date.now()}`;

  try {
    const result = await alipaySdk.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: orderNo,
        refund_amount: refundAmount || order.amount,
        out_request_no: refundNo,
        refund_reason: refundReason
      }
    });

    if (result.code === '10000') {
      order.status = 'REFUND';
      order.refundAmount = result.refund_fee;
      res.json({
        success: true,
        refundNo: refundNo,
        refundAmount: result.refund_fee
      });
    } else {
      res.json({ success: false, msg: result.msg });
    }
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;