import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Task from './models/Task.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Database Setup
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('Warning: MONGODB_URI is not defined using temporary local fallback or failing.');
}

mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/dailytodo')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Helper Functions removed (using Mongoose models directly)

// Auth Middleware
const auth = async (req, res, next) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    // Mongoose findById
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Routes
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/dist')));

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    
    await newUser.save();
    
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.cookie('userId', user._id.toString(), { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ message: 'Logged in', user: { id: user._id.toString(), email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId');
  res.json({ message: 'Logged out' });
});

// Me
// Me - Soft auth check to avoid 401 console errors
app.get('/api/auth/me', async (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.json({ user: null });
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.json({ user: null });
    res.json({ user: { id: user._id.toString(), email: user.email } });
  } catch (err) {
    console.error('Auth error:', err);
    res.json({ user: null });
  }
});

// Tasks

// Get Tasks
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).sort({ priority: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Task
app.post('/api/tasks', auth, async (req, res) => {
  const { text, days, recurring, date, frequency, startDate } = req.body;
  // days: array of numbers 0-6 (Sun-Sat) or names. Let's use 0-6.
  
  try {
    // Get current max priority to add to end
    const count = await Task.countDocuments({ userId: req.user._id });

    const newTask = new Task({
      userId: req.user._id,
      text,
      days: days || [0, 1, 2, 3, 4, 5, 6], // Default all
      recurring: recurring !== undefined ? recurring : true,
      frequency: frequency || 'weekly',
      startDate: startDate,
      date,
      priority: count
    });
    
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Task (Toggle Complete)
app.patch('/api/tasks/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date, completed } = req.body; // Expecting date string YYYY-MM-DD
  
  try {
    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (date !== undefined && completed !== undefined) {
      if (completed) {
        if (!task.completedDates.includes(date)) task.completedDates.push(date);
      } else {
        task.completedDates = task.completedDates.filter(d => d !== date);
      }
    }

    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.text !== undefined) task.text = req.body.text;
    if (req.body.days !== undefined) task.days = req.body.days;
    if (req.body.frequency !== undefined) task.frequency = req.body.frequency;
    if (req.body.startDate !== undefined) task.startDate = req.body.startDate;

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Task
app.delete('/api/tasks/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Task.findOneAndDelete({ _id: id, userId: req.user._id });
    
    if (!result) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reorder Tasks
app.patch('/api/tasks/reorder/batch', auth, async (req, res) => {
  const { taskIds } = req.body; // Array of IDs in new order
  
  try {
    const operations = taskIds.map((id, index) => {
      return Task.updateOne({ _id: id, userId: req.user._id }, { priority: index });
    });

    await Promise.all(operations);
    res.json({ message: 'Tasks reordered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});