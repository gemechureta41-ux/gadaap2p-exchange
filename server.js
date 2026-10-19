require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendTelegramOTP, verifyOTP, isEmailRegisteredOnBot } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

const p2pOrders = [];
const kycRequests = new Map();

const ADMIN_EMAIL = "gemechureta387@gmail.com";

const isSuperAdmin = (req, res, next) => {
  const { adminKey, userEmail } = req.headers;
  if ((adminKey === process.env.ADMIN_SECRET_KEY || adminKey === "GadaaFounder2026") && userEmail && userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Restricted exclusively to Super Admin gemechureta387@gmail.com." });
};

app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const result = await sendTelegramOTP(email);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: 'OTP code sent to your @gadaap2p_bot on Telegram!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const otpCheck = verifyOTP(email, otpCode);
    if (!otpCheck.valid) {
      return res.status(400).json({ success: false, message: otpCheck.message });
    }

    const isAdminUser = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    return res.json({ success: true, message: 'OTP Verified successfully!', isAdmin: isAdminUser });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

app.post('/api/kyc/submit', (req, res) => {
  try {
    const { userEmail, country, city, fullName, idType, idNumber, idFrontImg, idBackImg, selfieImg } = req.body;

    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'User session invalid. Please log in again.' });
    }

    if (!country || !city || !fullName || !idNumber) {
      return res.status(400).json({ success: false, message: 'Please fill in all required personal and document details.' });
    }

    if (!idFrontImg || !idBackImg || !selfieImg) {
      return res.status(400).json({ 
        success: false, 
        message: 'Strict KYC Required: You must upload ID Front, ID Back, and a clear Live Selfie photo!' 
      });
    }

    kycRequests.set(userEmail.toLowerCase(), {
      userEmail,
      country,
      city,
      fullName,
      idType,
      idNumber,
      idFrontImg,
      idBackImg,
      selfieImg,
      status: 'PENDING_ADMIN',
      submittedAt: new Date()
    });

    return res.json({ 
      success: true, 
      message: 'KYC documents submitted successfully! Under strict review by Super Admin.',
      kycStatus: 'PENDING_ADMIN'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to process KYC submission: ' + err.message });
  }
});

app.get('/api/kyc/status', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return res.json({ success: true, kycStatus: 'VERIFIED' });
  }

  const kyc = kycRequests.get(email.toLowerCase());
  if (!kyc) return res.json({ success: true, kycStatus: 'UNVERIFIED' });

  return res.json({ success: true, kycStatus: kyc.status });
});

app.get('/api/admin/pending-kyc', isSuperAdmin, (req, res) => {
  const pendingList = Array.from(kycRequests.values()).filter(k => k.status === 'PENDING_ADMIN');
  return res.json({ success: true, pendingKyc: pendingList });
});

app.post('/api/admin/verify-kyc-action', isSuperAdmin, (req, res) => {
  const { targetEmail, action } = req.body;
  const kyc = kycRequests.get(targetEmail.toLowerCase());

  if (!kyc) {
    return res.status(404).json({ success: false, message: 'KYC record not found.' });
  }

  if (action === 'APPROVE') {
    kyc.status = 'VERIFIED';
    return res.json({ success: true, message: `KYC for ${targetEmail} approved successfully!` });
  } else if (action === 'REJECT') {
    kyc.status = 'REJECTED';
    return res.json({ success: true, message: `KYC for ${targetEmail} rejected due to invalid documents!` });
  }

  return res.status(400).json({ success: false, message: 'Invalid action.' });
});

app.get('/api/p2p/orders', (req, res) => res.json({ success: true, orders: p2pOrders }));

app.post('/api/p2p/create-order', (req, res) => {
  const { merchantEmail, type, price, amount, paymentMethod } = req.body;

  const isSuperAdminUser = (merchantEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const kyc = kycRequests.get(merchantEmail.toLowerCase());

  if (!isSuperAdminUser && (!kyc || kyc.status !== 'VERIFIED')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access Denied: You must complete and pass full KYC (ID Front, ID Back & Selfie) verified by Super Admin before you can Buy, Sell, or Post orders!' 
    });
  }

  const numericPrice = parseFloat(price);
  if (numericPrice < 190) {
    return res.status(400).json({ success: false, message: 'Minimum price rate starts from 190 ETB per 1 USDT.' });
  }

  const merchantName = isSuperAdminUser ? "Gadaa Owner (Super Admin)" : kyc.fullName;

  const newOrder = {
    id: 'ORD-' + Date.now(),
    merchantEmail,
    merchantName,
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
