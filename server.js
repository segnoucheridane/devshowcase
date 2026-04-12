require('dotenv').config();

const express = require('express');
const app = require('./src/app');

// For Vercel - export the app directly
module.exports = app;

// Only start server locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
  const { connectDB } = require('./src/config/prisma');
  const PORT = process.env.PORT || 5000;
  
  const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`  Running  : http://localhost:${PORT}`);
      console.log(`  Mode     : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health   : http://localhost:${PORT}/health`);
    });
  };
  start();
}