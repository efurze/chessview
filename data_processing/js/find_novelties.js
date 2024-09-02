
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const THRESHOLD = 100;


let initializeJSON = function(filename) {
  let obj = {}
  // Load the object from the JSON file
  try {
    const data = fs.readFileSync(filename, 'utf8');
    obj = JSON.parse(data);
  } catch (e) {
    //console.log("JSON file not read: " + e.toString());
  }
  return obj;
}

let saveObject = function(obj, filename) {
  try {
    const json = JSON.stringify(obj, null, " ");
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.error(e);
  }
}

let initializeOutputDirectory = function(outputdir) {
  for (let i=0; i<256; i++) {
    const dir = path.join(outputdir, i.toString(16).padStart(2, '0'));
    fs.mkdirSync(dir, { recursive: true });
  }
}

/*
  pos: {
    fen: <fenstr>,
    moves: {
     "Bb5": [
        "35fd9232bf4e4755", // gameId
        "ea19d08de9925418"
       ],
       ...
    }
  }
*/
let processPosition = function(pos) {
  if (!pos || !pos.moves) {
    return;
  }

  const moves = Object.keys(pos.moves);

  // total times this position has occurred
  let occurrances = 0;
  moves.forEach(function(move) {
    occurrances += pos.moves[move].length;
  });

  // only consider positions that have occured at least 100 times
  if (occurrances < 100){
    return;
  }


  const gamesBefore = {}; // {'1960.??.??': 0} 
  let allGames = []; // holds all games in which this pos occurred
  const moveBday = {}; // {'nf3': '1937.01.04'}
  moves.forEach(function(move) {
    // look up all the games move appeared in
    games = pos.moves[move].map(function(id){
      return loadGame(id);
    }); 

    // sort so we can find the first one
    games.sort(compareGameDates);
    gamesBefore[games[0]["Date"]] = 0;
    moveBday[move] = games[0]["Date"];

    console.log(move + " first made " + games[0].Date + " by " + games[0].Black);

    // TODO: make this a merge so I don't have to re-sort below
    allGames = allGames.concat(games);
  })


  allGames.sort(compareGameDates);

  // figure out how many times this position occurred
  // before each novelty
  let count = 0;
  allGames.forEach(function(game) {
    count++;
    if (game.Date in gamesBefore) {
      gamesBefore[game.Date] = count;
    }
  })

  moves.forEach(function(move) {
    const noveltyCount = pos.moves[move].length; // number of times this move happened
    const before = gamesBefore[moveBday[move]];
    const after = occurrances - before;
    const moveFreq = noveltyCount/occurrances;

    // Is this novelty or does our data just not happen to have captured
    // games where it was played? Calculate odds that <before> games
    // would have happened without it by chance
    noveltyProb = Math.pow(1 - moveFreq, before);

    if (noveltyProb > 0.05) {
      return;
    }

    const significance = Math.pow(moveFreq, noveltyCount) * binomial(after, noveltyCount);

    console.log(move, "before: " + before,
      "after: " + after,
      "occurrances: " + noveltyCount, 
      "freq: " + noveltyCount/after,
      "prior: " + noveltyProb,
      "significance: " + significance);
  })
}

function binomial(n, k) {
  if (k < 0 || k > n) {
    return 0;
  }
  if (k === 0 || k === n) {
    return 1;
  }

  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= n - k + i;
    result /= i;
  }

  return result;
}


let compareGameDates = function(a, b) {
  const datea = a['Date'].replace(/\?\?/g, "01").replace(/\./g, "");
  const dateb = b['Date'].replace(/\?\?/g, "01").replace(/\./g, "");
  return datea - dateb;
}

/*
returns:
{
"Event": "FIDE (27) 1967-1969",
 "Site": "Moskou cm sf",
 "Date": "1968.??.??",
 "Round": "1",
 "White": "Korchnoi, Viktor",
 "Black": "Tal, Mikhail",
 "Result": "0-1",
 "ECO": "E05k",
 "Moves": "1. e4 ..."
 }
*/
let loadGame = function(gameid) { // hash
  const filepath = path.join(GAMEDIR, gameid.slice(0,2) + path.sep + gameid.slice(2));
  return initializeJSON(filepath);
}

function* enumerateFiles(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      yield* enumerateFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}


// number of times a move had a given number of occurrances:
//
// 722000 {"50":338,"100":161,"200":76,"300":57,"400":88,"500":0}
// 722000 {"20":1050,"30":634,"40":444,"50":338}

const histogram = {
  '20': 0,
  '30': 0,
  '40': 0,
  '50': 0
};

let GAMEDIR = "";

let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.error("Not enough parameters. USAGE: node find_novelties.js input/ game/ output/");
    process.exit(1);
  }

  const inputpath = args[0];
  GAMEDIR = args[1];
  const filegenerator = enumerateFiles(inputpath);

  let file;
  let count = 0;
  while ((file = filegenerator.next().value) !== undefined) {
    processPosition(initializeJSON(file));
    if (count % 1000 == 0){

    }
    count++;
  }
}

runScript();



