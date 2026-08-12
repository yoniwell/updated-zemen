const http = require('http');
http.get('http://localhost:5000/api/content/download-categories', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data.substring(0, 500)));
});
