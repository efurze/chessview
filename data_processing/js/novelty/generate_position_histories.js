/*
  generate_position_histories.js

  USAGE: node generate_position_histories.js input.json output.json

  first parameter should be the name of a json file with game data in the following format:
  {
    1: {"Date":"\"1900.??.??\"","White":"\"Maroczy, Geza\"","Black":"\"Mieses, Jacques\"","moves":"1. e4 d5 2. exd5 Qxd5 ...""},
    2: ...
  }

  This script will output a json file containing every move made in every position in the games from the input file. The output format is:

  {
    <fen>: {
      <move> (e.g. 'nf3'): [23, 54, 56, 78 ...],
      <move>: [<gameid>, <gameid>, ...]
    }

    <fen>: {...}
    ...
  }

  It is a mapping of unique FENs to a map from each known move in that position to an array of gameids in which the move was made.
  Gameids will match the ids in the input file

*/

const fs = require('fs');
const {Chess} = require('../../../gamedata/chess.js');


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
    const json = JSON.stringify(obj, null, " "); 
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
  gameinfo: {
    Date: "",
    moves: "1. e4 e5 2. ..."
    ...
  }
*/
let processGame = function(gameinfo, gameid, histories) {

  const chess = new Chess();
  const moves = parseMoves(gameinfo.moves);
  moves.forEach(function(move){
    let fen = chess.fen();
    if (!(fen in histories)) {
      histories[fen] = {};
    }

    let movesfromposition = histories[fen];
    if (!(move in movesfromposition)) {
      movesfromposition[move] = [];
    }
    movesfromposition[move].push(gameid);
    chess.move(move);
  })
}

let parseMoves = function(line){
  if (!line.endsWith("1-0") && !line.endsWith("0-1") && !line.endsWith("1/2-1/2") && !line.endsWith("*")) {
      console.log("skipping malformed pgn: " + line);
      return [];
    }
    if (line.includes("eval")) {
      console.log("skipping malformed pgn: " + line);
      return [];
    }

    let moves = [];

    try {
      let turns = line.split(/\d+\. /); //['e4 e5 ', 'Nf3 Nc6' ...]
      turns.forEach(function(turn) {
        turn = turn.trim();
        if (!turn.length) {
          return;
        }
        // 'e4 e5 ' 
        let halfmoves = turn.split(' ');
        //console.log(halfmoves);
        
        moves.push(halfmoves[0]);

        if (halfmoves[1] !== "1-0" && halfmoves[1] !== "0-1" && halfmoves[1] !== "1/2-1/2" && halfmoves[1] !== "*") {
          //chess.move(halfmoves[1]);
          moves.push(halfmoves[1]);
        }
      }); // forEach(turn)
      
    } catch (e) {
      console.log(e);
      console.log(line);  
    }

    return moves;
}


let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.log("Not enough parameters. USAGE: node generate_position_histories.js input.json output.json");
    process.exit(1);
  }

  console.log("loading game data from " + args[0]);
  let gamedata = initializeJSON(args[0]);

  const histories = {};

  const gameids = Object.keys(gamedata);
  gameids.forEach(function(id, idx){
    processGame(gamedata[id], id, histories);
    if (idx % 10 == 0){
      console.log("processed game " + id);
    }
  })


  console.log("saving output to " + args[1]);
  saveObject(histories, args[1]);
}

runScript();



