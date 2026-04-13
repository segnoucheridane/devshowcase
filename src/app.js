const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');







const { apiLimiter }             = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes     = require('./routes/authRoute');
const userRoutes     = require('./routes/usersRoute');
const adminRoutes    = require('./routes/adminRoute');
const projectRoutes  = require('./routes/projectsRoute');
const timelineRoutes = require('./routes/timelineRoute');
const collaborationRoutes = require('./routes/collaborationsRoute');
const searchRoutes   = require('./routes/searchRoute');  
const marketplaceRoutes = require('./routes/marketplaceRoute');
const notificationRoutes = require('./routes/notificationsRoute');
const fundingRoutes = require('./routes/fundingRoute');
const reputationRoutes = require('./routes/reputationRoute');
const analyticsRoutes = require('./routes/analyticsRoute');
const learningRoutes = require('./routes/learningRoute');
const aiRoutes = require('./routes/aiRoute');
const licensingRoutes = require('./routes/licensingRoute');


const swaggerRoutes = require('./routes/swaggerRoute');


const app = express();

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

//app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({
    status:      'ok',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', timelineRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/search', searchRoutes);        
app.use('/api/discovery', searchRoutes);   
app.use('/api/marketplace', marketplaceRoutes); 
app.use('/api/notifications', notificationRoutes); 
app.use('/api', fundingRoutes);
app.use('/api', reputationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/licensing', licensingRoutes);


app.use('/api-docs', swaggerRoutes);



app.use(notFound);
app.use(errorHandler);

module.exports = app;