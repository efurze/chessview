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
  chess: contains board state for current move (represented by root node)
  games: map from gameid to set of game info (date, event, players, etc)
  positions: set where keys are fen strings of positions for which we have recorded novelties
  positionHistories: 
  {
    fen : {
      move : [date1, date2 ...]
    }
  }
*/
let generatePositions = function(root, chess, games, positions, positionhistories) {
  if (!root || !root.c){
    return [];
  }

  const fen = chess.fen();
  const isNovel = (fen in positions) ? true : false; // is this a novelty-producing position?

  // recurse on each child
  const moves = Object.keys(root.c);
  moves.forEach(function(move) { // 'Nf3'

    const childNode = root.c[move];
    
    // if this position is one in which we have novelties for,
    // then record all moves ever made from this position and their dates
    if (isNovel && childNode.games) {

      if (!(fen in positionhistories)) {
        positionhistories[fen] = {move : []};
      }
      history = positionhistories[fen];
      
      if (!(move in history)) {
        history[move] = [];
      }
      movehistory = history[move];

      childNode.games.forEach(function(gameid){
        if (games[gameid].Date){
          movehistory.push(games[gameid].Date.replace(/\"/g, ""));
        }
      })
    }

    chess.move(move);
    let childgames = generatePositions(childNode, chess, games, positions, positionhistories);
    chess.undo();
  })

}


let filterPositions = function(novelties){
  const positions = {}
  const keys = Object.keys(novelties);
  keys.forEach(function(key){
    const p = key.split(".")[0];
    //console.log(p);
    positions[p] = 1;
  })
  return positions;
}

console.log("loading game data");
let gamedata = initializeJSON("gmgames.json");

console.log("loading novelty data");
const positions = filterPositions(initializeJSON("novelties.json"));

console.log("loading move tree")
let trie = initializeJSON("trie.json");

console.log("decorating tree");
decorateWithGames(trie);

console.log("generating position histories");
let histories = {};
generatePositions(trie, new Chess(), gamedata, positions, histories);

console.log("saving");
saveObject(histories, "movehistories.json");

