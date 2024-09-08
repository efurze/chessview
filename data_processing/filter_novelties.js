
const fs = require('fs');
const path = require('path');
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


let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.error("Not enough parameters. USAGE: node filter_novelties.js input/ output.json");
    process.exit(1);
  }

  const inputpath = args[0];
  const outfile = args[1];
  const filegenerator = enumerateFiles(inputpath);

  let file;
  let count = 0;
  const novelties = [];
  while ((file = filegenerator.next().value) !== undefined) {

    if (count % 100 == 0){
      console.log("novelty " + count);
    }
    count++;
    
    const novelty = initializeJSON(file);

    const total = novelty.before + novelty.after;

    if (novelty.before < (total * 0.2) || novelty.after < (total * 0.2) || novelty.count < 5) {
      continue;
    }

    const freq = novelty.count/(novelty.before + novelty.after);
    const turn = novelty.fen.match(/ [b|w] /)[0].trim();
    const player = (turn == 'b') ? novelty.black : novelty.white;
    const likelihood = Math.pow(1-freq, novelty.before);

    const info = {
      player: player,
      before: novelty.before,
      after: novelty.after,
      count: novelty.count,
      move: novelty.move
    };

    novelties.push(info);
  }


  console.log("Saving");
  const total = novelties.length;
  novelties.forEach(function(novelty, idx) {
    let line = "";
    if (idx == 0) {
      line = "[";
    }
    line += JSON.stringify(novelty);
    if ((idx+1) >= total) {
      line += "]";
    } else {
      line += ",\n";
    }
    fs.appendFileSync(outfile, line, {encoding: 'utf8'});
  })

}

runScript();



