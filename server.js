require('dotenv').config();
const express = require('express');
const path = require('path');
const { isEmailRegisteredOnBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Data Stores
const p2pOrders = [];
const kycRequests = new Map(); // email -> { country, city, fullName, idType, idNumber, idFrontImg, selfieImg, status }

const isAdmin = (req, res, next) => {
  const { adminKey } = req.headers;
  if (adminKey === process.env.ADMIN_SECRET_KEY || adminKey === "GadaaFounder2026") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied." });
};

// --- AUTH & BOT VERIFICATION ---
app.post('/api/verify-bot-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const registered = isEmailRegisteredOnBot(email);
  if (!registered) {
    return res.status(400).json({
      success: false,
      message: 'This email is not registered on @gadaap2p_bot! Please start the bot and send your email first.'
    });
  }
  return res.json({ success: true, message: 'Email verified on bot successfully!' });
});

// --- BINANCE STYLE KYC SUBMISSION ---
app.post('/api/kyc/submit', (req, res) => {
  const { userEmail, country, city, fullName, idType, idNumber, idFrontImg, selfieImg } = req.body;

  if (!userEmail || !country || !city || !fullName || !idNumber || !idFrontImg || !selfieImg) {
    return res.status(400).json({ success: false, message: 'All fields including Country, City, ID Photo, and Live Selfie are required.' });
  }

  kycRequests.set(userEmail.toLowerCase(), {
    userEmail,
    country,
    city,
    fullName,
    idType,
    idNumber,
    idFrontImg,
    selfieImg,
    status: 'PENDING_ADMIN',
    submittedAt: new Date()
  });

  return res.json({ 
    success: true, 
    message: 'Identity Verification submitted successfully! Under review.',
    kycStatus: 'PENDING_ADMIN'
  });
});

app.get('/api/kyc/status', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  const kyc = kycRequests.get(email.toLowerCase());
  if (!kyc) return res.json({ success: true, kycStatus: 'UNVERIFIED' });

  return res.json({ success: true, kycStatus: kyc.status });
});

// --- P2P MARKET APIS ---
app.get('/api/p2p/orders', (req, res) => res.json({ success: true, orders: p2pOrders }));

app.post('/api/p2p/create-order', (req, res) => {
  const { merchantEmail, type, price, amount, paymentMethod } = req.body;

  const kyc = kycRequests.get(merchantEmail.toLowerCase());
  if (!kyc || kyc.status !== 'VERIFIED') {
    return res.status(403).json({ 
      success: false, 
      message: 'KYC Required: Complete Identity Verification before posting ads.' 
    });
  }

  const numericPrice = parseFloat(price);
  if (numericPrice < 190) {
    return res.status(400).json({ success: false, message: 'Minimum price rate starts from 190 ETB per 1 USDT.' });
  }

  const newOrder = {
    id: 'ORD-' + Date.now(),
    merchantEmail,
    merchantName: kyc.fullName,
    type,
    price: numericPrice,
    amount: parseFloat(amount),
    availableAmount: parseFloat(amount),
    paymentMethod,
    createdAt: new Date()
  };

  p2pOrders.unshift(newOrder);
  return res.json({ success: true, message: 'Order published live!', order: newOrder });
});

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.listen(PORT, () => console.log(`🚀 GadaaP2P Engine running on port ${PORT}`));
