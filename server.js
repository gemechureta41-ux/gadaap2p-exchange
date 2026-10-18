require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendOTPNotification, sendSupportAlert } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Request OTP Code
app.post('/api/request-otp', async (req, res) => {
  const { telegramId, type } = req.body;
  
  if (!telegramId) {
    return res.status(400).json({ success: false, message: 'Telegram ID is required' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const result = await sendOTPNotification(telegramId, otpCode, type || 'REGISTER');

  if (result.success) {
    return res.json({ success: true, message: 'OTP code sent via @gadaap2p_bot' });
  } else {
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Make sure you started @gadaap2p_bot' });
  }
});

// API: Submit Support Ticket
app.post('/api/support-ticket', async (req, res) => {
  const { userId, category, orderId, description } = req.body;
  await sendSupportAlert({ userId, category, orderId, description });
  return res.json({ success: true, message: 'Support ticket submitted successfully' });
});

// Serve Frontend Dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 GadaaP2P Exchange Server running on port ${PORT}`);
});
