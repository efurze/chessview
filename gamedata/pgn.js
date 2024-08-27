const readline = require('readline');

// capture everything between "1." and " 2"
const regex = /\d\. (.*?) \d/g;

// Create an interface to read from stdin line by line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Listen for each line of input
rl.on('line', (line) => {
    // Echo the line to stdout
    if (line.startsWith("1.")) {
      let moves = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        // e.g. match = "Qxf3 Nf6"
        moves = moves.concat(match[1].split(' '));
      }

      console.log(moves);
    }
});
