const express = require('express');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors());  // 允许跨域
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/alipay', require('./routes/pay'));

// 健康检查
app.get('/', (req, res) => {
  res.json({ msg: '支付宝支付服务运行中' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, msg: '服务器内部错误' });
});

const PORT = process.env.PORT || 6699;

app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 支付服务启动: http://localhost:${PORT}`);
  console.log(`📋 API列表:`);
  console.log(`   POST /api/pay/create  - 创建订单`);
  console.log(`   GET  /api/pay/query    - 查询订单`);
  console.log(`   POST /api/pay/notify   - 支付回调`);
  console.log(`   POST /api/pay/close    - 关闭订单`);
  console.log(`   POST /api/pay/refund   - 申请退款`);
});