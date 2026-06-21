const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

// Import kango-wa (will try, but we have fallbacks)
let sendButtons = null;
try {
    const kango = require('kango-wa');
    sendButtons = kango.sendButtons;
} catch (e) {
    console.log("⚠️ kango-wa not installed, buttons disabled");
}

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    async function PEAKY_BLINDER_MD_PAIR_CODE() {
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
                        let sessionId = "blinder~" + string_session;

                        // ---------- 1. SEND RAW SESSION ID ----------
                        await sock.sendMessage(sock.user.id, { text: sessionId });

                        // ---------- 2. SEND THE DESCRIPTION (PLAIN TEXT - GUARANTEED) ----------
                        const descriptionText = `*🔗 SESSION LINKED — DUAL BOT MODE 🔗*

*POWER. LOYALTY. LEGACY.*

This session ID is now successfully generated and works for BOTH Jexploit and Vesper-Xmd.
Use it for your deployments.

*Follow our channel below*👇
 https://whatsapp.com/channel/0029Vb725SbIyPtOEG92nA04
`;

                        // Send the description as plain text (ALWAYS WORKS)
                        await sock.sendMessage(sock.user.id, { text: descriptionText });

                        // ---------- 3. TRY TO SEND THE COPY BUTTON (BONUS) ----------
                        if (sendButtons) {
                            try {
                                await sendButtons(sock, sock.user.id, {
                                    text: '📋 *Tap the button below to copy your session ID instantly!*',
                                    footer: 'BEAMER XMD • Peaky Blinders MD',
                                    buttons: [
                                        {
                                            name: 'cta_copy',
                                            buttonParamsJson: JSON.stringify({
                                                display_text: '📋 Copy Session',
                                                copy_code: sessionId
                                            })
                                        }
                                    ]
                                });
                            } catch (buttonError) {
                                console.log("Button error (normal):", buttonError.message);
                                // Fallback: send manual copy instruction
                                await sock.sendMessage(sock.user.id, { text: `📋 *Copy manually:*\n${sessionId}` });
                            }
                        } else {
                            // kango not installed, send manual instruction
                            await sock.sendMessage(sock.user.id, { text: `📋 *Copy manually:*\n${sessionId}` });
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
                    PEAKY_BLINDER_MD_PAIR_CODE();
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