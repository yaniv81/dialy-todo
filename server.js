const http = require('http');
const ejs = require('ejs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');

  ejs.renderFile(path.join(__dirname, 'views', 'index.ejs'), {}, {}, (err, str) => {
    if (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('Server Error');
    } else {
      res.end(str);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});