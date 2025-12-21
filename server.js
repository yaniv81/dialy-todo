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
import Subscription from './models/Subscription.js';
import webpush from 'web-push';
import cron from 'node-cron';

dotenv.config();

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
    res.json({ user: { id: user._id.toString(), email: user.email, categories: user.categories } });
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
  const { text, days, recurring, removeAfterCompletion, date, frequency, startDate, alertEnabled, alertTime, alertMode, category, categoryColor } = req.body;
  // days: array of numbers 0-6 (Sun-Sat) or names. Let's use 0-6.

  try {
    // Handle Categories
    if (category) {
      const user = await User.findById(req.user._id);
      const categoryExists = user.categories && user.categories.some(c => c.name === category);

      if (!categoryExists) {
        // Add new category
        // Default color if not provided?
        const color = categoryColor || '#3B82F6'; // Default Blue
        await User.findByIdAndUpdate(req.user._id, {
          $push: { categories: { name: category, color } }
        });
      }
    }
    // Get current max priority to add to end
    const count = await Task.countDocuments({ userId: req.user._id });

    const newTask = new Task({
      userId: req.user._id,
      text,
      days: days || [0, 1, 2, 3, 4, 5, 6], // Default all
      recurring: recurring !== undefined ? recurring : true,
      frequency: frequency || 'weekly',
      removeAfterCompletion: removeAfterCompletion || false,
      startDate: startDate,
      date,
      priority: count,
      alertEnabled,
      alertTime,
      alertMode,
      category
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
        // If removeAfterCompletion is true, delete the task
        if (task.removeAfterCompletion) {
          await Task.deleteOne({ _id: id });
          return res.json({ message: 'Task completed and removed', id, deleted: true });
        }
        if (!task.completedDates.includes(date)) task.completedDates.push(date);
      } else {
        task.completedDates = task.completedDates.filter(d => d !== date);
      }
    }

    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.text !== undefined) task.text = req.body.text;
    if (req.body.days !== undefined) task.days = req.body.days;
    if (req.body.recurring !== undefined) task.recurring = req.body.recurring;
    if (req.body.removeAfterCompletion !== undefined) task.removeAfterCompletion = req.body.removeAfterCompletion;
    if (req.body.frequency !== undefined) task.frequency = req.body.frequency;
    if (req.body.startDate !== undefined) task.startDate = req.body.startDate;
    if (req.body.alertEnabled !== undefined) task.alertEnabled = req.body.alertEnabled;
    if (req.body.alertTime !== undefined) task.alertTime = req.body.alertTime;
    if (req.body.alertMode !== undefined) task.alertMode = req.body.alertMode;
    if (req.body.category !== undefined) {
      task.category = req.body.category;
      // Check if we need to update category color in User? 
      // The PATCH mostly updates task data. Creating new category is done via User update in frontend or POST.
      // But if user changes color of existing category, that's a User update.
      // For now let's assume this just changes the task's category link.
    }

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

// Category Management

// Edit Category
app.patch('/api/categories/:name', auth, async (req, res) => {
  const { name } = req.params;
  const { newName, newColor } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const categoryIndex = user.categories.findIndex(c => c.name === name);

    if (categoryIndex !== -1) {
      // Normal update
      if (newName) user.categories[categoryIndex].name = newName;
      if (newColor) user.categories[categoryIndex].color = newColor;
    } else {
      // Orphan adoption: Category used in tasks but not in User list
      // We are "creating" it now (or renaming it to a new valid one)
      // Check if task exists with this category to confirm it's a valid orphan?
      // Optional, but let's just assume prompt is correct or user wants to create it.
      // But wait, if it's a rename of an orphan, we add 'newName' (or 'name' if no newName) to user.categories
      const nameToUse = newName || name;
      // Check if target name already exists?
      if (user.categories.some(c => c.name === nameToUse)) {
        // Merge? Or just error? Let's just update the tasks to point to the existing one.
        // If we merge, we don't add a new category.
      } else {
        user.categories.push({
          name: nameToUse,
          color: newColor || '#3B82F6'
        });
      }
    }

    await user.save();

    // Update Tasks
    // If renaming:
    if (newName && newName !== name) {
      await Task.updateMany(
        { userId: req.user._id, category: name },
        { category: newName }
      );
    }
    // If just changing color of orphan (and not renaming), or adopting:
    // We pushed to user.categories so future renders will use that color.
    // Tasks stick with 'category: name'.

    res.json({ message: 'Category updated', categories: user.categories });
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Category
app.delete('/api/categories/:name', auth, async (req, res) => {
  const { name } = req.params;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Remove from User
    user.categories = user.categories.filter(c => c.name !== name);
    await user.save();

    // Update Tasks: Remove category
    await Task.updateMany(
      { userId: req.user._id, category: name },
      { $unset: { category: "", categoryColor: "" } } // Unset both just in case
    );

    res.json({ message: 'Category deleted', categories: user.categories });
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Notifications

// Get VAPID Public Key
app.get('/api/config/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to Notifications
app.post('/api/notifications/subscribe', auth, async (req, res) => {
  const { subscription, timezone } = req.body;

  try {
    // Update user timezone
    if (timezone) {
      await User.findByIdAndUpdate(req.user._id, { timezone });
    }

    // Save subscription
    // Check if exists to avoid duplicates
    const existing = await Subscription.findOne({ endpoint: subscription.endpoint });
    if (!existing) {
      const newSub = new Subscription({
        userId: req.user._id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers['user-agent']
      });
      await newSub.save();
    }

    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cron Job for Alerts (Every Minute)
cron.schedule('* * * * *', async () => {
  try {
    // 1. Get all users with subscriptions
    // Optimization: distinct users from Subscription
    const userIds = await Subscription.distinct('userId');

    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) continue;

      const timezone = user.timezone || 'UTC';
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

      const hours = String(userTime.getHours()).padStart(2, '0');
      const minutes = String(userTime.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      // Get local date string YYYY-MM-DD for checking recurrence
      const year = userTime.getFullYear();
      const month = String(userTime.getMonth() + 1).padStart(2, '0');
      const day = String(userTime.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const dayIndex = userTime.getDay(); // 0-6

      // 2. Find matching tasks
      const tasks = await Task.find({
        userId: user._id,
        alertEnabled: true,
        alertTime: timeStr
      });

      for (const task of tasks) {
        // Check recurrence
        let isForToday = false;
        if (task.recurring) {
          if (task.frequency === 'everyOtherDay' && task.startDate) {
            const d1 = new Date(task.startDate); d1.setHours(0, 0, 0, 0);
            const d2 = new Date(todayStr); d2.setHours(0, 0, 0, 0);
            // We need robust diffing. Using simplified diff.
            // Ensure dates are parsed correctly in context of their timezone, 
            // but standard JS Date might convert to local.
            // Simplest is treat YYYY-MM-DD as UTC to diff days.
            const u1 = Date.parse(task.startDate);
            const u2 = Date.parse(todayStr);
            const diff = Math.round((u2 - u1) / (86400000));
            isForToday = (diff >= 0 && diff % 2 === 0);
          } else {
            isForToday = task.days.includes(dayIndex);
          }
        } else {
          isForToday = (task.date === todayStr);
        }

        if (isForToday) {
          // Send Notification
          const payload = JSON.stringify({
            title: 'Task Alert',
            body: task.text,
            icon: '/vite.svg', // Assuming public path
            // Custom data if needed
            url: '/'
          });

          const subs = await Subscription.find({ userId: user._id });
          for (const sub of subs) {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: sub.keys
            };

            webpush.sendNotification(pushSubscription, payload)
              .catch(err => {
                console.error('Push error', err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                  // Expired subscription
                  Subscription.deleteOne({ _id: sub._id }).catch(console.error);
                }
              });
          }
        }
      }
    }

  } catch (err) {
    console.error('Cron error:', err);
  }
});

// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});