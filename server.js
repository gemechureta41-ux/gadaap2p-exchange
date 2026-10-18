require('dotenv').config();
const express = require('express');
const path = require('path');
const { sendTelegramOTP, isEmailRegisteredOnBot, verifyOTP } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Render static file fix
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// API 1: Verify Bot Email Registration
app.post('/api/verify-bot-email', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email barbaachisaadha' });
  }

  const registered = isEmailRegisteredOnBot(email);
  if (!registered) {
    return res.status(400).json({
      success: false,
      message: 'Email kun @gadaap2p_bot irratti hin galmeeffamne! Dursa Bot start godhii Email kee ergi.'
    });
  }

  return res.json({ success: true, message: 'Email Bot irratti mirkanaa\'eera!' });
});

// API 2: Send OTP
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await sendTelegramOTP(email, otpCode);
  if (result.success) {
    return res.json({ success: true, message: 'OTP gara Bot keetiif ergameera.' });
  } else {
    return res.status(400).json({ success: false, message: result.message });
  }
});

// Serve frontend for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 GadaaP2P Exchange Server running on port ${PORT}`);
});
