const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index by conversation and creation time for fast chronological sorting
messageSchema.index({ conversationId: 1, createdAt: -1 });
// Index by receiver reading status logic (often needed)
messageSchema.index({ conversationId: 1, read: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
