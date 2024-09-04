/*
  generate_position_histories.js

  USAGE: node generate_position_histories.js input_dir output_dir

  Script will iterate over all files in input_dir. It expects each file to have game info in the following format:
  {
   "Event": "FIDE (27) 1967-1969",
   "Site": "Moskou cm sf",
   "Date": "1968.??.??",
   "Round": "1",
   "White": "Korchnoi, Viktor",
   "Black": "Tal, Mikhail",
   "Result": "0-1",
   "ECO": "E05k",
   "Moves": "1. Nf3 Nf6 2. c4 e6 3. g3 d5 4. Bg2 Be7 5. O-O O-O 6. d4 dxc4 7. Qc2 a6 8. a4 Nc6 9. Qxc4 Qd5 10. Nbd2 Rd8 11. e3 Qh5 12. e4 Bd7 13. b3 b5 14. Qc3 bxa4 15. bxa4 Bb4 16. Qc2 Rac8 17. Nc4 Be8 18. h3 Rxd4 19. g4 Qc5 20. Nxd4 Nxd4 21. Qd3 Rd8 22. Bb2 e5 23. Rfc1 Qe7 24. Bxd4 Rxd4 25. Qg3 Qe6 26. Qb3 a5 27. Qc2 c5 28. Ne3 Bc6 29. Rd1 g6 30. f3 c4 31. Qe2 Bc5 32. Kh1 c3 33. Nc2 Rxa4 34. Qd3 Bd4 35. f4 Rxa1 36. Rxa1 Bb6 37. Rb1 Bc5 38. f5 Qd7 39. Qxc3 Nxe4 40. Qxe5 Bd6 41. Qxa5 Bc7 42. Qb4 Qd3 0-1"
  }

  This script will write to the output_dir. It will generate one file for each unique board position in the format: 
  {
    "fen": <fenstr>,
    "moves": { 
      <move>: [<gameid>, <gameid>, ...]
      <move>: [<gameid>, <gameid>, ...]
      ...
    }
  }

  e.g.
  {
   "Qg3": ["0005e0f8f905947f", ...]
   ...
  }

  It is a mapping from each known move in that position to an array of gameids in which the move was made.
  Gameids will match the names of the input file

*/

const fs = require('fs');
const path = require('path');
const {Chess} = require('../../gamedata/chess.js');
const crypto = require('crypto');


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
  this returns an array of relative paths from the inputdir
  e.g. ["00/2ae3411265fbd2", ...]
*/
let enumerateGamefiles = function(dirpath){
  let files = [];
  try {
    files = enumerateFilesRecursively(dirpath);

    const normalizeDir = path.normalize(dirpath);
    files = files.map(function(filepath){
      return path.join(path.basename(path.dirname(filepath)), path.basename(filepath));
    })
  } catch (err) {
      console.error('Unable to scan directory:', err);
  }
  return files;
}


function enumerateFilesRecursively(dir, fileList = []) {
    let files = [];
    try {
      files = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.error('Unable to scan directory:', err);   
    }

    files.forEach(file => {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            enumerateFilesRecursively(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    });

    return fileList;
}

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

let filterPassCount = 0;
let filterFailCount = 0;
let positionHistoryCache = {};
let cacheDirtyFlag = false;

function getPosition(id, dir) {
  return positionHistoryCache[id] 
    ?? initializeJSON(path.join(dir, hashToFile(id)));
}

function storePosition(pos, filename) {
  cacheDirtyFlag = true;
  positionHistoryCache[filename] = pos;
}

// turns 00308b5db58e3b6b into 00/308b5db58e3b6b
function hashToFile(hash){
  return path.join(hash.slice(0,2), hash.slice(2));
}

function flushCache(dir) {
  if (cacheDirtyFlag) {
    console.log("flushing cache...");
    let writecount = 0;

    Object.keys(positionHistoryCache).forEach(function(id, idx) {
      writecount++;
      const filepath = path.join(dir, hashToFile(id));
      saveObject(positionHistoryCache[id], filepath);
    })

    cacheDirtyFlag = false;
    console.log("Wrote out " + writecount + " unique positions");
  }
}

function gameInPosition(gameid, pos) {
  const str = JSON.stringify(pos);
  return str.includes(gameid, 0);
}

/*
  gameinfo: {
    Date: "",
    moves: "1. e4 e5 2. ..."
    ...
  }
*/
let processGame = function(gameinfo, gameid, outputdir) {

  const chess = new Chess();
  const moves = parseMoves(gameinfo.Moves);
  try {
    moves.forEach(function(move, idx){
      let fen = chess.fen();
      const hash = crypto.createHash('sha256').update(fen).digest('hex').slice(0, 16);
      if (!FILTER || FILTER[hash]) {
        
        /*
          Load file. Expecting:
          {
            <move> (e.g. 'nf3'): [SHA64, SHA64, SHA64 ...],
            <move>: [<gameid>, <gameid>, ...]
          }
        */
        let movesfromposition = getPosition(hash, outputdir); 

        if (idx == 0 && gameInPosition(gameid, movesfromposition)) {
          throw new Error("Game already processed");
        }

        movesfromposition["fen"] = fen;
        if (!("moves" in movesfromposition)) {
          movesfromposition.moves = {};
        }
        
        if (!(move in movesfromposition.moves)) {
          movesfromposition.moves[move] = [];
        }

        // prevent duplicates
        let dupe = false;
        for (let i=0; i<movesfromposition.moves[move].length; i++) {
          if (movesfromposition.moves[move][i] == gameid) {
            dupe = true;
            break;
          }
        }

        if (!dupe) {
          movesfromposition.moves[move].push(gameid);
          // save
          storePosition(movesfromposition, hash);
        }
      } else {
        filterFailCount++;
      }

      chess.move(move);
    })
  } catch (err) {}
}


let FILTER = null;

let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.error("Not enough parameters. USAGE: node generate_position_histories.js input/ output/ [filter.json]");
    process.exit(1);
  }

  const inputpath = args[0];
  const outputpath = args[1];
  const filterfile = args[2] || null;
  console.log("loading game data from " + inputpath);
  const gamefiles = enumerateGamefiles(inputpath);


  console.log("found " + gamefiles.length + " files");

  initializeOutputDirectory(outputpath);

  if (filterfile) {
    console.log("loading position filter from " + filterfile);
    FILTER = initializeJSON(filterfile);
    Object.keys(FILTER).forEach(function(key) {
      if (FILTER[key] >= 100000) {
        delete FILTER[key];
      }
    })
    console.log("Filter has " + Object.keys(FILTER).length + " positions");
  } else {
    console.log("no filter file provided.")
    FILTER = null;
  }

  gamefiles.forEach(function(id, idx){ // id = "00/2ae3411265fbd2"
    const filepath = path.join(inputpath, id);
    const gamedata = initializeJSON(filepath);
    try {
      processGame(
        gamedata, 
        id.replace(path.sep, ""), // just save the unadulterated hash of the gamefile 
        outputpath
      );
    } catch (err) {
      console.log(err);
    }
    if (idx % 100 == 0){
      console.log("processed game " + idx);
    }
    if (idx && idx % 20000 == 0) {
      flushCache(outputpath);
    }
  })

  flushCache(outputpath);
}

runScript();



