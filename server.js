require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/prisma');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Only run the server locally, not on Vercel
if (process.env.NODE_ENV !== 'production') {
  const start = async () => {
    try {
      await connectDB();
      server.listen(PORT, () => {
        console.log(`  Running  : http://localhost:${PORT}`);
        console.log(`  Mode     : ${process.env.NODE_ENV || 'development'}`);
        console.log(`  Health   : http://localhost:${PORT}/health`);
      });
    } catch (err) {
      console.error('Server failed to start:', err.message);
      process.exit(1);
    }
  };
  start();
}

// Export for Vercel (this is critical)
module.exports = app;