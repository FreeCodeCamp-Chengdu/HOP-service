const express = require('express');
const multer = require('multer');
const gitUploadRouter = require('./routes/gitUpload');

const app = express();
const port = process.env.PORT || 3000;

// Multer configuration for handling FormData
const upload = multer({ dest: 'uploads/' });

app.use('/file/Git', upload.any(), gitUploadRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;