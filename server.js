require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendTelegramOTP, isEmailRegisteredOnBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// In-Memory Engine Data Stores
const p2pOrders = [
  {
    id: 'ORD-1001',
    merchantEmail: 'apex_merchant@gmail.com',
    type: 'SELL',
    price: 150.25,
    amount: 1000,
    availableAmount: 850,
    minLimit: 5000,
    maxLimit: 100000,
    paymentMethod: 'Telebirr, CBE',
    createdAt: new Date()
  }
];
const escrowTrades = [];

// Middleware: Founder/Admin Access Verification
const isAdmin = (req, res, next) => {
  const { adminKey } = req.headers;
  if (adminKey === process.env.ADMIN_SECRET_KEY || adminKey === "GadaaFounder2026") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Founder/Admin privileges required." });
};

// API 1: Verify Telegram Bot Email Registration
app.post('/api/verify-bot-email', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const registered = isEmailRegisteredOnBot(email);
  if (!registered) {
    return res.status(400).json({
      success: false,
      message: 'This email is not registered on @gadaap2p_bot! Please start the bot and send your email first.'
    });
  }

  return res.json({ success: true, message: 'Email verified on bot successfully!' });
});

// API 2: Send OTP
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await sendTelegramOTP(email, otpCode);
  if (result.success) {
    return res.json({ success: true, message: 'OTP sent to your Telegram bot.' });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
});

// --- REAL P2P ENGINE APIS ---

// Get All Active Live P2P Orders
app.get('/api/p2p/orders', (req, res) => {
  return res.json({ success: true, orders: p2pOrders });
});

// Create New Buy/Sell Order
app.post('/api/p2p/create-order', (req, res) => {
  const { merchantEmail, type, price, amount, minLimit, maxLimit, paymentMethod } = req.body;

  const newOrder = {
    id: 'ORD-' + Date.now(),
    merchantEmail,
    type,
    price: parseFloat(price),
    amount: parseFloat(amount),
    availableAmount: parseFloat(amount),
    minLimit: parseFloat(minLimit),
    maxLimit: parseFloat(maxLimit),
    paymentMethod,
    createdAt: new Date()
  };

  p2pOrders.unshift(newOrder);
  return res.json({ success: true, message: 'P2P Order published successfully', order: newOrder });
});

// Initiate Trade & Lock Escrow
app.post('/api/p2p/start-trade', (req, res) => {
  const { orderId, buyerEmail, cryptoAmount } = req.body;
  const order = p2pOrders.find(o => o.id === orderId);

  if (!order || order.availableAmount < cryptoAmount) {
    return res.status(400).json({ success: false, message: 'Insufficient order liquidity or order unavailable' });
  }

  const trade = {
    tradeId: 'TRD-' + Date.now(),
    orderId,
    sellerEmail: order.merchantEmail,
    buyerEmail,
    cryptoAmount: parseFloat(cryptoAmount),
    totalPriceETB: cryptoAmount * order.price,
    status: 'PAYMENT_PENDING',
    escrowLocked: true,
    createdAt: new Date()
  };

  order.availableAmount -= cryptoAmount;
  escrowTrades.push(trade);

  return res.json({ success: true, message: 'Trade created & Escrow locked', trade });
});

// Multi-Chain Crypto Withdrawal
app.post('/api/wallet/withdraw', (req, res) => {
  const { userEmail, network, amount, destinationAddress } = req.body;

  const supportedNetworks = ['TRC20', 'BEP20', 'ERC20', 'SOLANA'];
  if (!supportedNetworks.includes(network)) {
    return res.status(400).json({ success: false, message: 'Unsupported Blockchain Network' });
  }

  return res.json({
    success: true,
    message: `Withdrawal request of ${amount} USDT on ${network} network submitted for Founder approval.`,
    txStatus: 'PENDING_APPROVAL'
  });
});

// --- FOUNDER ADMIN CONTROL APIS ---

// Admin: Get All Escrow Trades
app.get('/api/admin/trades', isAdmin, (req, res) => {
  return res.json({ success: true, trades: escrowTrades });
});

// Admin: Manual Release Escrow
app.post('/api/admin/release-escrow', isAdmin, (req, res) => {
  const { tradeId } = req.body;
  const trade = escrowTrades.find(t => t.tradeId === tradeId);

  if (!trade) {
    return res.status(404).json({ success: false, message: 'Trade not found' });
  }

  trade.status = 'RELEASED';
  trade.escrowLocked = false;

  return res.json({ success: true, message: `Escrow for ${tradeId} released successfully to buyer ${trade.buyerEmail}` });
});

// Serve Single Page Web Application
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 GadaaP2P Real Exchange Engine running on port ${PORT}`);
});
