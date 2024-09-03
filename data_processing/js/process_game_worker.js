
const { workerData, parentPort } = require('worker_threads');

const {Chess} = require('../../gamedata/chess.js');
const crypto = require('crypto');


let parseMoves = function(line){
  if (!line || (!line.endsWith("1-0") && !line.endsWith("0-1") && !line.endsWith("1/2-1/2") && !line.endsWith("*"))) {
      console.error("skipping malformed pgn: " + line);
      return [];
    }
    if (line.includes("eval")) {
      console.error("skipping malformed pgn: " + line);
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
      console.error(e);
      console.error(line);  
    }

    return moves;
}

let processGame = function(gameinfo) {

  const positionhash = {};
  const chess = new Chess();
  const moves = parseMoves(gameinfo.Moves);
  moves.forEach(function(move){
    let fen = chess.fen();
    const hash = crypto.createHash('sha256').update(fen).digest('hex').slice(0, 16);
 
    if (!(hash in positionhash)) {
      positionhash[hash] = 0;
    }
    positionhash[hash]++;
    
    try {
      chess.move(move);
    } catch (err) {
      console.error("Chess error: " + err);
    }
  })
  return positionhash;
}

const result = processGame(workerData.data);
parentPort.postMessage(result);