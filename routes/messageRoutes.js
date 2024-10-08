const express = require('express');
const { getUserChat, sendMessage,getChatList } = require('../Controllers/messageController');

const router = express.Router();

router.post('/send', sendMessage);
router.post('/user-chat',getUserChat);
router.post('/chat-list',getChatList);

module.exports = router;
