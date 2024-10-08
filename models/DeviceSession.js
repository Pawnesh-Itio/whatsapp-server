const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DeviceSessionSchema = new Schema({
    deviceId: { type: Number, required: true },
    userId: { type: Number, required: true, trim:true},
    clientId: {type:String, required: true, trim:true, unique: true },
    whatsappNumber:{type: Number, required:true, trim:true},
    whatsappName: { type: String, required: true },
    isAuthenticated: { type: Boolean, default: false },
    chats: { type: [String], default: [] } 
});

module.exports = mongoose.model('DeviceSession', DeviceSessionSchema);
