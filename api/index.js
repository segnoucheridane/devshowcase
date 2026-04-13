const app = require('./src/app');

// Add a direct test route
app.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Export for Vercel
module.exports = app;