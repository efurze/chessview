const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// Define a route for the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scatter.html'));
});

app.get('/scatter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scatter.html'));
});

app.get('/bar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'barchart.html'));
});


app.use('/data', express.static(__dirname + '/public/data'));


app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});
