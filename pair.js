const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');
const axios = require('axios');
const { sendButtons } = require('gifted-btns');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    async function JEXPLOIT_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            var items = ["Edge"];
            function selectRandomItem(array) {
                var randomIndex = Math.floor(Math.random() * array.length);
                return array[randomIndex];
            }
            var randomItem = selectRandomItem(items);

            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });
            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection == "open") {
                    await delay(5000);
                    let rf = __dirname + `/temp/${id}/creds.json`;
                    function generateRandomText() {
                        const prefix = "3EB";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        let randomText = prefix;
                        for (let i = prefix.length; i < 22; i++) {
                            const randomIndex = Math.floor(Math.random() * characters.length);
                            randomText += characters.charAt(randomIndex);
                        }
                        return randomText;
                    }
                    const randomText = generateRandomText();
                    try {
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let sessionId = "JEXPLOIT-BOT~" + string_session;

                        // Create the beautiful session message
                        const sessionMessage = `╭━━━━━✧JEXPLOIT SESSION ✧━━━━━╮
┃
┃ ✅ *Session Generated Successfully!*
┃ 
┃ 📌 *Session Format:* JEXPLOIT-BOT~[mega]
┃ 📦 *Size:* 2.45 KB
┃ 🔐 *Encoded:* Base64 Standard
┃
┃ ⚠️ *IMPORTANT:*
┃ • Do NOT share this session with anyone
┃ • Copy the session string below
┃ • Paste it in your bot's SESSION_ID
┃
┃ 📱 *Need Help?*
┃ • wa.me/256742932677
┃
┃ *Stay connected with Vesper-Xmd and Jexploit!*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

📋 *Your Session ID:*
\`${sessionId}\``;

                        // Try to send image with the session message
                        try {
                            const imageUrl = 'https://files.catbox.moe/j8fok2.jpg';
                            const imageResponse = await axios.get(imageUrl, {
                                responseType: 'arraybuffer',
                                timeout: 10000
                            });
                            const imageBuffer = Buffer.from(imageResponse.data);
                            
                            // Send image with caption
                            await sock.sendMessage(sock.user.id, {
                                image: imageBuffer,
                                caption: sessionMessage
                            });
                        } catch (imageError) {
                            // If image fails, send as text
                            await sock.sendMessage(sock.user.id, {
                                text: sessionMessage
                            });
                        }

                        // Send Gifted buttons using sendButtons from gifted-btns
                        try {
                            await sendButtons(sock, sock.user.id, {
                                text: '📋 *Choose an action below:*',
                                footer: 'JEXPLOIT BOT • Vesper-XMD',
                                buttons: [
                                    {
                                        name: 'cta_copy',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '📋 Copy Session',
                                            copy_code: sessionId
                                        })
                                    },
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '📢 Join Channel',
                                            url: 'https://whatsapp.com/channel/0029Vb725SbIyPtOEG92nA04'
                                        })
                                    },
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: '⭐ Star GitHub',
                                            url: 'https://github.com/Kevintech-hub/Jexploit-Bot'
                                        })
                                    }
                                ]
                            });
                        } catch (buttonError) {
                            console.log("Button error:", buttonError.message);
                            // Fallback: send session ID again with instructions
                            await sock.sendMessage(sock.user.id, { 
                                text: `📋 *Your Session ID:*\n\`${sessionId}\`\n\n📢 *Join our channel:*\nhttps://whatsapp.com/channel/0029Vb725SbIyPtOEG92nA04\n\n⭐ *Star on GitHub:*\nhttps://github.com/Kevintech-hub/Jexploit-Bot`
                            });
                        }

                    } catch (e) {
                        console.log("❌ Mega upload error:", e.message || e);
                        try {
                            await sock.sendMessage(sock.user.id, { text: `❌ Upload Failed: ${e.message || e}` });
                        } catch (sendError) {
                            console.log("❌ Failed to send error:", sendError);
                        }
                    }
                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗽𝗿𝗼𝗰𝗲𝘀𝘀...`);
                    await delay(10);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    JEXPLOIT_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ Service Unavailable" });
            }
        }
    }
    return await PEAKY_BLINDER_MD_PAIR_CODE();
});

module.exports = router;