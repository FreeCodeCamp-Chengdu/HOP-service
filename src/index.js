require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fileGitRouter = require('./routes/fileGit');

const app = express();

app.use(express.json());
app.use('/', fileGitRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
