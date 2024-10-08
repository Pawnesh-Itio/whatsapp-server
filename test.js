const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Express initiated 
const app = express();
const port = 3000; // Port

// Create a new client instance
const client = new Client();
let isClientReady = false;
// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Client is ready!');
    isClientReady = true; // Set the flag to true when ready
});

// When the client received QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.initialize();

// Middleware to parse JSON bodies
app.use(express.json());

// Route to send a message
app.post('/send-message', (req, res) => {
    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    if (isClientReady) { // Check if client is ready
        client.sendMessage(number + '@c.us', message).then(response => {
            res.json({ success: 'Message sent successfully', response });
        }).catch(err => {
            console.error('Error sending message:', err);
            res.status(500).json({ error: 'Error sending message', details: err.message });
        });
    } else {
        res.status(503).json({ error: 'Client is not ready.' });
    }
});

app.get('/get-chats', async(req, res) =>{
    if(!isClientReady){
        return res.status(503).json({error: 'Client is not ready.'})
    }
    try{
        const chats = await client.getChats();
        res.json({chats});
    } catch (err){
        console.error("Error fetching chat list:", chats);
        return res.status(500).json({error: 'Error in fetching chats', details: err.message});  
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
const deleteSessionDir = (deviceName) => {
    const deviceDir = path.join(sessionDir, `session-${deviceName}`);
    if (fs.existsSync(deviceDir)) {
        fs.rmSync(deviceDir, { recursive: true, force: true });
        console.log(`Deleted session directory for ${deviceName}`);
    }
};
client.on('auth_failure', (message) => {
    console.error('Authentication failure:', message);
    // Delete the old session directory
    deleteSessionDir(deviceName);
    // Optionally, send a response to the client indicating the need for re-authentication
});