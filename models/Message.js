const mongoose = require('mongoose');

const MessageScheme = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    text:String,
    file: String
}, {timestamps: true});


const MessageModel = mongoose.model('Message', MessageScheme);
module.exports = MessageModel;