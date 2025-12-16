import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  completedDates: { type: [String], default: [] },
  days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
  recurring: { type: Boolean, default: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'everyOtherDay'], default: 'weekly' },
  startDate: { type: String }, // Format YYYY-MM-DD
  date: { type: String }, // Format YYYY-MM-DD for non-recurring
  priority: { type: Number, default: 0 },
  alertEnabled: { type: Boolean, default: false },
  alertTime: { type: String }, // Format HH:mm
  alertMode: { type: String, enum: ['vibration', 'sound', 'both'], default: 'both' }
});

// Map _id to id for frontend compatibility
taskSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
