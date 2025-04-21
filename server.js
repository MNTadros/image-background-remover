const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const { exec } = require('child_process');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// setup for uploads (max 5 MB)
const upload = multer({
  dest: 'public/uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.static('public'));

app.post('/analyze', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }

  const imagePath  = req.file.path;
  const outputPath = `${imagePath}_processed.png`;
  const scriptPath = path.join(__dirname, 'vision_processor.py');

  exec(`python "${scriptPath}" "${imagePath}" "${outputPath}"`, (err, stdout, stderr) => {
    if (err) {
      console.error('Python error:', err);
      return res.status(500).json({
        success: false,
        message: 'Processing failed',
        error: err.message
      });
    }

    let analysis;
    try {
      analysis = JSON.parse(stdout);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'stdout:', stdout);
      analysis = { success: false, message: 'Invalid JSON from Python' };
    }

    if (!fs.existsSync(outputPath)) {
      console.error('Processed file missing:', outputPath);
      return res.status(500).json({
        success: false,
        message: 'Processed image not found'
      });
    }

    try {
      const imgBuf = fs.readFileSync(outputPath);
      
      // clean up both files
      fs.unlinkSync(imagePath);
      fs.unlinkSync(outputPath);

      res.json({
        success: true,
        processedImage: imgBuf.toString('base64'),
        analysis
      });
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: cleanupErr.message
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
