require('dotenv').config();

const http           = require('http');
const app            = require('./src/app');
const { connectDB }  = require('./src/config/database');

const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

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

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

start();
