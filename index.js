const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// Define a route for the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chess.html'));
});

app.get('/hello', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hello.html'));
});

app.get('/knight', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'knight.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/scatter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scatter.html'));
});

app.use('/public/js/third_party', express.static(__dirname + '/public/js/third_party/'));
app.use('/data', express.static(__dirname + '/public/data'));

/*
app.get('/', (req, res) => {
  res.send('Hello World!');
});
*/

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
