require('dotenv').config();

const http = require('http');
const app = require('./src/app');

// Only for local development
if (process.env.NODE_ENV !== 'production') {
  const { connectDB } = require('./src/config/prisma');
  const PORT = process.env.PORT || 5000;
  const server = http.createServer(app);
  
  const start = async () => {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`  Running  : http://localhost:${PORT}`);
      console.log(`  Mode     : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health   : http://localhost:${PORT}/health`);
    });
  };
  start();
}

// For Vercel - export the app
module.exports = app;