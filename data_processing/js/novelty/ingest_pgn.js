const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');

let OUTPUT_PATH = "";

// Function to read a file line by line
function readFileLineByLine(filePath) {
	let buffer = []; // collection of lines
	let count = 0;
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity // Recognizes all instances of CR LF ('\r\n') as a single line break.
        });

        rl.on('line', (line) => {
            // Process each line here
            buffer.push(line);
            if (line.startsWith("1.")) {
            	processGame(buffer);
            	buffer = [];
            	count++;
            	if (count % 100 == 0){
            		console.log("game " + count);
            	}            	
            }
        });

        rl.on('close', () => {
            resolve(); // Resolve the promise when reading is complete
        });

        rl.on('error', (error) => {
            reject(error); // Reject the promise if there's an error
        });
    });
}

let saveObject = function(obj, filename) {
  try {
    const json = JSON.stringify(obj, null, " "); 
  	fs.writeFileSync(filename, json);
  } catch (e) {
    console.log(e);
  }
}

/*
	line: text with move sequence e.g. "1. e4 e5 2. ..."
	returns array of half-moves:
	['e4', 'e5', 'nf3', ...]
*/
let parseMoves = function(line) {
	const moves = [];
	if (!line.endsWith("1-0") && !line.endsWith("0-1") && !line.endsWith("1/2-1/2") && !line.endsWith("*")) {
	  console.log("skipping malformed pgn: " + line);
	  return moves;
	}
	if (line.includes("eval")) {
	  console.log("skipping malformed pgn: " + line);
	  return moves;
	}

	let turns = line.split(/\d+\. /); //['e4 e5 ', 'Nf3 Nc6' ...]
	turns.forEach(function(turn) {
	turn = turn.trim();
	if (!turn.length) {
	  return;
	}
	// 'e4 e5 ' 
	let halfmoves = turn.split(' ');
	//console.log(halfmoves);

	// NOTE: the last half-move for black will be "1-0", "0-1", or "1/2-1/2" if the game ended on white's move
	// chess.move() will throw an exception if the move isn't well-formed
	moves.push(halfmoves[0]);

	if (halfmoves[1] !== "1-0" && halfmoves[1] !== "0-1" && halfmoves[1] !== "1/2-1/2" && halfmoves[1] !== "*") {
	  moves.push(halfmoves[1]);
	}
	}) // forEach(turn)

    return moves;
}

/*
	This parses the game metadata into key/value pairs and saves it to disk

	@buffer: array of text lines
*/
let processGame = function(buffer) {
	const gamedata = {};
	let moves = [];
	buffer.forEach(function(line) {
		line = line.trim();
		if (line.startsWith("1.")) {
			gamedata['Moves'] = line;
			moves = parseMoves(line);
		} else {
			// parse e.g. [White "Bukavshin, Ivan"] into key/value pair
			const matches = line.match(/\[([^\]]+)\]/);
			if (matches && matches.length > 1) { // matches[1] should be "White 'Bukavshin, Ivan'"
				let index = matches[1].indexOf(" ");
				if (index !== -1) {
					const key = matches[1].slice(0, index);
					let val = matches[1].slice(index+1);
					if (val) {
						val = val.replace(/\"/g, ""); // strip off the quotes
					}
					//console.log(key, val);
					gamedata[key] = val;
				} else {
					console.error("Unable to parse metadata " + line);
				}
			}
		}
	}) // forEach(line)

	const hash256 = crypto.createHash('sha256').update(moves.join()).digest('hex');
	const hash64 = hash256.slice(0, 16);
	saveObject(gamedata, OUTPUT_PATH + hash64);
}


let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.log("Not enough parameters. USAGE: node ingest_pgn.js games.pgn outputdir/");
    process.exit(1);
  }

  OUTPUT_PATH = args[1];
  if (!OUTPUT_PATH.endsWith("/")) {
  	OUTPUT_PATH = OUTPUT_PATH + "/";
  }

  readFileLineByLine(args[0])
  	.then(function(){
  		console.log('Finished reading file');
  	}).catch(function(err){
  		console.error(`Error reading file: ${err.message}`);
  	});

}

runScript();