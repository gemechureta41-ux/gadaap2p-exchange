require('dotenv').config();
const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing in environment variables.");
}

const bot = new Telegraf(BOT_TOKEN);

// Persistent Maps
const userStore = new Map(); // email -> chatId
const otpStore = new Map();  // email -> { otp, expires }

// Always register Super Admin
const SUPER_ADMIN_EMAIL = "gemechureta387@gmail.com";

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  ctx.reply(
    `👋 **Welcome to GadaaP2P Verification Bot!**\n\n` +
    `Please send your email address (e.g. example@gmail.com) to link your Telegram account for OTP login authentication.`
  );
});

bot.on('text', (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  if (text.includes('@') && text.includes('.')) {
    const email = text.toLowerCase();
    userStore.set(email, chatId);

    ctx.reply(
      `✅ **Email Registered Successfully!**\n\n` +
      `Your email \`\${email}\` is now linked with @gadaap2p_bot.\n` +
      `You can now go back to the GadaaP2P Web app and click "Send OTP".`
    );
  } else if (!text.startsWith('/')) {
    ctx.reply(`⚠️ Please send a valid email address (e.g. name@gmail.com).`);
  }
});

async function sendTelegramOTP(email) {
  const cleanEmail = email.toLowerCase();
  
  // Auto-fallback check
  let chatId = userStore.get(cleanEmail);

  if (!chatId && cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    // If Admin email is checked, fallback search or store
    chatId = Array.from(userStore.values())[0]; 
  }

  if (!chatId) {
    return { 
      success: false, 
      message: `This email (${cleanEmail}) is not registered on @gadaap2p_bot! Please start the bot and send your email address first.` 
    };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpStore.set(cleanEmail, { otp, expires });

  try {
    await bot.telegram.sendMessage(
      chatId,
      `🔐 **GadaaP2P Verification Code**\n\n` +
      `Your 6-digit OTP login code is: **${otp}**\n\n` +
      `This code will expire in 5 minutes. Do not share it with anyone!`
    );
    return { success: true, message: 'OTP sent to Telegram!' };
  } catch (err) {
    console.error('Failed to send Telegram message:', err.message);
    return { success: false, message: 'Failed to send OTP message via Telegram Bot. Make sure you started @gadaap2p_bot.' };
  }
}

function verifyOTP(email, inputOtp) {
  const cleanEmail = email.toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record) {
    return { valid: false, message: 'OTP expired or not requested. Please request a new code.' };
  }

  if (Date.now() > record.expires) {
    otpStore.delete(cleanEmail);
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (record.otp === inputOtp.trim()) {
    otpStore.delete(cleanEmail); // Single use
    return { valid: true };
  }

  return { valid: false, message: 'Invalid OTP code. Please check Telegram and try again.' };
}

function isEmailRegisteredOnBot(email) {
  const cleanEmail = email.toLowerCase();
  if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  return userStore.has(cleanEmail);
}

bot.launch().then(() => console.log('🤖 Telegram OTP Bot @gadaap2p_bot is running...')).catch(err => console.error('Bot Launch Error:', err));

module.exports = {
  sendTelegramOTP,
  verifyOTP,
  isEmailRegisteredOnBot
};
