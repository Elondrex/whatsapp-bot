const fs = require('fs').promises;
const axios = require('axios');
const got = require('got');
const path = require('path');
const cheerio = require('cheerio');
const config = require('../../config');
const jsQR = require('jsqr');
const jimp = require('jimp');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');
let { JSDOM } = require('jsdom');
const { Buffer } = require('buffer');
const playdl = require('play-dl');
const { writeFileSync, readFileSync, unlinkSync, existsSync } = require('fs');
const { SESSION_ID } = require('../../config');
const PastebinAPI = require('pastebin-js');
const sessPath = path.resolve(__dirname, '../../auth');
const pastebin = new PastebinAPI('bR1GcMw175fegaIFV2PfignYVtF0b_Bl');
const Crypto = require('crypto');
const webp = require('node-webpmux');
const { tmpdir } = require('os');
const { loadMessage } = require('../Store').Store;
const { fromBuffer } = require('file-type');
const { default: fetch } = require('node-fetch');
const { jidDecode, delay, generateWAMessageFromContent, proto } = require('baileys');
const { PluginDB, installPlugin } = require('../Store').Plugins;
const { getStatus, getMessage } = require('../Store').Greetings;
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

async function imageToWebp(media) {
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);

 writeFileSync(tmpFileIn, media);

 await new Promise((resolve, reject) => {
  ffmpeg(tmpFileIn)
   .on('error', reject)
   .on('end', () => resolve(true))
   .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"])
   .toFormat('webp')
   .save(tmpFileOut);
 });

 const buff = readFileSync(tmpFileOut);
 unlinkSync(tmpFileOut);
 unlinkSync(tmpFileIn);
 return buff;
}

async function videoToWebp(media) {
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);

 writeFileSync(tmpFileIn, media);

 await new Promise((resolve, reject) => {
  ffmpeg(tmpFileIn)
   .on('error', reject)
   .on('end', () => resolve(true))
   .addOutputOptions(['-vcodec', 'libwebp', '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse", '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05', '-preset', 'default', '-an', '-vsync', '0'])
   .toFormat('webp')
   .save(tmpFileOut);
 });

 const buff = readFileSync(tmpFileOut);
 unlinkSync(tmpFileOut);
 unlinkSync(tmpFileIn);
 return buff;
}

async function writeExifImg(media, metadata) {
 let wMedia = await imageToWebp(media);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 writeFileSync(tmpFileIn, wMedia);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}

async function writeExifVid(media, metadata) {
 let wMedia = await videoToWebp(media);
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 writeFileSync(tmpFileIn, wMedia);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}

async function writeExifWebp(media, metadata) {
 const tmpFileIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 const tmpFileOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
 writeFileSync(tmpFileIn, media);

 if (metadata.packname || metadata.author) {
  const img = new webp.Image();
  const json = {
   'sticker-pack-id': `https://github.com/FXastro/fxop-md`,
   'sticker-pack-name': metadata.packname,
   'sticker-pack-publisher': metadata.author,
   emojis: metadata.categories ? metadata.categories : [''],
  };
  const exifAttr = await Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  const jsonBuff = await Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = await Buffer.concat([exifAttr, jsonBuff]);
  await exif.writeUIntLE(jsonBuff.length, 14, 4);
  await img.load(tmpFileIn);
  unlinkSync(tmpFileIn);
  img.exif = exif;
  await img.save(tmpFileOut);
  return tmpFileOut;
 }
}

const commands = [];

/**
 * Registers a command with its associated function and modifies command patterns.
 * @param {Object} cmdInfo - Information about the command.
 * @param {String} cmdInfo.pattern - The command pattern to match.
 * @param {Boolean} [cmdInfo.fromMe=false] - Indicates if the command is from the bot itself.
 * @param {Boolean} [cmdInfo.dontAddCommandList=false] - If true, the command won't be added to the command list.
 * @param {String} [cmdInfo.type='misc'] - The type of command.
 * @param {Function} func - The function to execute when the command is called.
 * @returns {Object} - The modified commandInfo object.
 */
function bot(cmdInfo, func) {
 cmdInfo.function = func;
 if (cmdInfo.pattern) {
  cmdInfo.originalPattern = cmdInfo.pattern; // Store the original pattern
  cmdInfo.pattern = new RegExp(`^(${config.HANDLERS})\\s*(${cmdInfo.pattern})(?:\\s+(.*))?$`, 'i'); // Create a new RegExp
 }
 cmdInfo.dontAddCommandList = cmdInfo.dontAddCommandList || false; // Default to false
 cmdInfo.fromMe = cmdInfo.fromMe || false; // Default to false
 cmdInfo.type = cmdInfo.type || 'misc'; // Default to 'misc'

 commands.push(cmdInfo);
 return cmdInfo;
}

/**
 * Convert a buffer to a file and save it
 * @param {Buffer} buffer The buffer to convert
 * @param {String} filename The name of the file
 * @returns {String} The path to the saved file
 * @example
 * const path = await bufferToFile(buffer, 'file.txt')
 * console.log(path)
 */

async function buffToFile(buffer, filename) {
 if (!filename) filename = Date.now();
 let { ext } = await fromBuffer(buffer);
 let filePath = path.join(tmpdir(), `${filename}.${ext}`);
 await fs.promises.writeFile(filePath, buffer);
 return filePath;
}

/**
 *
 * @param {Buffer} imageBuffer
 * @returns {Buffer|null} [Buffer|null
 */

const removeBg = async (imageBuffer) => {
 const formData = new FormData();
 const inputPath = await buffToFile(imageBuffer);
 formData.append('size', 'auto');
 formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));
 try {
  const response = await axios({
   method: 'post',
   url: 'https://api.remove.bg/v1.0/removebg',
   data: formData,
   responseType: 'arraybuffer',
   headers: {
    ...formData.getHeaders(),
    'X-Api-Key': config.REMOVEBG,
   },
   encoding: null,
  });

  if (response.status !== 200) {
   console.error('Error:', response.status, response.statusText);
   return null;
  }

  return response.data;
 } catch (error) {
  console.error('Request failed:', error);
  return null;
 }
};

async function validatAndSaveDeleted(client, msg) {
 if (msg.type === 'protocolMessage') {
  if (msg.message.protocolMessage.type === 'REVOKE') {
   await client.sendMessage(msg.key.remoteJid, { text: 'Message Deleted' });
   let jid = config.DELETED_LOG_CHAT;
   let message = await loadMessage(msg.message.protocolMessage.key.id);
   const m = generateWAMessageFromContent(jid, message.message, {
    userJid: client.user.id,
   });
   await client.relayMessage(jid, m.message, {
    messageId: m.key.id,
   });
   return m;
  }
 }
}

/**
 * Reads a QR code from an image buffer.
 * @param {Buffer} imageBuffer - The image buffer containing the QR code.
 * @returns {string|null} The decoded QR code data, or null if no QR code was found.
 */
async function readQr(imageBuffer) {
 try {
  const image = await jimp.read(imageBuffer);
  const { data, width, height } = image.bitmap;
  const code = jsQR(data, width, height);
  if (code) {
   return code.data;
  }
 } catch (err) {
  throw new Error(`Error reading QR code: ${err.message}`);
 }
 return null;
}

function createInteractiveMessage(data, options = {}) {
 const { jid, button, header, footer, body } = data;
 let buttons = [];
 for (let i = 0; i < button.length; i++) {
  let btn = button[i];
  let Button = {};
  Button.buttonParamsJson = JSON.stringify(btn.params);
  switch (btn.type) {
   case 'copy':
    Button.name = 'cta_copy';
    break;
   case 'url':
    Button.name = 'cta_url';
    break;
   case 'location':
    Button.name = 'send_location';
    break;
   case 'address':
    Button.name = 'address_message';
    break;
   case 'call':
    Button.name = 'cta_call';
    break;
   case 'reply':
    Button.name = 'quick_reply';
    break;
   case 'list':
    Button.name = 'single_select';
    break;
   default:
    Button.name = 'quick_reply';
    break;
  }
  buttons.push(Button);
 }
 const mess = {
  viewOnceMessage: {
   message: {
    messageContextInfo: {
     deviceListMetadata: {},
     deviceListMetadataVersion: 2,
    },
    interactiveMessage: proto.Message.InteractiveMessage.create({
     body: proto.Message.InteractiveMessage.Body.create({ ...body }),
     footer: proto.Message.InteractiveMessage.Footer.create({ ...footer }),
     header: proto.Message.InteractiveMessage.Header.create({ ...header }),
     nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: buttons,
     }),
    }),
   },
  },
 };
 let optional = generateWAMessageFromContent(jid, mess, options);
 return optional;
}

/**
 * Convert Audio to Playable WhatsApp Audio
 * @param {Buffer} buffer Audio Buffer
 * @param {String} ext File Extension
 */
const toAudio = (inputBuffer) => {
 return new Promise((resolve, reject) => {
  const stream = new Readable();
  stream.push(inputBuffer);
  stream.push(null);
  const chunks = [];
  ffmpeg(stream)
   .toFormat('mp3')
   .on('error', (err) => reject(err))
   .on('end', () => {
    resolve(Buffer.concat(chunks));
   })
   .pipe()
   .on('data', (chunk) => chunks.push(chunk));
 });
};

/**
 * Convert audio buffer to WhatsApp PTT format (opus).
 * @param {Buffer} inputBuffer - Buffer containing the input file.
 * @returns {Promise<Buffer>} - Promise resolving to the converted Opus buffer.
 */
const toPTT = (inputBuffer) => {
 return new Promise((resolve, reject) => {
  const stream = new Readable();
  stream.push(inputBuffer);
  stream.push(null);
  const chunks = [];

  ffmpeg(stream)
   .audioCodec('libopus')
   .audioBitrate(128)
   .audioQuality(10)
   .toFormat('opus')
   .on('error', (err) => reject(err))
   .on('end', () => {
    resolve(Buffer.concat(chunks));
   })
   .pipe()
   .on('data', (chunk) => chunks.push(chunk));
 });
};

/**
 * Convert Audio to Playable WhatsApp Video
 * @param {Buffer} buffer Video Buffer
 * @param {String} ext File Extension
 */
function toVideo(buffer, ext) {
 return ffmpeg(buffer, ['-c:v', 'libx264', '-c:a', 'aac', '-ab', '128k', '-ar', '44100', '-crf', '32', '-preset', 'slow'], ext, 'mp4');
}

/**
 * Downloads content from a specified URL and returns it as a buffer.
 * @param {String} url - The URL of the resource to download.
 * @param {Object} [options={}] - Optional request configuration.
 * @returns {Promise<Buffer>} - A promise that resolves to a Buffer of the downloaded data.
 * @throws {Error} - Throws an error if the request fails.
 */
async function getBuffer(url, options = {}) {
 try {
  const res = await axios({
   method: 'get',
   url,
   headers: {
    DNT: 1,
    'Upgrade-Insecure-Request': 1,
   },
   ...options,
   responseType: 'arraybuffer',
  });
  return res.data;
 } catch (error) {
  throw new Error(`Error: ${error.message}`);
 }
}
/**
 * Decodes a JID (Jabber ID) and returns the user and server part.
 * @param {String} jid - The JID to decode.
 * @returns {String|null} - Decoded JID in the format user@server or original JID if invalid.
 */
const decodeJid = (jid) => {
 if (!jid) return jid;
 if (/:\d+@/gi.test(jid)) {
  const decode = jidDecode(jid) || {};
  return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
 } else {
  return jid;
 }
};
/**
 * Fetches the file from a URL and determines its type.
 * @param {String} url - The URL of the file to fetch.
 * @returns {Promise<Object>} - An object containing the file type and buffer.
 */
async function FiletypeFromUrl(url) {
 const buffer = await getBuffer(url); // Assume getBuffer is defined elsewhere
 const out = await fromBuffer(buffer); // Assume fromBuffer is defined elsewhere
 let type;
 if (out) {
  type = out.mime.split('/')[0]; // Extract the primary type (e.g., 'image', 'audio')
 }
 return { type, buffer };
}
/**
 * Extracts the first URL found in a message string.
 * @param {String} message - The message containing URLs.
 * @returns {String|null} - The extracted URL or null if none found.
 */
function extractUrlFromMessage(message) {
 const urlRegex = /(https?:\/\/[^\s]+)/gi; // Regex to match URLs
 const match = urlRegex.exec(message);
 return match ? match[0] : null;
}

/**
 * Reads a file and returns its content as a buffer.
 * @param {String} filePath - The path to the file.
 * @returns {Promise<Buffer>} - A promise that resolves to the file buffer.
 * @throws {Error} - Throws an error if the file cannot be read.
 */
async function localBuffer(filePath) {
 try {
  const resolvedPath = path.resolve(filePath); // Resolves the path to an absolute path
  const buffer = await fs.readFile(resolvedPath); // Reads the file into a buffer
  return buffer;
 } catch (error) {
  throw new Error(`Error reading file at ${filePath}: ${error.message}`);
 }
}

const removeCommand = async (name) => {
 return new Promise((resolve, reject) => {
  commands.map(async (command, index) => {
   if (command.pattern !== undefined && command.pattern.test(new RegExp(`${config.HANDLERS}( ?${name})`, 'is'))) {
    commands.splice(index, 1);
    return resolve(true);
   }
  });
  resolve(false);
 });
};

async function getJson(url, options) {
 try {
  options ? options : {};
  const res = await axios({
   method: 'GET',
   url: url,
   headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
   },
   ...options,
  });
  return res.data;
 } catch (err) {
  return err;
 }
}

const installPluginHandler = async (message, match) => {
 if (!match) return await message.sendReply('_Provide URL of Plugin_');

 let url;
 try {
  url = new URL(match);
  if (url.host === 'gist.github.com') {
   url.host = 'gist.githubusercontent.com';
   url = url.toString() + '/raw';
  } else {
   url = url.toString();
  }
 } catch {
  return await message.send('_Invalid Url_');
 }

 try {
  const { data, status } = await axios.get(url);
  if (status !== 200) throw new Error('Failed to fetch plugin');

  let plugin_name = (data.match(/(?<=pattern:) ["'](.*?)["']/) || [])[0]?.replace(/["']/g, '').trim().split(' ')[0];
  plugin_name = plugin_name || '__' + Math.random().toString(36).substring(8);

  const filePath = `${__dirname}/${plugin_name}.js`;
  fs.writeFileSync(filePath, data);

  try {
   require(`./${plugin_name}`);
  } catch (e) {
   fs.unlinkSync(filePath);
   return await message.send(`Invalid Plugin\n \`\`\`${e}\`\`\``);
  }

  await installPlugin(url, plugin_name);
  await message.send(`_New plugin installed: ${plugin_name}_`);
 } catch (error) {
  console.error(error);
  return await message.send('Failed to fetch plugin');
 }
};

const listPluginsHandler = async (message) => {
 const plugins = await PluginDB.findAll();
 if (plugins.length === 0) {
  return await message.send('_No external plugins installed_');
 }
 const pluginList = plugins.map((plugin) => `\`\`\`${plugin.dataValues.name}\`\`\`: ${plugin.dataValues.url}\n`).join('');
 await message.send(pluginList);
};

const removePluginHandler = async (message, match) => {
 if (!match) return await message.send('_Need a plugin name_');

 const plugin = await PluginDB.findOne({ where: { name: match } });
 if (!plugin) return await message.send('_Plugin not found_');

 await plugin.destroy();
 const filePath = `${__dirname}/${match}.js`;
 delete require.cache[require.resolve(`./${match}.js`)];
 fs.unlinkSync(filePath);
 await message.send(`Plugin ${match} deleted`);
};

async function fancy(text) {
 try {
  const response = await axios.get('http://qaz.wtf/u/convert.cgi', {
   params: { text },
  });
  const $ = cheerio.load(response.data);
  const hasil = [];

  $('table > tbody > tr').each(function () {
   hasil.push({
    name: $(this).find('td:nth-child(1) > h6 > a').text(),
    result: $(this).find('td:nth-child(2)').text().trim(),
   });
  });
  return hasil.map((item) => item.result).join('\n');
 } catch (error) {
  console.error('Error fetching data:', error);
  throw error;
 }
}

async function twitter(id) {
 try {
  const url = 'https://ssstwitter.com';
  const response = await axios.get(url, {
   headers: {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
   },
  });

  const $ = cheerio.load(response.data);
  const form = $('form.pure-form.pure-g.hide-after-request');
  const includeVals = form.attr('include-vals');
  const ttMatch = includeVals.match(/tt:'([^']+)'/);
  const tsMatch = includeVals.match(/ts:(\d+)/);

  if (!ttMatch || !tsMatch) throw new Error('Cannot find tt or ts values.');

  const tt = ttMatch[1];
  const ts = tsMatch[1];

  const postData = new URLSearchParams({
   tt: tt,
   ts: ts,
   source: 'form',
   id: id,
   locale: 'en',
  });

  const postResponse = await axios.post(url, postData.toString(), {
   headers: {
    'HX-Request': 'true',
    'HX-Target': 'target',
    'HX-Current-URL': 'https://ssstwitter.com/en',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    Referer: 'https://ssstwitter.com/result_normal',
   },
  });

  const $result = cheerio.load(postResponse.data);
  const downloads = [];
  $result('.result_overlay a.download_link').each((i, element) => {
   const text = $result(element).text().trim();
   const href = $result(element).attr('href');
   if (href && href !== '#') {
    downloads.push({ text, url: href });
   }
  });

  if (downloads.length === 0) throw new Error('No valid download links found.');
  const firstDownloadUrl = downloads[0].url;
  const fileResponse = await axios.get(firstDownloadUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(fileResponse.data);

  return buffer;
 } catch (error) {
  console.error('Error:', error);
  throw error;
 }
}
async function tinyurl(url) {
 try {
  const response = await fetch(`https://tinyurl.com/api-create.php?url=${url}`);
  return await response.text();
 } catch (error) {
  console.error(error);
  return null;
 }
}

async function ssweb(url) {
 try {
  const response = await fetch(`https://image.thum.io/get/fullpage/${url}`);

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
 } catch (error) {
  console.error('Error creating screenshot:', error);
  return null;
 }
}

async function shortenurl(url) {
 const formData = new FormData();
 formData.append('u', url);

 try {
  const response = await axios.post('https://www.shorturl.at/shortener.php', formData, {
   headers: {
    ...formData.getHeaders(),
   },
  });
  const $ = cheerio.load(response.data);
  const shortUrl = $('#shortenurl').val();
  return shortUrl;
 } catch (error) {
  console.error('Error:', error.response ? error.response.data : error.message);
  return null;
 }
}

async function aptoideDl(query) {
 try {
  const response = await axios.get('http://ws75.aptoide.com/api/7/apps/search', {
   params: { query, limit: 1 },
  });
  const app = response.data.datalist.list[0];

  return {
   img: app.icon,
   developer: app.store.name,
   appname: app.name,
   link: app.file.path,
  };
 } catch (error) {
  console.error('Error fetching app information:', error);
  throw error;
 }
}

async function Google(query) {
 const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

 try {
  const response = await axios.get(searchUrl, {
   headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
   },
  });

  const $ = cheerio.load(response.data);
  const results = [];

  $('div.g').each((_, element) => {
   const title = $(element).find('h3').text();
   const link = $(element).find('a').attr('href');
   const description = $(element).find('div.VwiC3b').text();

   if (title && link) {
    results.push(`Title: ${title}\nLink: ${link}\nDescription: ${description}\n`);
   }
  });

  return results.join('\n');
 } catch (error) {
  throw new Error(`Failed to scrape Google: ${error.message}`);
 }
}
const gifted_api = `https://api.giftedtechnexus.co.ke/api/`;
async function lyrics(songName) {
 const encodeSong = encodeURIComponent(songName.trim());
 const url = `search/lyrics?query=${encodeSong}&apikey=giftedtechk`;
 const response = await axios.get(gifted_api + url);
 const data = response.data.result;
 const songLyrics = `*Artist: ${data.Artist}*\n*Song: ${data.Title}*\nLyrics: ${data.Lyrics}`;
 return songLyrics;
}

async function upload(input) {
 return new Promise(async (resolve, reject) => {
  const form = new FormData();
  let fileStream;

  if (Buffer.isBuffer(input)) {
   fileStream = input;
   form.append('files[]', fileStream, 'uploaded-file.jpg');
  } else if (typeof input === 'string') {
   fileStream = fs.createReadStream(input);
   form.append('files[]', fileStream);
  } else {
   return reject(new Error('Invalid input type'));
  }

  try {
   const response = await axios({
    url: 'https://uguu.se/upload.php',
    method: 'POST',
    headers: {
     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
     ...form.getHeaders(),
    },
    data: form,
   });
   resolve(response.data.files[0].url);
  } catch (error) {
   reject(error);
  }
 });
}

async function enhanceImage(imageBuffer, enhancementType) {
 const validEnhancementTypes = ['enhance', 'recolor', 'dehaze'];
 if (!validEnhancementTypes.includes(enhancementType)) {
  enhancementType = validEnhancementTypes[0];
 }

 const formData = new FormData();
 const apiUrl = `https://inferenceengine.vyro.ai/${enhancementType}`;

 formData.append('model_version', '1');
 formData.append('image', imageBuffer, {
  filename: 'enhance_image_body.jpg',
  contentType: 'image/jpeg',
 });

 try {
  const response = await fetch(apiUrl, {
   method: 'POST',
   body: formData,
   headers: formData.getHeaders(),
  });

  if (!response.ok) {
   throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const resultBuffer = await response.buffer();
  return resultBuffer;
 } catch (error) {
  throw new Error(`Error enhancing image: ${error.message}`);
 }
}

const baseUrl = 'https://ironman.koyeb.app/';
const apiKey = 'Ir0n-M4n_xhf04';
const imageApiKey = 'img-1r0nm4nH4x!';

async function askAi(aiType, query) {
 const apiPaths = {
  aoyo: 'ironman/ai/aoyo',
  thinkany: 'ironman/ai/thinkany',
  prodia: 'ironman/ai/prodia',
  lepton: 'ironman/ai/llm',
  gpt: 'ironman/ai/gpt',
  blackbox: 'ironman/ai/blackbox',
  chatgpt: 'ironman/ai/chatev',
  dalle: 'ironman/ai/dalle',
  upscale: 'ironman/ai/upscale',
 };

 try {
  switch (aiType) {
   case 'aoyo':
    const { data: aoyoResponse } = await axios.get(`${baseUrl}${apiPaths.aoyo}`, { headers: { ApiKey: apiKey }, params: { query } });
    return aoyoResponse;

   case 'prodia':
    return `${baseUrl}${apiPaths.prodia}?prompt=${query}&ApiKey=${imageApiKey}`;

   case 'lepton':
    const { data: leptonResponse } = await axios.get(`${baseUrl}${apiPaths.lepton}`, { headers: { ApiKey: apiKey }, params: { query } });
    return leptonResponse;

   case 'gpt':
    const { data: gptResponse } = await axios.get(`${baseUrl}${apiPaths.gpt}`, { headers: { ApiKey: apiKey }, params: { prompt: query } });
    return gptResponse;

   case 'blackbox':
    const { data: blackboxResponse } = await axios.get(`${baseUrl}${apiPaths.blackbox}`, { headers: { ApiKey: apiKey }, params: { query } });
    return blackboxResponse;

   case 'chatgpt':
    const { data: chatgptResponse } = await axios.get(`${baseUrl}${apiPaths.chatgpt}`, { headers: { ApiKey: apiKey }, params: { prompt: query } });
    return chatgptResponse;

   case 'dalle':
    return `${baseUrl}${apiPaths.dalle}?text=${encodeURIComponent(query)}&ApiKey=${imageApiKey}`;

   default:
    throw new Error('Invalid AI type provided.');
  }
 } catch (error) {
  console.error(`Error interacting with AI: ${error.message}`);
  throw error;
 }
}

async function bing(query) {
 const response = await axios.get(`https://gpt4.guruapi.tech/bing?username=astro&query=${encodeURIComponent(query)}`);
 return response.data.result;
}
const getFloor = function (number) {
 return Math.floor(number);
};

const onwhatsapp = async (phoneNumber) => {
 const userNumber = '+2348039607375';
 const apiKey = 'UAK35165589-1fa5-43e8-92aa-c3bb997985a8';
 const apiUrl = `https://api.p.2chat.io/open/whatsapp/check-number/${userNumber}/${phoneNumber}`;

 try {
  const { data } = await axios.get(apiUrl, { headers: { 'X-User-API-Key': apiKey } });
  const { on_whatsapp, number } = data;
  return `OnWhatsApp: ${on_whatsapp},\nCountry: ${number.iso_country_code},\nRegion: ${number.region},\nTimeZone: ${number.timezone.join(', ')}`;
 } catch {
  return 'Failed to check the number. Please try again later.';
 }
};

async function mediafiredl(url) {
 if (!/https?:\/\/(www\.)?mediafire\.com/.test(url)) {
  throw new Error('Invalid URL: ' + url);
 }
 const data = await got(url).text();
 const $ = cheerio.load(data);
 const Url = ($('#downloadButton').attr('href') || '').trim();
 const url2 = ($('#download_link > a.retry').attr('href') || '').trim();
 const $intro = $('div.dl-info > div.intro');
 const filename = $intro.find('div.filename').text().trim();
 const filetype = $intro.find('div.filetype > span').eq(0).text().trim();
 const ext = (/\(\.(.*?)\)/.exec($intro.find('div.filetype > span').eq(1).text()) || [])[1]?.trim() || 'bin';
 const $li = $('div.dl-info > ul.details > li');
 const aploud = $li.eq(1).find('span').text().trim();
 const filesizeH = $li.eq(0).find('span').text().trim();
 const filesize = parseFloat(filesizeH) * (/GB/i.test(filesizeH) ? 1000000 : /MB/i.test(filesizeH) ? 1000 : /KB/i.test(filesizeH) ? 1 : /B/i.test(filesizeH) ? 0.1 : 0);
 return {
  url: Url,
  url2,
  filename,
  filetype,
  ext,
  aploud,
  filesizeH,
  filesize,
 };
}

function convertToPDF(input, inputType = 'text') {
 return new Promise((resolve, reject) => {
  const chunks = [];
  const doc = new PDFDocument();

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => {
   const pdfBuffer = Buffer.concat(chunks);
   resolve(pdfBuffer);
  });

  switch (inputType) {
   case 'text':
    doc.fontSize(12).text(input, 100, 100);
    break;
   case 'image':
    if (typeof input === 'string' || Buffer.isBuffer(input)) {
     doc.image(input, {
      fit: [250, 300],
      align: 'center',
      valign: 'center',
     });
    } else {
     reject(new Error('Invalid image input. Must be a file path or a buffer.'));
     return;
    }
    break;
   default:
    reject(new Error('Invalid input type. Use "text" or "image".'));
    return;
  }

  doc.end();
 });
}
async function convertInputsToPDF(input, inputType) {
 if (inputType === 'text') {
  if (typeof input !== 'string' && !Buffer.isBuffer(input)) {
   throw new Error('Invalid text input. Must be a string or a buffer.');
  }
  const processedTextInput = typeof input === 'string' ? input : input.toString();
  return await convertToPDF(processedTextInput, 'text');
 } else if (inputType === 'image') {
  let processedImageInput;
  if (typeof input === 'string' && fs.existsSync(input)) {
   processedImageInput = fs.readFileSync(input);
  } else if (Buffer.isBuffer(input)) {
   processedImageInput = input;
  } else {
   throw new Error('Invalid image input. Must be a valid file path or a buffer.');
  }
  return await convertToPDF(processedImageInput, 'image');
 } else {
  throw new Error('Invalid input type. Use "text" or "image".');
 }
}
const decodeB64 = (str) => Buffer.from(str, 'base64').toString('utf-8');
const mkSessDir = () => fs.mkdir(sessPath, { recursive: true });
const wFile = (fp, data) => fs.writeFile(fp, data);
const exit = () => (console.error('unparsable session'), fs.rm(sessPath, { recursive: true, force: true }).finally(() => process.exit(1)));

const sessionID = (sid) =>
 mkSessDir()
  .then(() => {
   const sessId = (sid || SESSION_ID).replace(/Session~/gi, '').trim();
   return sessId.length > 20 ? wFile(path.join(sessPath, 'creds.json'), JSON.stringify(JSON.parse(decodeB64(sessId)))) : pastebin.getPaste(sessId).then((decodedData) => (decodedData ? wFile(path.join(sessPath, 'creds.json'), decodedData.toString()) : exit()));
  })
  .catch(exit);

const requireJS = async (dir, { recursive = false, fileFilter = (f) => path.extname(f) === '.js' } = {}) => {
 const entries = await fs.readdir(dir, { withFileTypes: true });
 const files = recursive
  ? await Promise.all(
     entries.map(async (entry) => {
      const fullPath = path.resolve(dir, entry.name);
      return entry.isDirectory() ? requireJS(fullPath, { recursive, fileFilter }) : fullPath;
     })
    ).then((results) => results.flat())
  : entries.map((entry) => path.join(dir, entry.name));

 const loadedModules = await Promise.all(
  files.filter(fileFilter).map(async (f) => {
   const filePath = path.isAbsolute(f) ? f : path.join(dir, f);
   try {
    return require(filePath);
   } catch (err) {
    return null;
   }
  })
 );

 return loadedModules.filter(Boolean);
};

async function Greetings(data, conn) {
 const metadata = await conn.groupMetadata(data.id);
 const participants = data.participants;

 for (const user of participants) {
  const userpp = await getUserProfilePicture(conn, user);

  switch (data.action) {
   case 'add': {
    await handleGroupAction(conn, data.id, metadata, user, userpp, 'welcome');
    break;
   }

   case 'remove': {
    await handleGroupAction(conn, data.id, metadata, user, userpp, 'goodbye');
    break;
   }
  }
 }
}

async function getUserProfilePicture(conn, user) {
 try {
  return await conn.profilePictureUrl(user, 'image');
 } catch {
  return 'https://getwallpapers.com/wallpaper/full/3/5/b/530467.jpg';
 }
}

async function handleGroupAction(conn, groupId, metadata, user, userpp, actionType) {
 const status = await getStatus(groupId, actionType);
 if (!status) return;

 const message = await getMessage(groupId, actionType);
 let msg = replaceMessagePlaceholders(message.message, user, metadata);

 const url = extractUrlFromMessage(msg);

 if (url) {
  const { type, buffer } = await FiletypeFromUrl(url);

  if (type === 'image' || type === 'video') {
   const caption = msg.replace(url, '').trim();

   conn.sendMessage(groupId, {
    [type]: buffer,
    caption,
    mentions: parseJid(msg),
   });
  } else {
   conn.sendMessage(groupId, { text: msg, mentions: parseJid(msg) });
  }
 } else {
  conn.sendMessage(groupId, { text: msg, mentions: parseJid(msg) });
 }
}

function replaceMessagePlaceholders(message, user, metadata) {
 return message
  .replace(/@user/gi, `@${user.split('@')[0]}`)
  .replace(/@gname/gi, metadata.subject)
  .replace(/@count/gi, metadata.participants.length);
}

const isYouTubeUrl = (url) => {
 const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/|youtu\.be\/)(watch\?v=)?([a-zA-Z0-9_-]{11})/;
 return youtubeRegex.test(url);
};

const getYoutubeLink = async (query) => {
 try {
  const searchResults = await playdl.search(query, { limit: 1 });
  if (searchResults.length > 0) {
   return searchResults[0].url;
  } else {
   console.log('No results found.');
   return null;
  }
 } catch (error) {
  console.error('Error occurred while searching:', error);
  return null;
 }
};

const downloadData = async (url) => {
 try {
  if (!url) {
   console.error('Invalid URL provided.');
   return null;
  }

  const apiUrl = 'https://api.guruapi.tech/ytdl/ytmp4?url=';
  const response = await axios.get(apiUrl + encodeURIComponent(url));
  if (response.status === 200) {
   const videoUrl = response.data.video_url;
   const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
   return Buffer.from(videoResponse.data);
  } else {
   console.error('Failed to fetch video data:', response.status);
   return null;
  }
 } catch (error) {
  console.error('Error occurred while downloading data:', error);
  return null;
 }
};

const returnDetails = async (url) => {
 try {
  if (!url) {
   console.error('Invalid URL provided.');
   return null;
  }

  const apiUrl = 'https://api.guruapi.tech/ytdl/ytmp4?url=';
  const response = await axios.get(apiUrl + encodeURIComponent(url));
  if (response.status === 200) {
   const { title, description } = response.data;
   return { title, description };
  } else {
   console.error('Failed to fetch video details:', response.status);
   return null;
  }
 } catch (error) {
  console.error('Error occurred while fetching details:', error);
  return null;
 }
};

async function ytPlay(query) {
 let url = query;
 if (!isYouTubeUrl(query)) {
  url = await getYoutubeLink(query);
  if (!url) {
   console.log('Failed to get YouTube link from search.');
   return null;
  }
 }

 const fetchVideo = await downloadData(url);
 const extras = await returnDetails(url);

 if (fetchVideo && extras) {
  console.log({ video: fetchVideo, details: extras });
  return { video: fetchVideo, details: extras };
 } else {
  console.log('Failed to fetch all data.');
  return null;
 }
}
module.exports = {
 Mode: config.WORK_TYPE.toLowerCase() === 'private',
 ytPlay,
 Greetings,
 bot,
 commands,
 imageToWebp,
 videoToWebp,
 writeExifImg,
 writeExifVid,
 writeExifWebp,
 sessionID,
 requireJS,
 convertToPDF,
 convertInputsToPDF,
 mediafiredl,
 onwhatsapp,
 getFloor,
 bing,
 askAi,
 IronMan: function IronMan(url) {
  return 'https://ironman.koyeb.app/' + url;
 },
 Google,
 aptoideDl,
 lyrics,
 ssweb,
 tinyurl,
 upload,
 shortenurl,
 enhanceImage,
 twitter,
 fancy,
 installPlugin,
 installPluginHandler,
 listPluginsHandler,
 removePluginHandler,
 parseTimeToSeconds: (timeString) => {
  const [minutes, seconds] = timeString.split(':').map(Number);
  return minutes * 60 + seconds;
 },
 toAudio,
 toPTT,
 toVideo,
 ffmpeg,
 removeBg,
 FiletypeFromUrl,
 removeCommand,
 localBuffer,
 getBuffer,
 extractUrlFromMessage,
 decodeJid,
 isAdmin: async (jid, user, client) => {
  const groupMetadata = await client.groupMetadata(jid);
  const groupAdmins = groupMetadata.participants.filter((participant) => participant.admin !== null).map((participant) => participant.id);

  return groupAdmins.includes(decodeJid(user));
 },
 webp2mp4: async (source) => {
  let form = new FormData();
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
  form.append('new-image-url', isUrl ? source : '');
  form.append('new-image', isUrl ? '' : source, 'image.webp');
  let res = await fetch('https://ezgif.com/webp-to-mp4', {
   method: 'POST',
   body: form,
  });
  let html = await res.text();
  let { document } = new JSDOM(html).window;
  let form2 = new FormData();
  let obj = {};
  for (let input of document.querySelectorAll('form input[name]')) {
   obj[input.name] = input.value;
   form2.append(input.name, input.value);
  }
  let res2 = await fetch('https://ezgif.com/webp-to-mp4/' + obj.file, {
   method: 'POST',
   body: form2,
  });
  let html2 = await res2.text();
  let { document: document2 } = new JSDOM(html2).window;
  return new URL(document2.querySelector('div#output > p.outfile > video > source').src, res2.url).toString();
 },
 validatAndSaveDeleted,
 webp2png: async (source) => {
  let form = new FormData();
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source);
  form.append('new-image-url', isUrl ? source : '');
  form.append('new-image', isUrl ? '' : source, 'image.webp');
  let res = await fetch('https://s6.ezgif.com/webp-to-png', {
   method: 'POST',
   body: form,
  });
  let html = await res.text();
  let { document } = new JSDOM(html).window;
  let form2 = new FormData();
  let obj = {};
  for (let input of document.querySelectorAll('form input[name]')) {
   obj[input.name] = input.value;
   form2.append(input.name, input.value);
  }
  let res2 = await fetch('https://ezgif.com/webp-to-png/' + obj.file, {
   method: 'POST',
   body: form2,
  });
  let html2 = await res2.text();
  console.log(html2);
  let { document: document2 } = new JSDOM(html2).window;
  return new URL(document2.querySelector('div#output > p.outfile > img').src, res2.url).toString();
 },
 parseJid(text = '') {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
 },
 parsedJid(text = '') {
  return [...text.matchAll(/([0-9]{5,16}|0)/g)].map((v) => v[1] + '@s.whatsapp.net');
 },
 getJson,
 isIgUrl: (url) => {
  return /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am|instagr.com)\/(\w+)/gim.test(url);
 },
 isUrl: (isUrl = (url) => {
  return new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi').test(url);
 }),
 getUrl: (getUrl = (url) => {
  return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
 }),
 qrcode: async (string) => {
  const { toBuffer } = require('qrcode');
  let buff = await toBuffer(string);
  return buff;
 },
 secondsToDHMS: (seconds) => {
  seconds = Number(seconds);

  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  seconds = Math.floor(seconds);

  const parts = [];

  if (days) parts.push(`${days} Days`);
  if (hours) parts.push(`${hours} Hours`);
  if (minutes) parts.push(`${minutes} Minutes`);
  if (seconds) parts.push(`${seconds} Seconds`);
  return parts.join(' ');
 },
 formatBytes: (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
 },
 sleep: delay,
 clockString: (duration) => {
  (seconds = Math.floor((duration / 1000) % 60)), (minutes = Math.floor((duration / (1000 * 60)) % 60)), (hours = Math.floor((duration / (1000 * 60 * 60)) % 24));

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return hours + ':' + minutes + ':' + seconds;
 },
 runtime: (seconds) => {
  seconds = Number(seconds);
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);
  var dDisplay = d > 0 ? d + (d == 1 ? ' d ' : ' d ') : '';
  var hDisplay = h > 0 ? h + (h == 1 ? ' h ' : ' h ') : '';
  var mDisplay = m > 0 ? m + (m == 1 ? ' m ' : ' m ') : '';
  var sDisplay = s > 0 ? s + (s == 1 ? ' s' : ' s') : '';
  return dDisplay + hDisplay + mDisplay + sDisplay;
 },
 Bitly: async (url) => {
  return new Promise((resolve, reject) => {
   const BitlyClient = require('bitly').BitlyClient;
   const bitly = new BitlyClient('6e7f70590d87253af9359ed38ef81b1e26af70fd');
   bitly
    .shorten(url)
    .then((a) => {
     resolve(a);
    })
    .catch((A) => reject(A));
   return;
  });
 },
 isNumber: function isNumber() {
  const int = parseInt(this);
  return typeof int === 'number' && !isNaN(int);
 },
 getRandom: function getRandom() {
  if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)];
  return Math.floor(Math.random() * this);
 },
 createInteractiveMessage,
 readQr,
 postJson: async function (url, postData, options = {}) {
  try {
   const response = await axios.request({
    url: url,
    data: JSON.stringify(postData),
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
    },
    ...options,
   });
   return response.data;
  } catch (error) {
   return error;
  }
 },
 writeJsonFiles: function (jsonObj, directoryPath) {
  for (const key in jsonObj) {
   if (jsonObj.hasOwnProperty(key)) {
    const filename = key + '.json';
    const filePath = path.join(directoryPath, filename);
    const content = JSON.stringify(jsonObj[key], null, 2);
    fs.writeFile(filePath, content, 'utf8', () => {});
   }
  }
 },
};

const ignore = () => {
 const gitignorePath = path.join(process.cwd(), '.gitignore');
 const ignorePatterns = ['node_modules', 'bot.db', 'auth', '.env', '.gitignore'].join('\n');
 if (!existsSync(gitignorePath)) writeFileSync(gitignorePath, ignorePatterns);
};

ignore();
