const AlipaySdk = require('alipay-sdk').AlipaySdk || require('alipay-sdk');
const config = require('./config/alipay');

console.log('AlipaySdk type:', typeof AlipaySdk);
console.log('privateKey length:', config.privateKey.length);
console.log('alipayPublicKey length:', config.alipayPublicKey.length);

const sdk = new AlipaySdk({
  appId: config.appId,
  gateway: config.gateway,
  privateKey: config.privateKey,
  alipayPublicKey: config.alipayPublicKey,
  signType: config.signType
});

sdk.exec('alipay.trade.precreate', {
  bizContent: {
    out_trade_no: 'TEST' + Date.now(),
    total_amount: '0.01',
    subject: '测试'
  }
}).then(result => {
  console.log('成功:', result);
}).catch(err => {
  console.error('错误:', err.message);
  console.error('错误详情:', err);
});