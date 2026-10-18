require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendTelegramOTP, isEmailRegisteredOnBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Real Data Stores
const p2pOrders = [];
const kycRequests = new Map(); // email -> { userEmail, fullName, idType, idNumber, idFrontImg, selfieImg, status }

// Admin Verification Middleware
const isAdmin = (req, res, next) => {
  const { adminKey } = req.headers;
  if (adminKey === process.env.ADMIN_SECRET_KEY || adminKey === "GadaaFounder2026") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Founder privileges required." });
};

// --- BOT & AUTH APIS ---
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

// --- USER KYC SUBMISSION API ---
app.post('/api/kyc/submit', (req, res) => {
  const { userEmail, fullName, idType, idNumber, idFrontImg, selfieImg } = req.body;

  if (!userEmail || !fullName || !idNumber || !idFrontImg || !selfieImg) {
    return res.status(400).json({ success: false, message: 'All KYC fields including ID photo and live selfie are required.' });
  }

  // Save with PENDING_ADMIN status so Founder can manually review
  kycRequests.set(userEmail.toLowerCase(), {
    userEmail,
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
    message: 'KYC & Live Selfie submitted successfully! Pending Founder/Admin manual approval.',
    kycStatus: 'PENDING_ADMIN'
  });
});

app.get('/api/kyc/status', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  const kyc = kycRequests.get(email.toLowerCase());
  if (!kyc) {
    return res.json({ success: true, kycStatus: 'NOT_SUBMITTED' });
  }

  return res.json({ success: true, kycStatus: kyc.status });
});

// --- FOUNDER ADMIN KYC MANAGEMENT APIS ---

// 1. Get All Pending KYC Submissions for Founder Review
app.get('/api/admin/pending-kyc', isAdmin, (req, res) => {
  const pendingList = Array.from(kycRequests.values()).filter(k => k.status === 'PENDING_ADMIN');
  return res.json({ success: true, pendingKyc: pendingList });
});

// 2. Founder Manual Approve or Reject Action
app.post('/api/admin/verify-kyc-action', isAdmin, (req, res) => {
  const { userEmail, action } = req.body; // action: 'APPROVE' or 'REJECT'
  const kyc = kycRequests.get(userEmail.toLowerCase());

  if (!kyc) {
    return res.status(404).json({ success: false, message: 'KYC request not found' });
  }

  if (action === 'APPROVE') {
    kyc.status = 'VERIFIED';
    return res.json({ success: true, message: `User ${userEmail} KYC approved successfully!` });
  } else if (action === 'REJECT') {
    kyc.status = 'REJECTED';
    return res.json({ success: true, message: `User ${userEmail} KYC rejected!` });
  }

  return res.status(400).json({ success: false, message: 'Invalid action' });
});

// --- REAL P2P ORDERS APIS ---
app.get('/api/p2p/orders', (req, res) => {
  return res.json({ success: true, orders: p2pOrders });
});

app.post('/api/p2p/create-order', (req, res) => {
  const { merchantEmail, type, price, amount, paymentMethod } = req.body;

  const kyc = kycRequests.get(merchantEmail.toLowerCase());
  if (!kyc || kyc.status !== 'VERIFIED') {
    return res.status(403).json({ 
      success: false, 
      message: 'KYC Required: Your KYC is not verified by Founder yet. Please wait for Admin approval!' 
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
  return res.json({ success: true, message: 'Real P2P Order published live!', order: newOrder });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 GadaaP2P Engine running with Founder Manual Verification on port ${PORT}`);
});
