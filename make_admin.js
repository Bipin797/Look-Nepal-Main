require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./looknepal-backend/models/User');

async function makeAdmin() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/looknepal');
    let user = await User.findOne({ email: 'admin@looknepal.com' });
    if (!user) {
        user = new User({
            firstName: 'Super',
            lastName: 'Admin',
            email: 'admin@looknepal.com',
            password: 'password123',
            userType: 'admin',
            isVerified: true
        });
    } else {
        user.userType = 'admin';
    }
    await user.save();
    console.log('Admin user ready. ID:', user._id);
    process.exit();
}
makeAdmin();
