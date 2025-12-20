import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  timezone: { type: String, default: 'UTC' },
  categories: { type: [{ name: String, color: String }], default: [] }
});

// Map _id to id for frontend compatibility
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const User = mongoose.model('User', userSchema);

export default User;
