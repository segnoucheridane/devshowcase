const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Prisma connected to database');
  } catch (err) {
    console.error('Prisma connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };