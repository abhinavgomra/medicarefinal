const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the OCR endpoint
async function testOCR() {
  try {
    // First, login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com', // assuming admin user exists
      password: 'password'
    });
    const token = loginResponse.data.token;
    console.log('Logged in, token:', token);

    // Prepare form data with a test image
    const form = new FormData();
    const testImagePath = path.join(__dirname, 'Medical-Prescription-OCR-master/Model-1/test/1.jpg');
    if (!fs.existsSync(testImagePath)) {
      console.error('Test image not found at:', testImagePath);
      return;
    }
    form.append('file', fs.createReadStream(testImagePath));

    // Send OCR request
    const ocrResponse = await axios.post('http://localhost:5000/api/prescriptions/ocr', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('OCR Result:', ocrResponse.data);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

testOCR();
