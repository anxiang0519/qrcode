const fs = require('fs');
const path = require('path');

module.exports = {
    // 沙箱环境
    appId: '9021000163647890',
    gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',

    // 密钥
    privateKey: fs.readFileSync(path.join(__dirname, '../keys/app-private-key.pem'), 'ascii'),
    //支付宝公钥
    alipayPublicKey:  fs.readFileSync(path.join(__dirname, '../keys/alipay-public-key.pem'), 'ascii'),

    signType: 'RSA2',

    // 回调地址（需用 ngrok 穿透）
    notifyUrl: 'https://chatty-boats-divide.loca.lt/api/pay/notify'
};
//openssl genrsa -out keys/app-private-key.pem 2048
//openssl rsa -in keys/app-private-key.pem -pubout -out keys/app-public-key.pem