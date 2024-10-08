const { Client,LocalAuth } = require('whatsapp-web.js');
const DeviceSession = require('../models/DeviceSession');
const qrcode = require('qrcode-terminal');

// Add a new session
const { clients } = require('./clients');
exports.addSession = async (req, res) => {
    const { deviceId, userId } = req.body;
    if (!deviceId || !userId) {
        return res.status(400).json({ mecssage: 'Device Id and User Id are required' });
    }
    const data = await DeviceSession.findOne({ deviceId, userId });
    // Generate Client Id
    let clientId = data && data.clientId ? data.clientId : `WA-ID-${userId}-user-${deviceId}-${Date.now()}`;

    // Check for an existing client and destroy it
    if (clients[clientId]) {
        try {
            await clients[clientId].destroy();
            delete clients[clientId];
            console.log(`Destroyed and deleted existing client for user ${userId}`);
        } catch (err) {
            console.error(`Error destroying existing client for user ${userId}:`, err);
        }
    }
    // Creating Client
    try {
        const client = new Client({
            authStrategy: new LocalAuth({ 
                clientId: clientId,
                dataPath: 'session' })
        });
        //Send QR code to client
        client.on('qr', (qr) => {
            req.app.get('io').emit(`qrCode-${userId}`, { qrCode: qr });
        });
        //Authentication
        client.on('authenticated', () => {
            req.app.get('io').emit(`ready-${userId}`, { message: 'WhatsApp client is authenticated' });
        });
        //Ready
        client.on('ready', async () => {
                try {
                    const userInfo = client.info;
                    const whatsappName = userInfo.pushname;
                    const whatsappNumber = userInfo.wid.user;

                    await DeviceSession.findOneAndUpdate(
                        { deviceId, userId },
                        { clientId, whatsappNumber, whatsappName, isAuthenticated: true },
                        { new: true, upsert: true }
                    );
                    console.log("client is ready");
                    req.app.get('io').emit(`ready-${userId}`, { message: 'WhatsApp client is ready' });
                    // Store the new client instance
                    clients[clientId] = client;
                } catch (err) {
                    console.error('Error during ready state:', err);
                }
        });
        // Disconnected
        client.on('disconnected', async()=>{
            console.log('disconnected');
            try {
                await client.destroy();
                console.log(`Destroyed and deleted existing client for user ${userId}`);
            } catch (err) {
                console.error(`Error destroying existing client for user ${userId}:`, err);
            }
        });
        // Creating Client Instance
        await client.initialize();

    } catch (err) {
        console.error('Error with client initialization:', err);
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Failed to initialize WhatsApp client' });
        }
    }
};
