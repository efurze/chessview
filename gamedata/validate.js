const readline = require('readline');
const fs = require('fs');
const crypto = require('crypto');
var mmh3 = require('murmurhash3');
const {Chess} = require('./chess.js');


let initializeTrie = function(filename) {
  let trie = {
    d: [],      // data == array of gameIds
    c: {}       // named children e.g. {'e4': {trie}, 'd4': {trie}}
  };
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    trie = JSON.parse(data);
  } catch (e) {
    console.log("Trie file not read: " + e.toString());
  }
  return trie;
}

function createHash(inputString) {
    const hash = crypto.createHash('sha256');
    hash.update(inputString);
    return hash.digest('hex');
}

let gamecount = 0;
let traverse = function(root, chess) {
  if (!root)
    return;

  let children = {};
  if ('c' in root) {
    children = root.c;
  } else {
    children = root;
  }

  let keys = Object.keys(children);
  if (keys.length == 0) {
    console.log("validated game " + ++gamecount);
  }

  keys.forEach(function(key) {
    try {
      chess.move(key);
    } catch (e) {
      console.log("Invalid move " + key + " at position " + chess.history());
    }
    traverse(children[key], chess);
    chess.undo();
  });
}

const filename = process.argv[2];
let chess = new Chess();
const trie = initializeTrie(filename);
traverse(trie, chess);


