const http = require('http');
const ejs = require('ejs');
const path = require('path');


const port = process.env.PORT || 3000;

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

server.listen(port, () => {
  console.log(`Server running at port ${port}/`);
});