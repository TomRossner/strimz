import {Schema, model} from 'mongoose';

const userSchema = new Schema({
    firstName: String,
    lastName: String,
    email: {
        type: String,
        index: true
    },
    password: String,
    watchList: Array,
    isOnline: Boolean,
    createdAt: {
        type: Date,
        default: new Date(Date.now())
    },
    userId: Number
})

const User = model('User', userSchema);

export { User }