// code. by AYESH

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const axios = require('axios');
const FileType = require('file-type');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// Set the path for fluent-ffmpeg to find the ffmpeg executable
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  getContentType,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
  downloadContentFromMessage,
  DisconnectReason
} = require('dct-dula-baileys');
const { title } = require('process');

// ---------------- CONFIG ----------------

const BOT_NAME_FANCY = '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📍📡';

const config = {
  AUTO_VIEW_STATUS: 'true',
  AUTO_LIKE_STATUS: 'true',
  AUTO_RECORDING: 'false',
  AUTO_LIKE_EMOJI: ['💙', '🩷', '💜', '🤎', '🧡', '🩵', '💛', '🩶', '♥️', '💗', '❤️‍🔥'],
  PREFIX: '.',
  MAX_RETRIES: 3,
  GROUP_INVITE_LINK: 'https://chat.whatsapp.com/Ctlfm8HwU6u9zaDVF00M8K?mode=gi_t',
  RCD_IMAGE_PATH: 'https://files.catbox.moe/fwykff.jpeg',
  NEWSLETTER_JID: '120363424104757487@newsletter',
  OTP_EXPIRY: 300000,
  OWNER_NUMBER: process.env.OWNER_NUMBER || '94705851067',
  CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb7y6JB1yT20bJxMcP45',
  BOT_NAME: '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1🐇📡',
  BOT_VERSION: '2.0.0V',
  OWNER_NAME: '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1🐇📡',
  IMAGE_PATH: 'https://files.catbox.moe/5ncuwv.jpeg',
  BOT_FOOTER: '> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 🐇📡.*',
  BUTTON_IMAGES: { ALIVE: 'https://files.catbox.moe/5ncuwv.jpeg' }
};

// ---------------- MONGO SETUP ----------------

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://hirunvikasitha-xmd:hirun12x@cluster0.yx3w1au.mongodb.net/?retryWrites=true&w=majority';
const MONGO_DB = process.env.MONGO_DB || 'Ernnda-DATE';
const apibase = 'https://api.srihub.store'
const apikey = 'dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl'

let mongoClient, mongoDB;
let sessionsCol, numbersCol, adminsCol, newsletterCol, configsCol, newsletterReactsCol;

async function initMongo() {
  try {
    if (mongoClient && mongoClient.topology && mongoClient.topology.isConnected && mongoClient.topology.isConnected()) return;
  } catch (e) { }
  mongoClient = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoClient.connect();
  mongoDB = mongoClient.db(MONGO_DB);

  sessionsCol = mongoDB.collection('sessions');
  numbersCol = mongoDB.collection('numbers');
  adminsCol = mongoDB.collection('admins');
  newsletterCol = mongoDB.collection('newsletter_list');
  configsCol = mongoDB.collection('configs');
  newsletterReactsCol = mongoDB.collection('newsletter_reacts');

  await sessionsCol.createIndex({ number: 1 }, { unique: true });
  await numbersCol.createIndex({ number: 1 }, { unique: true });
  await newsletterCol.createIndex({ jid: 1 }, { unique: true });
  await newsletterReactsCol.createIndex({ jid: 1 }, { unique: true });
  await configsCol.createIndex({ number: 1 }, { unique: true });
  console.log('✅ Mongo initialized and collections ready');
}

// ---------------- Mongo helpers ----------------

async function saveCredsToMongo(number, creds, keys = null) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    const doc = { number: sanitized, creds, keys, updatedAt: new Date() };
    await sessionsCol.updateOne({ number: sanitized }, { $set: doc }, { upsert: true });
    console.log(`Saved creds to Mongo for ${sanitized}`);
  } catch (e) { console.error('saveCredsToMongo error:', e); }
}

async function loadCredsFromMongo(number) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    const doc = await sessionsCol.findOne({ number: sanitized });
    return doc || null;
  } catch (e) { console.error('loadCredsFromMongo error:', e); return null; }
}

async function removeSessionFromMongo(number) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    await sessionsCol.deleteOne({ number: sanitized });
    console.log(`Removed session from Mongo for ${sanitized}`);
  } catch (e) { console.error('removeSessionToMongo error:', e); }
}

async function addNumberToMongo(number) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    await numbersCol.updateOne({ number: sanitized }, { $set: { number: sanitized } }, { upsert: true });
    console.log(`Added number ${sanitized} to Mongo numbers`);
  } catch (e) { console.error('addNumberToMongo', e); }
}

async function removeNumberFromMongo(number) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    await numbersCol.deleteOne({ number: sanitized });
    console.log(`Removed number ${sanitized} from Mongo numbers`);
  } catch (e) { console.error('removeNumberFromMongo', e); }
}

async function getAllNumbersFromMongo() {
  try {
    await initMongo();
    const docs = await numbersCol.find({}).toArray();
    return docs.map(d => d.number);
  } catch (e) { console.error('getAllNumbersFromMongo', e); return []; }
}

async function loadAdminsFromMongo() {
  try {
    await initMongo();
    const docs = await adminsCol.find({}).toArray();
    return docs.map(d => d.jid || d.number).filter(Boolean);
  } catch (e) { console.error('loadAdminsFromMongo', e); return []; }
}

async function addAdminToMongo(jidOrNumber) {
  try {
    await initMongo();
    const doc = { jid: jidOrNumber };
    await adminsCol.updateOne({ jid: jidOrNumber }, { $set: doc }, { upsert: true });
    console.log(`Added admin ${jidOrNumber}`);
  } catch (e) { console.error('addAdminToMongo', e); }
}

async function removeAdminFromMongo(jidOrNumber) {
  try {
    await initMongo();
    await adminsCol.deleteOne({ jid: jidOrNumber });
    console.log(`Removed admin ${jidOrNumber}`);
  } catch (e) { console.error('removeAdminFromMongo', e); }
}

async function addNewsletterToMongo(jid, emojis = []) {
  try {
    await initMongo();
    const doc = { jid, emojis: Array.isArray(emojis) ? emojis : [], addedAt: new Date() };
    await newsletterCol.updateOne({ jid }, { $set: doc }, { upsert: true });
    console.log(`Added newsletter ${jid} -> emojis: ${doc.emojis.join(',')}`);
  } catch (e) { console.error('addNewsletterToMongo', e); throw e; }
}

async function removeNewsletterFromMongo(jid) {
  try {
    await initMongo();
    await newsletterCol.deleteOne({ jid });
    console.log(`Removed newsletter ${jid}`);
  } catch (e) { console.error('removeNewsletterFromMongo', e); throw e; }
}

async function listNewslettersFromMongo() {
  try {
    await initMongo();
    const docs = await newsletterCol.find({}).toArray();
    return docs.map(d => ({ jid: d.jid, emojis: Array.isArray(d.emojis) ? d.emojis : [] }));
  } catch (e) { console.error('listNewslettersFromMongo', e); return []; }
}

async function saveNewsletterReaction(jid, messageId, emoji, sessionNumber) {
  try {
    await initMongo();
    const doc = { jid, messageId, emoji, sessionNumber, ts: new Date() };
    if (!mongoDB) await initMongo();
    const col = mongoDB.collection('newsletter_reactions_log');
    await col.insertOne(doc);
    console.log(`Saved reaction ${emoji} for ${jid}#${messageId}`);
  } catch (e) { console.error('saveNewsletterReaction', e); }
}

async function setUserConfigInMongo(number, conf) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    await configsCol.updateOne({ number: sanitized }, { $set: { number: sanitized, config: conf, updatedAt: new Date() } }, { upsert: true });
  } catch (e) { console.error('setUserConfigInMongo', e); }
}

async function loadUserConfigFromMongo(number) {
  try {
    await initMongo();
    const sanitized = number.replace(/[^0-9]/g, '');
    const doc = await configsCol.findOne({ number: sanitized });
    return doc ? doc.config : null;
  } catch (e) { console.error('loadUserConfigFromMongo', e); return null; }
}

// -------------- newsletter react-config helpers --------------

async function addNewsletterReactConfig(jid, emojis = []) {
  try {
    await initMongo();
    await newsletterReactsCol.updateOne({ jid }, { $set: { jid, emojis, addedAt: new Date() } }, { upsert: true });
    console.log(`Added react-config for ${jid} -> ${emojis.join(',')}`);
  } catch (e) { console.error('addNewsletterReactConfig', e); throw e; }
}

async function removeNewsletterReactConfig(jid) {
  try {
    await initMongo();
    await newsletterReactsCol.deleteOne({ jid });
    console.log(`Removed react-config for ${jid}`);
  } catch (e) { console.error('removeNewsletterReactConfig', e); throw e; }
}

async function listNewsletterReactsFromMongo() {
  try {
    await initMongo();
    const docs = await newsletterReactsCol.find({}).toArray();
    return docs.map(d => ({ jid: d.jid, emojis: Array.isArray(d.emojis) ? d.emojis : [] }));
  } catch (e) { console.error('listNewsletterReactsFromMongo', e); return []; }
}

async function getReactConfigForJid(jid) {
  try {
    await initMongo();
    const doc = await newsletterReactsCol.findOne({ jid });
    return doc ? (Array.isArray(doc.emojis) ? doc.emojis : []) : null;
  } catch (e) { console.error('getReactConfigForJid', e); return null; }
}

// ---------------- basic utils ----------------

function formatMessage(title, content, footer) {
  return `${title}\n\n${content}\n\n> *${footer}*`;
}
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function getSriLankaTimestamp() { return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss'); }

const activeSockets = new Map();

const socketCreationTime = new Map();

const otpStore = new Map();

// ---------------- helpers kept/adapted ----------------

async function joinGroup(socket) {
  let retries = config.MAX_RETRIES;
  const inviteCodeMatch = (config.GROUP_INVITE_LINK || '').match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
  if (!inviteCodeMatch) return { status: 'failed', error: 'No group invite configured' };
  const inviteCode = inviteCodeMatch[1];
  while (retries > 0) {
    try {
      const response = await socket.groupAcceptInvite(inviteCode);
      if (response?.gid) return { status: 'success', gid: response.gid };
      throw new Error('No group ID in response');
    } catch (error) {
      retries--;
      let errorMessage = error.message || 'Unknown error';
      if (error.message && error.message.includes('not-authorized')) errorMessage = 'Bot not authorized';
      else if (error.message && error.message.includes('conflict')) errorMessage = 'Already a member';
      else if (error.message && error.message.includes('gone')) errorMessage = 'Invite invalid/expired';
      if (retries === 0) return { status: 'failed', error: errorMessage };
      await delay(2000 * (config.MAX_RETRIES - retries));
    }
  }
  return { status: 'failed', error: 'Max retries reached' };
}

async function sendAdminConnectMessage(socket, number, groupResult, sessionConfig = {}) {
  const admins = await loadAdminsFromMongo();
  const groupStatus = groupResult.status === 'success' ? `Joined (ID: ${groupResult.gid})` : `Failed to join group: ${groupResult.error}`;
  const botName = sessionConfig.botName || BOT_NAME_FANCY;
  const image = sessionConfig.logo || config.RCD_IMAGE_PATH;
  const caption = formatMessage(botName, `*📞 𝗡ᴜᴍʙᴇʀ:* ${number}\n*🍷 𝗦ᴛᴀᴛᴜꜱ:* ${groupStatus}\n*🕒 𝗖ᴏɴɴᴇᴄᴛᴇᴅ 𝗔ᴛ:* ${getSriLankaTimestamp()}`, botName);
  for (const admin of admins) {
    try {
      const to = admin.includes('@') ? admin : `${admin}@s.whatsapp.net`;
      if (String(image).startsWith('http')) {
        await socket.sendMessage(to, { image: { url: image }, caption });
      } else {
        try {
          const buf = fs.readFileSync(image);
          await socket.sendMessage(to, { image: buf, caption });
        } catch (e) {
          await socket.sendMessage(to, { image: { url: config.RCD_IMAGE_PATH }, caption });
        }
      }
    } catch (err) {
      console.error('Failed to send connect message to admin', admin, err?.message || err);
    }
  }
}

// owner contact massage 🥷🍷
async function sendOwnerConnectMessage(socket, number, groupResult, sessionConfig = {}) {
  try {
    const ownerJid = `${config.WELCOME_OWNER.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    const activeCount = activeSockets.size;
    const botName = sessionConfig.botName || BOT_NAME_FANCY;
    const image = sessionConfig.logo || config.RCD_IMAGE_PATH;
    const groupStatus = groupResult.status === 'success' ? `Joined (ID: ${groupResult.gid})` : `Failed to join group: ${groupResult.error}`;
    const caption = formatMessage(`*🥷 𝗢ᴡɴᴇʀ 𝗖ᴏɴᴛᴀᴄᴛ: ${botName}*`, `*📞 𝗡ᴜᴍʙᴇʀ:* ${number}\n*🍷 𝗦ᴛᴀᴛᴜꜱ:* ${groupStatus}\n*🕒 𝗖ᴏɴɴᴇᴄᴛᴇᴅ 𝗔ᴛ:* ${getSriLankaTimestamp()}\n\n*🔢 𝗔ᴄᴛɪᴠᴇ 𝗦ᴇꜱꜱɪᴏɴꜱ:* ${activeCount}`, botName);
    if (String(image).startsWith('http')) {
      await socket.sendMessage(ownerJid, { image: { url: image }, caption });
    } else {
      try {
        const buf = fs.readFileSync(image);
        await socket.sendMessage(ownerJid, { image: buf, caption });
      } catch (e) {
        await socket.sendMessage(ownerJid, { image: { url: config.RCD_IMAGE_PATH }, caption });
      }
    }
  } catch (err) { console.error('Failed to send owner connect message:', err); }
}

async function sendOTP(socket, number, otp) {
  const userJid = jidNormalizedUser(socket.user.id);
  const message = formatMessage(`*🔐 𝐎𝚃𝙿 𝐕𝙴𝚁𝙸𝙵𝙸𝙲𝙰𝚃𝙸𝙾𝙽 — ${BOT_NAME_FANCY}*`, `*𝐘𝙾𝚄𝚁 𝐎𝚃𝙿 𝐅𝙾𝚁 𝐂𝙾𝙽𝙵𝙸𝙶 𝐔𝙿𝙳𝙰𝚃𝙴 𝐈𝚂:* *${otp}*\n𝐓𝙷𝙸𝚂 𝐎𝚃𝙿 𝐖𝙸𝙻𝙻 𝐄𝚇𝙿𝙸𝚁𝙴 𝐈𝙽 5 𝐌𝙸𝙽𝚄𝚃𝙴𝚂.\n\n*𝐍𝚄𝙼𝙱𝙴𝚁:* ${number}`, BOT_NAME_FANCY);
  try { await socket.sendMessage(userJid, { text: message }); console.log(`OTP ${otp} sent to ${number}`); }
  catch (error) { console.error(`Failed to send OTP to ${number}:`, error); throw error; }
}

// ---------------- handlers (newsletter + reactions) ----------------

async function setupNewsletterHandlers(socket, sessionNumber) {
  const rrPointers = new Map();

  socket.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message?.key) return;
    const jid = message.key.remoteJid;

    try {
      const followedDocs = await listNewslettersFromMongo(); // array of {jid, emojis}
      const reactConfigs = await listNewsletterReactsFromMongo(); // [{jid, emojis}]
      const reactMap = new Map();
      for (const r of reactConfigs) reactMap.set(r.jid, r.emojis || []);

      const followedJids = followedDocs.map(d => d.jid);
      if (!followedJids.includes(jid) && !reactMap.has(jid)) return;

      let emojis = reactMap.get(jid) || null;
      if ((!emojis || emojis.length === 0) && followedDocs.find(d => d.jid === jid)) {
        emojis = (followedDocs.find(d => d.jid === jid).emojis || []);
      }
      if (!emojis || emojis.length === 0) emojis = config.AUTO_LIKE_EMOJI;

      let idx = rrPointers.get(jid) || 0;
      const emoji = emojis[idx % emojis.length];
      rrPointers.set(jid, (idx + 1) % emojis.length);

      const messageId = message.newsletterServerId || message.key.id;
      if (!messageId) return;

      let retries = 3;
      while (retries-- > 0) {
        try {
          if (typeof socket.newsletterReactMessage === 'function') {
            await socket.newsletterReactMessage(jid, messageId.toString(), emoji);
          } else {
            await socket.sendMessage(jid, { react: { text: emoji, key: message.key } });
          }
          console.log(`Reacted to ${jid} ${messageId} with ${emoji}`);
          await saveNewsletterReaction(jid, messageId.toString(), emoji, sessionNumber || null);
          break;
        } catch (err) {
          console.warn(`Reaction attempt failed (${3 - retries}/3):`, err?.message || err);
          await delay(1200);
        }
      }

    } catch (error) {
      console.error('Newsletter reaction handler error:', error?.message || error);
    }
  });
}


// ---------------- status + revocation + resizing ----------------

async function setupStatusHandlers(socket, sessionNumber) {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant) return;

    try {
      // Load user-specific config from MongoDB
      let userEmojis = config.AUTO_LIKE_EMOJI; // Default emojis
      let autoViewStatus = config.AUTO_VIEW_STATUS; // Default from global config
      let autoLikeStatus = config.AUTO_LIKE_STATUS; // Default from global config
      let autoRecording = config.AUTO_RECORDING; // Default from global config

      if (sessionNumber) {
        const userConfig = await loadUserConfigFromMongo(sessionNumber) || {};

        // Check for emojis in user config
        if (userConfig.AUTO_LIKE_EMOJI && Array.isArray(userConfig.AUTO_LIKE_EMOJI) && userConfig.AUTO_LIKE_EMOJI.length > 0) {
          userEmojis = userConfig.AUTO_LIKE_EMOJI;
        }

        // Check for auto view status in user config
        if (userConfig.AUTO_VIEW_STATUS !== undefined) {
          autoViewStatus = userConfig.AUTO_VIEW_STATUS;
        }

        // Check for auto like status in user config
        if (userConfig.AUTO_LIKE_STATUS !== undefined) {
          autoLikeStatus = userConfig.AUTO_LIKE_STATUS;
        }

        // Check for auto recording in user config
        if (userConfig.AUTO_RECORDING !== undefined) {
          autoRecording = userConfig.AUTO_RECORDING;
        }
      }

      // Use auto recording setting (from user config or global)
      if (autoRecording === 'true') {
        await socket.sendPresenceUpdate("recording", message.key.remoteJid);
      }

      // Use auto view status setting (from user config or global)
      if (autoViewStatus === 'true') {
        let retries = config.MAX_RETRIES;
        while (retries > 0) {
          try {
            await socket.readMessages([message.key]);
            break;
          } catch (error) {
            retries--;
            await delay(1000 * (config.MAX_RETRIES - retries));
            if (retries === 0) throw error;
          }
        }
      }

      // Use auto like status setting (from user config or global)
      if (autoLikeStatus === 'true') {
        const randomEmoji = userEmojis[Math.floor(Math.random() * userEmojis.length)];
        let retries = config.MAX_RETRIES;
        while (retries > 0) {
          try {
            await socket.sendMessage(message.key.remoteJid, {
              react: { text: randomEmoji, key: message.key }
            }, { statusJidList: [message.key.participant] });
            break;
          } catch (error) {
            retries--;
            await delay(1000 * (config.MAX_RETRIES - retries));
            if (retries === 0) throw error;
          }
        }
      }

    } catch (error) {
      console.error('Status handler error:', error);
    }
  });
}


async function handleMessageRevocation(socket, number) {
  socket.ev.on('messages.delete', async ({ keys }) => {
    if (!keys || keys.length === 0) return;
    const messageKey = keys[0];
    const userJid = jidNormalizedUser(socket.user.id);
    const deletionTime = getSriLankaTimestamp();
    const message = formatMessage('*🗑️ 𝗠ᴇꜱꜱᴀɢᴇ 𝗗ᴇʟᴇᴛᴇᴅ*', `A message was deleted from your chat.\n*📋 𝗙ʀᴏᴍ:* ${messageKey.remoteJid}\n*🍷 𝗗ᴇʟᴇᴛɪᴏɴ 𝗧ɪᴍᴇ:* ${deletionTime}`, BOT_NAME_FANCY);
    try { await socket.sendMessage(userJid, { image: { url: config.RCD_IMAGE_PATH }, caption: message }); }
    catch (error) { console.error('Failed to send deletion notification:', error); }
  });
}


async function resize(image, width, height) {
  let oyy = await Jimp.read(image);
  return await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
}


// ---------------- command handlers ----------------

function setupCommandHandlers(socket, number) {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

    const type = getContentType(msg.message);
    if (!msg.message) return;
    msg.message = (getContentType(msg.message) === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;

    const from = msg.key.remoteJid;
    const sender = from;
    const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net' || socket.user.id) : (msg.key.participant || msg.key.remoteJid);
    const senderNumber = (nowsender || '').split('@')[0];
    const developers = `${config.OWNER_NUMBER}`;
    const botNumber = socket.user.id.split(':')[0];
    const isbot = botNumber.includes(senderNumber);
    const isOwner = isbot ? isbot : developers.includes(senderNumber);
    const isGroup = from.endsWith("@g.us");


    let body = (type === 'conversation') ? msg.message.conversation
      : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage')
        ? msg.message.extendedTextMessage.text
        : (type == 'interactiveResponseMessage')
          ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage
          && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id
          : (type == 'templateButtonReplyMessage')
            ? msg.message.templateButtonReplyMessage?.selectedId
            : (type === 'extendedTextMessage')
              ? msg.message.extendedTextMessage.text
              : (type == 'imageMessage') && msg.message.imageMessage.caption
                ? msg.message.imageMessage.caption
                : (type == 'videoMessage') && msg.message.videoMessage.caption
                  ? msg.message.videoMessage.caption
                  : (type == 'buttonsResponseMessage')
                    ? msg.message.buttonsResponseMessage?.selectedButtonId
                    : (type == 'listResponseMessage')
                      ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId
                      : (type == 'messageContextInfo')
                        ? (msg.message.buttonsResponseMessage?.selectedButtonId
                          || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId
                          || msg.text)
                        : (type === 'viewOnceMessage')
                          ? msg.message[type]?.message[getContentType(msg.message[type].message)]
                          : (type === "viewOnceMessageV2")
                            ? (msg.msg.message.imageMessage?.caption || msg.msg.message.videoMessage?.caption || "")
                            : '';
    body = String(body || '');

    if (!body || typeof body !== 'string') return;

    const prefix = config.PREFIX;
    const isCmd = body && body.startsWith && body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : null;
    const args = body.trim().split(/ +/).slice(1);

    // helper: download quoted media into buffer
    async function downloadQuotedMedia(quoted) {
      if (!quoted) return null;
      const qTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
      const qType = qTypes.find(t => quoted[t]);
      if (!qType) return null;
      const messageType = qType.replace(/Message$/i, '').toLowerCase();
      const stream = await downloadContentFromMessage(quoted[qType], messageType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      return {
        buffer,
        mime: quoted[qType].mimetype || '',
        caption: quoted[qType].caption || quoted[qType].fileName || '',
        ptt: quoted[qType].ptt || false,
        fileName: quoted[qType].fileName || ''
      };
    }

    if (!command) return;

    try {

      // Load user config for work type restrictions
      const sanitized = (number || '').replace(/[^0-9]/g, '');
      const userConfig = await loadUserConfigFromMongo(sanitized) || {};

      // ========== ADD WORK TYPE RESTRICTIONS HERE ==========
      // Apply work type restrictions for non-owner users
      if (!isOwner) {
        // Get work type from user config or fallback to global config
        const workType = userConfig.WORK_TYPE || 'public'; // Default to public if not set

        // If work type is "private", only owner can use commands
        if (workType === "private") {
          console.log(`Command blocked: WORK_TYPE is private for ${sanitized}`);
          return;
        }

        // If work type is "inbox", block commands in groups
        if (isGroup && workType === "inbox") {
          console.log(`Command blocked: WORK_TYPE is inbox but message is from group for ${sanitized}`);
          return;
        }

        // If work type is "groups", block commands in private chats
        if (!isGroup && workType === "groups") {
          console.log(`Command blocked: WORK_TYPE is groups but message is from private chat for ${sanitized}`);
          return;
        }

        // If work type is "public", allow all (no restrictions needed)
      }
      // ========== END WORK TYPE RESTRICTIONS ==========


      switch (command) {
        // --- existing commands (deletemenumber, unfollow, newslist, admin commands etc.) ---
        // ... (keep existing other case handlers unchanged) ...
		case 'xnxx': {
    try {
        const query = args.join(' ');
        const sanitized = (sender || '').replace(/[^0-9]/g, '');
        let cfg = typeof loadUserConfigFromMongo === 'function' ? await loadUserConfigFromMongo(sanitized) : {};
        let botName = cfg.botName || '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📍📡';

        // --- UI Templates ---
        const uiTitle = "𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📡";
        const footer = `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 📍📡*`;

        if (!query) {
            return await socket.sendMessage(sender, {
                text: `╭───  *⚠️ SYSTEM NOTICE* ───╼\n│\n│ 📍 *Usage:* .xnxx <query/url>\n│ ⚡ *Example:* .xnxx sri lanka\n│\n╰───────────────╼`
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

        // --- බාගත කිරීමේ List එක යවන Function එක (Case එක ඇතුළේ) ---
        const sendDownloadMenu = async (vUrl, vTitle, quoted) => {
            const sections = [{
                title: "💿 ASSET RECOVERY",
                rows: [
                    { title: "🎬 VIDEO (MP4)", rowId: `dl_1|${vUrl}`, description: "High Quality Stream" },
                    { title: "🎵 AUDIO (MP3)", rowId: `dl_2|${vUrl}`, description: "Audio Extraction" },
                    { title: "📂 DOCUMENT", rowId: `dl_3|${vUrl}`, description: "Binary File Format" }
                ]
            }];

            const dlList = {
                text: `\n📦 *CONTENT IDENTIFIED*\n\n📌 *Title:* ${vTitle}\n\nSelect the transmission format below:`,
                footer: footer,
                title: uiTitle,
                buttonText: "📥 DOWNLOAD",
                sections
            };

            const sentDl = await socket.sendMessage(sender, dlList, { quoted: quoted });

            // බාගත කිරීමේ තේරීම සඳහා Listener එක
            const dlListener = async ({ messages }) => {
                const r = messages[0];
                if (!r.message || r.key.remoteJid !== sender) return;
                const selId = r.message.listResponseMessage?.singleSelectReply?.selectedRowId;
                const isReply = r.message.listResponseMessage?.contextInfo?.stanzaId === sentDl.key.id;

                if (isReply && selId?.startsWith('dl_')) {
                    socket.ev.off('messages.upsert', dlListener);
                    const [_, format, targetUrl] = selId.split('|');
                    await socket.sendMessage(sender, { react: { text: '⏳', key: r.key } });

                    try {
                        let { data: dlData } = await axios.get(`https://18-apis.vercel.app/api/adult/xnxx/dl?url=${encodeURIComponent(targetUrl)}`);
                        const finalUrl = dlData.download_url || dlData.direct_link;

                        if (format === '1') await socket.sendMessage(sender, { video: { url: finalUrl }, caption: `✅ *COMPLETED:* ${vTitle}` }, { quoted: r });
                        else if (format === '2') await socket.sendMessage(sender, { audio: { url: finalUrl }, mimetype: 'audio/mpeg' }, { quoted: r });
                        else if (format === '3') await socket.sendMessage(sender, { document: { url: finalUrl }, mimetype: 'video/mp4', fileName: `${vTitle}.mp4` }, { quoted: r });

                        await socket.sendMessage(sender, { react: { text: '✅', key: r.key } });
                    } catch {
                        await socket.sendMessage(sender, { text: '❌ *Download error.*' }, { quoted: r });
                    }
                }
            };
            socket.ev.on('messages.upsert', dlListener);
            setTimeout(() => socket.ev.off('messages.upsert', dlListener), 300000);
        };

        // --- සෙවුම් ක්‍රියාවලිය (Search / URL Check) ---
        if (query.includes('xnxx.com/video-')) {
            return await sendDownloadMenu(query.trim(), "XNXX Content", msg);
        }

        let { data: searchData } = await axios.get(`https://18-apis.vercel.app/api/adult/xnxx/search?q=${encodeURIComponent(query)}&page=1`);
        if (!searchData.success || !searchData.results?.length) return await socket.sendMessage(sender, { text: '❌ *No results found.*' });

        const results = searchData.results.slice(0, 15);
        const rows = results.map((res, i) => ({
            title: `${i + 1}. ${res.title.substring(0, 35)}...`,
            rowId: `sel_${i}`,
            description: `🕒 Duration: ${res.duration || 'N/A'}`
        }));

        const searchList = {
            text: `\n🧬 *DATABASE SCAN COMPLETE*\n\nQuery: "${query}"\n\nChoose a file to proceed:`,
            footer: footer,
            title: uiTitle,
            buttonText: "🔎 VIEW RESULTS",
            sections: [{ title: "AVAILABLE STREAMS", rows }]
        };

        const sentSearch = await socket.sendMessage(sender, searchList, { quoted: msg });

        // සෙවුම් ප්‍රතිඵල තේරීම සඳහා Listener එක
        const searchListener = async ({ messages }) => {
            const r = messages[0];
            if (!r.message || r.key.remoteJid !== sender) return;
            const selId = r.message.listResponseMessage?.singleSelectReply?.selectedRowId;
            const isReply = r.message.listResponseMessage?.contextInfo?.stanzaId === sentSearch.key.id;

            if (isReply && selId?.startsWith('sel_')) {
                socket.ev.off('messages.upsert', searchListener);
                const index = parseInt(selId.split('_')[1]);
                const selected = results[index];
                await sendDownloadMenu(selected.url, selected.title, r);
            }
        };

        socket.ev.on('messages.upsert', searchListener);
        setTimeout(() => socket.ev.off('messages.upsert', searchListener), 300000);

    } catch (e) {
        console.error(e);
        await socket.sendMessage(sender, { text: '⚠️ *System Failure.*' });
    }
}
break;


case 'font': {
    try {
        const text = args.join(' ').trim();
        if (!text) return await socket.sendMessage(sender, { text: '*✅ කියන දේ අහලා උබට Font එක ලබා ගන්න ඔනේ වචනය දාපන් යකු 😒🙌*' });

        // සෙවුම් ප්‍රතිචාරය (Reaction)
        await socket.sendMessage(sender, { react: { text: '✍️', key: msg.key } });

        // API එකට Request එක යැවීම
        const res = await axios.get(`https://chama-api-hub.vercel.app/api/tools/fancy?apikey=chama_mini_api&text=${encodeURIComponent(text)}`);
        
        if (!res.data || res.data.status !== true) {
            return await socket.sendMessage(sender, { text: '❌ මට සමාවෙන්න, එම පෙළ වෙනස් කිරීමට නොහැකි වුණා.' });
        }

        const styles = res.data.result;
        
        // පණිවිඩය සැකසීම
        let fancyMsg = `*📍 FANCY TEXTER*\n\n`;
        fancyMsg += `*📍 NON FONT* ${text}\n\n`;
        fancyMsg += `*━━━━━━━━━━━━━●►*\n`;

        // ලැබෙන සෑම style එකක්ම ලැයිස්තුවකට එකතු කිරීම
        styles.forEach((style) => {
            fancyMsg += `*├► ${style.name.replace(/_/g, ' ').toUpperCase()}:*\n\`${style.result}\` \n\n`;
        });

        fancyMsg += `*┕━━━━━━━━━━━━━●►*\n\n\n`;
        fancyMsg += `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

        // අවසාන පණිවිඩය යැවීම
        await socket.sendMessage(sender, { text: fancyMsg }, { quoted: msg });

        // සාර්ථක ප්‍රතිචාරය (Reaction)
        await socket.sendMessage(sender, { react: { text: '✔', key: msg.key } });

    } catch (err) {
        console.error(err);
        await socket.sendMessage(sender, { text: `❌ ERROR: ${err.message}` });
    }
}
break;	  


			  

  // 🍷🍷🍷    
case 'menu': {
    try {       
        await socket.sendMessage(sender, { react: { text: "📍", key: msg.key } });

        // --- ⚙️ BOT CONFIGURATION ---
        const BOT_NAME = '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📍📡';
        const OWNER_NAME = '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📍📡';
        const CHANNEL_LINK = "https://whatsapp.com/channel/0029Vb7y6JB1yT20bJxMcP45";
        const MENU_IMG = "https://files.catbox.moe/5ncuwv.jpeg"; 
        // 👇 Video Note URL
        const VIDEO_INTRO = 'https://files.catbox.moe/rdnh0d.mp4'; 
        
        // --- 📅 TIME & GREETING ENGINE ---
        const slNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
        const hour = slNow.getHours();
        const timeStr = slNow.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const dateStr = slNow.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });

        // 🎨 STYLISH GREETING LOGIC
        let greetingText = "";
        if (hour < 5)        greetingText = "🌌 ᴇᴀʀʟʏ ᴍᴏʀɴɪɴɢ";
        else if (hour < 12) greetingText = "🌅 ɢᴏᴏᴅ ᴍᴏʀɴɪɴɢ";
        else if (hour < 18) greetingText = "🌞 ɢᴏᴏᴅ ᴀꜰᴛᴇʀɴᴏᴏɴ";
        else if (hour < 22) greetingText = "🌙 ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ";
        else                greetingText = "🦉 ꜱᴡᴇᴇᴛ ᴅʀᴇᴀᴍꜱ";             
        

        // --- 📊 STATS ---
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const uptime = process.uptime();
        const days = Math.floor(uptime / (24 * 3600));
        const hours = Math.floor((uptime % (24 * 3600)) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const runtime = `${days}D ${hours}H ${minutes}M`;

        // --- 📝 RANDOM QUOTES ---
       const quotes = [
            "Great things never came from comfort zones.",
            "Dream it. Wish it. Do it.",
            "Success is not final, failure is not fatal.",
            "Believe you can and you're halfway there.",
            "Your limitation—it's only your imagination.",
            "Push yourself, because no one else is going to do it for you."
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const userTag = `@${sender.split("@")[0]}`;

       // menu of  first video note 👇 
        await socket.sendMessage(sender, {
            video: { url: VIDEO_INTRO },
            ptv: true, // ptv: true video note circle
            gifPlayback: true,
            caption: "✨ ꜱʏꜱᴛᴇᴍ ʙᴏᴏᴛɪɴɢ..."
        });
        
        const caption = `     
*╭━━〔 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 𝐌𝐄𝐍𝐔 〕━◉◈▻*
*│👋 𝙷𝙴𝙻𝙻𝙾 ${userTag}*
*╰────┈⊷* 

*╭─「 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1-𝐌𝙳 𝐁𝙾𝚃 𝐒ᴛᴀᴛᴜꜱ 」─●●►*
*┃✯╭──────────────┈⊷*
*┃✯┋ 🌏* *\`ɢʀᴇᴇᴛɪɴɢ:\`* *\`${greetingText}\`*
*┃✯┋ 📄* *\`ʙᴏᴛ ɴᴀᴍᴇ:\`* *𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1📍📡*
*┃✯┋ 🥷* *\`ᴏᴡɴᴇʀ :\`* *𝐄𝐫𝐚𝐧𝐧𝐝𝐚📍📡*
*┃✯┋ 💾* *\`ʀᴀᴍ :\`* *\`${ramUsage}MB\`*
*┃✯┋ ⏳* *\`ᴜᴘᴛɪᴍᴇ:\`* *${runtime}*
*┃✯╰────────┈⊷*
 ╰──────────────◉◈▻*

*👋 හායි ${userTag} welcome to 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1ᴠ.2 mini බොට් 𝙼𝙴𝙽𝚄 වෙත ඔබව සාදරයෙන් පිලිගන්නවා...❒*



> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1  📍📡*

*╭━━〔 🔢 𝐍𝐀𝐕𝐈𝐆𝐀𝐓𝐈𝐎𝐍 〕━━╮*
*│ 1️⃣ ─ 📥 Download Cmds*
*│ 2️⃣ ─ 🎨 Tool & AI Cmds*
*│ 3️⃣ ─ ⚙️ System & Other*
*│ 4️⃣ ─ 💓 Alive Status*
*│ 5️⃣ ─ ⚡ Speed Test*
*│ 6️⃣ ─ 👥 Group Commands*
*│ 7️⃣ ─ 👑 Owner Info*
*│ 8️⃣ ─ 🔧 Bot Settings*
*╰━━━━━━━━━━━━━━━━━╯*
> 📲 *Reply with number to navigate!*

        const buttons = [
            {
                buttonId: "menu_list",
                buttonText: { displayText: "📂 𝐎𝐏𝐄𝐍 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify({ title: "𝐕2.0.0 𝐒𝙴𝙻𝙴𝙲𝚃 𝐓𝙴𝙱 𝐌𝙴𝙽𝚄", sections })
                }
            },
            // new buttons create 
        ];

        // --- 📤 SEND AS FAKE DOCUMENT ---
        await socket.sendMessage(sender, {
            document: { url: MENU_IMG },
            mimetype: "application/pdf",
            fileName: `${BOT_NAME} 📂`, 
            pageCount: 9999, 
            fileLength: 99999999999999,
            caption: caption,
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                mentionedJid: [sender],
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: "𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 📍📡",
                    body: `Contact: ${OWNER_NAME}`,
                    thumbnailUrl: MENU_IMG,
                    sourceUrl: CHANNEL_LINK,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

    } catch (e) {
        console.log("❌ Menu Error:", e);
        reply("⚠️ System Error.");
    }
    break;
}

// ==================== DOWNLOAD MENU ====================
case 'download': {
  try { await socket.sendMessage(sender, { react: { text: "📥", key: msg.key } }); } catch(e){}

  try {
    let userCfg = {};
    try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch(e){ userCfg = {}; }
    const title = userCfg.botName || '𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 📍📡';
    
    // 1. GENERATE RANDOM LOGO (Add your URLs here)
    const logos = [
        "https://files.catbox.moe/5ncuwv.jpeg", 
        "https://files.catbox.moe/5ncuwv.jpeg",
        config.LOGO // Fallback to config logo
    ];
    const randomLogo = logos[Math.floor(Math.random() * logos.length)] || logos[0];

    // 2. CREATE FAKE CONTACT (QUOTED)
    const shonux = {
        key: {
            remoteJid: "status@broadcast",
            participant: "0@s.whatsapp.net",
            fromMe: false,
            id: "META_DOWNLOAD_V3"
        },
        message: {
            contactMessage: {
                displayName: "📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐂𝐄𝐍𝐓𝐄𝐑",
                vcard: `BEGIN:VCARD
VERSION:3.0
N:;Downloader;;;
FN:Downloader
ORG:${title}
TITLE:System
END:VCARD`
            }
        }
    };

    const text = `
╭═〔 Dᴏᴡɴʟᴏᴀᴅ Mᴇɴᴜ Lɪꜱᴛ 📍〕═╮
╠═════════════❒
╠•📍${config.PREFIX}song
╠•📍${config.PREFIX}csong
╠•📍${config.PREFIX}gsong
╠•📍${config.PREFIX}cvideo
╠•📍${config.PREFIX}video
╠•📍${config.PREFIX}tiktok
╠•📍${config.PREFIX}fb
╠•📍${config.PREFIX}ig
╠•📍${config.PREFIX}apk
╠•📍${config.PREFIX}apksearch
╠•📍${config.PREFIX}mediafire
╠•📍${config.PREFIX}gdrive
╘════════════❒
`.trim();

    const buttons = [
      { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝐇𝐎𝐌𝐄" }, type: 1 },
      { buttonId: `${config.PREFIX}tool`, buttonText: { displayText: "💜 𝐂𝐑𝐄𝐀𝐓𝐈𝐕𝐄" }, type: 1 }
    ];

    // 3. SEND IMAGE MESSAGE WITH CONTEXT INFO (DOUBLE LOGO)
    await socket.sendMessage(sender, {
      image: { url: randomLogo }, // Main Logo
      caption: text,
      footer: "> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*",
      buttons: buttons,
      contextInfo: {
        externalAdReply: {
          title: "📥 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐌𝐀𝐍𝐀𝐆𝐄𝐑",
          body: title,
          thumbnailUrl: randomLogo, // Second Logo (Thumbnail)
          sourceUrl: "https://chat.whatsapp.com/Ctlfm8HwU6u9zaDVF00M8K?mode=gi_t", // Your Channel Link
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: shonux });

  } catch (err) {
    console.error('download command error:', err);
    try { await socket.sendMessage(sender, { text: '❌ Error loading download menu.' }, { quoted: msg }); } catch(e){}
  }
  break;
}

// ==================== CREATIVE / TOOL MENU ====================
case 'tool': 
case 'creative': {
  try { await socket.sendMessage(sender, { react: { text: "🎨", key: msg.key } }); } catch(e){}

  try {
    let userCfg = {};
    try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch(e){ userCfg = {}; }
    const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
    
    // Random Logo Logic
    const logos = [config.LOGO, "https://files.catbox.moe/5ncuwv.jpeg"]; // Add more
    const randomLogo = logos[Math.floor(Math.random() * logos.length)] || logos[0];

    const shonux = {
        key: {
            remoteJid: "status@broadcast",
            participant: "0@s.whatsapp.net",
            fromMe: false,
            id: "META_CREATIVE_V3"
        },
        message: {
            contactMessage: {
                displayName: "🎨 𝐂𝐑𝐄𝐀𝐓𝐈𝐕𝐄 𝐒𝐓𝐔𝐃𝐈𝐎",
                vcard: `BEGIN:VCARD
VERSION:3.0
N:;Artist;;;
FN:Artist
ORG:${title}
TITLE:Creative
END:VCARD`
            }
        }
    };

    const text = `
╭═〔 Tᴏᴏʟ Mᴇɴᴜ Lɪꜱᴛ 📍〕═╮
╠═════════════❒
╠•📍${config.PREFIX}jid
╠•📍${config.PREFIX}cid
╠•📍${config.PREFIX}system
╠•📍${config.PREFIX}tagall
╠•📍${config.PREFIX}online
╠•📍${config.PREFIX}adanews
╠•📍${config.PREFIX}sirasanews
╠•📍${config.PREFIX}lankadeepanews
╠•📍${config.PREFIX}gagananews
╠•📍${config.PREFIX}block
╠•📍${config.PREFIX}unblock
╠•📍${config.PREFIX}prefix
╠•📍${config.PREFIX}autorecording
╠•📍${config.PREFIX}mread
╠•📍${config.PREFIX}creject
╠•📍${config.PREFIX}wtyp
╠•📍${config.PREFIX}pp
╠•📍${config.PREFIX}arm
╠•📍${config.PREFIX}rstatus
╠•📍${config.PREFIX}botpresence
╠•📍${config.PREFIX}img
╠•📍${config.PREFIX}google
╠•📍${config.PREFIX}ping
╠•📍${config.PREFIX}alive
╚═════════════❒
`.trim();

    const buttons = [
      { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝐌𝐀𝐈𝐍 𝐌𝐄𝐍𝐔" }, type: 1 },
      { buttonId: `${config.PREFIX}download`, buttonText: { displayText: "💜 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒" }, type: 1 }
    ];

    await socket.sendMessage(sender, {
      image: { url: randomLogo },
      caption: text,
      footer: "✨ ᴜɴʟᴇᴀꜱʜ ʏᴏᴜʀ ᴄʀᴇᴀᴛɪᴠɪᴛʏ",
      buttons: buttons,
      contextInfo: {
        externalAdReply: {
          title: "🎨 𝐂𝐑𝐄𝐀𝐓𝐈𝐕𝐄 𝐌𝐎𝐃𝐄",
          body: title,
          thumbnailUrl: randomLogo,
          sourceUrl: "https://whatsapp.com/channel/0029Vb7y6JB1yT20bJxMcP45l",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: shonux });

  } catch (err) {
    console.error('creative command error:', err);
    try { await socket.sendMessage(sender, { text: '❌ Error loading creative menu.' }, { quoted: msg }); } catch(e){}
  }
  break;
}

// ==================== OTHER / SYSTEM MENU ====================
case 'other': {
  try { await socket.sendMessage(sender, { react: { text: "🛠️", key: msg.key } }); } catch(e){}

  try {
    let userCfg = {};
    try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch(e){ userCfg = {}; }
    const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
    
    // Random Logo Logic
    const logos = [config.LOGO, "https://files.catbox.moe/5ncuwv.jpeg"]; // Add more
    const randomLogo = logos[Math.floor(Math.random() * logos.length)] || logos[0];

    const shonux = {
        key: {
            remoteJid: "status@broadcast",
            participant: "0@s.whatsapp.net",
            fromMe: false,
            id: "META_CREATIVE_V3"
        },
        message: {
            contactMessage: {
                displayName: "⚙️ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐂𝐎𝐍𝐓𝐑𝐎𝐋",
                vcard: `BEGIN:VCARD
VERSION:3.0
N:;Artist;;;
FN:Artist
ORG:${title}
TITLE:Creative
END:VCARD`
            }
        }
    };

    const text = `
╭━━━〔 *𝐀𝚁𝙰𝙽𝙽𝙳𝙰-𝐌𝙳 𝐎𝚃𝙷𝙴𝚁* 〕━━━┈⊷
┋ 🔧 *𝐒𝐘𝐒𝐓𝐄𝐌 𝐔𝐓𝐈𝐋𝐈𝐓𝐈𝐄𝐒* 
┋ 𝘮𝘢𝘯𝘢𝘨𝘦 • 𝘤𝘰𝘯𝘵𝘳𝘰𝘭 • 𝘰𝘱𝘵𝘪𝘮𝘪𝘻𝘦
╰━━━━━━━━━━━━━━━━━━┈⊷

╭═〔 ʙᴏᴛ ɪɴꜰᴏ 📍 〕═╮
╠═════════════❒
╠⦁📍*${config.PREFIX}system*  ➣ _Sys Specs_
╠⦁📍*${config.PREFIX}ping*    ➣ _Speed_
╠⦁📍*${config.PREFIX}alive*   ➣ _Status_
╠⦁📍*${config.PREFIX}jid*     ➣ _My JID_
╠⦁📍*${config.PREFIX}checkjid* ➣ _Check JID_
╠⦁📍*${config.PREFIX}showconfig* ➣ _View Config_
╠⦁📍*${config.PREFIX}active*  ➣ _Sessions_
╚═════════════❒

╭═〔 ɢʀᴏᴜᴘ ᴍɢᴍᴛ 📍 〕═╮
╠═════════════❒
╠⦁📍*${config.PREFIX}tagall*  ➣ _Tag All_
╠⦁📍*${config.PREFIX}online*  ➣ _Active Users_
╠⦁📍*${config.PREFIX}kick*    ➣ _Remove User_
╠⦁📍*${config.PREFIX}add*     ➣ _Add User_
╠⦁📍*${config.PREFIX}promote* ➣ _Make Admin_
╠⦁📍*${config.PREFIX}demote*  ➣ _Demote_
╠⦁📍*${config.PREFIX}mute*    ➣ _Close Chat_
╠⦁📍*${config.PREFIX}unmute*  ➣ _Open Chat_
╠⦁📍*${config.PREFIX}grouplist* ➣ _My Groups_
╚═════════════❒

╭═〔 ᴜꜱᴇʀ & ꜱᴀꜰᴇᴛʏ 📍 〕═╮
╠═════════════❒
╠⦁📍*${config.PREFIX}block*    ➣ _Block User_
╠⦁📍*${config.PREFIX}unblock*  ➣ _Unblock_
╠⦁📍*${config.PREFIX}deleteme* ➣ _Del Bot Msg_
╠⦁📍*${config.PREFIX}owner*    ➣ _Owner Info_
╚═════════════❒

╭═〔 ꜱᴇᴛᴛɪɴɢꜱ 📍 〕═╮
╠═════════════❒
╠⦁📍*${config.PREFIX}botpresence* ➣ _Set Status_
╠⦁📍*${config.PREFIX}autorecording* ➣ _Auto Rec_
╠⦁📍*${config.PREFIX}autotyping* ➣ _Auto Type_
╠⦁📍*${config.PREFIX}mread*   ➣ _Auto Read_
╠⦁📍*${config.PREFIX}setbotname* ➣ _Set Name_
╠⦁📍*${config.PREFIX}setlogo*  ➣ _Set Logo_
╠⦁📍*${config.PREFIX}prefix*   ➣ _Set Prefix_
╠⦁📍*${config.PREFIX}creject*  ➣ _Call Reject_
╚═════════════❒
`.trim();

    const buttons = [
      { buttonId: `${config.PREFIX}owner`, buttonText: { displayText: "💜 𝐎𝐖𝐍𝐄𝐑" }, type: 1 },
      { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝐌𝐄𝐍𝐔" }, type: 1 }
    ];

    await socket.sendMessage(sender, {
      image: { url: randomLogo },
      caption: text,
      footer: "⚙️ ꜱʏꜱᴛᴇᴍ ᴄᴏᴍᴍᴀɴᴅꜱ",
      buttons: buttons,
      contextInfo: {
        externalAdReply: {
          title: "⚙️ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐂𝐎𝐍𝐓𝐑𝐎𝐋",
          body: title,
          thumbnailUrl: randomLogo,
          sourceUrl: "https://whatsapp.com/channel/0029Vb7y6JB1yT20bJxMcP45",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: shonux });

  } catch (err) {
    console.error('creative command error:', err);
    try { await socket.sendMessage(sender, { text: '❌ Error loading creative menu.' }, { quoted: msg }); } catch(e){}
  }
  break;
}

// shiya time case ⏩⏩⏩⏩⏩
	case 'time': {
  try {
    await socket.sendMessage(sender, {react: { text: '🌪️', key: msg.key }});
    
    const BOT_NAME = '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
    const OWNER_NAME = '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃';
    const CHANNEL_LINK = "channel eka dapn";
    const TIME_IMG = "https://files.catbox.moe/5ncuwv.jpeg";
    const VIDEO_NOTE = "video  note eka dapn";
    
    
    const slTme = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo"}));
    const hour = slTme.getHours();
    const timeStr = slTme.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit"});
    const dateStr = slTme.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "2-digit"});
    
    let greetingText = "";
    if (hour < 5) greetingText = "🌌 සුභ අලුයම";
    else if (hour < 12) greetingText = "🌅 සුභ උදෑසනක්";
    else if (hour < 18) greetingText = "🌞 සුභ දහවල්";
    else if (hour < 22) greetingText = "🌙 සුභ සන්ධ්‍යාවක්";
    else greetingText = "🦉 සුභ රාත්‍රියක්";
   
   
    const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 3600));
    const house = Math.floor((uptime % (24 * 3600)) /  3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const runtime = `${days}D ${house}H ${minutes}M`;
    
    await socket.sendMessage(sender, {
     video: { url: VIDEO_NOTE },
     ptv: true,
     gifPlayback: true,
     caption: "🍷 System Booting"
   });
    
const caption =  `
*┎━『 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 𝗧𝗜𝗠𝗘  』━●►*
*├►🌍 ᴜꜱᴇʀ :* \`${greetingText}\`
*├►🗓️ ᴅᴀᴛᴇ & ᴛɪᴍᴇ :* ${getSriLankaTimestamp()}
*├►🌡️ ʀᴀᴍ :* ${ramUsage}
*┕━━━━━━━━━━━━━●►* 

> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*		 
     `.trim();
     
    const sections = [
            {
                title: "ꜱᴇʟᴇᴄᴛ ᴛʜɪꜱ ᴄᴏᴍᴍᴀɴᴅ ⤵",
                rows: [
                    { title: "📍 ʙᴀᴄᴋ ᴍᴇɴᴜ", description: "𝚋𝚊𝚌𝚔 𝚖𝚎𝚖𝚞 𝚌𝚘𝚖𝚖𝚊𝚗𝚍 💜", id: `${config.PREFIX}menu` },
                    { title: "📍 ʙᴀᴄᴋ ᴏᴡɴᴇʀ ɪɴꜰᴏ", description: "𝚋𝚊𝚌𝚔 𝚘𝚠𝚗𝚎𝚛 𝚒𝚗𝚏𝚘 💜", id: `${config.PREFIX}owner ` }                  
                ]
            },
    ];
    
    const buttons = [
            {
                buttonId: "menu_list",
                buttonText: { displayText: "📂 𝐎𝐏𝐄𝐍 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃" },
                type: 4,
                nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify({ title: "𝐒𝙴𝙻𝙴𝙲𝚃 𝐓𝙴𝙱 𝐂𝙼𝙼𝙰𝙽𝙳 ⤵", sections })
                }
            },
            // new buttons create 
        ];
    
    await socket.sendMessage(sender, {
            document: { url: TIME_IMG },
            mimetype: "application/pdf",
            fileName: `${BOT_NAME} ✨`, 
            pageCount: 9999, 
            fileLength: 99999999999999,
            caption: caption,
            buttons: buttons,
            headerType: 4,
            contextInfo: {
                mentionedJid: [sender],
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: "𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰",
                    body: `Contact: ${OWNER_NAME}`,
                    thumbnailUrl: TIME_IMG,
                    sourceUrl: CHANNEL_LINK,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, {quoted: msg});
        
  } catch (e) {
     console.log("Time error:", e);
     reply("Times error:");
  }
  break;
	}		  



      
// Auto typing ✅✅✅
        case 'autotyping': {
          await socket.sendMessage(sender, { react: { text: '⌨️', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_TYPING1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change auto typing.' }, { quoted: shonux });
            }

            let q = args[0];
            const settings = { on: "true", off: "false" };

            if (settings[q]) {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.AUTO_TYPING = settings[q];

              // If turning on auto typing, turn off auto recording to avoid conflict
              if (q === 'on') {
                userConfig.AUTO_RECORDING = "false";
              }

              await setUserConfigInMongo(sanitized, userConfig);

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_TYPING2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Auto Typing ${q === 'on' ? 'ENABLED' : 'DISABLED'}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_TYPING3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Options:* on / off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Autotyping error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_TYPING4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating auto typing!*" }, { quoted: shonux });
          }
          break;
        }

        case 'rstatus': {
          await socket.sendMessage(sender, { react: { text: '👁️', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RSTATUS1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change status seen setting.' }, { quoted: shonux });
            }

            let q = args[0];
            const settings = { on: "true", off: "false" };

            if (settings[q]) {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.AUTO_VIEW_STATUS = settings[q];
              await setUserConfigInMongo(sanitized, userConfig);

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RSTATUS2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Your Auto Status Seen ${q === 'on' ? 'ENABLED' : 'DISABLED'}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RSTATUS3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Invalid option!*\n\nAvailable options:\n- on\n- off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Rstatus command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RSTATUS4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your status seen setting!*" }, { quoted: shonux });
          }
          break;
        }

        case 'creject': {
          await socket.sendMessage(sender, { react: { text: '📞', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CREJECT1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change call reject setting.' }, { quoted: shonux });
            }

            let q = args[0];
            const settings = { on: "on", off: "off" };

            if (settings[q]) {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.ANTI_CALL = settings[q];
              await setUserConfigInMongo(sanitized, userConfig);

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CREJECT2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Your Auto Call Reject ${q === 'on' ? 'ENABLED' : 'DISABLED'}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CREJECT3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Invalid option!*\n\nAvailable options:\n- on\n- off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Creject command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CREJECT4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your call reject setting!*" }, { quoted: shonux });
          }
          break;
        }

        case 'arm': {
          await socket.sendMessage(sender, { react: { text: '❤️', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ARM1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change status react setting.' }, { quoted: shonux });
            }

            let q = args[0];
            const settings = { on: "true", off: "false" };

            if (settings[q]) {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.AUTO_LIKE_STATUS = settings[q];
              await setUserConfigInMongo(sanitized, userConfig);

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ARM2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Your Auto Status React ${q === 'on' ? 'ENABLED' : 'DISABLED'}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ARM3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Invalid option!*\n\nAvailable options:\n- on\n- off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Arm command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ARM4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your status react setting!*" }, { quoted: shonux });
          }
          break;
        }

        case 'mread': {
          await socket.sendMessage(sender, { react: { text: '📖', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_MREAD1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change message read setting.' }, { quoted: shonux });
            }

            let q = args[0];
            const settings = { all: "all", cmd: "cmd", off: "off" };

            if (settings[q]) {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.AUTO_READ_MESSAGE = settings[q];
              await setUserConfigInMongo(sanitized, userConfig);

              let statusText = "";
              switch (q) {
                case "all":
                  statusText = "READ ALL MESSAGES";
                  break;
                case "cmd":
                  statusText = "READ ONLY COMMAND MESSAGES";
                  break;
                case "off":
                  statusText = "DONT READ ANY MESSAGES";
                  break;
              }

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_MREAD2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Your Auto Message Read: ${statusText}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_MREAD3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Invalid option!*\n\nAvailable options:\n- all\n- cmd\n- off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Mread command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_MREAD4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your message read setting!*" }, { quoted: shonux });
          }
          break;
        }

        case 'autorecording': {
          await socket.sendMessage(sender, { react: { text: '🎥', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RECORDING1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change auto recording.' }, { quoted: shonux });
            }

            let q = args[0];

            if (q === 'on' || q === 'off') {
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              userConfig.AUTO_RECORDING = (q === 'on') ? "true" : "false";

              // If turning on auto recording, turn off auto typing to avoid conflict
              if (q === 'on') {
                userConfig.AUTO_TYPING = "false";
              }

              await setUserConfigInMongo(sanitized, userConfig);

              // Immediately stop any current recording if turning off
              if (q === 'off') {
                await socket.sendPresenceUpdate('available', sender);
              }

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RECORDING2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: `✅ *Auto Recording ${q === 'on' ? 'ENABLED' : 'DISABLED'}*` }, { quoted: shonux });
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RECORDING3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: "❌ *Invalid! Use:* .autorecording on/off" }, { quoted: shonux });
            }
          } catch (e) {
            console.error('Autorecording error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_RECORDING4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating auto recording!*" }, { quoted: shonux });
          }
          break;
        }

        case 'prefix': {
          await socket.sendMessage(sender, { react: { text: '🔖', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PREFIX1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change prefix.' }, { quoted: shonux });
            }

            let newPrefix = args[0];
            if (!newPrefix || newPrefix.length > 2) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PREFIX2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: "❌ *Invalid prefix!*\nPrefix must be 1-2 characters long." }, { quoted: shonux });
            }

            const userConfig = await loadUserConfigFromMongo(sanitized) || {};
            userConfig.PREFIX = newPrefix;
            await setUserConfigInMongo(sanitized, userConfig);

            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PREFIX3" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: `✅ *Your Prefix updated to: ${newPrefix}*` }, { quoted: shonux });
          } catch (e) {
            console.error('Prefix command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PREFIX4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your prefix!*" }, { quoted: shonux });
          }
          break;
        }

        case 'settings': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETTINGS1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can view settings.' }, { quoted: shonux });
            }

            const currentConfig = await loadUserConfigFromMongo(sanitized) || {};
            const botName = currentConfig.botName || BOT_NAME_FANCY;

            const settingsText = `
┍━━━━━━━━━━━━━━━━━━━━●►
├► ♻️  𝐰𝐨𝐫𝐤 𝐭𝐲𝐩𝐞 : ${currentConfig.WORK_TYPE || 'public'}
├► 💐  𝐩𝐫𝐞𝐬𝐞𝐧𝐜𝐞 : ${currentConfig.PRESENCE || 'available'}
├► 👁️‍🗨️  𝐚𝐮𝐭𝐨 𝐬𝐭𝐚𝐭𝐮𝐬 𝐯𝐢𝐞𝐰: ${currentConfig.AUTO_VIEW_STATUS || 'true'}
├► ❤️  𝐚𝐮𝐭𝐨 𝐬𝐭𝐚𝐭𝐮𝐬 𝐫𝐞𝐚𝐜𝐭 : ${currentConfig.AUTO_LIKE_STATUS || 'true'}
├► 🔕  𝐚𝐮𝐭𝐨 𝐫𝐞𝐣𝐞𝐜𝐭 𝐜𝐚𝐥𝐥𝐬 : ${currentConfig.ANTI_CALL || 'off'}
├► 💬  𝐚𝐮𝐭𝐨 𝐦𝐬𝐠 𝐫𝐞𝐚𝐝 : ${currentConfig.AUTO_READ_MESSAGE || 'off'}
├► 🎤  𝐚𝐮𝐭𝐨 𝐫𝐞𝐜𝐨𝐫𝐝𝐢𝐧𝐠 : ${currentConfig.AUTO_RECORDING || 'false'}
├► 👀  𝐚𝐮𝐭𝐨 𝐭𝐲𝐩𝐢𝐧𝐠 : ${currentConfig.AUTO_TYPING || 'false'}
├► 🔖  𝐩𝐫𝐞𝐟𝐢𝐱 : ${currentConfig.PREFIX || '/'}
├► 📦  𝐫𝐞𝐚𝐜𝐭 𝐞𝐦𝐨𝐣𝐢𝐬: ${(currentConfig.AUTO_LIKE_EMOJI || config.AUTO_LIKE_EMOJI).join(' ')}
┕━━━━━━━━━━━━━━━━━●►
    `;

            await socket.sendMessage(sender, {
              image: { url: currentConfig.logo || config.RCD_IMAGE_PATH },
              caption: settingsText
            }, { quoted: msg });

          } catch (e) {
            console.error('Settings command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETTINGS2" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error loading settings!*" }, { quoted: shonux });
          }
          break;
        }

        case 'deleteme': {
          // 'number' is the session number passed to setupCommandHandlers (sanitized in caller)
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          // determine who sent the command
          const senderNum = (nowsender || '').split('@')[0];
          const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

          // Permission: only the session owner or the bot OWNER can delete this session
          if (senderNum !== sanitized && senderNum !== ownerNum) {
            await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or the bot owner can delete this session.' }, { quoted: msg });
            break;
          }

          try {
            // 1) Remove from Mongo
            await removeSessionFromMongo(sanitized);
            await removeNumberFromMongo(sanitized);

            // 2) Remove temp session dir
            const sessionPath = path.join(os.tmpdir(), `session_${sanitized}`);
            try {
              if (fs.existsSync(sessionPath)) {
                fs.removeSync(sessionPath);
                console.log(`Removed session folder: ${sessionPath}`);
              }
            } catch (e) {
              console.warn('Failed removing session folder:', e);
            }

            // 3) Try to logout & close socket
            try {
              if (typeof socket.logout === 'function') {
                await socket.logout().catch(err => console.warn('logout error (ignored):', err?.message || err));
              }
            } catch (e) { console.warn('socket.logout failed:', e?.message || e); }
            try { socket.ws?.close(); } catch (e) { console.warn('ws close failed:', e?.message || e); }

            // 4) Remove from runtime maps
            activeSockets.delete(sanitized);
            socketCreationTime.delete(sanitized);

            // 5) notify user
            await socket.sendMessage(sender, {
              image: { url: config.RCD_IMAGE_PATH },
              caption: formatMessage('🗑️ SESSION DELETED', '♻️ Your session has been successfully deleted from MongoDB and local storage.', BOT_NAME_FANCY)
            }, { quoted: msg });

            console.log(`Session ${sanitized} deleted by ${senderNum}`);
          } catch (err) {
            console.error('deleteme command error:', err);
            await socket.sendMessage(sender, { text: `❌ Failed to delete session: ${err.message || err}` }, { quoted: msg });
          }
          break;
        }

        case 'emojis': {
          await socket.sendMessage(sender, { react: { text: '♻️', key: msg.key } });
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const senderNum = (nowsender || '').split('@')[0];
            const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

            // Permission check - only session owner or bot owner can change emojis
            if (senderNum !== sanitized && senderNum !== ownerNum) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_EMOJIS1" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change status reaction emojis.' }, { quoted: shonux });
            }

            let newEmojis = args;

            if (!newEmojis || newEmojis.length === 0) {
              // Show current emojis if no args provided
              const userConfig = await loadUserConfigFromMongo(sanitized) || {};
              const currentEmojis = userConfig.AUTO_LIKE_EMOJI || config.AUTO_LIKE_EMOJI;

              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_EMOJIS2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };

              return await socket.sendMessage(sender, {
                text: `👀 *Current Status Reaction Emojis:*\n\n${currentEmojis.join(' ')}\n\nUsage: \`.emojis 😀 😄 😊 🎉 ❤️\``
              }, { quoted: shonux });
            }

            // Validate emojis (basic check)
            const invalidEmojis = newEmojis.filter(emoji => !/\p{Emoji}/u.test(emoji));
            if (invalidEmojis.length > 0) {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_EMOJIS3" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              return await socket.sendMessage(sender, {
                text: `❌ *Invalid emojis detected:* ${invalidEmojis.join(' ')}\n\nPlease use valid emoji characters only.`
              }, { quoted: shonux });
            }

            // Get user-specific config from MongoDB
            const userConfig = await loadUserConfigFromMongo(sanitized) || {};

            // Update ONLY this user's emojis
            userConfig.AUTO_LIKE_EMOJI = newEmojis;

            // Save to MongoDB
            await setUserConfigInMongo(sanitized, userConfig);

            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_EMOJIS4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            await socket.sendMessage(sender, {
              text: `✅ *Your Status Reaction Emojis Updated!*\n\nNew emojis: ${newEmojis.join(' ')}\n\nThese emojis will be used for your automatic status reactions.`
            }, { quoted: shonux });

          } catch (e) {
            console.error('Emojis command error:', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_EMOJIS5" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: "*❌ Error updating your status reaction emojis!*" }, { quoted: shonux });
          }
          break;
        }


    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗪ᴇᴀᴛʜᴇʀ 𝗖ᴀꜱᴇ
        case 'weather':
          try {
            // Messages in English
            const messages = {
              noCity: "❗ *Please provide a city name!* \n📋 *Usage*: .weather [city name]",
              weather: (data) => `
*💬 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃  𝗪ᴇᴀᴛʜᴇʀ*

*◈  ${data.name}, ${data.sys.country}  ◈*

 𝗧emperature :* ${data.main.temp}°C
 𝗙eels 𝗟ike :* ${data.main.feels_like}°C
 𝗠in 𝗧emp :* ${data.main.temp_min}°C
 𝗠ax 𝗧emp :* ${data.main.temp_max}°C
 𝗛umidity :* ${data.main.humidity}%
 𝗪eather :* ${data.weather[0].main}
 𝗗escription :* ${data.weather[0].description}
 𝗪ind 𝗦peed :* ${data.wind.speed} m/s
 𝗣ressure :* ${data.main.pressure} hPa


> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*
`,
              cityNotFound: "🚫 *City not found!* \n🔍 Please check the spelling and try again.",
              error: "⚠️ *An error occurred!* \n🔄 Please try again later."
            };

            // Check if a city name was provided
            if (!args || args.length === 0) {
              await socket.sendMessage(sender, { text: messages.noCity });
              break;
            }

            const apiKey = '2d61a72574c11c4f36173b627f8cb177';
            const city = args.join(" ");
            const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

            const response = await axios.get(url);
            const data = response.data;

            // Get weather icon
            const weatherIcon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

            await socket.sendMessage(sender, {
              image: { url: weatherIcon },
              caption: messages.weather(data)
            });

          } catch (e) {
            console.log(e);
            if (e.response && e.response.status === 404) {
              await socket.sendMessage(sender, { text: messages.cityNotFound });
            } else {
              await socket.sendMessage(sender, { text: messages.error });
            }
          }
          break;


    // =========== 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗖ꜱᴏɴɢ 𝗖ᴀꜱᴇ
        case 'csend':
        case 'csong': {
          try {
            try { await socket.sendMessage(sender, { react: { text: "🎧", key: msg.key } }); } catch (e) { }

            const targetArg = args[0];
            const query = args.slice(1).join(" ").trim();
            if (!targetArg || !query) {
              return await socket.sendMessage(sender, { text: "*❌ Invalid format!* Use: `.csong <jid|number|channelId> <song name or YouTube url>`" }, { quoted: msg });
            }

            // normalize targetJid
            let targetJid = targetArg;
            if (!targetJid.includes('@')) {
              if (/^\d{12,}$/.test(targetJid) || /^0029/.test(targetJid)) {
                if (!targetJid.endsWith('@newsletter')) targetJid = `${targetJid}@newsletter`;
              } else {
                targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
              }
            }

            // resolve YouTube url (if user gave search terms, keep original flow of yt-search)
            const yts = require('yt-search');
            let ytUrl = query;
            if (!/^https?:\/\//i.test(query)) {
              const search = await yts(query);
              if (!search || !search.videos || search.videos.length === 0) {
                return await socket.sendMessage(sender, { text: "*Song not found... ❌*" }, { quoted: msg });
              }
              const video = search.videos[0];
              ytUrl = video.url;
            }

            // Use SriHub API to get mp3 download link & metadata
            const axios = require('axios');
            const apiUrl = `https://api.srihub.store/download/ytmp3?url=${encodeURIComponent(ytUrl)}`;
            const apiResp = await axios.get(apiUrl, {
              headers: {
                'x-api-key': 'dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl'
              },
              timeout: 15000
            }).catch(err => {
              console.error('SriHub API Error:', err?.response?.data || err.message);
              return null;
            });

            if (!apiResp || !apiResp.data) {
              return await socket.sendMessage(sender, { text: "❌ Failed to get data from API. Please try again." }, { quoted: msg });
            }

            const apiRes = apiResp.data;

            // Check if API response indicates success
            if (apiRes.status === 'error' || !apiRes.result) {
              return await socket.sendMessage(sender, { text: `❌ API Error: ${apiRes.message || 'Failed to fetch song'}` }, { quoted: msg });
            }

            // Extract data from SriHub API response
            const downloadUrl = apiRes.result.download || apiRes.result.url;
            const title = apiRes.result.title || 'Unknown Title';
            const thumbnail = apiRes.result.thumbnail || null;
            const duration = apiRes.result.duration || 'N/A';
            const views = apiRes.result.views || 'N/A';
            const uploadDate = apiRes.result.uploadDate || apiRes.result.published || 'N/A';

            if (!downloadUrl) {
              return await socket.sendMessage(sender, { text: "❌ No download URL found in API response. Try another song." }, { quoted: msg });
            }

            // prepare temp files
            const os = require('os');
            const path = require('path');
            const fs = require('fs');
            const crypto = require('crypto');
            const tmpId = crypto.randomBytes(8).toString('hex');
            const tempMp3 = path.join(os.tmpdir(), `cm_${tmpId}.mp3`);
            const tempOpus = path.join(os.tmpdir(), `cm_${tmpId}.opus`);

            // fetch mp3 binary
            const resp = await axios.get(downloadUrl, {
              responseType: 'arraybuffer',
              timeout: 120000
            }).catch(err => {
              console.error('Download Error:', err.message);
              return null;
            });

            if (!resp || !resp.data) {
              return await socket.sendMessage(sender, { text: "❌ Failed to download song (API/Network issue)." }, { quoted: msg });
            }

            fs.writeFileSync(tempMp3, Buffer.from(resp.data));

            // convert to opus (ogg) using ffmpeg
            const ffmpeg = require('fluent-ffmpeg');
            const ffmpegPath = require('ffmpeg-static');
            if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

            await new Promise((resolve, reject) => {
              ffmpeg(tempMp3)
                .noVideo()
                .audioCodec('libopus')
                .format('opus')
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(tempOpus);
            });

            if (!fs.existsSync(tempOpus)) {
              throw new Error('Opus conversion failed');
            }

            // try to resolve channel name if newsletter metadata available
            let channelname = targetJid;
            try {
              if (typeof socket.newsletterMetadata === 'function') {
                const meta = await socket.newsletterMetadata("jid", targetJid);
                if (meta && meta.name) channelname = meta.name;
              }
            } catch (e) { /* ignore */ }

            // build caption in English
            const caption = `*📍 𝗧ɪᴛʟᴇ :* ${title}

*👀 𝗩ɪᴇᴡꜱ :* ${views}
*⏱️ 𝗗ᴜʀᴀᴛɪᴏɴ :* ${duration}
*📅 𝗨ᴘʟᴏᴀᴅ ᴅᴀᴛᴇ :* ${uploadDate}

*${channelname}*`;

            // send thumbnail+caption (best-effort)
            try {
              if (thumbnail) {
                await socket.sendMessage(targetJid, {
                  image: { url: thumbnail },
                  caption: caption
                });
              } else {
                await socket.sendMessage(targetJid, {
                  text: caption
                });
              }
            } catch (e) {
              console.warn('Failed to send thumbnail/caption to target:', e?.message || e);
            }

            // send opus as voice (ptt)
            const opusBuffer = fs.readFileSync(tempOpus);
            await socket.sendMessage(targetJid, {
              audio: opusBuffer,
              mimetype: 'audio/ogg; codecs=opus',
              ptt: true
            });

            // notify the command issuer
            await socket.sendMessage(sender, {
              text: `✅ *"${title}"* Successfully sent to *${channelname}* (${targetJid}) 🎶`
            }, { quoted: msg });

            // cleanup
            try { if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3); } catch (e) { }
            try { if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus); } catch (e) { }

          } catch (e) {
            console.error('csong error:', e);
            try {
              await socket.sendMessage(sender, {
                text: "*Some error occurred! Please try again later.*"
              }, { quoted: msg });
            } catch (e) { }
          }
          break;
        }


    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗢ɴʟɪɴᴇ 𝗖ᴀꜱᴇ
        case 'online': {
          try {
            if (!(from || '').endsWith('@g.us')) {
              await socket.sendMessage(sender, { text: '❌ This command works only in group chats.' }, { quoted: msg });
              break;
            }

            let groupMeta;
            try { groupMeta = await socket.groupMetadata(from); } catch (err) { console.error(err); break; }

            const callerJid = (nowsender || '').replace(/:.*$/, '');
            const callerId = callerJid.includes('@') ? callerJid : `${callerJid}@s.whatsapp.net`;
            const ownerNumberClean = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
            const isOwnerCaller = callerJid.startsWith(ownerNumberClean);
            const groupAdmins = (groupMeta.participants || []).filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
            const isGroupAdminCaller = groupAdmins.includes(callerId);

            if (!isOwnerCaller && !isGroupAdminCaller) {
              await socket.sendMessage(sender, { text: '❌ Only group admins or the bot owner can use this command.' }, { quoted: msg });
              break;
            }

            try { await socket.sendMessage(sender, { text: '🔄 Scanning for online members... please wait ~15 seconds' }, { quoted: msg }); } catch (e) { }

            const participants = (groupMeta.participants || []).map(p => p.id);
            const onlineSet = new Set();
            const presenceListener = (update) => {
              try {
                if (update?.presences) {
                  for (const id of Object.keys(update.presences)) {
                    const pres = update.presences[id];
                    if (pres?.lastKnownPresence && pres.lastKnownPresence !== 'unavailable') onlineSet.add(id);
                    if (pres?.available === true) onlineSet.add(id);
                  }
                }
              } catch (e) { console.warn('presenceListener error', e); }
            };

            for (const p of participants) {
              try { if (typeof socket.presenceSubscribe === 'function') await socket.presenceSubscribe(p); } catch (e) { }
            }
            socket.ev.on('presence.update', presenceListener);

            const checks = 3; const intervalMs = 5000;
            await new Promise((resolve) => { let attempts = 0; const iv = setInterval(() => { attempts++; if (attempts >= checks) { clearInterval(iv); resolve(); } }, intervalMs); });
            try { socket.ev.off('presence.update', presenceListener); } catch (e) { }

            if (onlineSet.size === 0) {
              await socket.sendMessage(sender, { text: '⚠️ No online members detected (they may be hiding presence or offline).' }, { quoted: msg });
              break;
            }

            const onlineArray = Array.from(onlineSet).filter(j => participants.includes(j));
            const mentionList = onlineArray.map(j => j);

            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY;

            // BotName meta mention
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ONLINE" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            let txt = `🟢 *𝗢ɴʟɪɴᴇ 𝗠ᴇᴍʙᴇʀꜱ* — ${onlineArray.length}/${participants.length}\n\n`;
            onlineArray.forEach((jid, i) => {
              txt += `${i + 1}. @${jid.split('@')[0]}\n`;
            });

            await socket.sendMessage(sender, {
              text: txt.trim(),
              mentions: mentionList
            }, { quoted: metaQuote }); // <-- botName meta mention

          } catch (err) {
            console.error('Error in online command:', err);
            try { await socket.sendMessage(sender, { text: '❌ An error occurred while checking online members.' }, { quoted: msg }); } catch (e) { }
          }
          break;
        }
        
        
   // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗙ᴀᴄᴇʙᴏᴏᴋ 𝗖ᴀꜱᴇ
        case 'fb':
        case 'fbdl':
        case 'facebook':
        case 'fbd': {
          try {
            let text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            let url = text.split(" ")[1]; // e.g. .fb <link>

            if (!url) {
              return await socket.sendMessage(sender, {
                text: '🚫 *Please send a Facebook video link.*\n\nExample: .fb <url>'
              }, { quoted: msg });
            }

            const axios = require('axios');

            // 🔹 Load bot name dynamically
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            // 🔹 Fake contact for Meta AI mention
            const shonux = {
              key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_FB"
              },
              message: {
                contactMessage: {
                  displayName: botName,
                  vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
                }
              }
            };

            // 🔹 Call API
            let api = `https://tharuzz-ofc-api-v2.vercel.app/api/download/fbdl?url=${encodeURIComponent(url)}`;
            let { data } = await axios.get(api);

            if (!data.success || !data.result) {
              return await socket.sendMessage(sender, { text: '❌ *Failed to fetch Facebook video.*' }, { quoted: shonux });
            }

            let title = data.result.title || 'Facebook Video';
            let thumb = data.result.thumbnail;
            let hdLink = data.result.dlLink?.hdLink || data.result.dlLink?.sdLink; // Prefer HD else SD

            if (!hdLink) {
              return await socket.sendMessage(sender, { text: '⚠️ *No video link available.*' }, { quoted: shonux });
            }

            // 🔹 Send thumbnail + title first
            await socket.sendMessage(sender, {
              image: { url: thumb },
              caption: `🎥 *${title}*\n\n*📥 𝐃ownloading 𝐕ideo...*\n> *${botName}*`
            }, { quoted: shonux });

            // 🔹 Send video automatically
            await socket.sendMessage(sender, {
              video: { url: hdLink },
              caption: `🎥 *${title}*\n\n> *${botName}*`
            }, { quoted: shonux });

          } catch (e) {
            console.log(e);
            await socket.sendMessage(sender, { text: '⚠️ *Error downloading Facebook video.*' });
          }
        }
          break;
          
          
    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗨ɴꜰᴏʟʟᴏᴡ 𝗖ᴀꜱᴇ
        case 'unfollow': {
          const jid = args[0] ? args[0].trim() : null;
          if (!jid) {
            let userCfg = {};
            try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch (e) { userCfg = {}; }
            const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_UNFOLLOW" },
              message: { contactMessage: { displayName: title, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${title};;;;\nFN:${title}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            return await socket.sendMessage(sender, { text: '❗ Provide channel JID to unfollow. Example:\n.unfollow 120363423916773660@newsletter' }, { quoted: shonux });
          }

          const admins = await loadAdminsFromMongo();
          const normalizedAdmins = admins.map(a => (a || '').toString());
          const senderIdSimple = (nowsender || '').includes('@') ? nowsender.split('@')[0] : (nowsender || '');
          const isAdmin = normalizedAdmins.includes(nowsender) || normalizedAdmins.includes(senderNumber) || normalizedAdmins.includes(senderIdSimple);
          if (!(isOwner || isAdmin)) {
            let userCfg = {};
            try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch (e) { userCfg = {}; }
            const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_UNFOLLOW2" },
              message: { contactMessage: { displayName: title, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${title};;;;\nFN:${title}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            return await socket.sendMessage(sender, { text: '❌ Permission denied. Only owner or admins can remove channels.' }, { quoted: shonux });
          }

          if (!jid.endsWith('@newsletter')) {
            let userCfg = {};
            try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch (e) { userCfg = {}; }
            const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_UNFOLLOW3" },
              message: { contactMessage: { displayName: title, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${title};;;;\nFN:${title}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            return await socket.sendMessage(sender, { text: '❗ Invalid JID. Must end with @newsletter' }, { quoted: shonux });
          }

          try {
            if (typeof socket.newsletterUnfollow === 'function') {
              await socket.newsletterUnfollow(jid);
            }
            await removeNewsletterFromMongo(jid);

            let userCfg = {};
            try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch (e) { userCfg = {}; }
            const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_UNFOLLOW4" },
              message: { contactMessage: { displayName: title, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${title};;;;\nFN:${title}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            await socket.sendMessage(sender, { text: `✅ Unfollowed and removed from DB: ${jid}` }, { quoted: shonux });
          } catch (e) {
            console.error('unfollow error', e);
            let userCfg = {};
            try { if (number && typeof loadUserConfigFromMongo === 'function') userCfg = await loadUserConfigFromMongo((number || '').replace(/[^0-9]/g, '')) || {}; } catch (e) { userCfg = {}; }
            const title = userCfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_UNFOLLOW5" },
              message: { contactMessage: { displayName: title, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${title};;;;\nFN:${title}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: `❌ Failed to unfollow: ${e.message || e}` }, { quoted: shonux });
          }
          break;
        }


     // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗧ɪᴋᴛᴏᴋ 𝗖ᴀꜱᴇ
        case 'tt':
        case 'tiktokdl': {
          const axios = require('axios');

          await socket.sendMessage(sender, { react: { text: '🎬', key: msg.key } });

          const q = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || '';

          // Extract the TikTok URL
          const url = q.replace(/^[.\/!]?(tt|tiktokdl)\s*/i, '').trim();

          if (!url) {
            return await socket.sendMessage(sender, {
              text: '*📌 Usage:* .tt <tiktok_url>\n*Example:* .tt https://vt.tiktok.com/ZS57nHKP8/'
            }, { quoted: msg });
          }

          // Check if it's a TikTok URL
          if (!url.includes('tiktok.com') && !url.includes('vt.tiktok')) {
            return await socket.sendMessage(sender, {
              text: '❌ *Invalid TikTok URL.*\nඔබ TikTok video link එකක් දෙන්න ඕනෙ!'
            }, { quoted: msg });
          }

          try {
            // Send processing message
            await socket.sendMessage(sender, {
              text: '*⏳ Downloading your TikTok video...*'
            }, { quoted: msg });

            // Use tikwm.com API for downloading (same as your search function)
            const downloadUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;

            const response = await axios.get(downloadUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
              }
            });

            const data = response.data;

            if (data.code !== 0 || !data.data) {
              throw new Error(data.msg || 'Failed to fetch video');
            }

            const videoData = data.data;

            // Get video URL (prefer HD, then play/wm)
            const videoUrl = videoData.hdplay || videoData.play || videoData.wm || videoData.download;

            if (!videoUrl) {
              throw new Error('No video URL found');
            }

            // Get bot name dynamically
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            // Create caption
            const caption = `*${botName} 𝗧ɪᴋᴛᴏᴋ 𝗗ᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
              `*╔═════════◆◉◉➤*\n` +
              `*╠⦁ 📝 𝗧ɪᴛʟᴇ:* ${videoData.title || 'No Title'}\n` +
              `*╠⦁ 👤 𝗔ᴜᴛʜᴏʀ:* ${videoData.author?.nickname || 'Unknown'}\n` +
              `*╠⦁ 👍 𝗟ɪᴋᴇꜱ:* ${videoData.digg_count || 0}\n` +
              `*╠⦁ 💬 𝗖ᴏᴍᴍᴇɴᴛꜱ:* ${videoData.comment_count || 0}\n` +
              `*╠⦁ 🔁 𝗦ʜᴀʀᴇꜱ:* ${videoData.share_count || 0}\n` +
              `*╠⦁ 📥 𝗗ᴏᴡɴʟᴏᴀᴅᴇ:* ${videoData.download_count || 0}\n` +
              `*╚═══════════◆◉◉➤*\n\n` +
              
              `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

            // Send the video
            await socket.sendMessage(sender, {
              video: { url: videoUrl },
              caption: caption,
              gifPlayback: false
            }, { quoted: msg });

          } catch (error) {
            console.error('TikTok Download Error:', error);

            // Try alternative API if first one fails
            try {
              await socket.sendMessage(sender, {
                text: '*🔄 Trying alternative method...*'
              }, { quoted: msg });

              // Alternative API
              const altResponse = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);
              const altData = altResponse.data;

              if (altData.data && altData.data.play) {
                const sanitized = (number || '').replace(/[^0-9]/g, '');
                let cfg = await loadUserConfigFromMongo(sanitized) || {};
                let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

                const caption = `*${botName} 𝗧ɪᴋᴛᴛᴏᴋ 𝗗ᴏᴡɴʟᴏᴀᴅᴇʀ*\n\nTitle: ${altData.data.title || 'No Title'}\nAuthor: ${altData.data.author.nickname || 'Unknown'}`;

                await socket.sendMessage(sender, {
                  video: { url: altData.data.play },
                  caption: caption
                }, { quoted: msg });
              } else {
                throw new Error('Alternative API also failed');
              }

            } catch (altError) {
              console.error('Alternative API Error:', altError);

              await socket.sendMessage(sender, {
                text: `❌ *Download Failed!*\n\nError: ${error.message}\n\nඔබට අවශ්‍ය නම්:\n1. TikTok link එක නිවැරදිද බලන්න\n2. Video එක public එකක්ද බලන්න\n3. නැත්තම් නැවත උත්සාහ කරන්න`
              }, { quoted: msg });
            }
          }

          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗥ᴇᴀᴄᴛ & 𝗙ᴏʟʟᴏᴡ 𝗖ᴀꜱᴇ

        case 'cfn': {
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          const cfg = await loadUserConfigFromMongo(sanitized) || {};
          const botName = cfg.botName || BOT_NAME_FANCY;
          const logo = cfg.logo || config.RCD_IMAGE_PATH;

          const full = body.slice(config.PREFIX.length + command.length).trim();
          if (!full) {
            await socket.sendMessage(sender, { text: `❗ Provide input: .cfn <jid@newsletter> | emoji1,emoji2\nExample: .cfn 120363423916773660@newsletter | 🔥,❤️` }, { quoted: msg });
            break;
          }

          const admins = await loadAdminsFromMongo();
          const normalizedAdmins = (admins || []).map(a => (a || '').toString());
          const senderIdSimple = (nowsender || '').includes('@') ? nowsender.split('@')[0] : (nowsender || '');
          const isAdmin = normalizedAdmins.includes(nowsender) || normalizedAdmins.includes(senderNumber) || normalizedAdmins.includes(senderIdSimple);
          if (!(isOwner || isAdmin)) {
            await socket.sendMessage(sender, { text: '❌ Permission denied. Only owner or configured admins can add follow channels.' }, { quoted: msg });
            break;
          }

          let jidPart = full;
          let emojisPart = '';
          if (full.includes('|')) {
            const split = full.split('|');
            jidPart = split[0].trim();
            emojisPart = split.slice(1).join('|').trim();
          } else {
            const parts = full.split(/\s+/);
            if (parts.length > 1 && parts[0].includes('@newsletter')) {
              jidPart = parts.shift().trim();
              emojisPart = parts.join(' ').trim();
            } else {
              jidPart = full.trim();
              emojisPart = '';
            }
          }

          const jid = jidPart;
          if (!jid || !jid.endsWith('@newsletter')) {
            await socket.sendMessage(sender, { text: '❗ Invalid JID. Example: 120363423916773660@newsletter' }, { quoted: msg });
            break;
          }

          let emojis = [];
          if (emojisPart) {
            emojis = emojisPart.includes(',') ? emojisPart.split(',').map(e => e.trim()) : emojisPart.split(/\s+/).map(e => e.trim());
            if (emojis.length > 20) emojis = emojis.slice(0, 20);
          }

          try {
            if (typeof socket.newsletterFollow === 'function') {
              await socket.newsletterFollow(jid);
            }

            await addNewsletterToMongo(jid, emojis);

            const emojiText = emojis.length ? emojis.join(' ') : '(default set)';

            // Meta mention for botName
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CFN" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

            await socket.sendMessage(sender, {
              image: imagePayload,
              caption: `*✅ 𝗖ʜᴀɴɴᴇʟ 𝗙ᴏʟʟᴏᴡᴇᴅ 𝗔ɴᴅ 𝗦ᴀᴠᴇᴅ ✅*\n\n*𝗝ɪᴅ:* ${jid}\n*𝗘ᴍᴏᴊɪꜱ:* ${emojiText}\n*𝗦ᴀᴠᴇᴅ 𝗕ʏ:* @${senderIdSimple}`,
              footer: `☘️ ${botName} 𝐅ollow 𝐂hannel`,
              mentions: [nowsender], // user mention
              buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "📄 𝗠ᴇɴᴜ" }, type: 1 }],
              headerType: 4
            }, { quoted: metaQuote }); // <-- botName meta mention

          } catch (e) {
            console.error('cfn error', e);
            await socket.sendMessage(sender, { text: `❌ Failed to save/follow channel: ${e.message || e}` }, { quoted: msg });
          }
          break;
        }

        case 'chr': {
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          const cfg = await loadUserConfigFromMongo(sanitized) || {};
          const botName = cfg.botName || BOT_NAME_FANCY;
          const logo = cfg.logo || config.RCD_IMAGE_PATH;

          const senderIdSimple = (nowsender || '').includes('@') ? nowsender.split('@')[0] : (nowsender || '');

          const q = body.split(' ').slice(1).join(' ').trim();
          if (!q.includes(',')) return await socket.sendMessage(sender, { text: "❌ Usage: chr <channelJid/messageId>,<emoji>" }, { quoted: msg });

          const parts = q.split(',');
          let channelRef = parts[0].trim();
          const reactEmoji = parts[1].trim();

          let channelJid = channelRef;
          let messageId = null;
          const maybeParts = channelRef.split('/');
          if (maybeParts.length >= 2) {
            messageId = maybeParts[maybeParts.length - 1];
            channelJid = maybeParts[maybeParts.length - 2].includes('@newsletter') ? maybeParts[maybeParts.length - 2] : channelJid;
          }

          if (!channelJid.endsWith('@newsletter')) {
            if (/^\d+$/.test(channelJid)) channelJid = `${channelJid}@newsletter`;
          }

          if (!channelJid.endsWith('@newsletter') || !messageId) {
            return await socket.sendMessage(sender, { text: '❌ Provide channelJid/messageId format.' }, { quoted: msg });
          }

          try {
            await socket.newsletterReactMessage(channelJid, messageId.toString(), reactEmoji);
            await saveNewsletterReaction(channelJid, messageId.toString(), reactEmoji, sanitized);

            // BotName meta mention
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CHR" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

            await socket.sendMessage(sender, {
              image: imagePayload,
              caption: `*✅ 𝗥ᴇᴀᴄᴛᴇᴅ 𝗦ᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ*\n\n*𝗖ʜᴀɴɴᴇʟ:* ${channelJid}\n*𝗠ᴇꜱꜱᴀɢᴇ:* ${messageId}\n*𝗘ᴍᴏᴊɪ:* ${reactEmoji}\nBy: @${senderIdSimple}`,
              footer: `*🍁 ${botName} 𝐑eaction*`,
              mentions: [nowsender], // user mention
              buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "📄 𝗠ᴇɴᴜ" }, type: 1 }],
              headerType: 4
            }, { quoted: metaQuote }); // <-- botName meta mention

          } catch (e) {
            console.error('chr command error', e);
            await socket.sendMessage(sender, { text: `❌ Failed to react: ${e.message || e}` }, { quoted: msg });
          }
          break;
        }

        //=====================hi,mk,pk===========

        case 'apkdownload':
        case 'apk': {
          try {
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const id = text.split(" ")[1]; // .apkdownload <id>

            // ✅ Load bot name dynamically
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            // ✅ Fake Meta contact message
            const shonux = {
              key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_APKDL"
              },
              message: {
                contactMessage: {
                  displayName: botName,
                  vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
                }
              }
            };

            if (!id) {
              return await socket.sendMessage(sender, {
                text: '🚫 *Please provide an APK package ID.*\n\nExample: .apkdownload com.whatsapp',
                buttons: [
                  { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: '📄 𝗠ᴇɴᴜ' }, type: 1 }
                ]
              }, { quoted: shonux });
            }

            // ⏳ Notify start
            await socket.sendMessage(sender, { text: '*⏳ Fetching APK info...*' }, { quoted: shonux });

            // 🔹 Call API
            const apiUrl = `https://tharuzz-ofc-apis.vercel.app/api/download/apkdownload?id=${encodeURIComponent(id)}`;
            const { data } = await axios.get(apiUrl);

            if (!data.success || !data.result) {
              return await socket.sendMessage(sender, { text: '*❌ Failed to fetch APK info.*' }, { quoted: shonux });
            }

            const result = data.result;
            const caption = `📱 *${result.name}*\n\n` +
              `*🆔 𝗣ᴀᴄᴋᴀɢᴇ:* \`${result.package}\`\n` +
              `*📦 𝗦ɪᴢᴇ:* ${result.size}\n` +
              `*🕒 𝗟ᴀꜱᴛ 𝗨ᴘᴅᴀᴛᴇ:* ${result.lastUpdate}\n\n` +
              `> *${botName}*`;

            // 🔹 Send APK as document
            await socket.sendMessage(sender, {
              document: { url: result.dl_link },
              fileName: `${result.name}.apk`,
              mimetype: 'application/vnd.android.package-archive',
              caption: caption,
              jpegThumbnail: result.image ? await axios.get(result.image, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data)) : undefined
            }, { quoted: shonux });

          } catch (err) {
            console.error("Error in APK download:", err);

            // Catch block Meta mention
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            const shonux = {
              key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_APKDL"
              },
              message: {
                contactMessage: {
                  displayName: botName,
                  vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
                }
              }
            };

            await socket.sendMessage(sender, { text: '*❌ Internal Error. Please try again later.*' }, { quoted: shonux });
          }
          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗩ᴠ & 𝗦ᴛᴀᴛᴜꜱ 𝗦ᴀᴠᴇʀ 𝗖ᴀꜱᴇ

        case 'දාපන්':
        case 'oni':
        case 'vv':
        case 'save':
        case 'send': {
          try {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
              return await socket.sendMessage(sender, { text: '*❌ Please reply to a message (status/media) to save it.*' }, { quoted: msg });
            }

            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (e) { }

            // 🟢 Instead of bot’s own chat, use same chat (sender)
            const saveChat = sender;

            if (quotedMsg.imageMessage || quotedMsg.videoMessage || quotedMsg.audioMessage || quotedMsg.documentMessage || quotedMsg.stickerMessage) {
              const media = await downloadQuotedMedia(quotedMsg);
              if (!media || !media.buffer) {
                return await socket.sendMessage(sender, { text: '❌ Failed to download media.' }, { quoted: msg });
              }

              if (quotedMsg.imageMessage) {
                await socket.sendMessage(saveChat, { image: media.buffer, caption: media.caption || '✅ Status Saved' });
              } else if (quotedMsg.videoMessage) {
                await socket.sendMessage(saveChat, { video: media.buffer, caption: media.caption || '✅ Status Saved', mimetype: media.mime || 'video/mp4' });
              } else if (quotedMsg.audioMessage) {
                await socket.sendMessage(saveChat, { audio: media.buffer, mimetype: media.mime || 'audio/mp4', ptt: media.ptt || false });
              } else if (quotedMsg.documentMessage) {
                const fname = media.fileName || `saved_document.${(await FileType.fromBuffer(media.buffer))?.ext || 'bin'}`;
                await socket.sendMessage(saveChat, { document: media.buffer, fileName: fname, mimetype: media.mime || 'application/octet-stream' });
              } else if (quotedMsg.stickerMessage) {
                await socket.sendMessage(saveChat, { image: media.buffer, caption: media.caption || '✅ Sticker Saved' });
              }

              await socket.sendMessage(sender, { text: '🔥 *𝐒tatus 𝐒aved 𝐒uccessfully!*' }, { quoted: msg });

            } else if (quotedMsg.conversation || quotedMsg.extendedTextMessage) {
              const text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
              await socket.sendMessage(saveChat, { text: `✅ *𝐒tatus 𝐒aved*\n\n${text}` });
              await socket.sendMessage(sender, { text: '🔥 *𝐓ext 𝐒tatus 𝐒aved 𝐒uccessfully!*' }, { quoted: msg });
            } else {
              if (typeof socket.copyNForward === 'function') {
                try {
                  const key = msg.message?.extendedTextMessage?.contextInfo?.stanzaId || msg.key;
                  await socket.copyNForward(saveChat, msg.key, true);
                  await socket.sendMessage(sender, { text: '🔥 *𝐒aved (𝐅orwarded) 𝐒uccessfully!*' }, { quoted: msg });
                } catch (e) {
                  await socket.sendMessage(sender, { text: '❌ Could not forward the quoted message.' }, { quoted: msg });
                }
              } else {
                await socket.sendMessage(sender, { text: '❌ Unsupported quoted message type.' }, { quoted: msg });
              }
            }

          } catch (error) {
            console.error('❌ Save error:', error);
            await socket.sendMessage(sender, { text: '*❌ Failed to save status*' }, { quoted: msg });
          }
          break;
        }

  // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗔ʟɪᴠᴇ 𝗖ᴀꜱᴇ
  // 💚💚💚
 case 'alive': {
  try {
    // 1. Add Reaction (Immediate Feedback)
    await socket.sendMessage(sender, { react: { text: "📜", key: msg.key } });

    const sanitized = (number || '').replace(/[^0-9]/g, '');
    const cfg = await loadUserConfigFromMongo(sanitized) || {};
    const botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡'; // Default fancy name
    const logo = cfg.logo || config.RCD_IMAGE_PATH;

    // 2. Calculate Uptime
    const startTime = socketCreationTime.get(number) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // 3. Meta AI "Fake" Quote for style
    const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ALIVE" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
 };

    // 4. Beautiful & Art-full Caption Style
    const text = `𝐇𝙸 👋 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 𝐁𝙾𝚃 𝐔𝚂𝙴𝚁 𝐈 𝐀𝙼 𝐀𝙻𝙸𝚅𝙴 𝐍𝙾𝚆 💜

*╭━━〔 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 𝐀𝐋𝐈𝐕𝐄 📍 〕━━●●►*  
*┃✯╭───────────────────┈⊷*
*┃✯┋ 👤 User:* @${sender.split('@')[0]}
*┃✯┋ 🥷 Owner:* ${config.OWNER_NAME || 'ARNNDA'}  
*┃✯┋ ⚙️ Prefix:* .  
*┃✯┋ 🧬 Version:* 2.0.0  
*┃✯┋ 💻 Platform:* ${process.env.PLATFORM || 'Heroku'}  
*┃✯┋ ⏱️ Uptime:* ${hours}h ${minutes}m ${seconds}s  
*┃✯╰────────────┈⊷*
*╰──────────────────●●►*  

> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1 📍📡*`;


    // 5. Button System
    const buttons = [
        { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝐁𝙾𝚃 𝐌𝙴𝙽𝚄" }, type: 1 },
        { buttonId: `${config.PREFIX}ping`, buttonText: { displayText: "💜 𝐒𝙿𝙴𝙴𝙴 𝐓𝙴𝚂𝚁" }, type: 1 }
    ];

    let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

    await socket.sendMessage(sender, {
      image: imagePayload,
      caption: text,
      footer: `*${botName}*`,
      buttons: buttons,
      headerType: 4,
      mentions: [sender] // Ensures the user tag works
    }, { quoted: metaQuote });

  } catch(e) {
    console.error('Alive command error:', e);
    await socket.sendMessage(sender, { text: '❌ An error occurred in alive command.' }, { quoted: msg });
  }
  break;
}

//  𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰  𝗦𝗘𝗧𝗧𝗜𝗡𝗚
case 'setting': {
  // 1. Acknowledge the command
  await socket.sendMessage(sender, { react: { text: '❄', key: msg.key } });

  try {
    // 2. Data Sanitization & Permission Logic
    const sanitized = (number || '').replace(/[^0-9]/g, '');
    const senderNum = (nowsender || '').split('@')[0];
    const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
    
    // 🔒 Security Check
    if (senderNum !== sanitized && senderNum !== ownerNum) {
      const permissionCard = {
        key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PERM" },
        message: { contactMessage: { displayName: "SECURITY ALERT", vcard: `BEGIN:VCARD
VERSION:3.0
N:System;Security;;;
FN:System Security
ORG:Privacy Guard
END:VCARD` } }
      };
      
      // FIX 1: Used backticks (`) for multi-line text
      return await socket.sendMessage(sender, { 
        text: `❌ *𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃*

🔒 _This menu is restricted to the bot owner only._` 
      }, { quoted: permissionCard });
    }

    // 3. Load Configuration
    const currentConfig = await loadUserConfigFromMongo(sanitized) || {};
    const botName = currentConfig.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡'; // Default name fallback
    const prefix = currentConfig.PREFIX || config.PREFIX;

    // 4. Construct the Interactive Menu
    const settingOptions = {
      name: 'single_select',
      paramsJson: JSON.stringify({
        title: `𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 𝐒𝐄𝐓𝐓𝐈𝐍𝐆 𝐍𝐄𝐖 💜`,
        sections: [
          {
            title: '📍 𝙴𝚁𝙰𝙽𝙽𝙳𝙰--𝙼𝙳 ᴠ.2.0.0 ᴘᴇʀꜱᴏɴᴀʟɪᴢᴀᴛɪᴏɴ',
            highlight_label: 'New',
            rows: [
              { 
                title: ' ✏️  ➤ 𝐂𝐡𝐚𝐧𝐠𝐞 𝐁𝐨𝐭 𝐍𝐚𝐦𝐞', 
                description: 'Set a new name for your bot', 
                id: `${config.PREFIX}setbotname` 
              }
            ]
          },
          
          {
            title: '📍 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 ᴛʏᴘᴇ ᴏꜰ ᴡᴏʀᴋ',
            rows: [
              { title: '📍 ➤ 𝐏𝐮𝐛𝐥𝐢𝐜 𝐌𝐨𝐝𝐞', description: 'Bot works for everyone', id: `${config.PREFIX}wtype public` },
              { title: '📍 ➤ 𝐏𝐫𝐢𝐯𝐚𝐭𝐞 𝐌𝐨𝐝𝐞', description: 'Bot works only for you', id: `${config.PREFIX}wtype private` },
              { title: '📍 ➤ 𝐆𝐫𝐨𝐮𝐩𝐬 𝐎𝐧𝐥𝐲', description: 'Works in groups only', id: `${config.PREFIX}wtype group` },
              { title: '📍 ➤ 𝐈𝐧𝐛𝐨𝐱 𝐎𝐧𝐥𝐲', description: 'Works in DM/Inbox only', id: `${config.PREFIX}wtype inbox` },
            ],
          },
          
          {
            title: '📍 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  ɢʜᴏꜱᴛ & ᴘʀɪᴠᴀᴄʏ',
            rows: [
              { title: '📍 ➤ 𝐀𝐥𝐰𝐚𝐲𝐬 𝐎𝐧𝐥𝐢𝐧𝐞 ▸ 𝐎𝐍', description: 'Show online badge', id: `${config.PREFIX}botpresence online` },
              { title: '📍 ➤ 𝐀𝐥𝐰𝐚𝐲𝐬 𝐎𝐧𝐥𝐢𝐧𝐞 ▸ 𝐎𝐅𝐅', description: 'Hide online badge', id: `${prefix}botpresence offline` },
              { title: '📍 ➤ 𝐅𝐚𝐤𝐞 𝐓𝐲𝐩𝐢𝐧𝐠 ▸ 𝐎𝐍', description: 'Show typing animation', id: `${config.PREFIX}autotyping on` },
              { title: '📍 ➤ 𝐅𝐚𝐤𝐞 𝐓𝐲𝐩𝐢𝐧𝐠 ▸ 𝐎𝐅𝐅', description: 'Hide typing animation', id: `${config.PREFIX}autotyping off` },
              { title: '📍 ➤ 𝐅𝐚𝐤𝐞 𝐑𝐞𝐜 ▸ 𝐎𝐍', description: 'Show recording audio', id: `${config.PREFIX}autorecording on` },
              { title: '📍 ➤ 𝐅𝐚𝐤𝐞 𝐑𝐞𝐜 ▸ 𝐎𝐅𝐅', description: 'Hide recording audio', id: `${config.PREFIX}autorecording off` },
            ],
          },
          {
            title: '📍 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  ᴀᴜᴛᴏᴍᴀᴛɪᴏɴ & ᴛᴏᴏʟꜱ',
            rows: [
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐒𝐞𝐞𝐧 𝐒𝐭𝐚𝐭𝐮𝐬 ▸ 𝐎𝐍', description: 'View statuses automatically', id: `${config.PREFIX}rstatus on` },
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐒𝐞𝐞𝐧 𝐒𝐭𝐚𝐭𝐮𝐬 ▸ 𝐎𝐅𝐅', description: 'Do not view statuses', id: `${config.PREFIX}rstatus off` },
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐋𝐢𝐤𝐞 𝐒𝐭𝐚𝐭𝐮𝐬 ▸ 𝐎𝐍', description: 'React to statuses', id: `${config.PREFIX}arm on` },
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐋𝐢𝐤𝐞 𝐒𝐭𝐚𝐭𝐮𝐬 ▸ 𝐎𝐅𝐅', description: 'Do not react', id: `${config.PREFIX}arm off` },
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐑𝐞𝐣𝐞𝐜𝐭 𝐂𝐚𝐥𝐥 ▸ 𝐎𝐍', description: 'Decline incoming calls', id: `${config.PREFIX}creject on` },
              { title: '📍 ➤ 𝐀𝐮𝐭𝐨 𝐑𝐞𝐣𝐞𝐜𝐭 𝐂𝐚𝐥𝐥 ▸ 𝐎𝐅𝐅', description: 'Allow incoming calls', id: `${config.PREFIX}creject off` },
            ],
          },
          {
            title: '📍 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  ᴍᴇꜱꜱᴀɢᴇ ʜᴀɴᴅʟɪɴɢ',
            rows: [
              { title: '📍 𝐑𝐞𝐚𝐝 𝐀𝐥𝐥 : 𝐎𝐍', description: 'Blue tick everything', id: `${config.PREFIX}mread all` },
              { title: '📍 𝐑𝐞𝐚𝐝 𝐂𝐦𝐝𝐬 : 𝐎𝐍', description: 'Blue tick commands only', id: `${config.PREFIX}mread cmd` },
              { title: '📍  𝐀𝐮𝐭𝐨 𝐑𝐞𝐚𝐝 : 𝐎𝐅𝐅', description: 'Stay on grey ticks', id: `${config.PREFIX}mread off` },
            ],
          },
        ],
      }),
    };

    // 5. Build Aesthetic Caption
    const fancyWork = (currentConfig.WORK_TYPE || 'public').toUpperCase();
    const fancyPresence = (currentConfig.PRESENCE || 'available').toUpperCase();
    
    const msgCaption = `
*╭─╮*
*✦╭ᴡᴏʀᴋ ᴛʏᴘᴇ* ${currentConfig.WORK_TYPE || 'public'}
*├► ʙᴏᴛ ᴘʀᴇꜱᴇɴᴄᴇ* ${currentConfig.PRESENCE || 'available'}
*├► ᴀᴜᴛɪ ᴠɪᴇᴡ ꜱᴛᴀᴛᴜꜱ* ${currentConfig.AUTO_VIEW_STATUS || 'true'}
*├► ᴀᴜᴛᴏ ʟɪᴋᴇ ꜱᴛᴀᴛᴜꜱ* ${currentConfig.AUTO_LIKE_STATUS || 'true'}
*├► ᴀᴜᴛᴏ ᴀɴᴛɪ ᴄᴀʟʟ* ${currentConfig.ANTI_CALL || 'off'}
*├► ᴀᴜᴛᴏ ʀᴇᴀᴅ ᴍᴀꜱꜱᴀɢᴇ* ${currentConfig.AUTO_READ_MESSAGE || 'off'}
*├► ᴀᴜᴛᴏ ʀᴇᴄᴏʀᴅɪɴɢ* ${currentConfig.AUTO_RECORDING || 'false'}
*✦╰ᴀᴜᴛᴏ ᴛʏᴘɪɴɢ* ${currentConfig.AUTO_TYPING || 'false'}
*╰─╯*
    `.trim();

    // 6. Send the Message
    await socket.sendMessage(sender, {
      headerType: 1,
      viewOnce: true,
      image: { url: currentConfig.logo || config.RCD_IMAGE_PATH },
      caption: msgCaption,
      buttons: [
        {
          buttonId: 'settings_action',
          buttonText: { displayText: '⚙️ 𝐎𝐏𝐄𝐍 𝐂𝐎𝐍𝐅𝐈𝐆' },
          type: 4,
          nativeFlowInfo: settingOptions,
        },
      ],
      footer: `📍 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 ${config.OWNER_NAME || 'Bot Owner'}`,
    }, { quoted: msg });

  } catch (e) {
    console.error('Setting command error:', e);
    const errorCard = {
      key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ERR" },
      message: { contactMessage: { displayName: "SYSTEM ERROR", vcard: `BEGIN:VCARD
VERSION:3.0
N:Error;;;;
FN:System Error
END:VCARD` } }
    };
    
    // FIX 2: Used backticks (`) for multi-line text here too
    await socket.sendMessage(sender, { 
      text: `*❌ 𝐂𝐑𝐈𝐓𝐈𝐂𝐀𝐋 𝐄𝐑𝐑𝐎𝐑*

_Failed to load settings menu. Check console logs._` 
    }, { quoted: errorCard });
  }
  break;
}


// 	𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗽𝗮𝗶𝗿 💚💚
case 'pair':
case 'freebot': {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    const number = q.replace(/^[.\/!]pair\s*/i, '').trim();

    if (!number) {
        return await socket.sendMessage(sender, {
            text: '*📃 Usage:* .freebot +9476XXX'
        }, { quoted: msg });
    }

    try {
        const url = `https://ernnda-md-v2-mini-bot-c1f9dde05b1c.herokuapp.com/code?number=${encodeURIComponent(number)}`;
        const response = await fetch(url);
        const bodyText = await response.text();
        const botUrl = "https://ernnda-md-mini-bot.vercel.app/";
        
        let result;
        try {
            result = JSON.parse(bodyText);
        } catch (e) {
            return await socket.sendMessage(sender, {
                text: '❌ Invalid response from server.'
            }, { quoted: msg });
        }

        if (!result || !result.code) {
            return await socket.sendMessage(sender, {
                text: '❌ Failed to retrieve pairing code.'
            }, { quoted: msg });
        }
       
        const mainMsg = `*𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  ᴘᴀɪʀ ᴄᴏɴɴᴇᴄᴛᴇᴅ* ✅\n\n*🔑 ʏᴏᴜʀ ᴘᴀɪʀ ᴄᴏᴅᴇ :* ${result.code}\n*🌐 ʙᴏᴛ ʟɪɴᴋ :* ${botUrl}\n\n> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

        await socket.sendMessage(sender, { text: mainMsg }, { quoted: msg });

        await sleep(1500);
       
        await socket.sendMessage(sender, {
            text: '```' + result.code + '```'
        }, { quoted: msg });  

    } catch (err) {
        console.error("❌ Pair Command Error:", err);
        await socket.sendMessage(sender, {
            text: '❌ An error occurred. Please try again.'
        }, { quoted: msg });
    }

    break;
}		

    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗠ᴇɴᴜ 𝗖ᴀꜱᴇ
        case 'activesessions':
        case 'active':
        case 'bots': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY;
            const logo = cfg.logo || config.RCD_IMAGE_PATH;

            // Permission check - only owner and admins can use this
            const admins = await loadAdminsFromMongo();
            const normalizedAdmins = (admins || []).map(a => (a || '').toString());
            const senderIdSimple = (nowsender || '').includes('@') ? nowsender.split('@')[0] : (nowsender || '');
            const isAdmin = normalizedAdmins.includes(nowsender) || normalizedAdmins.includes(senderNumber) || normalizedAdmins.includes(senderIdSimple);

            if (!isOwner && !isAdmin) {
              await socket.sendMessage(sender, {
                text: '❌ Permission denied. Only bot owner or admins can check active sessions.'
              }, { quoted: msg });
              break;
            }

            const activeCount = activeSockets.size;
            const activeNumbers = Array.from(activeSockets.keys());

            // Meta AI mention
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ACTIVESESSIONS" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            let text = `*📡 aᴄᴛɪᴠᴇ sᴇꜱꜱɪᴏɴꜱ - ${botName}*\n\n`;
            text += `📊 *tᴏᴛᴀʟ aᴄᴛɪᴠᴇ sᴇꜱꜱɪᴏɴꜱ:* ${activeCount}\n\n`;

            if (activeCount > 0) {
              text += `📱 *Aᴄᴛɪᴠᴇ nᴜᴍʙᴇʀꜱ:*\n`;
              activeNumbers.forEach((num, index) => {
                text += `${index + 1}. ${num}\n`;
              });
            } else {
              text += `⚠️ No active sessions found.`;
            }

            text += `\n*🕒 𝗖ʜᴇᴄᴋᴇᴅ aᴛ:* ${getSriLankaTimestamp()}`;

            let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

            await socket.sendMessage(sender, {
              image: imagePayload,
              caption: text,
              footer: `*${botName}*`,
              buttons: [
                { buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝗠ᴇɴᴜ" }, type: 1 },
                { buttonId: `${config.PREFIX}ping`, buttonText: { displayText: "💜 𝗣ɪɴɢ" }, type: 1 }
              ],
              headerType: 4
            }, { quoted: metaQuote });

          } catch (e) {
            console.error('activesessions error', e);
            await socket.sendMessage(sender, {
              text: '❌ Failed to fetch active sessions information.'
            }, { quoted: msg });
          }
          break;
        }


  // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗣ɪɴɢ 𝗖ᴀꜱᴇ
 case 'ping': 
 case 'speed': {
  try {
    const start = Date.now();

    const sanitized = (number || '').replace(/[^0-9]/g, '');
    const cfg = await loadUserConfigFromMongo(sanitized) || {};
    const botName = cfg.botName || BOT_NAME_FANCY;
    const logo = cfg.logo || config.RCD_IMAGE_PATH;
    const userTag = `@${sender.split("@")[0]}`;

    // Sri Lanka Time
    const now = new Date();
    const sriLankaTime = now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
    const sriLankaDate = new Date(sriLankaTime);
    const currentHour = sriLankaDate.getHours();

    let greeting;
    if (currentHour >= 5 && currentHour < 12) {
      greeting = 'Good Morning 🌅';
    } else if (currentHour >= 12 && currentHour < 18) {
      greeting = 'Good Afternoon ☀️';
    } else {
      greeting = 'Good Evening 🌙';
    }

    const formattedTime = sriLankaDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Colombo'
    });

    // Runtime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const end = Date.now();
    const latency = end - start;

    const speedStatus = latency < 200
      ? 'Excellent 💚'
      : latency < 500
      ? 'Good 🧡'
      : 'Slow ❤️';

    const text = `
┍『 ✨ *𝐄𝚁𝙰𝙽𝙼𝙳𝙰-𝐒𝙿𝙴𝙴𝙳* 』━●►
├► 👤 *USER* : ${userTag}
├► 🌏 *GREETING* : ${greeting}
├► ⏰ *TIME* : ${formattedTime}
├► 🔖 *SPEED* : ${latency} ms...📍
├► 🖥️ *RUNTIME* : ${hours}h ${minutes}m ${seconds}s
├► 📡 *STATUS* : ${speedStatus}
┕━━━━━━━━━━━━━●►
`;

    let imagePayload = String(logo).startsWith('http')
      ? { url: logo }
      : fs.readFileSync(logo);

    // 🔘 Buttons
    const buttons = [
      {
        buttonId: 'menu',
        buttonText: { displayText: '💜 Back To Menu' },
        type: 1
      },
      {
        buttonId: 'alive',
        buttonText: { displayText: '💜 Alive' },
        type: 1
      }
    ];

    await socket.sendMessage(sender, {
      image: imagePayload,
      caption: text,
      footer: `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`,
      buttons: buttons,
      headerType: 4
    }, { quoted: msg });

  } catch (e) {
    console.error('ping error', e);
    await socket.sendMessage(sender, {
      text: '❌ Failed to test ping.'
    }, { quoted: msg });
  }
  break;
}

   // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗦ʏꜱᴛᴇᴍ 𝗖ᴀꜱᴇ
        case 'system': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY;
            const logo = cfg.logo || config.RCD_IMAGE_PATH;

            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SYSTEM" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            const os = require('os');
            const text = `
*┎━━『 📁 *𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 𝐒𝚈𝚂𝚃𝙴𝙼 𝐈𝙽𝙵𝙾* 』━●►*
*├► 🧸 oꜱ:* ${os.type()} ${os.release()}
*├► 📡 pʟᴀᴛꜰᴏʀᴍ :* ${os.platform()}
*├► 🧠 cᴘᴜ ᴄᴏʀᴇꜱ:* ${os.cpus().length}
*├► 💾 Mᴇᴍᴏʀʏ:* ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB
*┕━━━━━━━━━━━━━●►*
`;

            let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

            await socket.sendMessage(sender, {
              image: imagePayload,
              caption: text,
              footer: `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`,
              buttons: [{ buttonId: `${config.PREFIX}menu`, buttonText: { displayText: "💜 𝗠ᴇɴᴜ" }, type: 1 }],
              headerType: 4
            }, { quoted: metaQuote });

          } catch (e) {
            console.error('system error', e);
            await socket.sendMessage(sender, { text: '❌ Failed to get system info.' }, { quoted: msg });
          }
          break;
 }


        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗩ɪᴅᴇᴏ 𝗖ᴀꜱᴇ
        case 'videop1': {
          const yts = require('yt-search');
          const axios = require('axios'); // axios භාවිතා කරන්න
          const apibase = "https://api.srihub.store";
          const apikey = "dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl";

          await socket.sendMessage(from, { react: { text: '🎥', key: msg.key } });

          // Extract YouTube ID
          function extractYouTubeId(url) {
            const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
            const match = url.match(regex);
            return match ? match[1] : null;
          }

          // Normalize YouTube URL
          function normalizeLink(input) {
            const id = extractYouTubeId(input);
            return id ? `https://www.youtube.com/watch?v=${id}` : input;
          }

          const q =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || '';

          if (!q.trim()) {
            return socket.sendMessage(from, { text: '*Enter YouTube URL or Title.*' });
          }

          const query = normalizeLink(q.trim());

          try {
            // YouTube search
            const searchResults = await yts(query);
            const v = searchResults.videos[0];
            if (!v) return socket.sendMessage(from, { text: '*No results found.*' });

            const youtubeUrl = v.url;
            const encodedUrl = encodeURIComponent(youtubeUrl);

            const caption = `*🎬 𝘙𝘌𝘋 𝘞𝘈𝘛𝘌𝘙 𝗩ɪᴅᴇᴏ 𝗗ᴏᴡɴʟᴏᴀᴅᴇʀ ??*

┏━━━━━━━━━━━◆◉◉➤
┃🎵 *𝗧ɪᴛʟᴇ:* ${v.title}
┃⏱️ *𝗗ᴜʀᴀᴛɪᴏɴ:* ${v.timestamp}
┃👀 *𝗩ɪᴇᴡꜱ:* ${v.views}
┃📆 *𝗥ᴇʟᴇᴀꜱᴇᴅ:* ${v.ago}
┃🔗 *𝗨ʀʟ:* https://youtu.be/${extractYouTubeId(youtubeUrl) || 'N/A'}
┗━━━━━━━━━━━◆◉◉➤

> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

            // Create buttons for format selection
            const buttons = [
              {
                buttonId: 'video_video',
                buttonText: { displayText: '📽️ 𝗩ɪᴅᴇᴏ' },
                type: 1
              },
              {
                buttonId: 'video_doc',
                buttonText: { displayText: '🗂️ 𝗗ᴏᴄᴜᴍᴇɴᴛ' },
                type: 1
              },
              {
                buttonId: 'video_audio',
                buttonText: { displayText: '🎧 𝗔ᴜᴅɪᴏ' },
                type: 1
              }
            ];

            const sentMsg = await socket.sendMessage(
              from,
              {
                image: { url: v.thumbnail },
                caption: caption,
                buttons: buttons,
                headerType: 4
              },
              { quoted: msg }
            );

            // Handler for button responses
            const handler = async (update) => {
              try {
                const m = update.messages && update.messages[0];
                if (!m) return;

                const fromId = m.key.remoteJid || m.key.participant;
                if (fromId !== from) return;

                // Check for button response
                const buttonResponse = m.message?.buttonsResponseMessage;
                if (buttonResponse) {
                  const contextId = buttonResponse.contextInfo?.stanzaId;
                  if (!contextId || contextId !== sentMsg.key.id) return;

                  const selectedId = buttonResponse.selectedButtonId;

                  await socket.sendMessage(from, {
                    react: { text: "📥", key: m.key }
                  });

                  let downloadUrl, fileName, mimeType;

                  try {
                    if (selectedId === 'video_video' || selectedId === 'video_doc') {
                      // Video download
                      const videoApiUrl = `${apibase}/download/ytmp4?apikey=${apikey}&url=${encodedUrl}&format=1080`;
                      console.log('Fetching video from:', videoApiUrl);

                      const videoResponse = await axios.get(videoApiUrl, { timeout: 30000 });
                      const videoData = videoResponse.data;

                      console.log('Video API response:', JSON.stringify(videoData, null, 2));

                      if (!videoData.success || !videoData.result?.download_url) {
                        console.error('Video download API error:', videoData);
                        return socket.sendMessage(from, {
                          text: "❌ Video download failed. API returned an error."
                        }, { quoted: m });
                      }

                      downloadUrl = videoData.result.download_url;
                      fileName = `${v.title.replace(/[^\w\s]/gi, '')}.mp4`;
                      mimeType = "video/mp4";

                      console.log('Download URL:', downloadUrl);

                      if (selectedId === 'video_video') {
                        // Send as video
                        await socket.sendMessage(from, {
                          video: { url: downloadUrl },
                          mimetype: mimeType,
                          caption: `*${v.title}*`
                        }, { quoted: m });
                      } else if (selectedId === 'video_doc') {
                        // Send as document
                        await socket.sendMessage(from, {
                          document: { url: downloadUrl },
                          mimetype: mimeType,
                          fileName: fileName,
                          caption: `*${v.title}*`
                        }, { quoted: m });
                      }

                    } else if (selectedId === 'video_audio') {
                      // Audio download (MP3)
                      const audioApiUrl = `${apibase}/download/ytmp3?apikey=${apikey}&url=${encodedUrl}`;
                      console.log('Fetching audio from:', audioApiUrl);

                      const audioResponse = await axios.get(audioApiUrl, { timeout: 30000 });
                      const audioData = audioResponse.data;

                      console.log('Audio API response:', JSON.stringify(audioData, null, 2));

                      if (!audioData.success || !audioData.result?.download_url) {
                        console.error('Audio download API error:', audioData);
                        return socket.sendMessage(from, {
                          text: "❌ Audio download failed. API returned an error."
                        }, { quoted: m });
                      }

                      downloadUrl = audioData.result.download_url;
                      fileName = `${v.title.replace(/[^\w\s]/gi, '')}.mp3`;

                      console.log('Audio Download URL:', downloadUrl);

                      // Send as audio
                      await socket.sendMessage(from, {
                        audio: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        ptt: false, // Voice message ලෙස නොව සාමාන්ය audio ලෙස
                        fileName: fileName,
                        caption: `*${v.title}*`
                      }, { quoted: m });
                    }

                  } catch (apiError) {
                    console.error('API Error:', apiError);
                    await socket.sendMessage(from, {
                      text: `❌ Download failed: ${apiError.message || 'Unknown error'}`
                    }, { quoted: m });
                  }

                  // Clean up
                  socket.ev.off("messages.upsert", handler);
                  return;
                }

                // Check for text response (fallback)
                const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
                if (!text) return;

                // Check if this is a reply to our message
                if (m.message.extendedTextMessage?.contextInfo?.stanzaId !== sentMsg.key.id) return;

                const selected = text.trim();

                await socket.sendMessage(from, {
                  react: { text: "📥", key: m.key }
                });

                try {
                  if (selected === "1") {
                    // Video download
                    const videoApiUrl = `${apibase}/download/ytmp4?apikey=${apikey}&url=${encodedUrl}&format=1080`;
                    const videoResponse = await axios.get(videoApiUrl);
                    const videoData = videoResponse.data;

                    if (!videoData.success || !videoData.result?.download_url) {
                      return socket.sendMessage(from, {
                        text: "❌ Video download failed."
                      }, { quoted: m });
                    }

                    const downloadUrl = videoData.result.download_url;
                    await socket.sendMessage(from, {
                      video: { url: downloadUrl },
                      mimetype: "video/mp4",
                      caption: `*${v.title}*`
                    }, { quoted: m });

                  } else if (selected === "2") {
                    // Video as document
                    const videoApiUrl = `${apibase}/download/ytmp4?apikey=${apikey}&url=${encodedUrl}&format=1080`;
                    const videoResponse = await axios.get(videoApiUrl);
                    const videoData = videoResponse.data;

                    if (!videoData.success || !videoData.result?.download_url) {
                      return socket.sendMessage(from, {
                        text: "❌ Video download failed."
                      }, { quoted: m });
                    }

                    const downloadUrl = videoData.result.download_url;
                    await socket.sendMessage(from, {
                      document: { url: downloadUrl },
                      mimetype: "video/mp4",
                      fileName: `${v.title.replace(/[^\w\s]/gi, '')}.mp4`,
                      caption: `*${v.title}*`
                    }, { quoted: m });

                  } else if (selected === "3") {
                    // Audio download (MP3)
                    const audioApiUrl = `${apibase}/download/ytmp3?apikey=${apikey}&url=${encodedUrl}`;
                    const audioResponse = await axios.get(audioApiUrl);
                    const audioData = audioResponse.data;

                    if (!audioData.success || !audioData.result?.download_url) {
                      return socket.sendMessage(from, {
                        text: "❌ Audio download failed."
                      }, { quoted: m });
                    }

                    const downloadUrl = audioData.result.download_url;
                    await socket.sendMessage(from, {
                      audio: { url: downloadUrl },
                      mimetype: "audio/mpeg",
                      ptt: false,
                      caption: `*${v.title}*`
                    }, { quoted: m });

                  } else {
                    await socket.sendMessage(from, {
                      text: "❌ Invalid option. Please click the buttons."
                    }, { quoted: m });
                    return;
                  }

                } catch (apiError) {
                  console.error('API Error in text response:', apiError);
                  await socket.sendMessage(from, {
                    text: "❌ Download failed. Please try again."
                  }, { quoted: m });
                }

                // Clean up
                socket.ev.off("messages.upsert", handler);

              } catch (error) {
                console.error("Handler error:", error);
                await socket.sendMessage(from, {
                  text: "❌ An error occurred. Please try again."
                }, { quoted: msg });
                socket.ev.off("messages.upsert", handler);
              }
            };

            // Add event listener
            socket.ev.on("messages.upsert", handler);

            // Auto remove listener after 5 minutes
            setTimeout(() => {
              try {
                socket.ev.off("messages.upsert", handler);
              } catch (e) {
                console.error('Error removing listener:', e);
              }
            }, 5 * 60 * 1000);

          } catch (e) {
            console.error('Main error:', e);
            socket.sendMessage(from, {
              text: "*❌ Error fetching video. Please check the URL or try again later.*"
            });
          }
          break;
        }


        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗡ᴇᴡꜱ 𝗖ᴀꜱᴇ

case 'news': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY;
            const logo = cfg.logo || config.RCD_IMAGE_PATH;


            // Get current time for Sri Lanka (IST - UTC+5:30)
            const now = new Date();

            // Set Sri Lanka timezone
            const options = { timeZone: 'Asia/Colombo' };

            // Get current hour in Sri Lanka time
            const sriLankaTime = now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
            const sriLankaDate = new Date(sriLankaTime);
            const currentHour = sriLankaDate.getHours();

            let greeting;
            if (currentHour >= 5 && currentHour < 12) {
              greeting = 'Good Morning 🌅';
            } else if (currentHour >= 12 && currentHour < 18) {
              greeting = 'Good Afternoon';
            } else {
              greeting = 'Good Evening 🌙';
            }

            // Format date and day separately for Sri Lanka
            const optionsDate = {
              month: 'long',
              day: 'numeric',
              timeZone: 'Asia/Colombo'
            };
            const formattedDate = sriLankaDate.toLocaleDateString('en-US', optionsDate);

            const optionsDay = {
              weekday: 'long',
              timeZone: 'Asia/Colombo'
            };
            const formattedDay = sriLankaDate.toLocaleDateString('en-US', optionsDay);

            // Format time for Sri Lanka
            const optionsTime = {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: 'Asia/Colombo'
            };
            const formattedTime = sriLankaDate.toLocaleTimeString('en-US', optionsTime);

            // Meta AI mention
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ALIVE" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            // 1. Send video note first
            const vnoteUrl = 'https://files.catbox.moe/thrvup.mp4';
            await socket.sendMessage(sender, {
              video: { url: vnoteUrl },
              ptv: true
            }, { quoted: metaQuote });

            await new Promise(resolve => setTimeout(resolve, 500));


            const text = `
*𝗛ɪ 👋 𝐄𝚁𝙰𝙽𝙽𝙳𝙰-𝐌𝙳 𝗠ɪɴɪ 𝗕ᴏᴛ 𝗨ꜱᴇʀ*

*┎━━『 📰 *𝐄𝚁𝙰𝙽𝙽𝙳𝙰-𝐌𝙳 𝐍𝙴𝚆𝚂* 』━●►
*├► 🗯️ ɢʀᴇᴇᴛɪɴɢ :* ${greeting}
*├► 𝙼𝚈 𝙳𝙴𝙰𝚁 𝚄𝚂𝙴𝚁 𝚃𝙷𝙸𝚂 𝙸𝚂* 
*├► 𝙴𝚁𝙰𝙽𝙽𝙳𝙰-𝙼𝙳 𝙽𝙴𝚆𝚂 𝚄𝙿𝙳𝙰𝚃𝙴𝚂*
*┕━━━━━━━━━●►
`;

            const buttons = [
              {
                buttonId: 'action',
                buttonText: {
                  displayText: '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 𝐍𝙴𝚆𝚂 📰'
                },
                type: 4,
                nativeFlowInfo: {
                  name: 'single_select',
                  paramsJson: JSON.stringify({
                    title: 'CLICK HERE',
                    sections: [
                      {
                        title: `DAILY NEWS 📰`,
                        highlight_label: '𝙷𝙴𝙻𝙻𝙾 𝙽𝙴𝚆𝚂 📰',
                        rows: [
                          {
                            title: 'ᴀᴅᴀɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ᴀᴅᴀ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}ada`,
                          },
                          {
                            title: 'ʜɪʀᴜ ɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ʜɪʀᴜ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}hiru`,
                          },
                          {
                            title: 'ꜱɪʀᴀꜱᴀ ɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ꜱɪʀᴀꜱᴀ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}sirasa`,
                          },
                          {
                            title: 'ɪᴛɴ ɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ɪᴛɴ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}itn`,
                          },
                          // පස්සෙ කෑල්ල මෙතනට
                          {
                            title: 'ʟɴᴡ ɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ʟɴᴡ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}lnw`,
                          },
                          {
                            title: 'ʙʙᴄ ɴᴇᴡꜱ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ʙʙᴄ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}bbc`,
                          },
                          // මෙතනට ටයිපින්
                          {
                            title: 'ᴅᴀꜱᴀᴛʜᴀ ʟᴀɴᴋᴀ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ᴅᴀꜱᴀᴛʜᴀ ɴᴡᴇꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}dasathalanka`,
                          },
                          {
                            title: 'ꜱɪʏᴀᴛᴀ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ꜱɪʏᴀᴛʜᴀ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}siyatha`,
                          },
                          // රෙකෝඩින් එක මෙතනට
                          {
                            title: 'ʟᴀɴᴋᴀᴅᴇᴇᴘᴀ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ʟᴀɴᴋᴀᴅᴇᴇᴘᴀ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}lankadeepa`,
                          },
                          {
                            title: 'ɢᴀɢᴀɴᴀ 📰',
                            description: 'ᴇʀᴀɴɴᴅᴀ_ᴍᴅ ɢᴀɢᴀɴᴀ ɴᴇᴡꜱ ᴜᴘᴅᴀᴛᴇ 📍',
                            id: `${config.PREFIX}gagana`,
                          },
                          // මෙතනට තව මොකක් හරි
                          
                        ],
                      },
                    ],
                  }),
                },
              },
            ]

            let imagePayload = String(logo).startsWith('http') ? { url: logo } : fs.readFileSync(logo);

            await socket.sendMessage(sender, {
              image: imagePayload,
              caption: text,
              footer: `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`,
              buttons,
              headerType: 4
            }, { quoted: metaQuote });

          } catch (e) {
            console.error('alive error', e);
            await socket.sendMessage(sender, { text: '❌ Failed to send alive status.' }, { quoted: msg });
          }
          break;
									 }
			  
  case 'siyatha': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_SIYATHA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/siyatha?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Siyatha News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗦ɪʏᴀᴛʜᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 ??ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('siyatha error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Siyatha News.' }, { quoted: botMention });
          }
          break;
        }

        case 'bbc': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_BBC" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/bbc?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch BBC News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗕ʙᴄ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('bbc error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching BBC News.' }, { quoted: botMention });
          }
          break;
        }

        case 'lnw': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_LNW" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/lnw?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch LNW News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗟ɴᴡ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('lnw error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching LNW News.' }, { quoted: botMention });
          }
          break;
        }

        case 'dasathalanka': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_DASA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/dasathalanka?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Dasa Thalanka News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗗ᴀꜱᴀᴛʜᴀʟᴀɴᴋᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('dasathalanka error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Dasa Thalanka News.' }, { quoted: botMention });
          }
          break;
        }

        case 'itn': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ITN" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/itn?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch ITN News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗜ᴛɴ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('itnnews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching ITN News.' }, { quoted: botMention });
          }
          break;
        }

        case 'hiru': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_HIRU" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://api.srihub.store/news/hiru?apikey=dew_nPUIx9HHozkgxSpy3H9FgUQ1OVylTVgdoUJC44Gl');
            if (!res.data?.success || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Hiru News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗛ɪʀᴜ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('hirunews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Hiru News.' }, { quoted: botMention });
          }
          break;
        }

        case 'ada': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_ADA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/ada');
            if (!res.data?.status || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Ada News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗔ᴅᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('adanews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Ada News.' }, { quoted: botMention });
          }
          break;
        }

        case 'sirasa': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_SIRASA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/sirasa');
            if (!res.data?.status || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Sirasa News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗦ɪʀᴀꜱᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('sirasanews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Sirasa News.' }, { quoted: botMention });
          }
          break;
        }

        case 'lankadeepa': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_LANKADEEPA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/lankadeepa');
            if (!res.data?.status || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Lankadeepa News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗟ᴀɴᴋᴀᴅᴇᴇᴘᴀ 𝗡ᴇᴡꜱ : ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('lankadeepanews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Lankadeepa News.' }, { quoted: botMention });
          }
          break;
        }

        case 'gagana': {
          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_GAGANA" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get('https://saviya-kolla-api.koyeb.app/news/gagana');
            if (!res.data?.status || !res.data.result) return await socket.sendMessage(sender, { text: '❌ Failed to fetch Gagana News.' }, { quoted: botMention });

            const n = res.data.result;
            const caption = `📰 *𝗚ᴀɢᴀɴᴀ 𝗡ᴇᴡꜱ ${n.title}*\n\n*📅 𝗗ᴀᴛᴇ :* ${n.date}\n*⏰ 𝗧ɪᴍᴇ :* ${n.time}\n\n${n.desc}\n\n*🔗 𝗥ᴇᴀᴅ 𝗠ᴏʀᴇ :* (${n.url})\n\n> *${botName}*`;

            await socket.sendMessage(sender, { image: { url: n.image }, caption, contextInfo: { mentionedJid: [sender] } }, { quoted: botMention });

          } catch (err) {
            console.error('gagananews error:', err);
            await socket.sendMessage(sender, { text: '❌ Error fetching Gagana News.' }, { quoted: botMention });
          }
          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗜ᴍᴀɢᴇ 𝗖ᴀꜱᴇ

        case 'img': {
          const q = body.replace(/^[.\/!]img\s*/i, '').trim();
          if (!q) return await socket.sendMessage(sender, {
            text: '🔍 Please provide a search query. Ex: `.img sunset`'
          }, { quoted: msg });

          try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const userCfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = userCfg.botName || BOT_NAME_FANCY;

            const botMention = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_FAKE_ID_IMG" },
              message: {
                contactMessage: {
                  displayName: botName, vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD` }
              }
            };

            const res = await axios.get(`https://allstars-apis.vercel.app/pinterest?search=${encodeURIComponent(q)}`);
            const data = res.data.data;
            if (!data || data.length === 0) return await socket.sendMessage(sender, { text: '❌ No images found for your query.' }, { quoted: botMention });

            const randomImage = data[Math.floor(Math.random() * data.length)];

            const buttons = [{ buttonId: `${config.PREFIX}img ${q}`, buttonText: { displayText: "⏩ 𝗡ᴇxᴛ 𝗜ᴍɢ" }, type: 1 }];

            const buttonMessage = {
              image: { url: randomImage },
              caption: `🖼️ *𝗜ᴍᴀɢᴇ 𝗦ᴇᴀʀᴄʜ* ${q}\n\n> *${botName}*`,
              footer: config.FOOTER || '𝗦ᴇᴀʀᴄʜ 𝗜ᴍᴀɢᴇ',
              buttons: buttons,
              headerType: 4,
              contextInfo: { mentionedJid: [sender] }
            };

            await socket.sendMessage(from, buttonMessage, { quoted: botMention });

          } catch (err) {
            console.error("Image search error:", err);
            await socket.sendMessage(sender, { text: '❌ Failed to fetch images.' }, { quoted: botMention });
          }
          break;
        }
        

  // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗚ᴇᴛᴅᴘ 𝗖ᴀꜱᴇ
case 'getpp':
case 'getdp':
case 'dp': {
    // 1. React with loading
    await socket.sendMessage(sender, { react: { text: '👤', key: msg.key } });

    try {
        // --- CONFIG & STYLE LOAD ---
        // (Assuming you have a function to get config, otherwise defaults use hardcoded values)
        const sanitizedSender = sender.split('@')[0];
        const cfg = await loadUserConfigFromMongo(sanitizedSender).catch(() => ({})) || {};
        const botName = cfg.botName || "𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡"; // Default Artful Name
        const logo = cfg.logo || "https://files.catbox.moe/qb2puf.jpeg"; // Default Logo
        
        // --- TARGET RESOLUTION (The "Bind" Logic) ---
        let targetUser = sender; // Default to self
        let inputNumber = msg.message?.conversation?.split(" ")[1] || 
                          msg.message?.extendedTextMessage?.text?.split(" ")[1];

        if (inputNumber) {
            // If number provided (getdp style)
            targetUser = inputNumber.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
        } else if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            // If mention exists
            targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.quoted) {
            // If reply exists
            targetUser = msg.quoted.sender;
        }

        const userNum = targetUser.split('@')[0];

        // --- FETCH PP (HD -> Privacy Fallback) ---
        let ppUrl, mode = 'HD IMAGE';
        try {
            ppUrl = await socket.profilePictureUrl(targetUser, 'image'); // Try HD
        } catch {
            try {
                mode = 'PREVIEW';
                ppUrl = await socket.profilePictureUrl(targetUser, 'preview'); // Try Preview
            } catch {
                mode = 'NOT FOUND';
                ppUrl = logo; // Fallback to bot logo if no PP allowed
            }
        }

        // --- ARTFUL CAPTION ---
        const caption = `
┎━━「 👤 *PROFILE PIC* 」━●►
├► 👤 *User:* @${userNum}
├► 🎭 *Mode:* ${mode}
├► 🤖 *Bot:* ${botName}
┕━━━━━━━━━━●►


   *අඩන්න එපා හලිද profile එක විතරයිනේ ගත්තේ මන් අල ගේනත් දෙන්නම්කො සුදු හලිද 🥺💗𝐐𝐔𝐄𝐄𝐍 𝐑𝐄𝐃 𝐂𝐇𝐔𝐓𝐈 𝐌𝐃 𝐕1=.owner0705851067*
`;

        // --- META BROADCAST QUOTE (Style) ---
        const metaQuote = {
            key: { 
                remoteJid: "status@broadcast", 
                participant: "0@s.whatsapp.net", 
                fromMe: false, 
                id: "𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡" 
            },
            message: { 
                contactMessage: { 
                    displayName: botName, 
                    vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:${botName} Inc.
TEL;type=CELL;type=VOICE;waid=94700000000:+94 70 000 0000
END:VCARD` 
                } 
            }
        };

        // --- BUTTONS ---
        const buttons = [
            { 
                buttonId: `${config.PREFIX || '.'}menu`, 
                buttonText: { displayText: "💜 MAIN MENU" }, 
                type: 1 
            },
            { 
                buttonId: `${config.PREFIX || '.'}alive`, 
                buttonText: { displayText: "💜 ALIVE" }, 
                type: 1 
            }
        ];

        // --- SEND MESSAGE ---
        await socket.sendMessage(msg.key.remoteJid, {
            image: { url: ppUrl },
            caption: caption,
            footer: `Power by ${botName}`,
            buttons: buttons,
            headerType: 4,
            mentions: [targetUser]
        }, { quoted: metaQuote });

        // Success React
        await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

    } catch (e) {
        console.log("❌ PP Fetch Error:", e);
        await socket.sendMessage(msg.key.remoteJid, { 
            text: `⚠️ *Error:* Could not fetch profile picture.
_${e.message}_` 
        }, { quoted: msg });
        await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
    }
    break;
}


        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰𝗢ᴡɴᴇʀ 𝗖ᴀꜱᴇ
case 'owner':
case 'erannda': {
            const ownerNumber = '+94705861067';
            const ownerName = '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃📍📡';
            const organization = '*𝙴𝚁𝙰𝙽𝙽𝙳𝙰--𝙼𝙳 𝙾𝚆𝙽𝙴𝚁 𝙱𝚈 𝐀ʏᴇꜱʜ 𝐓ʜᴇᴍɪʏᴀ 𝙱𝙾𝚃 𝙳𝙴𝚅𝙰𝙻𝙾𝙿𝙰𝚁';
            const logoUrl = 'https://files.catbox.moe/z99gzh.mp4';

            const vcard = 'BEGIN:VCARD\n' +
                          'VERSION:3.0\n' +
                          `FN:${ownerName}\n` +
                          `ORG:${organization};\n` +
                          `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:${ownerNumber}\n` +
                          'END:VCARD';

            try {
                // Send vCard contact
                const sent = await socket.sendMessage(from, {
                    contacts: {
                        displayName: ownerName,
                        contacts: [{ vcard }]
                    }
                });
             
                await socket.sendMessage(from, {
                    text: `*𝙴𝚁𝙰𝙽𝙽𝙳𝙰 𝙼𝙳-𝙾𝚆𝙽𝙴𝚁* \n\n👤 ɴᴀᴍᴇ: ${ownerName}\n📞 ɴᴜᴍʙᴀʀ: ${ownerNumber}\n\n> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`,
                    contextInfo: {
                        mentionedJid: [`${ownerNumber.replace('+', '')}@s.whatsapp.net`],
                        externalAdReply: {
                            title: `ᴏᴡɴᴇʀ: ${ownerName}`,
                            body: '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡',
                            thumbnailUrl: logoUrl, 
                            sourceUrl: `https://wa.me/${ownerNumber.replace('+', '')}`,
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                }, { quoted: msg });

            } catch (err) {
                console.error('❌ Owner command error:', err.message);
                await socket.sendMessage(from, {
                    text: '❌ Error sending owner contact.'
                }, { quoted: msg });
            }

            break;
     }



        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗧ᴀɢᴀʟʟ 𝗖ᴀꜱᴇ

        case 'tagall': {
          try {
            if (!from || !from.endsWith('@g.us')) return await socket.sendMessage(sender, { text: '❌ This command can only be used in groups.' }, { quoted: msg });

            let gm = null;
            try { gm = await socket.groupMetadata(from); } catch (e) { gm = null; }
            if (!gm) return await socket.sendMessage(sender, { text: '❌ Failed to fetch group info.' }, { quoted: msg });

            const participants = gm.participants || [];
            if (!participants.length) return await socket.sendMessage(sender, { text: '❌ No members found in the group.' }, { quoted: msg });

            const text = args && args.length ? args.join(' ') : '📢 Announcement';

            let groupPP = 'https://i.ibb.co/9q2mG0Q/default-group.jpg';
            try { groupPP = await socket.profilePictureUrl(from, 'image'); } catch (e) { }

            const mentions = participants.map(p => p.id || p.jid);
            const groupName = gm.subject || 'Group';
            const totalMembers = participants.length;

            const emojis = ['📢', '🔊', '🌐', '🛡️', '🚀', '🎯', '🧿', '🪩', '🌀', '💠', '🎊', '🎧', '📣', '🗣️'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY;

            // BotName meta mention
            const metaQuote = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_TAGALL" },
              message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            let caption = `*╭──────────╮*\n`;
            caption += `*❘ 🏷️ ɢʀᴏᴜᴘ:* ${groupName}\n`;
            caption += `*❘ 👥 ᴍᴇᴍʙᴇʀꜱ:* ${totalMembers}\n`;
            caption += `*❘ 💬 ᴍᴇꜱꜱᴀɢᴇ:* ${text}\n`;
            caption += `*╰──────────╯*\n\n`;
            caption += `*❕ᴍᴇɴᴛɪᴏɴꜱ ᴀʟʟ ᴍᴇᴍʙᴇʀꜱ*\n\n`;
            for (const m of participants) {
              const id = (m.id || m.jid);
              if (!id) continue;
              caption += `${randomEmoji} @${id.split('@')[0]}\n`;
            }
            caption += `\n> *${botName}*`;

            await socket.sendMessage(from, {
              image: { url: groupPP },
              caption,
              mentions,
            }, { quoted: metaQuote }); // <-- botName meta mention

          } catch (err) {
            console.error('tagall error', err);
            await socket.sendMessage(sender, { text: '❌ Error running tagall.' }, { quoted: msg });
          }
          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗠ᴇᴅɪᴀꜰɪʀᴇ 𝗖ᴀꜱᴇ

        case 'mediafire':
        case 'mf':
        case 'mfdl': {
          try {
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const url = text.split(" ")[1]; // .mediafire <link>

            // ✅ Load bot name dynamically
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

            // ✅ Fake Meta contact message (like Facebook style)
            const shonux = {
              key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_MEDIAFIRE"
              },
              message: {
                contactMessage: {
                  displayName: botName,
                  vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
                }
              }
            };

            if (!url) {
              return await socket.sendMessage(sender, {
                text: '🚫 *Please send a MediaFire link.*\n\nExample: .mediafire <url>'
              }, { quoted: shonux });
            }

            // ⏳ Notify start
            await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
            await socket.sendMessage(sender, { text: '*⏳ Fetching MediaFire file info...*' }, { quoted: shonux });

            // 🔹 Call API
            let api = `https://tharuzz-ofc-apis.vercel.app/api/download/mediafire?url=${encodeURIComponent(url)}`;
            let { data } = await axios.get(api);

            if (!data.success || !data.result) {
              return await socket.sendMessage(sender, { text: '❌ *Failed to fetch MediaFire file.*' }, { quoted: shonux });
            }

            const result = data.result;
            const title = result.title || result.filename;
            const filename = result.filename;
            const fileSize = result.size;
            const downloadUrl = result.url;

            const caption = `📦 *${title}*\n\n` +
              `📁 *ꜰɪʟᴇɴᴀᴍᴇ :* ${filename}\n` +
              `📏 *ꜱɪᴢᴇ :* ${fileSize}\n` +
              `🌐 *ꜰʀᴏᴍ :* ${result.from}\n` +
              `📅 *ᴅᴀᴛᴇ :* ${result.date}\n` +
              `🕑 *ᴛɪᴍᴇ :* ${result.time}\n\n` +
              
              `> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

            // 🔹 Send file automatically (document type for .zip etc.)
            await socket.sendMessage(sender, {
              document: { url: downloadUrl },
              fileName: filename,
              mimetype: 'application/octet-stream',
              caption: caption
            }, { quoted: shonux });

          } catch (err) {
            console.error("Error in MediaFire downloader:", err);

            // ✅ In catch also send Meta mention style
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            let botName = cfg.botName || ' ${botName}';

            const shonux = {
              key: {
                remoteJid: "status@broadcast",
                participant: "0@s.whatsapp.net",
                fromMe: false,
                id: "META_AI_FAKE_ID_MEDIAFIRE"
              },
              message: {
                contactMessage: {
                  displayName: botName,
                  vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
                }
              }
            };

            await socket.sendMessage(sender, { text: '*❌ Internal Error. Please try again later.*' }, { quoted: shonux });
          }
          break;
   }


  // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗪ɪᴋɪᴘᴘ 𝗖ᴀꜱᴇ
        case 'wikipp': {
          try {
            const q = args.join(' ');
            if (!q) {
              return socket.sendMessage(sender, {
                text: '❎ Please enter a pastpaper search term!\n\nExample: .wikipp o/l ict'
              }, { quoted: msg });
            }

            // quick reaction
            await socket.sendMessage(sender, { react: { text: '🔎', key: msg.key } });

            // Wiki search endpoint
            const searchApi = `https://pp-api-beta.vercel.app/api/wiki/pp?q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(searchApi, { timeout: 15000 });

            if (!data?.results || data.results.length === 0) {
              return socket.sendMessage(sender, { text: '❎ No results found for that query!' }, { quoted: msg });
            }

            // filter noisy links
            const filtered = data.results.filter(r => {
              const t = (r.title || '').toLowerCase();
              if (!r.link) return false;
              if (t.includes('next page') || t.includes('contact') || t.includes('terms') || t.includes('privacy')) return false;
              return true;
            });

            if (filtered.length === 0) {
              return socket.sendMessage(sender, { text: '❎ No relevant pastpaper results found.' }, { quoted: msg });
            }

            const results = filtered.slice(0, 5);

            // build caption
            let caption = `📚 *ᴘᴀꜱᴛ ᴘᴀᴘᴇʀ ʀᴇꜱᴜʟᴛ :* ${q}\n\n`;
            results.forEach((r, i) => {
              caption += `*${i + 1}. ${r.title}*\n🔗 𝗣ʀᴇᴠɪᴇᴡ: ${r.link}\n\n`;
            });
            caption += `*💬 ʀᴇᴘʟʏ ᴡɪᴛʜ ɴᴜᴍʙᴇʀ (1-${results.length}) to download/view.*`;

            // send list (image if thumbnail available)
            let sentMsg;
            if (results[0].thumbnail) {
              sentMsg = await socket.sendMessage(sender, {
                image: { url: results[0].thumbnail },
                caption
              }, { quoted: msg });
            } else {
              sentMsg = await socket.sendMessage(sender, {
                text: caption
              }, { quoted: msg });
            }

            // listener for user's choice
            const listener = async (update) => {
              try {
                const m = update.messages[0];
                if (!m.message) return;

                const text = m.message.conversation || m.message.extendedTextMessage?.text;
                const isReply =
                  m.message.extendedTextMessage &&
                  m.message.extendedTextMessage.contextInfo?.stanzaId === sentMsg.key.id;

                if (isReply && ['1', '2', '3', '4', '5'].includes(text)) {
                  const index = parseInt(text, 10) - 1;
                  const selected = results[index];
                  if (!selected) return;

                  await socket.sendMessage(sender, { react: { text: '⏳', key: m.key } });

                  // call wiki download endpoint to get pdfs/images
                  try {
                    const dlApi = `https://pp-api-beta.vercel.app/api/wiki/ppdl?url=${encodeURIComponent(selected.link)}`;
                    const { data: dlData } = await axios.get(dlApi, { timeout: 20000 });

                    if (!dlData?.pdfs || dlData.pdfs.length === 0) {
                      await socket.sendMessage(sender, { react: { text: '❌', key: m.key } });
                      await socket.sendMessage(sender, { text: '❎ No direct PDF found for that page.' }, { quoted: m });
                      socket.ev.off('messages.upsert', listener);
                      return;
                    }

                    const pdfs = dlData.pdfs;

                    if (pdfs.length === 1) {
                      // single pdf -> send directly
                      const pdfUrl = pdfs[0];
                      await socket.sendMessage(sender, { react: { text: '⬇️', key: m.key } });

                      await socket.sendMessage(sender, {
                        document: { url: pdfUrl },
                        mimetype: 'application/pdf',
                        fileName: `${selected.title}.pdf`,
                        caption: `📄 ${selected.title}`
                      }, { quoted: m });

                      await socket.sendMessage(sender, { react: { text: '✅', key: m.key } });
                      socket.ev.off('messages.upsert', listener);
                    } else {
                      // multiple pdfs -> list them and wait for choice
                      let desc = `📄 *${selected.title}* — multiple PDFs found:\n\n`;
                      pdfs.forEach((p, i) => {
                        desc += `*${i + 1}.* ${p.split('/').pop() || `PDF ${i + 1}`}\n`;
                      });
                      desc += `\n💬 Reply with number (1-${pdfs.length}) to download that PDF.`;

                      const infoMsg = await socket.sendMessage(sender, { text: desc }, { quoted: m });

                      const dlListener = async (dlUpdate) => {
                        try {
                          const d = dlUpdate.messages[0];
                          if (!d.message) return;

                          const text2 = d.message.conversation || d.message.extendedTextMessage?.text;
                          const isReply2 =
                            d.message.extendedTextMessage &&
                            d.message.extendedTextMessage.contextInfo?.stanzaId === infoMsg.key.id;

                          if (isReply2) {
                            if (!/^\d+$/.test(text2)) return;
                            const dlIndex = parseInt(text2, 10) - 1;
                            if (dlIndex < 0 || dlIndex >= pdfs.length) {
                              return socket.sendMessage(sender, { text: '❎ Invalid option.' }, { quoted: d });
                            }

                            const finalPdf = pdfs[dlIndex];
                            await socket.sendMessage(sender, { react: { text: '⬇️', key: d.key } });

                            try {
                              await socket.sendMessage(sender, {
                                document: { url: finalPdf },
                                mimetype: 'application/pdf',
                                fileName: `${selected.title} (${dlIndex + 1}).pdf`,
                                caption: `📄 ${selected.title} (${dlIndex + 1})`
                              }, { quoted: d });

                              await socket.sendMessage(sender, { react: { text: '✅', key: d.key } });
                            } catch (err) {
                              await socket.sendMessage(sender, { react: { text: '❌', key: d.key } });
                              await socket.sendMessage(sender, { text: `❌ Failed to send file. Direct link:\n${finalPdf}` }, { quoted: d });
                            }

                            socket.ev.off('messages.upsert', dlListener);
                            socket.ev.off('messages.upsert', listener);
                          }
                        } catch (err) {
                          // ignore
                        }
                      };

                      socket.ev.on('messages.upsert', dlListener);
                    }

                  } catch (err) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: m.key } });
                    await socket.sendMessage(sender, { text: `❌ Error fetching PDFs: ${err.message}` }, { quoted: m });
                    socket.ev.off('messages.upsert', listener);
                  }
                }
              } catch (err) {
                // ignore per-message errors
              }
            };

            socket.ev.on('messages.upsert', listener);

          } catch (err) {
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ ERROR: ${err.message}` }, { quoted: msg });
          }
          break;
        }

        // // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗣ᴀꜱᴛᴘᴀᴘᴇʀ 𝗖ᴀꜱᴇ
        case 'pp': {
          try {
            const q = args.join(' ');
            if (!q) {
              return socket.sendMessage(sender, {
                text: '❎ Please enter a pastpaper search term!\n\nExample: .pp o/l ict'
              }, { quoted: msg });
            }

            // Short reaction to show we're working
            await socket.sendMessage(sender, { react: { text: '🔎', key: msg.key } });

            // Search API (you provided)
            const searchApi = `https://pp-api-beta.vercel.app/api/pastpapers?q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(searchApi);

            if (!data?.results || data.results.length === 0) {
              return socket.sendMessage(sender, { text: '❎ No results found for that query!' }, { quoted: msg });
            }

            // Filter out generic pages like Next Page / Contact Us / Terms / Privacy
            const filtered = data.results.filter(r => {
              const t = (r.title || '').toLowerCase();
              if (!r.link) return false;
              if (t.includes('next page') || t.includes('contact us') || t.includes('terms') || t.includes('privacy policy')) return false;
              return true;
            });

            if (filtered.length === 0) {
              return socket.sendMessage(sender, { text: '❎ No relevant pastpaper results found.' }, { quoted: msg });
            }

            // Take top 5 results
            const results = filtered.slice(0, 5);

            // Build caption
            let caption = `📚 *ʀᴇꜱᴜʟᴛ ᴏꜰ ᴘᴀꜱᴛ ᴘᴀᴘᴇʀ:* ${q}\n\n`;
            results.forEach((r, i) => {
              caption += `*${i + 1}. ${r.title}*\n🔗 𝗣ʀᴇᴠɪᴇᴡ : ${r.link}\n\n`;
            });
            caption += `*💬 ʀᴇᴘʟʏ ᴡɪᴛʜ ɴᴜᴍʙᴇʀ (1-${results.length}) to download/view.*`;

            // Send first result image if any thumbnail, else just send text with first link preview
            let sentMsg;
            if (results[0].thumbnail) {
              sentMsg = await socket.sendMessage(sender, {
                image: { url: results[0].thumbnail },
                caption
              }, { quoted: msg });
            } else {
              sentMsg = await socket.sendMessage(sender, {
                text: caption
              }, { quoted: msg });
            }

            // Listener for user choosing an item (1..n)
            const listener = async (update) => {
              try {
                const m = update.messages[0];
                if (!m.message) return;

                const text = m.message.conversation || m.message.extendedTextMessage?.text;
                const isReply =
                  m.message.extendedTextMessage &&
                  m.message.extendedTextMessage.contextInfo?.stanzaId === sentMsg.key.id;

                if (isReply && ['1', '2', '3', '4', '5'].includes(text)) {
                  const index = parseInt(text, 10) - 1;
                  const selected = results[index];
                  if (!selected) return;

                  // show processing reaction
                  await socket.sendMessage(sender, { react: { text: '⏳', key: m.key } });

                  // Call download API to get direct pdf(s)
                  try {
                    const dlApi = `https://pp-api-beta.vercel.app/api/download?url=${encodeURIComponent(selected.link)}`;
                    const { data: dlData } = await axios.get(dlApi);

                    if (!dlData?.found || !dlData.pdfs || dlData.pdfs.length === 0) {
                      await socket.sendMessage(sender, { react: { text: '❌', key: m.key } });
                      await socket.sendMessage(sender, { text: '❎ No direct PDF found for that page.' }, { quoted: m });
                      // cleanup
                      socket.ev.off('messages.upsert', listener);
                      return;
                    }

                    const pdfs = dlData.pdfs; // array of URLs

                    if (pdfs.length === 1) {
                      // single pdf -> send directly
                      const pdfUrl = pdfs[0];
                      await socket.sendMessage(sender, { react: { text: '⬇️', key: m.key } });

                      await socket.sendMessage(sender, {
                        document: { url: pdfUrl },
                        mimetype: 'application/pdf',
                        fileName: `${selected.title}.pdf`,
                        caption: `📄 ${selected.title}`
                      }, { quoted: m });

                      await socket.sendMessage(sender, { react: { text: '✅', key: m.key } });

                      socket.ev.off('messages.upsert', listener);
                    } else {
                      // multiple pdfs -> list options and wait for choose
                      let desc = `📄 *${selected.title}* — multiple PDFs found:\n\n`;
                      pdfs.forEach((p, i) => {
                        desc += `*${i + 1}.* ${p.split('/').pop() || `PDF ${i + 1}`}\n`;
                      });
                      desc += `\n💬 Reply with number (1-${pdfs.length}) to download that PDF.`;

                      const infoMsg = await socket.sendMessage(sender, {
                        text: desc
                      }, { quoted: m });

                      // nested listener for pdf choice
                      const dlListener = async (dlUpdate) => {
                        try {
                          const d = dlUpdate.messages[0];
                          if (!d.message) return;

                          const text2 = d.message.conversation || d.message.extendedTextMessage?.text;
                          const isReply2 =
                            d.message.extendedTextMessage &&
                            d.message.extendedTextMessage.contextInfo?.stanzaId === infoMsg.key.id;

                          if (isReply2) {
                            if (!/^\d+$/.test(text2)) return;
                            const dlIndex = parseInt(text2, 10) - 1;
                            if (dlIndex < 0 || dlIndex >= pdfs.length) {
                              return socket.sendMessage(sender, { text: '❎ Invalid option.' }, { quoted: d });
                            }

                            const finalPdf = pdfs[dlIndex];
                            await socket.sendMessage(sender, { react: { text: '⬇️', key: d.key } });

                            try {
                              await socket.sendMessage(sender, {
                                document: { url: finalPdf },
                                mimetype: 'application/pdf',
                                fileName: `${selected.title} (${dlIndex + 1}).pdf`,
                                caption: `📄 ${selected.title} (${dlIndex + 1})`
                              }, { quoted: d });

                              await socket.sendMessage(sender, { react: { text: '✅', key: d.key } });
                            } catch (err) {
                              await socket.sendMessage(sender, { react: { text: '❌', key: d.key } });
                              await socket.sendMessage(sender, { text: `❌ Download/send failed.\n\nDirect link:\n${finalPdf}` }, { quoted: d });
                            }

                            socket.ev.off('messages.upsert', dlListener);
                            socket.ev.off('messages.upsert', listener);
                          }
                        } catch (err) {
                          // ignore inner errors but log if you want
                        }
                      };

                      socket.ev.on('messages.upsert', dlListener);
                      // keep outer listener off until user chooses or we cleanup inside dlListener
                    }

                  } catch (err) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: m.key } });
                    await socket.sendMessage(sender, { text: `❌ Error fetching PDF: ${err.message}` }, { quoted: m });
                    socket.ev.off('messages.upsert', listener);
                  }
                }
              } catch (err) {
                // ignore per-message listener errors
              }
            };

            socket.ev.on('messages.upsert', listener);

          } catch (err) {
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ ERROR: ${err.message}` }, { quoted: msg });
          }
          break;
        }

   // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗨ʀʟ 𝗖ᴀꜱᴇ
        case 'tourl':
        case 'url':
        case 'upload': {
          const axios = require('axios');
          const FormData = require('form-data');
          const fs = require('fs');
          const os = require('os');
          const path = require('path');

          const quoted = msg.message?.extendedTextMessage?.contextInfo;
          const mime = quoted?.quotedMessage?.imageMessage?.mimetype ||
            quoted?.quotedMessage?.videoMessage?.mimetype ||
            quoted?.quotedMessage?.audioMessage?.mimetype ||
            quoted?.quotedMessage?.documentMessage?.mimetype;

          if (!quoted || !mime) {
            return await socket.sendMessage(sender, { text: '❌ *Please reply to an image or video.*' });
          }

          // Fake Quote for Style
          const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_MEDIA" },
            message: { contactMessage: { displayName: "𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰", vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Upload Service\nORG:Catbox/ImgBB\nEND:VCARD` } }
          };

          let mediaType;
          let msgKey;

          if (quoted.quotedMessage.imageMessage) {
            mediaType = 'image';
            msgKey = quoted.quotedMessage.imageMessage;
          } else if (quoted.quotedMessage.videoMessage) {
            mediaType = 'video';
            msgKey = quoted.quotedMessage.videoMessage;
          } else if (quoted.quotedMessage.audioMessage) {
            mediaType = 'audio';
            msgKey = quoted.quotedMessage.audioMessage;
          } else if (quoted.quotedMessage.documentMessage) {
            mediaType = 'document';
            msgKey = quoted.quotedMessage.documentMessage;
          }

          try {
            // Using existing downloadContentFromMessage
            const stream = await downloadContentFromMessage(msgKey, mediaType);
            let buffer = Buffer.alloc(0);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }

            const ext = mime.split('/')[1] || 'tmp';
            const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.${ext}`);
            fs.writeFileSync(tempFilePath, buffer);

            const fileSize = (buffer.length / 1024 / 1024).toFixed(2) + ' MB';
            const typeStr = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);

            let catboxUrl = '';
            let imgbbUrl = '';

            // Upload to Catbox
            try {
              const catboxForm = new FormData();
              catboxForm.append('fileToUpload', fs.createReadStream(tempFilePath));
              catboxForm.append('reqtype', 'fileupload');

              const catboxResponse = await axios.post('https://catbox.moe/user/api.php', catboxForm, {
                headers: catboxForm.getHeaders()
              });
              catboxUrl = catboxResponse.data.trim();
            } catch (catboxError) {
              console.error('Catbox upload error:', catboxError);
              catboxUrl = '❌ Upload failed';
            }

            // Upload to ImgBB (works best with images)
            try {
              const base64Data = buffer.toString('base64');
              const imgbbForm = new FormData();
              imgbbForm.append('key', 'e4b536bbf102cfccc5d8758489052547');
              imgbbForm.append('image', base64Data);

              const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', imgbbForm, {
                headers: imgbbForm.getHeaders()
              });

              if (imgbbResponse.data.success) {
                imgbbUrl = imgbbResponse.data.data.url;
              } else {
                imgbbUrl = '❌ Upload failed';
              }
            } catch (imgbbError) {
              console.error('ImgBB upload error:', imgbbError);
              imgbbUrl = '❌ Upload failed';
            }

            // Cleanup
            fs.unlinkSync(tempFilePath);

            // Prepare message
            const txt = `
🔗 *𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 𝗨ʀʟ 𝗖ᴏɴᴠᴇɴᴛᴇʀ*

📂 *ᴛʏᴘᴇ:* ${typeStr}
📊 *ꜱɪᴢᴇ:* ${fileSize}

📦 *ᴄᴀᴛʙᴏx ᴜʀʟ:*
${catboxUrl}

📦 *ɪᴍɢʙʙ ᴜʀʟ:*
${imgbbUrl}

> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*`;

            // Determine thumbnail for preview
            let thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
            if (catboxUrl && !catboxUrl.includes('❌') && catboxUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
              thumbnailUrl = catboxUrl;
            } else if (imgbbUrl && !imgbbUrl.includes('❌')) {
              thumbnailUrl = imgbbUrl;
            }

            await socket.sendMessage(sender, {
              text: txt,
              contextInfo: {
                externalAdReply: {
                  title: "Media Uploaded Successfully!",
                  body: "Dual Upload Service",
                  thumbnailUrl: thumbnailUrl,
                  sourceUrl: catboxUrl && !catboxUrl.includes('❌') ? catboxUrl : (imgbbUrl && !imgbbUrl.includes('❌') ? imgbbUrl : ''),
                  mediaType: 1,
                  renderLargerThumbnail: true
                }
              }
            }, { quoted: metaQuote });

          } catch (e) {
            console.error(e);
            await socket.sendMessage(sender, { text: '❌ *Error uploading media.*' });
          }
        }
          break;

    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰  𝗖ᴠɪᴅᴇᴏ 𝗖ᴀꜱᴇ
        case 'cvideo': {
          try {
            const axios = require('axios');

            // react
            try { await socket.sendMessage(sender, { react: { text: "🎬", key: msg.key } }); } catch (e) { }

            // args: <targetJid> <search keywords>
            const targetArg = args[0];
            const query = args.slice(1).join(" ").trim();

            if (!targetArg || !query) {
              return await socket.sendMessage(sender, {
                text: "*❌ Format වැරදියි!* Use: `.cvideo <jid|number|channelId> <TikTok keyword>`"
              }, { quoted: msg });
            }

            // normalize target jid
            let targetJid = targetArg;
            if (!targetJid.includes('@')) {
              if (/^0029/.test(targetJid)) {
                targetJid = `${targetJid}@newsletter`;
              } else {
                targetJid = `${targetJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
              }
            }

            // TikTok search
            await socket.sendMessage(sender, { text: `🔎 TikTok එකෙන් සෙවීම සිදු වෙමින්... (${query})` }, { quoted: msg });

            const params = new URLSearchParams({ keywords: query, count: '5', cursor: '0', HD: '1' });
            const response = await axios.post("https://tikwm.com/api/feed/search", params, {
              headers: {
                'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8",
                'Cookie': "current_language=en",
                'User-Agent': "Mozilla/5.0"
              }
            });

            const videos = response.data?.data?.videos;
            if (!videos || videos.length === 0) {
              return await socket.sendMessage(sender, { text: '⚠️ TikTok video එකක් හමුනොවුණා.' }, { quoted: msg });
            }

            // get first video
            const v = videos[0];
            const videoUrl = v.play || v.download;
            if (!videoUrl) {
              return await socket.sendMessage(sender, { text: '❌ Video එක බාගත කළ නොහැක.' }, { quoted: msg });
            }

            // resolve channel name
            let channelname = targetJid;
            try {
              if (typeof socket.newsletterMetadata === 'function') {
                const meta = await socket.newsletterMetadata("jid", targetJid);
                if (meta && meta.name) channelname = meta.name;
              }
            } catch (e) { }

            // format date
            const dateStr = v.create_time ? new Date(v.create_time * 1000).toLocaleDateString() : 'Unknown';

            // ✨ caption style
            const caption = `☘️ 𝗧ɪᴛʟᴇ : ${v.title || 'Unknown'}

👀 ${v.play_count || 'N/A'} 𝗩iews, ${v.duration || 'N/A'} sec, ${dateStr}
*00:00 ───●────────── ${v.duration || '00:00'}*
*ලස්සන රියැක්ට් ඕනී ...💗😽🍃*
> ${channelname}`;

            // send video (no ref / no meta / no bot name)
            await socket.sendMessage(targetJid, {
              video: { url: videoUrl },
              caption
            });

            // confirm to sender
            if (targetJid !== sender) {
              await socket.sendMessage(sender, {
                text: `✅ TikTok video එක *${channelname}* වෙත සාර්ථකව යැවුණා! 🎬😎`
              }, { quoted: msg });
            }

          } catch (err) {
            console.error('cvideo TT error:', err);
            await socket.sendMessage(sender, { text: `❌ දෝෂයක්: ${err.message}` }, { quoted: msg });
          }
          break;
        }

     // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗦ᴇᴛɴᴇᴡꜱ 𝗖ᴀꜱᴇ
        case 'setnews': {
          try {
            const crypto = require('crypto');
            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const chatId = sender; // chat/group/channel id
            const subcmdRaw = args[0] || '';
            const subcmd = subcmdRaw.toString().toLowerCase();

            // --- news sources (edit / extend as needed) ---
            const newsSources = {
              adanews: { key: 'adanews', name: 'Ada News', api: 'https://saviya-kolla-api.koyeb.app/news/ada' },
              sirasanews: { key: 'sirasanews', name: 'Sirasa News', api: 'https://saviya-kolla-api.koyeb.app/news/sirasa' },
              derananews: { key: 'derana', name: 'Derana News', api: 'https://tharuzz-news-api.vercel.app/api/news/derana' },
              hirunews: { key: 'hirunews', name: 'Hiru News', api: 'https://tharuzz-news-api.vercel.app/api/news/hiru' },
              lankadeepanews: { key: 'lankadeepanews', name: 'Lankadeepa', api: 'https://saviya-kolla-api.koyeb.app/news/lankadeepa' },
              gagananews: { key: 'gagananews', name: 'Gagana', api: 'https://saviya-kolla-api.koyeb.app/news/gagana' }
            };

            // --- small in-case helpers (fully local to this block) ---
            async function loadCfg() {
              const cfg = await loadUserConfigFromMongo(sanitized) || {};
              cfg.newsSubscriptions = cfg.newsSubscriptions || [];
              // sentNews stores history of sent items to prevent duplicates:
              // [{ chatId, source, id, hash, sentAt }]
              cfg.sentNews = cfg.sentNews || [];
              return cfg;
            }
            async function persistCfg(cfg) {
              cfg.newsSubscriptions = cfg.newsSubscriptions || [];
              cfg.sentNews = cfg.sentNews || [];
              await setUserConfigInMongo(sanitized, cfg);
            }

            // create stable uid for item
            function deriveUid(n) {
              if (!n) return null;
              if (n.url) return n.url;
              if (n.id) return String(n.id);
              if (n.title) return `${n.title}||${n.date || ''}||${n.time || ''}`;
              return null;
            }

            // create content hash to detect updates
            function contentHashFor(n) {
              const str = JSON.stringify({
                title: n.title || '',
                desc: n.desc || n.summary || '',
                image: n.image || '',
                date: n.date || '',
                time: n.time || ''
              });
              return crypto.createHash('sha256').update(str).digest('hex');
            }

            // Helper: check whether item already sent; returns object { found, updated }
            function checkSent(cfg, chatIdLocal, sourceKey, itemId) {
              if (!itemId) return { found: false, entry: null };
              const entry = (cfg.sentNews || []).find(e => e.chatId === chatIdLocal && e.source === sourceKey && e.id === itemId);
              return { found: Boolean(entry), entry: entry || null };
            }

            // record (or update) sent item (and trim history to limit)
            function recordSent(cfg, chatIdLocal, sourceKey, itemId, hash) {
              if (!itemId) return;
              cfg.sentNews = cfg.sentNews || [];
              const idx = cfg.sentNews.findIndex(e => e.chatId === chatIdLocal && e.source === sourceKey && e.id === itemId);
              const now = Date.now();
              if (idx >= 0) {
                cfg.sentNews[idx].hash = hash;
                cfg.sentNews[idx].sentAt = now;
              } else {
                cfg.sentNews.push({ chatId: chatIdLocal, source: sourceKey, id: itemId, hash, sentAt: now });
              }
              // keep history bounded
              const MAX_HISTORY = 1000;
              if (cfg.sentNews.length > MAX_HISTORY) {
                cfg.sentNews = cfg.sentNews.slice(cfg.sentNews.length - MAX_HISTORY);
              }
            }

            // --- Add/Remove/List subscriptions (same as before) ---
            async function addNewsSubscription(chatIdLocal, sourceKey, intervalMinutes = 15) {
              if (!newsSources[sourceKey]) throw new Error('Unknown source: ' + sourceKey);
              const cfg = await loadCfg();
              const existsIdx = cfg.newsSubscriptions.findIndex(s => s.chatId === chatIdLocal && s.source === sourceKey);
              const now = Date.now();
              // immediate first-run so user sees news quickly
              const sub = { chatId: chatIdLocal, source: sourceKey, intervalMinutes, nextRun: now, enabled: true };
              if (existsIdx >= 0) {
                cfg.newsSubscriptions[existsIdx] = { ...cfg.newsSubscriptions[existsIdx], ...sub };
              } else {
                cfg.newsSubscriptions.push(sub);
              }
              await persistCfg(cfg);
              return cfg.newsSubscriptions;
            }

            async function removeNewsSubscription(chatIdLocal, sourceKey = null) {
              const cfg = await loadCfg();
              if (!sourceKey) cfg.newsSubscriptions = cfg.newsSubscriptions.filter(s => s.chatId !== chatIdLocal);
              else cfg.newsSubscriptions = cfg.newsSubscriptions.filter(s => !(s.chatId === chatIdLocal && s.source === sourceKey));
              await persistCfg(cfg);
              return cfg.newsSubscriptions;
            }

            async function listNewsSubscriptionsForChat(chatIdLocal) {
              const cfg = await loadCfg();
              return cfg.newsSubscriptions.filter(s => s.chatId === chatIdLocal);
            }

            // --- dispatcher (one-per-session) inside this block but global-tracked to avoid duplicates ---
            if (!global.__sessionNewsDispatchers) global.__sessionNewsDispatchers = {}; // global map

            function ensureDispatcherRunning() {
              if (global.__sessionNewsDispatchers[sanitized]) return; // already running for this session
              // start interval
              const iv = setInterval(async () => {
                try {
                  const cfg = await loadCfg();
                  const subs = cfg.newsSubscriptions || [];
                  const now = Date.now();

                  for (let i = 0; i < subs.length; i++) {
                    const sub = subs[i];
                    if (!sub.enabled) continue;
                    if (!sub.nextRun || sub.nextRun <= now) {
                      const src = newsSources[sub.source];
                      if (!src) {
                        console.warn('Unknown source in subscription, skipping:', sub.source);
                        sub.nextRun = Date.now() + (sub.intervalMinutes || 15) * 60000;
                        continue;
                      }

                      try {
                        const res = await axios.get(src.api, { timeout: 10000 });
                        if (!res.data || !res.data.status || !res.data.result) {
                          console.warn('No valid data from news API for', sub.source);
                          sub.nextRun = Date.now() + (sub.intervalMinutes || 15) * 60000;
                          continue;
                        }

                        const results = Array.isArray(res.data.result) ? res.data.result : [res.data.result];

                        // For each candidate news item, check dedupe then send if new or updated
                        for (let ri = 0; ri < results.length; ri++) {
                          const n = results[ri];
                          const uid = deriveUid(n);
                          if (!uid) continue;

                          // reload fresh cfg to check latest sentNews (avoid race)
                          const freshCfg = await loadCfg();
                          const existing = checkSent(freshCfg, sub.chatId, sub.source, uid);
                          const newHash = contentHashFor(n);

                          if (!existing.found) {
                            // NEW item -> send normally
                            const caption = `📰 *${n.title || 'No title'}*\n\n📅 ${n.date || ''} ${n.time || ''}\n\n${n.desc || ''}\n\n🔗 ${n.url || ''}\n\n_Provided by ${freshCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : 'Bot')}_`;
                            try {
                              if (n.image) {
                                await socket.sendMessage(sub.chatId, { image: { url: n.image }, caption });
                              } else {
                                await socket.sendMessage(sub.chatId, { text: caption });
                              }
                              // record as sent (persist)
                              recordSent(freshCfg, sub.chatId, sub.source, uid, newHash);
                              await persistCfg(freshCfg);
                            } catch (sendErr) {
                              console.error('Failed to send news message to', sub.chatId, sendErr);
                            }
                          } else {
                            // Already sent before: check if hash changed (i.e., updated content)
                            const prevHash = existing.entry.hash || null;
                            if (prevHash && prevHash !== newHash) {
                              // content updated -> send UPDATE message
                              const caption = `🔄 *UPDATE* — ${n.title || 'No title'}\n\n📅 ${n.date || ''} ${n.time || ''}\n\n${n.desc || ''}\n\n🔗 ${n.url || ''}\n\n_Provided by ${freshCfg.botName || (typeof BOT_NAME_FANCY !== 'undefined' ? BOT_NAME_FANCY : 'Bot')}_`;
                              try {
                                if (n.image) {
                                  await socket.sendMessage(sub.chatId, { image: { url: n.image }, caption });
                                } else {
                                  await socket.sendMessage(sub.chatId, { text: caption });
                                }
                                // update recorded hash & sentAt
                                recordSent(freshCfg, sub.chatId, sub.source, uid, newHash);
                                await persistCfg(freshCfg);
                              } catch (sendErr) {
                                console.error('Failed to send UPDATE message to', sub.chatId, sendErr);
                              }
                            } else {
                              // same item, not updated -> skip
                              // console.log('Skipping already-sent news for', sub.chatId, sub.source, uid);
                              continue;
                            }
                          }
                        }

                        // schedule next run (after processing all items)
                        sub.nextRun = Date.now() + (sub.intervalMinutes || 15) * 60000;
                      } catch (fetchErr) {
                        console.error('Error fetching news for', sub.source, fetchErr);
                        sub.nextRun = Date.now() + (sub.intervalMinutes || 15) * 60000;
                      }
                    }
                  }
                  // persist any nextRun updates
                  cfg.newsSubscriptions = subs;
                  await persistCfg(cfg);

                  // if no subscriptions left for this session, stop dispatcher to save resources
                  const remaining = (await loadCfg()).newsSubscriptions || [];
                  if (!remaining.length) {
                    clearInterval(iv);
                    delete global.__sessionNewsDispatchers[sanitized];
                  }
                } catch (topErr) {
                  console.error('News dispatcher top-level error:', topErr);
                }
              }, 60 * 1000); // checks every 60s

              global.__sessionNewsDispatchers[sanitized] = { intervalId: iv, startedAt: Date.now() };
            }

            // --- command handling inside single case ---
            if (!subcmd) {
              const keys = Object.keys(newsSources).join(', ');
              return await socket.sendMessage(chatId, { text: `❗ Usage:\n• .setnews <sourceKey> [intervalMinutes]\n• .setnews del [sourceKey]\n• .setnews list\n• .setnews [minutes]  -> enable ALL sources (e.g. .setnews 15)\n\nAvailable sources: ${keys}` });
            }

            // list
            if (subcmd === 'list') {
              const subs = await listNewsSubscriptionsForChat(chatId);
              if (!subs.length) {
                return await socket.sendMessage(chatId, { text: 'ℹ️ No auto-news subscriptions for this chat.' });
              }
              let txt = '*Auto-news subscriptions for this chat:*\n\n';
              subs.forEach(s => {
                txt += `• ${s.source} (${newsSources[s.source]?.name || 'Unknown'}) — every ${s.intervalMinutes} min — ${s.enabled ? 'enabled' : 'disabled'}\n`;
              });
              return await socket.sendMessage(chatId, { text: txt });
            }

            // delete/remove
            if (subcmd === 'del' || subcmd === 'remove' || subcmd === 'off') {
              const targetSource = args[1] ? args[1].toString().toLowerCase() : null;
              await removeNewsSubscription(chatId, targetSource);
              const cfgAfter = await loadCfg();
              if (!cfgAfter.newsSubscriptions.length && global.__sessionNewsDispatchers[sanitized]) {
                clearInterval(global.__sessionNewsDispatchers[sanitized].intervalId);
                delete global.__sessionNewsDispatchers[sanitized];
              }
              if (targetSource) {
                return await socket.sendMessage(chatId, { text: `✅ Removed news source *${targetSource}* from this chat.` });
              } else {
                return await socket.sendMessage(chatId, { text: `✅ Removed all auto-news subscriptions from this chat.` });
              }
            }

            // if the first arg is purely numeric -> treat as interval and enable ALL sources
            if (/^\d+$/.test(subcmd)) {
              const intervalMins = parseInt(subcmd, 10);
              if (isNaN(intervalMins) || intervalMins < 1) {
                return await socket.sendMessage(chatId, { text: '❗ Invalid interval. Provide minutes as a number (>=1).' });
              }

              const keys = Object.keys(newsSources);
              for (let k = 0; k < keys.length; k++) {
                const key = keys[k];
                try {
                  await addNewsSubscription(chatId, key, intervalMins);
                } catch (err) {
                  console.warn('Failed to add subscription for', key, err);
                }
              }

              // ensure dispatcher is running for this session
              ensureDispatcherRunning();

              return await socket.sendMessage(chatId, { text: `✅ Auto-news enabled for *all sources* (${keys.join(', ')}) every *${intervalMins}* minutes.` });
            }

            // otherwise treat subcmd as a sourceKey to add
            const sourceKey = subcmd;
            const intervalArg = args[1];
            const intervalMins = intervalArg ? parseInt(intervalArg, 10) : 15;
            if (!newsSources[sourceKey]) {
              const keys = Object.keys(newsSources).join(', ');
              return await socket.sendMessage(chatId, { text: `❗ Unknown source. Available sources: ${keys}\nExample: .setnews adanews 30` });
            }
            if (isNaN(intervalMins) || intervalMins < 1) {
              return await socket.sendMessage(chatId, { text: '❗ Invalid interval. Provide minutes as a number (>=1).' });
            }

            // add subscription and ensure dispatcher
            await addNewsSubscription(chatId, sourceKey, intervalMins);
            ensureDispatcherRunning();

            return await socket.sendMessage(chatId, { text: `✅ Auto-news enabled for *${newsSources[sourceKey].name}* in this chat every *${intervalMins}* minutes.` });
          } catch (e) {
            console.error('setnews (single-block) error:', e);
            try {
              await socket.sendMessage(sender, { text: `❌ Failed to process .setnews: ${e.message || e}` });
            } catch (ignore) { }
          }
          break;
        }

    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗚ᴊɪᴅ 𝗖ᴀꜱᴇ
        case 'gjid':
        case 'groupjid':
        case 'grouplist': {
          try {
            // ✅ Owner check removed — now everyone can use it!

            await socket.sendMessage(sender, {
              react: { text: "📝", key: msg.key }
            });

            await socket.sendMessage(sender, {
              text: "📝 Fetching group list..."
            }, { quoted: msg });

            const groups = await socket.groupFetchAllParticipating();
            const groupArray = Object.values(groups);

            // Sort by creation time (oldest to newest)
            groupArray.sort((a, b) => a.creation - b.creation);

            if (groupArray.length === 0) {
              return await socket.sendMessage(sender, {
                text: "❌ No groups found!"
              }, { quoted: msg });
            }

            const sanitized = (number || '').replace(/[^0-9]/g, '');
            const cfg = await loadUserConfigFromMongo(sanitized) || {};
            const botName = cfg.botName || BOT_NAME_FANCY || "𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡";

            // ✅ Pagination setup — 10 groups per message
            const groupsPerPage = 10;
            const totalPages = Math.ceil(groupArray.length / groupsPerPage);

            for (let page = 0; page < totalPages; page++) {
              const start = page * groupsPerPage;
              const end = start + groupsPerPage;
              const pageGroups = groupArray.slice(start, end);

              // ✅ Build message for this page
              const groupList = pageGroups.map((group, index) => {
                const globalIndex = start + index + 1;
                const memberCount = group.participants ? group.participants.length : 'N/A';
                const subject = group.subject || 'Unnamed Group';
                const jid = group.id;
                return `*${globalIndex}. ${subject}*\n*👥 𝗠ᴇᴍʙᴇʀꜱ:* ${memberCount}\n🆔 ${jid}`;
              }).join('\n\n');

              const textMsg = `📝 *𝗚ʀᴏᴜᴘ 𝗟ɪꜱᴛ ${botName}*\n\n*📄 𝗣ᴀɢᴇ:* ${page + 1}/${totalPages}\n*👥 𝗧ᴏᴛᴀʟ 𝗚ʀᴏᴜᴘꜱ:* ${groupArray.length}\n\n${groupList}`;

              await socket.sendMessage(sender, {
                text: textMsg,
                footer: `🤖 Powered by ${botName}`
              });

              // Add short delay to avoid spam
              if (page < totalPages - 1) {
                await delay(1000);
              }
            }

          } catch (err) {
            console.error('GJID command error:', err);
            await socket.sendMessage(sender, {
              text: "❌ Failed to fetch group list. Please try again later."
            }, { quoted: msg });
          }
          break;
        }

   // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗖ɪᴅ 𝗖ᴀꜱᴇ
        case 'cid': {
          // Extract query from message
          const q = msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || '';

          // ✅ Dynamic botName load
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          let cfg = await loadUserConfigFromMongo(sanitized) || {};
          let botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡';

          // ✅ Fake Meta AI vCard (for quoted msg)
          const shonux = {
            key: {
              remoteJid: "status@broadcast",
              participant: "0@s.whatsapp.net",
              fromMe: false,
              id: "META_AI_FAKE_ID_CID"
            },
            message: {
              contactMessage: {
                displayName: botName,
                vcard: `BEGIN:VCARD
VERSION:3.0
N:${botName};;;;
FN:${botName}
ORG:Meta Platforms
TEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002
END:VCARD`
              }
            }
          };

          // Clean command prefix (.cid, /cid, !cid, etc.)
          const channelLink = q.replace(/^[.\/!]cid\s*/i, '').trim();

          // Check if link is provided
          if (!channelLink) {
            return await socket.sendMessage(sender, {
              text: '❎ Please provide a WhatsApp Channel link.\n\n📌 *Example:* .cid https://whatsapp.com/channel/123456789'
            }, { quoted: shonux });
          }

          // Validate link
          const match = channelLink.match(/whatsapp\.com\/channel\/([\w-]+)/);
          if (!match) {
            return await socket.sendMessage(sender, {
              text: '⚠️ *Invalid channel link format.*\n\nMake sure it looks like:\nhttps://whatsapp.com/channel/xxxxxxxxx'
            }, { quoted: shonux });
          }

          const inviteId = match[1];

          try {
            // Send fetching message
            await socket.sendMessage(sender, {
              text: `🔎 Fetching channel info for: *${inviteId}*`
            }, { quoted: shonux });

            // Get channel metadata
            const metadata = await socket.newsletterMetadata("invite", inviteId);

            if (!metadata || !metadata.id) {
              return await socket.sendMessage(sender, {
                text: '❌ Channel not found or inaccessible.'
              }, { quoted: shonux });
            }

            // Format details
            const infoText = `
📡 *𝗪ʜᴀᴛꜱᴀᴘᴘ 𝗖ʜᴀɴɴᴇʟ 𝗜ɴꜰᴏ*

🆔 *𝗜ᴅ:* ${metadata.id}
📌 *𝗡ᴀᴍᴇ:* ${metadata.name}
👥 *𝗙ᴏʟʟᴏᴡᴇʀꜱ:* ${metadata.subscribers?.toLocaleString() || 'N/A'}
📅 *𝗖ʀᴇᴀᴛᴇᴅ 𝗢ɴ:* ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString("si-LK") : 'Unknown'}

> *${botName}*
`;

            // Send preview if available
            if (metadata.preview) {
              await socket.sendMessage(sender, {
                image: { url: `https://pps.whatsapp.net${metadata.preview}` },
                caption: infoText
              }, { quoted: shonux });
            } else {
              await socket.sendMessage(sender, {
                text: infoText
              }, { quoted: shonux });
            }

          } catch (err) {
            console.error("CID command error:", err);
            await socket.sendMessage(sender, {
              text: '⚠️ An unexpected error occurred while fetching channel info.'
            }, { quoted: shonux });
          }

          break;
        }


    // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗝ɪᴅ 𝗖ᴀꜱᴇ
        case 'jid': {
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          const cfg = await loadUserConfigFromMongo(sanitized) || {};
          const botName = cfg.botName || '𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 📍📡'; // dynamic bot name

          const userNumber = sender.split('@')[0];

          // Reaction
          await socket.sendMessage(sender, {
            react: { text: "🆔", key: msg.key }
          });

          // Fake contact quoting for meta style
          const shonux = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_FAKE_ID" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nEND:VCARD` } }
          };

          await socket.sendMessage(sender, {
            text: `*🆔 𝗖ʜᴀᴛ 𝗝ɪᴅ:* ${sender}\n*📞 𝗬ᴏᴜʀ 𝗡ᴜᴍʙᴇʀ:* +${userNumber}`,
          }, { quoted: shonux });
          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗦ᴇᴛʟᴏɢɪ & 𝗦ᴇᴛʙᴏᴛɴᴀᴍᴇ 𝗖ᴀꜱᴇ

        case 'setlogo': {
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          const senderNum = (nowsender || '').split('@')[0];
          const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
          if (senderNum !== sanitized && senderNum !== ownerNum) {
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETLOGO1" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change this session logo.' }, { quoted: shonux });
            break;
          }

          const ctxInfo = (msg.message.extendedTextMessage || {}).contextInfo || {};
          const quotedMsg = ctxInfo.quotedMessage;
          const media = await downloadQuotedMedia(quotedMsg).catch(() => null);
          let logoSetTo = null;

          try {
            if (media && media.buffer) {
              const sessionPath = path.join(os.tmpdir(), `session_${sanitized}`);
              fs.ensureDirSync(sessionPath);
              const mimeExt = (media.mime && media.mime.split('/').pop()) || 'jpg';
              const logoPath = path.join(sessionPath, `logo.${mimeExt}`);
              fs.writeFileSync(logoPath, media.buffer);
              let cfg = await loadUserConfigFromMongo(sanitized) || {};
              cfg.logo = logoPath;
              await setUserConfigInMongo(sanitized, cfg);
              logoSetTo = logoPath;
            } else if (args && args[0] && (args[0].startsWith('http') || args[0].startsWith('https'))) {
              let cfg = await loadUserConfigFromMongo(sanitized) || {};
              cfg.logo = args[0];
              await setUserConfigInMongo(sanitized, cfg);
              logoSetTo = args[0];
            } else {
              const shonux = {
                key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETLOGO2" },
                message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
              };
              await socket.sendMessage(sender, { text: '❗ Usage: Reply to an image with `.setlogo` OR provide an image URL: `.setlogo https://example.com/logo.jpg`' }, { quoted: shonux });
              break;
            }

            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETLOGO3" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            await socket.sendMessage(sender, { text: `✅ Logo set for this session: ${logoSetTo}` }, { quoted: shonux });
          } catch (e) {
            console.error('setlogo error', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETLOGO4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: `❌ Failed to set logo: ${e.message || e}` }, { quoted: shonux });
          }
          break;
        }

        case 'setbotname': {
          const sanitized = (number || '').replace(/[^0-9]/g, '');
          const senderNum = (nowsender || '').split('@')[0];
          const ownerNum = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
          if (senderNum !== sanitized && senderNum !== ownerNum) {
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETBOTNAME1" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: '❌ Permission denied. Only the session owner or bot owner can change this session bot name.' }, { quoted: shonux });
            break;
          }

          const name = args.join(' ').trim();
          if (!name) {
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETBOTNAME2" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            return await socket.sendMessage(sender, { text: '❗ Provide bot name. Example: `.setbotname 𝐀ʏᴇꜱʜ 𝐓ʜᴇᴍɪʏᴀ`' }, { quoted: shonux });
          }

          try {
            let cfg = await loadUserConfigFromMongo(sanitized) || {};
            cfg.botName = name;
            await setUserConfigInMongo(sanitized, cfg);

            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETBOTNAME3" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };

            await socket.sendMessage(sender, { text: `✅ Bot display name set for this session: ${name}` }, { quoted: shonux });
          } catch (e) {
            console.error('setbotname error', e);
            const shonux = {
              key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_SETBOTNAME4" },
              message: { contactMessage: { displayName: BOT_NAME_FANCY, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${BOT_NAME_FANCY};;;;\nFN:${BOT_NAME_FANCY}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD` } }
            };
            await socket.sendMessage(sender, { text: `❌ Failed to set bot name: ${e.message || e}` }, { quoted: shonux });
          }
          break;
        }

        // 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 4.0.0𝗩 🥷🇱🇰 𝗕ʟᴏᴄᴋ & 𝗨ɴʙʟᴏᴄᴋ 𝗖ᴀꜱᴇ
        case 'block': {
          try {
            // caller number (who sent the command)
            const callerNumberClean = (senderNumber || '').replace(/[^0-9]/g, '');
            const ownerNumberClean = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
            const sessionOwner = (number || '').replace(/[^0-9]/g, '');

            // allow if caller is global owner OR this session's owner
            if (callerNumberClean !== ownerNumberClean && callerNumberClean !== sessionOwner) {
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❌ ඔබට මෙය භාවිත කිරීමට අවසර නැත. (Owner හෝ මෙහි session owner විය යුතුයි)' }, { quoted: msg });
              break;
            }

            // determine target JID: reply / mention / arg
            let targetJid = null;
            const ctx = msg.message?.extendedTextMessage?.contextInfo;

            if (ctx?.participant) targetJid = ctx.participant; // replied user
            else if (ctx?.mentionedJid && ctx.mentionedJid.length) targetJid = ctx.mentionedJid[0]; // mentioned
            else if (args && args.length > 0) {
              const possible = args[0].trim();
              if (possible.includes('@')) targetJid = possible;
              else {
                const digits = possible.replace(/[^0-9]/g, '');
                if (digits) targetJid = `${digits}@s.whatsapp.net`;
              }
            }

            if (!targetJid) {
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❗ කරුණාකර reply කරන හෝ mention කරන හෝ number එක යොදන්න. උදාහරණය: .block 9477xxxxxxx' }, { quoted: msg });
              break;
            }

            // normalize
            if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;
            if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;

            // perform block
            try {
              if (typeof socket.updateBlockStatus === 'function') {
                await socket.updateBlockStatus(targetJid, 'block');
              } else {
                // some bailey builds use same method name; try anyway
                await socket.updateBlockStatus(targetJid, 'block');
              }
              try { await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: `✅ @${targetJid.split('@')[0]} blocked successfully.`, mentions: [targetJid] }, { quoted: msg });
            } catch (err) {
              console.error('Block error:', err);
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❌ Failed to block the user. (Maybe invalid JID or API failure)' }, { quoted: msg });
            }

          } catch (err) {
            console.error('block command general error:', err);
            try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
            await socket.sendMessage(sender, { text: '❌ Error occurred while processing block command.' }, { quoted: msg });
          }
          break;
        }

        case 'unblock': {
          try {
            // caller number (who sent the command)
            const callerNumberClean = (senderNumber || '').replace(/[^0-9]/g, '');
            const ownerNumberClean = config.OWNER_NUMBER.replace(/[^0-9]/g, '');
            const sessionOwner = (number || '').replace(/[^0-9]/g, '');

            // allow if caller is global owner OR this session's owner
            if (callerNumberClean !== ownerNumberClean && callerNumberClean !== sessionOwner) {
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❌ ඔබට මෙය භාවිත කිරීමට අවසර නැත. (Owner හෝ මෙහි session owner විය යුතුයි)' }, { quoted: msg });
              break;
            }

            // determine target JID: reply / mention / arg
            let targetJid = null;
            const ctx = msg.message?.extendedTextMessage?.contextInfo;

            if (ctx?.participant) targetJid = ctx.participant;
            else if (ctx?.mentionedJid && ctx.mentionedJid.length) targetJid = ctx.mentionedJid[0];
            else if (args && args.length > 0) {
              const possible = args[0].trim();
              if (possible.includes('@')) targetJid = possible;
              else {
                const digits = possible.replace(/[^0-9]/g, '');
                if (digits) targetJid = `${digits}@s.whatsapp.net`;
              }
            }

            if (!targetJid) {
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❗ කරුණාකර reply කරන හෝ mention කරන හෝ number එක යොදන්න. උදාහරණය: .unblock 9477xxxxxxx' }, { quoted: msg });
              break;
            }

            // normalize
            if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;
            if (!targetJid.endsWith('@s.whatsapp.net') && !targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;

            // perform unblock
            try {
              if (typeof socket.updateBlockStatus === 'function') {
                await socket.updateBlockStatus(targetJid, 'unblock');
              } else {
                await socket.updateBlockStatus(targetJid, 'unblock');
              }
              try { await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: `🔓 @${targetJid.split('@')[0]} unblocked successfully.`, mentions: [targetJid] }, { quoted: msg });
            } catch (err) {
              console.error('Unblock error:', err);
              try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
              await socket.sendMessage(sender, { text: '❌ Failed to unblock the user.' }, { quoted: msg });
            }

          } catch (err) {
            console.error('unblock command general error:', err);
            try { await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } }); } catch (e) { }
            await socket.sendMessage(sender, { text: '❌ Error occurred while processing unblock command.' }, { quoted: msg });
          }
          break;
        }

        // default
        default:
          break;
      }
    } catch (err) {
      console.error('Command handler error:', err);
      try { await socket.sendMessage(sender, { image: { url: config.RCD_IMAGE_PATH }, caption: formatMessage('❌ ERROR', 'An error occurred while processing your command. Please try again.', BOT_NAME_FANCY) }); } catch (e) { }
    }

  });
}

// ---------------- Call Rejection Handler ----------------

// ---------------- Simple Call Rejection Handler ----------------

async function setupCallRejection(socket, sessionNumber) {
  socket.ev.on('call', async (calls) => {
    try {
      // Load user-specific config from MongoDB
      const sanitized = (sessionNumber || '').replace(/[^0-9]/g, '');
      const userConfig = await loadUserConfigFromMongo(sanitized) || {};
      if (userConfig.ANTI_CALL !== 'on') return;

      console.log(`📞 Incoming call detected for ${sanitized} - Auto rejecting...`);

      for (const call of calls) {
        if (call.status !== 'offer') continue;

        const id = call.id;
        const from = call.from;

        // Reject the call
        await socket.rejectCall(id, from);

        // Send rejection message to caller
        await socket.sendMessage(from, {
          text: '*🔕 Auto call rejection is enabled. Calls are automatically rejected.*'
        });

        console.log(`✅ Auto-rejected call from ${from}`);

        // Send notification to bot user
        const userJid = jidNormalizedUser(socket.user.id);
        const rejectionMessage = formatMessage(
          '📞 CALL REJECTED',
          `Auto call rejection is active.\n\nCall from: ${from}\nTime: ${getSriLankaTimestamp()}`,
          BOT_NAME_FANCY
        );

        await socket.sendMessage(userJid, {
          image: { url: config.RCD_IMAGE_PATH },
          caption: rejectionMessage
        });
      }
    } catch (err) {
      console.error(`Call rejection error for ${sessionNumber}:`, err);
    }
  });
}

// ---------------- Auto Message Read Handler ----------------

async function setupAutoMessageRead(socket, sessionNumber) {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg || !msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

    // Quick return if no need to process
    const sanitized = (sessionNumber || '').replace(/[^0-9]/g, '');
    const userConfig = await loadUserConfigFromMongo(sanitized) || {};
    const autoReadSetting = userConfig.AUTO_READ_MESSAGE || 'off';

    if (autoReadSetting === 'off') return;

    const from = msg.key.remoteJid;

    // Simple message body extraction
    let body = '';
    try {
      const type = getContentType(msg.message);
      const actualMsg = (type === 'ephemeralMessage')
        ? msg.message.ephemeralMessage.message
        : msg.message;

      if (type === 'conversation') {
        body = actualMsg.conversation || '';
      } else if (type === 'extendedTextMessage') {
        body = actualMsg.extendedTextMessage?.text || '';
      } else if (type === 'imageMessage') {
        body = actualMsg.imageMessage?.caption || '';
      } else if (type === 'videoMessage') {
        body = actualMsg.videoMessage?.caption || '';
      }
    } catch (e) {
      // If we can't extract body, treat as non-command
      body = '';
    }

    // Check if it's a command message
    const prefix = userConfig.PREFIX || config.PREFIX;
    const isCmd = body && body.startsWith && body.startsWith(prefix);

    // Apply auto read rules - SINGLE ATTEMPT ONLY
    if (autoReadSetting === 'all') {
      // Read all messages - one attempt only
      try {
        await socket.readMessages([msg.key]);
        console.log(`✅ Message read: ${msg.key.id}`);
      } catch (error) {
        console.warn('Failed to read message (single attempt):', error?.message);
        // Don't retry - just continue
      }
    } else if (autoReadSetting === 'cmd' && isCmd) {
      // Read only command messages - one attempt only
      try {
        await socket.readMessages([msg.key]);
        console.log(`✅ Command message read: ${msg.key.id}`);
      } catch (error) {
        console.warn('Failed to read command message (single attempt):', error?.message);
        // Don't retry - just continue
      }
    }
  });
}

// ---------------- message handlers ----------------

function setupMessageHandlers(socket, sessionNumber) {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

    try {
      // Load user-specific config from MongoDB
      let autoTyping = config.AUTO_TYPING; // Default from global config
      let autoRecording = config.AUTO_RECORDING; // Default from global config

      if (sessionNumber) {
        const userConfig = await loadUserConfigFromMongo(sessionNumber) || {};

        // Check for auto typing in user config
        if (userConfig.AUTO_TYPING !== undefined) {
          autoTyping = userConfig.AUTO_TYPING;
        }

        // Check for auto recording in user config
        if (userConfig.AUTO_RECORDING !== undefined) {
          autoRecording = userConfig.AUTO_RECORDING;
        }
      }

      // Use auto typing setting (from user config or global)
      if (autoTyping === 'true') {
        try {
          await socket.sendPresenceUpdate('composing', msg.key.remoteJid);
          // Stop typing after 3 seconds
          setTimeout(async () => {
            try {
              await socket.sendPresenceUpdate('paused', msg.key.remoteJid);
            } catch (e) { }
          }, 3000);
        } catch (e) {
          console.error('Auto typing error:', e);
        }
      }

      // Use auto recording setting (from user config or global)
      if (autoRecording === 'true') {
        try {
          await socket.sendPresenceUpdate('recording', msg.key.remoteJid);
          // Stop recording after 3 seconds  
          setTimeout(async () => {
            try {
              await socket.sendPresenceUpdate('paused', msg.key.remoteJid);
            } catch (e) { }
          }, 3000);
        } catch (e) {
          console.error('Auto recording error:', e);
        }
      }
    } catch (error) {
      console.error('Message handler error:', error);
    }
  });
}


// ---------------- cleanup helper ----------------

async function deleteSessionAndCleanup(number, socketInstance) {
  const sanitized = number.replace(/[^0-9]/g, '');
  try {
    const sessionPath = path.join(os.tmpdir(), `session_${sanitized}`);
    try { if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath); } catch (e) { }
    activeSockets.delete(sanitized); socketCreationTime.delete(sanitized);
    try { await removeSessionFromMongo(sanitized); } catch (e) { }
    try { await removeNumberFromMongo(sanitized); } catch (e) { }
    try {
      const ownerJid = `${config.OWNER_NUMBER.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      const caption = formatMessage('*🥷 OWNER NOTICE — SESSION REMOVED*', `*𝐍umber:* ${sanitized}\n*𝐒ession 𝐑emoved 𝐃ue 𝐓o 𝐋ogout.*\n\n*𝐀ctive 𝐒essions 𝐍ow:* ${activeSockets.size}`, BOT_NAME_FANCY);
      if (socketInstance && socketInstance.sendMessage) await socketInstance.sendMessage(ownerJid, { image: { url: config.RCD_IMAGE_PATH }, caption });
    } catch (e) { }
    console.log(`Cleanup completed for ${sanitized}`);
  } catch (err) { console.error('deleteSessionAndCleanup error:', err); }
}

// ---------------- auto-restart ----------------

function setupAutoRestart(socket, number) {
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
        || lastDisconnect?.error?.statusCode
        || (lastDisconnect?.error && lastDisconnect.error.toString().includes('401') ? 401 : undefined);
      const isLoggedOut = statusCode === 401
        || (lastDisconnect?.error && lastDisconnect.error.code === 'AUTHENTICATION')
        || (lastDisconnect?.error && String(lastDisconnect.error).toLowerCase().includes('logged out'))
        || (lastDisconnect?.reason === DisconnectReason?.loggedOut);
      if (isLoggedOut) {
        console.log(`User ${number} logged out. Cleaning up...`);
        try { await deleteSessionAndCleanup(number, socket); } catch (e) { console.error(e); }
      } else {
        console.log(`Connection closed for ${number} (not logout). Attempt reconnect...`);
        try { await delay(10000); activeSockets.delete(number.replace(/[^0-9]/g, '')); socketCreationTime.delete(number.replace(/[^0-9]/g, '')); const mockRes = { headersSent: false, send: () => { }, status: () => mockRes }; await EmpirePair(number, mockRes); } catch (e) { console.error('Reconnect attempt failed', e); }
      }

    }

  });
}

// ---------------- EmpirePair (pairing, temp dir, persist to Mongo) ----------------


// ---------------- EmpirePair (pairing, temp dir, persist to Mongo) ----------------

async function EmpirePair(number, res) {
  const sanitizedNumber = number.replace(/[^0-9]/g, '');
  const sessionPath = path.join(os.tmpdir(), `session_${sanitizedNumber}`);
  await initMongo().catch(() => { });

  // Prefill from Mongo if available
  try {
    const mongoDoc = await loadCredsFromMongo(sanitizedNumber);
    if (mongoDoc && mongoDoc.creds) {
      fs.ensureDirSync(sessionPath);
      fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(mongoDoc.creds, null, 2));
      if (mongoDoc.keys) fs.writeFileSync(path.join(sessionPath, 'keys.json'), JSON.stringify(mongoDoc.keys, null, 2));
      console.log('Prefilled creds from Mongo');
    }
  } catch (e) { console.warn('Prefill from Mongo failed', e); }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const logger = pino({ level: 'silent' });

  try {
    const socket = makeWASocket({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      auth: state,
      version: [2, 3000, 1033105955],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      browser: ['Mac OS', 'Safari', '10.15.7']
    });

    socketCreationTime.set(sanitizedNumber, Date.now());

    setupStatusHandlers(socket, sanitizedNumber);
    setupCommandHandlers(socket, sanitizedNumber);
    setupMessageHandlers(socket, sanitizedNumber);
    setupAutoRestart(socket, sanitizedNumber);
    setupNewsletterHandlers(socket, sanitizedNumber);
    handleMessageRevocation(socket, sanitizedNumber);
    setupAutoMessageRead(socket, sanitizedNumber);
    setupCallRejection(socket, sanitizedNumber);

  
        if (!socket.authState.creds.registered) {
      let retries = config.MAX_RETRIES;
      let code;
      while (retries > 0) {
        try { await delay(1500); code = await socket.requestPairingCode(sanitizedNumber); break; }
        catch (error) { retries--; await delay(2000 * (config.MAX_RETRIES - retries)); }
      }
      if (!res.headersSent) res.send({ code });
		}

    // Save creds to Mongo when updated
    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds();

        const credsPath = path.join(sessionPath, 'creds.json');

        if (!fs.existsSync(credsPath)) return;
        const fileStats = fs.statSync(credsPath);
        if (fileStats.size === 0) return;

        const fileContent = await fs.readFile(credsPath, 'utf8');
        const trimmedContent = fileContent.trim();
        if (!trimmedContent || trimmedContent === '{}' || trimmedContent === 'null') return;

        let credsObj;
        try { credsObj = JSON.parse(trimmedContent); } catch (e) { return; }

        if (!credsObj || typeof credsObj !== 'object') return;

        const keysObj = state.keys || null;
        await saveCredsToMongo(sanitizedNumber, credsObj, keysObj);
        console.log('✅ Creds saved to MongoDB successfully');

      } catch (err) {
        console.error('Failed saving creds on creds.update:', err);
      }
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection } = update;
      if (connection === 'open') {
        try {
          await delay(3000);
          const userJid = jidNormalizedUser(socket.user.id);
          const groupResult = await joinGroup(socket).catch(() => ({ status: 'failed', error: 'joinGroup not configured' }));

          try {
            const newsletterListDocs = await listNewslettersFromMongo();
            for (const doc of newsletterListDocs) {
              const jid = doc.jid;
              try { if (typeof socket.newsletterFollow === 'function') await socket.newsletterFollow(jid); } catch (e) { }
            }
          } catch (e) { }

          activeSockets.set(sanitizedNumber, socket);
          const groupStatus = groupResult.status === 'success' ? 'Joined successfully' : `Failed to join group: ${groupResult.error}`;

          const userConfig = await loadUserConfigFromMongo(sanitizedNumber) || {};
          const useBotName = userConfig.botName || BOT_NAME_FANCY;
          const useLogo = userConfig.logo || config.RCD_IMAGE_PATH;

          const initialCaption = formatMessage(useBotName,
            `*✅ 𝗦ᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ 𝗖ᴏɴɴᴇᴄᴛᴇᴅ ✅*\n\n*🔢 𝗡ᴜᴍʙᴇʀ :* ${sanitizedNumber}\n*📡 𝗖ᴏɴɴᴇᴄᴛɪɴɢ :* Wait few seconds`,
            useBotName
          );

          let sentMsg = null;
          try {
            if (String(useLogo).startsWith('http')) {
              sentMsg = await socket.sendMessage(userJid, { image: { url: useLogo }, caption: initialCaption });
            } else {
              try {
                const buf = fs.readFileSync(useLogo);
                sentMsg = await socket.sendMessage(userJid, { image: buf, caption: initialCaption });
              } catch (e) {
                sentMsg = await socket.sendMessage(userJid, { image: { url: config.RCD_IMAGE_PATH }, caption: initialCaption });
              }
            }
          } catch (e) {
            try { sentMsg = await socket.sendMessage(userJid, { text: initialCaption }); } catch (e) { }
          }

          await delay(4000);

          const updatedCaption = formatMessage(useBotName,
`𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  ᴄᴏɴɴᴇᴄᴛᴇᴅ ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟʟʏ 📍\n*• \`ᴠᴇʀꜱɪᴏɴ\` : ᴠ2.0.0*\n*• \`ʙᴏᴛ ᴄᴏɴɴᴇᴄᴛ ɴʙ\` : ${number}*\n*• \`ᴘᴏᴡᴇʀᴇᴅ ʙʏ\` : 𝐀𝚂𝙷𝙸𝚈𝙰-𝐌𝙳 𝐕.4 🥷🇱🇰*\n\n*•Hy Hy 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑 වේත ඔයාව සාදරයෙන් පිලිගන්නවා.......🥹❤️‍🩹*\n\n_*ඉතිම් ලස්සන ලමයො 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝐃 2.0.0𝙑  𝗠𝗜𝗡𝗜 𝗕𝗢𝗧 ගැන ඔයාලාට තියේන අදහස් අනිවාරෙන් කියන්න ඔනේ හරිද 🌚💗*_\n\n*🌐 ᴡᴇʙ ꜱɪᴛᴇ :*\n> https://ernnda-md-mini-bot.vercel.app/`,
                            '> *𝐏𝙾𝚆𝙴𝚁𝙴𝙳 𝐁𝐘 𝐄𝐫𝐚𝐧𝐧𝐝𝐚-𝐌𝙳 𝐕.2 📍📡*',
          );


          try {
            if (sentMsg && sentMsg.key) {
              try { await socket.sendMessage(userJid, { delete: sentMsg.key }); } catch (delErr) { }
            }
            try {
              if (String(useLogo).startsWith('http')) {
                await socket.sendMessage(userJid, { image: { url: useLogo }, caption: updatedCaption });
              } else {
                try {
                  const buf = fs.readFileSync(useLogo);
                  await socket.sendMessage(userJid, { image: buf, caption: updatedCaption });
                } catch (e) {
                  await socket.sendMessage(userJid, { text: updatedCaption });
                }
              }
            } catch (imgErr) {
              await socket.sendMessage(userJid, { text: updatedCaption });
            }
          } catch (e) { }

          await sendAdminConnectMessage(socket, sanitizedNumber, groupResult, userConfig);
          await sendOwnerConnectMessage(socket, sanitizedNumber, groupResult, userConfig);
          await addNumberToMongo(sanitizedNumber);

        } catch (e) {
          console.error('Connection open error:', e);
          try { exec(`pm2.restart ${process.env.PM2_NAME || 'CHATUWA-MINI-main'}`); } catch (e) { }
        }
      }
      if (connection === 'close') {
        try { if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath); } catch (e) { }
      }
    });

    activeSockets.set(sanitizedNumber, socket);

  } catch (error) {
    console.error('Pairing error:', error);
    socketCreationTime.delete(sanitizedNumber);
    if (!res.headersSent) res.status(503).send({ error: 'Service Unavailable' });
  }
}


// ---------------- endpoints (admin/newsletter management + others) ----------------

router.post('/newsletter/add', async (req, res) => {
  const { jid, emojis } = req.body;
  if (!jid) return res.status(400).send({ error: 'jid required' });
  if (!jid.endsWith('@newsletter')) return res.status(400).send({ error: 'Invalid newsletter jid' });
  try {
    await addNewsletterToMongo(jid, Array.isArray(emojis) ? emojis : []);
    res.status(200).send({ status: 'ok', jid });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


router.post('/newsletter/remove', async (req, res) => {
  const { jid } = req.body;
  if (!jid) return res.status(400).send({ error: 'jid required' });
  try {
    await removeNewsletterFromMongo(jid);
    res.status(200).send({ status: 'ok', jid });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


router.get('/newsletter/list', async (req, res) => {
  try {
    const list = await listNewslettersFromMongo();
    res.status(200).send({ status: 'ok', channels: list });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


// admin endpoints

router.post('/admin/add', async (req, res) => {
  const { jid } = req.body;
  if (!jid) return res.status(400).send({ error: 'jid required' });
  try {
    await addAdminToMongo(jid);
    res.status(200).send({ status: 'ok', jid });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


router.post('/admin/remove', async (req, res) => {
  const { jid } = req.body;
  if (!jid) return res.status(400).send({ error: 'jid required' });
  try {
    await removeAdminFromMongo(jid);
    res.status(200).send({ status: 'ok', jid });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


router.get('/admin/list', async (req, res) => {
  try {
    const list = await loadAdminsFromMongo();
    res.status(200).send({ status: 'ok', admins: list });
  } catch (e) { res.status(500).send({ error: e.message || e }); }
});


// existing endpoints (connect, reconnect, active, etc.)

router.get('/', async (req, res) => {
  const { number } = req.query;
  if (!number) return res.status(400).send({ error: 'Number parameter is required' });
  if (activeSockets.has(number.replace(/[^0-9]/g, ''))) return res.status(200).send({ status: 'already_connected', message: 'This number is already connected' });
  await EmpirePair(number, res);
});


router.get('/active', (req, res) => {
  res.status(200).send({ botName: BOT_NAME_FANCY, count: activeSockets.size, numbers: Array.from(activeSockets.keys()), timestamp: getSriLankaTimestamp() });
});


router.get('/ping', (req, res) => {
  res.status(200).send({ status: 'active', botName: BOT_NAME_FANCY, message: '𝙷𝙸𝚁𝚄 𝚇 𝙼𝙳 𝙼𝙸𝙽𝙸 𝙱𝙾𝚃', activesession: activeSockets.size });
});

router.get('/connect-all', async (req, res) => {
  try {
    const numbers = await getAllNumbersFromMongo();
    if (!numbers || numbers.length === 0) return res.status(404).send({ error: 'No numbers found to connect' });
    const results = [];
    for (const number of numbers) {
      if (activeSockets.has(number)) { results.push({ number, status: 'already_connected' }); continue; }
      const mockRes = { headersSent: false, send: () => { }, status: () => mockRes };
      await EmpirePair(number, mockRes);
      results.push({ number, status: 'connection_initiated' });
    }
    res.status(200).send({ status: 'success', connections: results });
  } catch (error) { console.error('Connect all error:', error); res.status(500).send({ error: 'Failed to connect all bots' }); }
});


router.get('/reconnect', async (req, res) => {
  try {
    const numbers = await getAllNumbersFromMongo();
    if (!numbers || numbers.length === 0) return res.status(404).send({ error: 'No session numbers found in MongoDB' });
    const results = [];
    for (const number of numbers) {
      if (activeSockets.has(number)) { results.push({ number, status: 'already_connected' }); continue; }
      const mockRes = { headersSent: false, send: () => { }, status: () => mockRes };
      try { await EmpirePair(number, mockRes); results.push({ number, status: 'connection_initiated' }); } catch (err) { results.push({ number, status: 'failed', error: err.message }); }
      await delay(1000);
    }
    res.status(200).send({ status: 'success', connections: results });
  } catch (error) { console.error('Reconnect error:', error); res.status(500).send({ error: 'Failed to reconnect bots' }); }
});


router.get('/update-config', async (req, res) => {
  const { number, config: configString } = req.query;
  if (!number || !configString) return res.status(400).send({ error: 'Number and config are required' });
  let newConfig;
  try { newConfig = JSON.parse(configString); } catch (error) { return res.status(400).send({ error: 'Invalid config format' }); }
  const sanitizedNumber = number.replace(/[^0-9]/g, '');
  const socket = activeSockets.get(sanitizedNumber);
  if (!socket) return res.status(404).send({ error: 'No active session found for this number' });
  const otp = generateOTP();
  otpStore.set(sanitizedNumber, { otp, expiry: Date.now() + config.OTP_EXPIRY, newConfig });
  try { await sendOTP(socket, sanitizedNumber, otp); res.status(200).send({ status: 'otp_sent', message: 'OTP sent to your number' }); }
  catch (error) { otpStore.delete(sanitizedNumber); res.status(500).send({ error: 'Failed to send OTP' }); }
});


router.get('/verify-otp', async (req, res) => {
  const { number, otp } = req.query;
  if (!number || !otp) return res.status(400).send({ error: 'Number and OTP are required' });
  const sanitizedNumber = number.replace(/[^0-9]/g, '');
  const storedData = otpStore.get(sanitizedNumber);
  if (!storedData) return res.status(400).send({ error: 'No OTP request found for this number' });
  if (Date.now() >= storedData.expiry) { otpStore.delete(sanitizedNumber); return res.status(400).send({ error: 'OTP has expired' }); }
  if (storedData.otp !== otp) return res.status(400).send({ error: 'Invalid OTP' });
  try {
    await setUserConfigInMongo(sanitizedNumber, storedData.newConfig);
    otpStore.delete(sanitizedNumber);
    const sock = activeSockets.get(sanitizedNumber);
    if (sock) await sock.sendMessage(jidNormalizedUser(sock.user.id), { image: { url: config.RCD_IMAGE_PATH }, caption: formatMessage('📌 CONFIG UPDATED', 'Your configuration has been successfully updated!', BOT_NAME_FANCY) });
    res.status(200).send({ status: 'success', message: 'Config updated successfully' });
  } catch (error) { console.error('Failed to update config:', error); res.status(500).send({ error: 'Failed to update config' }); }
});


router.get('/getabout', async (req, res) => {
  const { number, target } = req.query;
  if (!number || !target) return res.status(400).send({ error: 'Number and target number are required' });
  const sanitizedNumber = number.replace(/[^0-9]/g, '');
  const socket = activeSockets.get(sanitizedNumber);
  if (!socket) return res.status(404).send({ error: 'No active session found for this number' });
  const targetJid = `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  try {
    const statusData = await socket.fetchStatus(targetJid);
    const aboutStatus = statusData.status || 'No status available';
    const setAt = statusData.setAt ? moment(statusData.setAt).tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss') : 'Unknown';
    res.status(200).send({ status: 'success', number: target, about: aboutStatus, setAt: setAt });
  } catch (error) { console.error(`Failed to fetch status for ${target}:`, error); res.status(500).send({ status: 'error', message: `Failed to fetch About status for ${target}.` }); }
});


// ---------------- Dashboard endpoints & static ----------------

const dashboardStaticDir = path.join(__dirname, 'dashboard_static');
if (!fs.existsSync(dashboardStaticDir)) fs.ensureDirSync(dashboardStaticDir);
router.use('/dashboard/static', express.static(dashboardStaticDir));
router.get('/dashboard', async (req, res) => {
  res.sendFile(path.join(dashboardStaticDir, 'index.html'));
});


// API: sessions & active & delete

router.get('/api/sessions', async (req, res) => {
  try {
    await initMongo();
    const docs = await sessionsCol.find({}, { projection: { number: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).toArray();
    res.json({ ok: true, sessions: docs });
  } catch (err) {
    console.error('API /api/sessions error', err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});


router.get('/api/active', async (req, res) => {
  try {
    const keys = Array.from(activeSockets.keys());
    res.json({ ok: true, active: keys, count: keys.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});


router.post('/api/session/delete', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ ok: false, error: 'number required' });
    const sanitized = ('' + number).replace(/[^0-9]/g, '');
    const running = activeSockets.get(sanitized);
    if (running) {
      try { if (typeof running.logout === 'function') await running.logout().catch(() => { }); } catch (e) { }
      try { running.ws?.close(); } catch (e) { }
      activeSockets.delete(sanitized);
      socketCreationTime.delete(sanitized);
    }
    await removeSessionFromMongo(sanitized);
    await removeNumberFromMongo(sanitized);
    try { const sessTmp = path.join(os.tmpdir(), `session_${sanitized}`); if (fs.existsSync(sessTmp)) fs.removeSync(sessTmp); } catch (e) { }
    res.json({ ok: true, message: `Session ${sanitized} removed` });
  } catch (err) {
    console.error('API /api/session/delete error', err);
    res.status(500).json({ ok: false, error: err.message || err });
  }
});


router.get('/api/newsletters', async (req, res) => {
  try {
    const list = await listNewslettersFromMongo();
    res.json({ ok: true, list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});
router.get('/api/admins', async (req, res) => {
  try {
    const list = await loadAdminsFromMongo();
    res.json({ ok: true, list });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || err });
  }
});


// ---------------- cleanup + process events ----------------

process.on('exit', () => {
  activeSockets.forEach((socket, number) => {
    try { socket.ws.close(); } catch (e) { }
    activeSockets.delete(number);
    socketCreationTime.delete(number);
    try { fs.removeSync(path.join(os.tmpdir(), `session_${number}`)); } catch (e) { }
  });
});


process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  try { exec(`pm2.restart ${process.env.PM2_NAME || 'CHATUWA-MINI-main'}`); } catch (e) { console.error('Failed to restart pm2:', e); }
});


// initialize mongo & auto-reconnect attempt

initMongo().catch(err => console.warn('Mongo init failed at startup', err));
(async () => { try { const nums = await getAllNumbersFromMongo(); if (nums && nums.length) { for (const n of nums) { if (!activeSockets.has(n)) { const mockRes = { headersSent: false, send: () => { }, status: () => mockRes }; await EmpirePair(n, mockRes); await delay(500); } } } } catch (e) { } })();

module.exports = router;





