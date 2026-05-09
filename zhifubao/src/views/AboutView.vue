<template>
  <div>
    <h2>支付宝扫码支付</h2>
    <canvas ref="qrCanvas"></canvas>
  </div>
</template>

<script>
import QRCode from 'qrcode'

export default {
  name: 'PayPage',
  
  // 注册组件
  components: {
  },
  
  // 数据
  data() {
    return {
      orderNo: '111111111112',
      qrCode: '3213123123213123345345',
      loading: false,
      paid: false,
      countdown: 300,
      timer: null,
      pollTimer: null
    }
  },
  
  // 计算属性
  computed: {
    formatTime() {
      const m = Math.floor(this.countdown / 60)
      const sec = this.countdown % 60
      return `${m}:${sec.toString().padStart(2, '0')}`
    }
  },
  
  // 方法
  methods: {
    // 创建订单
    async createOrder() {
      this.loading = true
      try {
        const res = await fetch('/api/alipay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: '0.01', subject: '测试商品' })
        })
        debugger
        const data = await res.json()
        console.log(1111,data);
        if (data.success) {
          this.orderNo = data.orderNo
          this.qrCode = data.qrCode
          
          // 生成二维码
          await QRCode.toCanvas(this.$refs.qrCanvas, data.qrCode, {
            width: 200,
            margin: 2
          })
          
          this.startPolling()
          this.startCountdown()
        }
      } catch (err) {
        alert('创建订单失败：' + err.message)
      } finally {
        this.loading = false
      }
    },
    
    // 轮询查单
    startPolling() {
      this.pollTimer = setInterval(async () => {
        const res = await fetch(`/api/alipay/query?orderNo=${this.orderNo}`)
        const data = await res.json()
        
        if (data.status === 'TRADE_SUCCESS') {
          this.paid = true
          this.clearAll()
        }
      }, 3000)
    },
    
    // 倒计时
    startCountdown() {
      this.timer = setInterval(() => {
        this.countdown--
        if (this.countdown <= 0) {
          this.clearAll()
        }
      }, 1000)
    },
    
    // 清除定时器
    clearAll() {
      clearInterval(this.timer)
      clearInterval(this.pollTimer)
    },
    
    // 刷新
    refresh() {
      this.clearAll()
      this.countdown = 300
      this.paid = false
      this.createOrder()
    }
  },
  
  // 生命周期钩子
  mounted() {
    this.createOrder()
  },
  
  beforeUnmount() {
    this.clearAll()
  }
}
</script>

<style scoped>
/* 样式 */
</style>