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
const fsp = require('fs').promises;
const path = require('path');
const { Worker } = require('worker_threads');
//const { ProcessGame } = require('./process_game_worker');


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

async function initializeJSONAsync(filename) {
  try {
    return JSON.parse(await fsp.readFile(filename, 'utf8'));
  } catch(err) {
    return {};
  }
}

let saveObject = function(obj, filename) {
  try {
    const json = JSON.stringify(obj, null, " ");
    fs.writeFileSync(filename, json);
  } catch (e) {
    console.error(e);
  }
}


/*
  this returns an array of relative paths from the inputdir
  e.g. ["00/2ae3411265fbd2", ...]
*/
function enumerateGamefiles(dirpath){
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




const POSITION_OCCURRANCE = {};

function mergeResults(result) {

  Object.keys(result).forEach(function(key){
    if (!(key in POSITION_OCCURRANCE)) {
      POSITION_OCCURRANCE[key] = 0;
    }

    POSITION_OCCURRANCE[key] += result[key];
  });
}

/*
  gameinfo: {
    Date: "",
    moves: "1. e4 e5 2. ..."
    ...
  }
*/


function run() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.error("Not enough parameters. USAGE: node generate_position_histories.js input/ output/");
    process.exit(1);
  }

  const inputpath = args[0];
  const outputpath = args[1];
  console.log("loading game data from " + inputpath);
  const files = enumerateGamefiles(inputpath);//.slice(0, 500);

  const total = files.length;
  console.log("found " + total + " files");

  let pending = 0;
  let count = 0;

  async function start(gameids) {
    pending++;
    const games = [];
    try {
      const promises = gameids.map(async (gameid) => {
        const filepath = path.join(inputpath, gameid);
        games.push(await initializeJSONAsync(filepath));
      });
      await Promise.all(promises);
      //const game = await initializeJSONAsync(filepath);
      //mergeResults(ProcessGame(game));
      await finish(games);
    } catch(err) {
      console.error(err);
    } finally {
      pending--;
      count++;
      if (count % 10 == 0) {
        console.log("processed " + count);
      }
  
      if (files.length) {
        start(files.splice(0, 100));
      } else if (pending == 0) {
        // done
        console.log("End of input");
        const hashes = Object.keys(POSITION_OCCURRANCE);
        hashes.forEach(function(hash) {
          if (POSITION_OCCURRANCE[hash] > 50) {
            console.log(hash, POSITION_OCCURRANCE[hash]);
          }
        })
      }
    }
  }

  function finish(games) {
    let finished = false;
    let resolve = null, reject = null;
    let p = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }) // Promise

    
    const worker = new Worker('./process_game_worker.js', {
      workerData: { data: games }
    });

    worker.on('message', function(result){
      //console.log("worker message");
      if (!finished) {
        finished = true;
        result.forEach((elem) => {
          mergeResults(elem);
        })
        resolve();
      }
    })

    worker.on('error', function(){
      //console.log("worker error");
      if (!finished) {
        finished = true;
        resolve();
      }
    })

    worker.on('exit', function(){
      //console.log("worker exit");
      if (!finished) {
        finished = true;
        resolve();
      }
    })

    return p;

  } // function finish()

  for (let i = 0; i < 6; i++) {
    start(files.splice(0, 100));
  }
}



run();





