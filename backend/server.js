const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http' );
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app );
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const userRoutes = require('./routes/userRoutes');
const providerRoutes = require('./routes/providerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join provider room for real-time updates
  socket.on('joinProviderRoom', (providerId) => {
    socket.join(`provider_${providerId}`);
    console.log(`Provider ${providerId} joined their room`);
  });
  
  // Join customer room for real-time updates
  socket.on('joinCustomerRoom', (customerId) => {
    socket.join(`customer_${customerId}`);
    console.log(`Customer ${customerId} joined their room`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Basic route for testing
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to BeautyNow API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// For local development, start the server
// This won't run in Vercel's serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel serverless function
module.exports = app;
