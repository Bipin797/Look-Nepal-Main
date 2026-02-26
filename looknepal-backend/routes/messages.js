const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations for the current user
 * @access  Private
 */
router.get('/conversations', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'firstName lastName profilePicture userType')
            .populate('jobContext', 'title company')
            .sort({ lastMessageAt: -1 })
            .lean();

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Server error fetching conversations' });
    }
});

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get all messages for a specific conversation
 * @access  Private
 */
router.get('/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Verify user is part of the conversation
        if (!conversation.participants.includes(userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Fetch messages
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 }) // Chronological order
            .lean();

        // Mark unread messages as read
        const unreadMessageIds = messages
            .filter(m => m.sender.toString() !== userId.toString() && !m.read)
            .map(m => m._id);

        if (unreadMessageIds.length > 0) {
            await Message.updateMany(
                { _id: { $in: unreadMessageIds } },
                { $set: { read: true } }
            );
        }

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
});

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post('/', authenticate, [
    body('receiverId').isMongoId().withMessage('Invalid receiver ID'),
    body('content').trim().notEmpty().withMessage('Message content is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { receiverId, content, jobContext } = req.body;
        const senderId = req.user._id;

        if (receiverId === senderId.toString()) {
            return res.status(400).json({ message: 'Cannot send message to yourself' });
        }

        // Check if conversation already exists between these two users
        let conversation;

        // If jobContext is provided, try to find a conversation for that specific job
        const query = {
            participants: { $all: [senderId, new mongoose.Types.ObjectId(receiverId)] }
        };
        if (jobContext) {
            query.jobContext = new mongoose.Types.ObjectId(jobContext);
        }

        conversation = await Conversation.findOne(query);

        // Create new conversation if it doesn't exist
        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId],
                jobContext: jobContext || null
            });
        }

        // Update conversation summary
        conversation.lastMessage = content;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Create message
        const message = new Message({
            conversationId: conversation._id,
            sender: senderId,
            content
        });

        await message.save();

        // Ensure the sender is populated before emitting so the frontend can render name/avatar if needed
        await message.populate('sender', 'firstName lastName profilePicture userType');

        // Setup Real-Time Socket Emission
        const io = req.app.get('io');
        const activeUsers = req.app.get('activeUsers');

        if (io && activeUsers) {
            const recipientSocketId = activeUsers.get(receiverId.toString());
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', message);
            }
        }

        // Optionally fetch populated message to return
        res.status(201).json(message);

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
});

module.exports = router;
