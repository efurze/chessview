const fs = require('fs');
const readline = require('readline');
const path = require('path');
const {Chess} = require('./chess.js');
const chess = new Chess();

// capture everything between "1." and " 2" for every number
const regex = /\d\. (.*?) \d/g;

const TRIE_FILE = "trie.json";
let gameId = 1;




let addLineToTrie = function(trie, moves, gameId) {
  let currentNode = trie;
  moves.forEach(function(move) { // e.g. 'e4'
    let child = {};
    if (move in currentNode.c) {
      currentNode = currentNode.c[move];
    } else {
      //console.log("adding move " + move);
      currentNode.c[move] = {c: {}};
      currentNode = currentNode.c[move];
    }

    //console.log(JSON.stringify(trie));
  });

  if (!('d' in currentNode)) {
    currentNode.d = [];
  }
  currentNode.d.push(gameId);
};


let initializeTrie = function(filename) {
  let trie = {
    c: {}
  };
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    trie = JSON.parse(data);
  } catch (e) {
    //console.log("Trie file not read: " + e.toString());
  }
  return trie;
}

let saveTrie = function(trie, filename) {
  // Save the modified object to the JSON file
  try {
    const json = JSON.stringify(trie);
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.log(e);
  }
}

// Create an interface to read from stdin line by line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const trie_root = initializeTrie(TRIE_FILE);

rl.on('line', (line) => {
  if (line.startsWith("1.")) {
    if (!line.endsWith("1-0") && !line.endsWith("0-1") && !line.endsWith("1/2-1/2")) {
      console.log("skipping malformed pgn: " + line);
      return;
    }
    if (line.includes("eval")) {
      console.log("skipping malformed pgn: " + line);
      return;
    }
    try {
      //chess.reset();
      let match;
      let moves = [];
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
        //chess.move(halfmoves[0]);
        moves.push(halfmoves[0]);

        if (halfmoves[1] !== "1-0" && halfmoves[1] !== "0-1" && halfmoves[1] !== "1/2-1/2") {
          //chess.move(halfmoves[1]);
          moves.push(halfmoves[1]);
        }
      }); // forEach(turn)
      
      addLineToTrie(trie_root, moves, gameId);
      console.log("added game: " + gameId);
      gameId ++;

      //if (gameId > 1000) {
      //  rl.close();
      //}
    } catch (e) {
      console.log(e);
      console.log(line);  
    }

  }
});

rl.on('close', () => {
  console.log("end of input");
  saveTrie(trie_root, TRIE_FILE);
});