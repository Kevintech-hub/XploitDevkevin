const { 
    giftedId,
    removeFile,
    generateRandomCode
} = require('../gift');
const express = require('express');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const { sendButtons } = require('gifted-btns');
const {
    default: giftedConnect,
    useMultiFileAuthState,
    delay,
    downloadContentFromMessage, 
    generateWAMessageFromContent,
    normalizeMessageContent,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

router.get('/', async (req, res) => {
    const id = giftedId();
    let num = req.query.number;
    let responseSent = false;
    let sessionCleanedUp = false;
    let pairingCode = null;
    let codeSent = false;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            try {
                await removeFile(path.join(sessionDir, id));
            } catch (cleanupError) {
                console.error("Cleanup error:", cleanupError);
            }
            sessionCleanedUp = true;
        }
    }

    async function GIFTED_PAIR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        console.log(version);
        
        const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, id));
        
        try {
            let Gifted = giftedConnect({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.ubuntu("Edge"),
                syncFullHistory: false,
                generateHighQualityLinkPreview: true,
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
                getMessage: async () => undefined,
                markOnlineOnConnect: true,
                connectTimeoutMs: 60000, 
                keepAliveIntervalMs: 30000
            });

            // ========== FIX: Generate pairing code properly ==========
            if (!Gifted.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                
                // IMPORTANT: Don't pass a custom random code - let Baileys generate it
                // The 8-digit code displayed on WhatsApp must match what Baileys generates
                const code = await Gifted.requestPairingCode(num);
                
                // Format the code for display (add hyphens for readability)
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                
                // Store the pairing code
                pairingCode = code;
                
                if (!responseSent && !res.headersSent) {
                    res.json({ code: formattedCode });
                    responseSent = true;
                    codeSent = true;
                }
                
                console.log(`✅ Pairing code generated for ${num}: ${formattedCode}`);
            }
            // =========================================================

            Gifted.ev.on('creds.update', saveCreds);
            
            Gifted.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    console.log(`✅ Device connected successfully for ${num}`);
                    
                    await delay(5000);
                    
                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 15;
                    
                    while (attempts < maxAttempts && !sessionData) {
                        // A creds.json that merely exists and is >100 bytes is NOT proof
                        // pairing finished — that file already has keys/noiseKey/etc. right
                        // away. `me` (the actual WhatsApp identity) only gets set once
                        // WhatsApp confirms registration, which can land a few seconds
                        // later. Check the live object (same one used above for
                        // `.registered`) instead of guessing from file size.
                        const liveCreds = Gifted.authState.creds;
                        if (liveCreds?.me?.id) {
                            sessionData = Buffer.from(JSON.stringify(liveCreds));
                            break;
                        }
                        await delay(3000);
                        attempts++;
                    }

                    if (!sessionData) {
                        console.error("❌ Paired, but no WhatsApp identity (creds.me) showed up in time — refusing to send a broken session");
                        await cleanUpSession();
                        return;
                    }
                    
                    try {
                        const b64data = sessionData.toString('base64');
                        
                        await delay(3000); 

                        let sessionSent = false;
                        let sendAttempts = 0;
                        const maxSendAttempts = 5;

                        while (sendAttempts < maxSendAttempts && !sessionSent) {
                            try {
                                await sendButtons(Gifted, Gifted.user.id, {
                                    title: '',
                                    text: 'JEXPLOIT-BOT:~' + b64data,
                                    buttons: [
                                        { 
                                            name: 'cta_copy', 
                                            buttonParamsJson: JSON.stringify({ 
                                                display_text: 'Copy Session', 
                                                copy_code: 'JEXPLOIT-BOT:~' + b64data 
                                            }) 
                                        },
                                        {
                                            name: 'cta_url',
                                            buttonParamsJson: JSON.stringify({
                                                display_text: 'visit our site',
                                                url: 'https://xploitdevkevin-pairing-site.onrender.com/'
                                            })
                                        },
                                        {
                                            name: 'cta_url',
                                            buttonParamsJson: JSON.stringify({
                                                display_text: 'Join WaChannel',
                                                url: 'https://whatsapp.com/channel/0029Vb725SbIyPtOEG92nA04'
                                            })
                                        }
                                    ]
                                });
                                sessionSent = true;
                                console.log(`✅ Session sent successfully to ${Gifted.user.id}`);
                            } catch (sendError) {
                                console.error("Send error:", sendError);
                                sendAttempts++;
                                if (sendAttempts < maxSendAttempts) {
                                    await delay(3000);
                                }
                            }
                        }

                        if (!sessionSent) {
                            console.error("❌ Failed to send session");
                            await cleanUpSession();
                            return;
                        }

                        await delay(2000);
                        await Gifted.ws.close();
                        
                    } catch (sessionError) {
                        console.error("Session processing error:", sessionError);
                    } finally {
                        await cleanUpSession();
                    }
                    
                } else if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    console.log(`Connection closed with status: ${statusCode}`);
                    
                    if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
                        console.log("❌ Invalid pairing code or session expired");
                        if (!responseSent && !res.headersSent) {
                            res.status(401).json({ code: "Invalid pairing code or session expired" });
                            responseSent = true;
                        }
                        await cleanUpSession();
                    } else if (statusCode !== 401 && !sessionCleanedUp) {
                        console.log("🔄 Reconnecting...");
                        await delay(5000);
                        GIFTED_PAIR_CODE();
                    }
                }
            });

        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent && !res.headersSent) {
                res.status(500).json({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
            await cleanUpSession();
        }
    }

    try {
        await GIFTED_PAIR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent && !res.headersSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;