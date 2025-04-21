const dropZone       = document.getElementById('dropZone');
const imageInput     = document.getElementById('imageInput');
const analyzeBtn     = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');
const originalImage  = document.getElementById('originalImage');
const processedImage = document.getElementById('processedImage');
const fileStatus     = document.getElementById('fileStatus');
const downloadBtn    = document.getElementById('downloadBtn');

let selectedFile = null;

// format bytes
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024)      return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' bytes';
}

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('border-blue-400','bg-blue-50');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-blue-400','bg-blue-50');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('border-blue-400','bg-blue-50');
  if (e.dataTransfer.files.length) {
    const f = e.dataTransfer.files[0];
    if (f.type.startsWith('image/')) handleSelection(f);
  }
});

imageInput.addEventListener('change', () => {
  if (imageInput.files.length) handleSelection(imageInput.files[0]);
});

function handleSelection(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert('File size exceeds 5MB limit');
    return;
  }
  selectedFile = file;
  analyzeBtn.disabled = false;
  fileStatus.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;

  // hide previous results & download button
  resultsSection.classList.add('hidden');
  downloadBtn.classList.add('hidden');

  // preview original
  const reader = new FileReader();
  reader.onload = e => originalImage.src = e.target.result;
  reader.readAsDataURL(file);
}

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  fileStatus.textContent = `Uploading ${selectedFile.name}...`;
  loadingSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const response = await fetch('/analyze', { method: 'POST', body: formData });
    const data = await response.json();

    if (data.success) {
      const dataUrl = `data:image/png;base64,${data.processedImage}`;
      processedImage.src = dataUrl;

      // show download button
      downloadBtn.classList.remove('hidden');
      downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `processed_${selectedFile.name.replace(/\.[^.]+$/, '')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      resultsSection.classList.remove('hidden');
      fileStatus.textContent = `Done: ${selectedFile.name}`;
    } else {
      alert('Processing failed: ' + (data.message || 'Unknown error'));
      fileStatus.textContent = 'Error during processing';
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error');
    fileStatus.textContent = 'Network error';
  } finally {
    loadingSection.classList.add('hidden');
  }
});