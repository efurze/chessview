
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

  const inputfile = "./novelties_fisher100.json";
  
  const novelties = initializeJSON(inputfile);
  const playersNumber = {}, playersGames = {}, playersPercentages = {};
  const playersDifficulty = {};

  novelties.forEach(function(novelty, count) {

    if (novelty.count > 5000 && novelty.before < 100) {
      return;
    }

    const turn = novelty.fen.match(/ [b|w] /)[0].trim();
    const player = turn === 'b' ? novelty.black : novelty.white;
    
    // normalize the name:
    const parts = player.split(',');
    parts[1] = parts[1] ?? " ";
    const name = parts[0] + ", " + parts[1].charAt(1);

    playersNumber[name] = playersNumber[name] ?? 0;
    playersNumber[name] ++;

    playersGames[name] = playersGames[name] ?? 0;
    playersGames[name] += novelty.count;

    playersPercentages[name] = playersPercentages[name] ?? 0;
    playersPercentages[name] += novelty.count/novelty.after;

    playersDifficulty[name] = playersDifficulty[name] ?? 0;
    playersDifficulty[name] += novelty.before;
    
  })

  const players = Object.keys(playersNumber);
  players.sort(function(a,b){
    return playersNumber[b] - playersNumber[a];
  })
  saveData("player_novelty_count.json", players, playersNumber);


  players.sort(function(a,b){
    return playersGames[b] - playersGames[a];
  })
  let out = ["["];
  players.forEach(function(name) {
    out.push(`{"player": "${name}", "gamesImpacted": ${playersGames[name]}, "playerNoveltyCount": ${playersNumber[name]}},`);
  })
  out.push("]");
  fs.writeFileSync("player_novelty_games.json", out.join('\n'));


  players.sort(function(a,b){
    return playersPercentages[b] - playersPercentages[a];
  })
  saveData("player_novelty_percentages.json", players, playersPercentages);

  players.sort(function(a,b){
    return playersDifficulty[b] - playersDifficulty[a];
  })
  saveData("player_novelty_difficulty.json", players, playersDifficulty);
}

function saveData(filename, players, data) {
  let out = ["["];
  players.forEach(function(name) {
    out.push(`{"player": "${name}", "count": ${data[name]}},`);
  })
  out.push("]");
  fs.writeFileSync(filename, out.join('\n'));

}

runScript();



