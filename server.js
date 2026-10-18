require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendTelegramOTP, verifyOTP, isEmailRegisteredOnBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' })); // Allow high-resolution ID and Selfie base64 images

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Data Stores
const p2pOrders = [];
const kycRequests = new Map(); // email -> { userEmail, country, city, fullName, idType, idNumber, idFrontImg, selfieImg, status, submittedAt }

const ADMIN_EMAIL = "gemechureta387@gmail.com";

// Admin Verification Middleware
const isSuperAdmin = (req, res, next) => {
  const { adminKey, userEmail } = req.headers;
  if ((adminKey === process.env.ADMIN_SECRET_KEY || adminKey === "GadaaFounder2026") && userEmail === ADMIN_EMAIL) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Restricted exclusively to Super Admin gemechureta387@gmail.com." });
};

// --- OTP AUTHENTICATION APIS ---
app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const result = await sendTelegramOTP(email);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  return res.json({ success: true, message: 'OTP code sent to your @gadaap2p_bot on Telegram!' });
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otpCode } = req.body;

  if (!email || !otpCode) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
  }

  const otpCheck = verifyOTP(email, otpCode);
  if (!otpCheck.valid) {
    return res.status(400).json({ success: false, message: otpCheck.message });
  }

  const isAdminUser = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  return res.json({ success: true, message: 'OTP Verified successfully!', isAdmin: isAdminUser });
});

// --- USER KYC SUBMISSION API ---
app.post('/api/kyc/submit', (req, res) => {
  const { userEmail, country, city, fullName, idType, idNumber, idFrontImg, selfieImg } = req.body;

  if (!userEmail || !country || !city || !fullName || !idNumber || !idFrontImg || !selfieImg) {
    return res.status(400).json({ success: false, message: 'All fields including ID Photo and Live Selfie are required.' });
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
    message: 'Identity Verification submitted successfully! Under review by Super Admin.',
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

// --- EXCLUSIVE SUPER ADMIN APIS (gemechureta387@gmail.com) ---

// 1. Fetch all pending KYC applications
app.get('/api/admin/pending-kyc', isSuperAdmin, (req, res) => {
  const pendingList = Array.from(kycRequests.values()).filter(k => k.status === 'PENDING_ADMIN');
  return res.json({ success: true, pendingKyc: pendingList });
});

// 2. Approve or Reject KYC Action
app.post('/api/admin/verify-kyc-action', isSuperAdmin, (req, res) => {
  const { targetEmail, action } = req.body; // action: 'APPROVE' or 'REJECT'
  const kyc = kycRequests.get(targetEmail.toLowerCase());

  if (!kyc) {
    return res.status(404).json({ success: false, message: 'KYC record not found.' });
  }

  if (action === 'APPROVE') {
    kyc.status = 'VERIFIED';
    return res.json({ success: true, message: `KYC for ${targetEmail} approved successfully!` });
  } else if (action === 'REJECT') {
    kyc.status = 'REJECTED';
    return res.json({ success: true, message: `KYC for ${targetEmail} rejected!` });
  }

  return res.status(400).json({ success: false, message: 'Invalid action.' });
});

// --- P2P TRADING APIS ---
app.get('/api/p2p/orders', (req, res) => res.json({ success: true, orders: p2pOrders }));

app.post('/api/p2p/create-order', (req, res) => {
  const { merchantEmail, type, price, amount, paymentMethod } = req.body;

  const kyc = kycRequests.get(merchantEmail.toLowerCase());
  if (!kyc || kyc.status !== 'VERIFIED') {
    return res.status(403).json({ 
      success: false, 
      message: 'KYC Verification Required: Your ID and Live Selfie must be approved by Super Admin before posting orders!' 
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
  return res.json({ success: true, message: 'Live order published successfully!', order: newOrder });
});

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.listen(PORT, () => console.log(`🚀 GadaaP2P Engine running on port ${PORT}`));
