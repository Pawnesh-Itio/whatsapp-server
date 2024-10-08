const DeviceSession =  require('../models/DeviceSession');
const {clients} = require('./clients.js');

// Send direct message using phoneNumber
exports.sendMessage = async (req, res) => {
    // Validating required parameters.
    const { userId, deviceId, to, message } = req.body;
    if (!userId || !to || !message || !deviceId) {
        return res.status(400).json({ message: 'Required fields are missing' });
    }
    //Fetch DeviceSession from database. 
    const data = await DeviceSession.findOne({ deviceId,userId });
    //Validate DeviceSession data.  
    if (!data || !data.isAuthenticated) {
        return res.status(404).json({ message: 'Device not found or not authenticated' });
    }
    // Validating Client Id and Whatsapp Client.
    const clientId = data.clientId;
    if(!clients || !clients[clientId]){
        return res.status(404).json({message: 'Session not exist please connect the whatsapp again!'})
    }
    // Initializing Client
    const client = clients[clientId];
    // Checking whatsapp client state
    const clientState = await client.getState();
    if (clientState !== 'CONNECTED') {
        return res.status(500).json({ message: `Client is not connected. Current state: ${clientState}` });
    }
    // Send Direct Message
    if(/@/.test(to)){
        const numberMatch = to.match(/(\d+)(?=@)/);
        to = numberMatch ? numberMatch[1] : null;
    }
    const phoneNumber = `${to}@c.us`; // e.g., 918851411809@c.us for Indian numbers
    // Send the message
    client.sendMessage(phoneNumber, message ).then(response => {
        console.log('Message sent successfully');
        // Checking if new message and insert in db chat list if new.
        if(!data.chats.includes(phoneNumber)){
            data.chats.push(phoneNumber);// Adding to chat list.
            data.save();
        }
        return res.status(200).json({response:response});
    }).catch(err => {
        console.error('Error sending message:', err);
    });
};
// Get chats of contacted users realtime and histroy.
exports.getUserChat = async (req, res)=>{
    // Validating required parameters.
    const {userId, deviceId, chatId} = req.body;
    if(!userId || !deviceId || !chatId){
        return res.status(400).json({message:'Required fields are missing'});
    }
    // Retriving SessionData from database.
    const SessionData = await DeviceSession.findOne({ deviceId,userId });
    if (!SessionData || !SessionData.isAuthenticated) {
        return res.status(404).json({ message: 'Device not found or not authenticated' });
    }
    //Validating clientID and Whatsapp Client.
    const clientId = SessionData.clientId;
    if(!clients || !clients[clientId]){
        return res.status(404).json({message: 'Session not exist please connect the whatsapp again!'})
    }
    //Initializing Whatsapp Client
    const client = clients[clientId];

    // Check the client state
    const clientState = await client.getState();
    if (clientState !== 'CONNECTED') {
        return res.status(500).json({ message: `Client is not connected. Current state: ${clientState}` });
    }
    //Creating chat instance using chatId.  
    const chat = await client.getChatById(chatId);
    var dataMessage;
    if(chat){
        // Fetching chat history (Last 10 Messages).
        let lastMessage
        chat.fetchMessages({limit: 10, after: lastMessage} ).then(messages => {

            messages.forEach(message => {   
                const sender = message.fromMe ? 'You' : chat.name; // If the message is from you, Then sender You otherwise senderName or Number (If contact is not saved).
                console.log(`[${new Date(message.timestamp * 1000).toLocaleString()}] ${sender}: ${message.body}`);// Printing message on console.
                dataMessage='';
                dataMessage={
                    sender:sender,
                    timestamp:message.timestamp,
                    message:message.body
                }
                req.app.get('io').emit(`chat-${chatId}`,{dataMessage:dataMessage});
            });
            return res.status(200).json({ message: `success :
                
                ${chatId}` });
        }).catch(err => {
            console.error('Error fetching messages:', err);
        });
    }
    client.removeAllListeners('message_create');
    client.on('message_create', async (message) => {
        const senderReceiver = message.fromMe ? message.to : message.from; // If the message is from you, get the recipient ID, otherwise get the sender ID
        
        // Check if the message belongs to the current chat
        if (senderReceiver === chatId) {
            const sender = message.fromMe ? 'You' : chat.name; // Use chat.name (If contact have saved then it will show saved name otherwise number) 
            console.log(`[${new Date(message.timestamp * 1000).toLocaleString()}] ${sender}: ${message.body}`);// Printing realtime message on console.
            dataMessage='';
            dataMessage={
                sender:sender,
                timestamp:message.timestamp,
                message:message.body
            }
            req.app.get('io').emit(`chat-${chatId}`,{dataMessage:dataMessage});
        }
    });

}
exports.getChatList = async (req, res)=>{
    // validating required parameters.
    const {userId, deviceId} = req.body;
    if(!userId, !deviceId){
        return res.status(400).json({message:'Required fields are missing'});
    }
    // Retriving SessionData from database.
    const SessionData = await DeviceSession.findOne({deviceId, userId});
    if(!SessionData || !SessionData.isAuthenticated){
        return res.status(401).json({message:'Device not found or not authenticated'});
    }
    // Validating clientID and Whatsapp Client.
    const clientId =SessionData.clientId;
    if(!clients || !clients[clientId]){
        return res.status(401).json({message:'Session not exist please connect the whatsapp again!'});
    }
    // Initializing Whatsapp Client
    const client = clients[clientId];
    // Check the client state
    const clientState = await client.getState();
    if (clientState !== 'CONNECTED') {
        return res.status(500).json({ message: `Client is not connected. Current state: ${clientState}` });
    }
    const savedChatIds = SessionData.chats;
    // Array to hold all chat details.
    const chatDetails = [];
    // Loop through the chat instance with chat id
    for(const chatId of savedChatIds){
        const chat = await client.getChatById(chatId);
        const chatProfileImage = await client.getProfilePicUrl(chat.id._serialized);
        console.log(chatProfileImage);
        if(chat){
            chatDetails.push({
                chatId:chat.id._serialized,
                number:chat.id.user,
                profileImage:chatProfileImage,
                chatName:chat.name,
                lastMessage: chat.lastMessage ? chat.lastMessage.body : 'No messages yet',
                timestamp: chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000) : null , // Timestamp of the last message
                tsTimestamp: chat.lastMessage.timestamp
            })
        }
    }
    // Sort chats by last message timestamp
    chatDetails.sort((a, b) => b.timestamp - a.timestamp);
    console.log(chatDetails);
    return res.status(200).json({ chats: chatDetails });

}
