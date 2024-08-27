const readline = require('readline');
let isClassical = false;


// Create an interface to read from stdin line by line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Listen for each line of input
rl.on('line', (line) => {
    // Echo the line to stdout
    if (line.startsWith("[Event")) {
        isClassical = line.includes("Rated Classical");
    }
    if (isClassical) {
        try {
            console.log(line);
        } catch(e){}
    }
});