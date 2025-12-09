import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
const adapter = new JSONFile(path.join(__dirname, 'data', 'db.json'));
const db = new Low(adapter, { users: [], tasks: [] });

await db.read();
db.data = db.data || { users: [], tasks: [] };
await db.write();

// Helper Functions
const getUserByEmail = (email) => db.data.users.find(u => u.email === email);
const getUserById = (id) => db.data.users.find(u => u.id === id);

// Auth Middleware
const auth = (req, res, next) => {
  const userId = req.cookies.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = getUserById(userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
};

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  await db.read();
  if (getUserByEmail(email)) return res.status(400).json({ error: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), email, password: hashedPassword };
  
  db.data.users.push(newUser);
  await db.write();
  
  res.status(201).json({ message: 'User created' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  await db.read();
  const user = getUserByEmail(email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  res.cookie('userId', user.id, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
  
  res.json({ message: 'Logged in', user: { id: user.id, email: user.email } });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('userId');
  res.json({ message: 'Logged out' });
});

// Me
app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

// Tasks

// Get Tasks
app.get('/api/tasks', auth, async (req, res) => {
  await db.read();
  const tasks = db.data.tasks.filter(t => t.userId === req.user.id);
  // Sort by priority (higher index = higher priority? Or simple number field?)
  // Let's use an explicit priority index (0 is highest?) Or just order in array?
  // Use a 'priority' field. 0 = highest.
  tasks.sort((a, b) => a.priority - b.priority);
  res.json(tasks);
});

// Create Task
app.post('/api/tasks', auth, async (req, res) => {
  const { text, days } = req.body;
  // days: array of numbers 0-6 (Sun-Sat) or names. Let's use 0-6.
  // Default to all days if not provided handled by frontend, but robust here.
  
  await db.read();
  const newTask = {
    id: Date.now().toString(),
    userId: req.user.id,
    text,
    completedDates: [], // Store dates 'YYYY-MM-DD' when completed
    days: days || [0, 1, 2, 3, 4, 5, 6], // Default all
    priority: db.data.tasks.filter(t => t.userId === req.user.id).length // Add to end
  };
  
  db.data.tasks.push(newTask);
  await db.write();
  res.status(201).json(newTask);
});

// Update Task (Toggle Complete)
app.patch('/api/tasks/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date, completed } = req.body; // Expecting date string YYYY-MM-DD
  
  await db.read();
  const task = db.data.tasks.find(t => t.id === id && t.userId === req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (date !== undefined && completed !== undefined) {
    if (completed) {
      if (!task.completedDates.includes(date)) task.completedDates.push(date);
    } else {
      task.completedDates = task.completedDates.filter(d => d !== date);
    }
  }

  // Handle priority update or text update if needed
  if (req.body.priority !== undefined) task.priority = req.body.priority;
  if (req.body.text !== undefined) task.text = req.body.text;
  if (req.body.days !== undefined) task.days = req.body.days;

  await db.write();
  res.json(task);
});

// Delete Task
app.delete('/api/tasks/:id', auth, async (req, res) => {
  const { id } = req.params;
  await db.read();
  const initialLength = db.data.tasks.length;
  db.data.tasks = db.data.tasks.filter(t => t.id !== id || t.userId !== req.user.id);
  
  if (db.data.tasks.length === initialLength) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await db.write();
  res.json({ message: 'Task deleted' });
});

// Reorder Tasks
app.patch('/api/tasks/reorder/batch', auth, async (req, res) => {
  const { taskIds } = req.body; // Array of IDs in new order
  await db.read();
  
  // Update priority based on index in taskIds
  // Filter tasks for this user
  const userTasks = db.data.tasks.filter(t => t.userId === req.user.id);
  
  userTasks.forEach(task => {
    const newIndex = taskIds.indexOf(task.id);
    if (newIndex !== -1) {
      task.priority = newIndex;
    }
  });

  // Sort global array? No, just save.
  
  await db.write();
  res.json({ message: 'Tasks reordered' });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});