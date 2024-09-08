
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




let runScript = function() {
  const args = process.argv.slice(2); // first 2 args are node and this file
  if (args.length < 2) {
    console.error("Not enough parameters. USAGE: node player_impact.js filtered_novelties.json player_stats.json");
    process.exit(1);
  }

  const inputfile = args[0];
  const outfile = args[1];
  
  const novelties = initializeJSON(inputfile);
  const players = {};

  novelties.forEach(function(novelty, count) {
    const player = novelty.player;

    // TODO: combine all variants of players' names

    const info = players[player] ?? {
        novelty_count: 0,   // number of novel moves contributed
        games_affected: 0,  // number of games in which one of this players' novelties has been played
        impact: 0           // sum of (before * count) for each novelty
    };
    
    info.novelty_count ++;
    info.games_affected += novelty.count;
    info.impact += (novelty.before + novelty.after) * (novelty.count/novelty.after);

    players[player] = info;

    if (count % 100 == 0){
      console.log("novelty " + count);
    }
  })

  console.log("Saving");
  const names = Object.keys(players);
  names.sort(function(a,b) {
    return players[b].impact - players[a].impact;
  });

  const outarray = [];
  names.forEach(function(name) {
    outarray.push([name, players[name]]);
  })

  saveObject(outarray, outfile);
}

runScript();



