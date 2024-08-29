const fs = require('fs');
const {Chess} = require('./chess.js');


let initializeJSON = function(filename) {
  let obj = {}
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    obj = JSON.parse(data);
  } catch (e) {
    console.log("JSON file not read: " + e.toString());
  }
  return obj;
}

let saveObject = function(obj, filename) {
  try {
    const json = JSON.stringify(obj, null, "\n"); 
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.log(e);
  }
}



let parseYear = function(str) {
  let date = 0;
  if (str) {
    str = str.replace(/"/g, "");
    const parts = str.split(".");
    date = parts[0];
  }
  return date;
}

let parseDate = function(str) {
  let date = "";
  if (str) {
    str = str.replace(/"/g, "");
    const parts = str.split(".");
    date = parts[0];
    if (parts[1] != "??") {
      date = parts[1] + "-" + date;
    }
    if (parts[2] != "??") {
      date = parts[2] + "-" + date;
    }
  }
  return date;
}

let printDates = function(games) {
  const gameids = Object.keys(games);
  gameids.forEach(function(id) {
    console.log("Game " + id + ": " + parseDate(games[id].Date));
  });
}

/*
  root: node of a prefix tree of moves

  this function crawls the tree and adds a "games" attribute to each node which contains an array of
  all gameIds which reached this position
*/
let decorateWithGames = function(root) {
  if (!root || !root.c){
    return [];
  }

  let ret = [];
  if (root.d) {
    ret = JSON.parse(JSON.stringify(root.d));
  }

  // find all games that reached this position
  const moves = Object.keys(root.c);
  moves.forEach(function(move) { // 'Nf3'
    let childgames = decorateWithGames(root.c[move]);
    ret = ret.concat(childgames);
  })

  if (ret.length < 12500) {
    root.games = ret;
  }

  return ret;
}

/*
  gameids: [1,2,3,533,5225]  // array of ids which are indices into games
  games: {1: {"Event": "world champ", "Date": "2003.2.2", ..., "moves": "1.e4 ..." }, 2: {} ...}
*/
let findEarliestYear = function(gameids, games) {
  //console.log(gameids);
  let earliest = 10000;
  gameids.forEach(function(id) {
      let year = parseYear(games[id].Date);
      earliest = Math.min(earliest, year);
      //console.log("year:", year, "earliest:", earliest);
  })
  return earliest;
}

let clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
}


let mergeNovelties = function(results, novelties){
  const keys = Object.keys(results);
  keys.forEach(function(key){
    if (key in novelties) {
      novelties[key] = novelties[key].concat(results.key);
    } else {
      novelties[key] = results[key];
    }
  })
}

/*
  returns a map between novelties (board position + move) and array of gameids that each appears in.
  Map key is fen.move e.g. "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2.nf3"
*/
let findNovelties = function(root, gamedata, chess, move /*'e4'*/) {
  if (!root || !root.c){
    return;
  }

  const novelties = {};
  let fen = "";
  let key = "";

  if ("games" in root && root.games.length > 1) {
    let earliest = findEarliestYear(root.games, gamedata);
    if (earliest > 1959 && root.games.length > 1) {
      //console.log(earliest, root.games.length);
      fen = chess.fen();
      key = fen + "." + move;
      novelties[key] = root.games.map(function(gameid){
        return gamedata[gameid].Date;
      });

      const moves = chess.history();
      console.log("Found novelty at " + moves.join(' '));
    }
  }

  if (move.length > 0) {
    chess.move(move);
  }

  let moves = Object.keys(root.c);

  moves.forEach(function(move) { // 'Nf3'
    let results = findNovelties(root.c[move], gamedata, chess, move);
    mergeNovelties(results, novelties);
  })

  chess.undo();

  return novelties;
}

console.log("loading game data");
let gamedata = initializeJSON("gmgames.json");

console.log("loading move tree")
let trie = initializeJSON("trie.json");

console.log("finding games");
decorateWithGames(trie);

console.log("finding novelties");
let n = findNovelties(trie, gamedata, new Chess(), '');
console.log("saving");
saveObject(n, "novelties.json");