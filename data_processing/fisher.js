const fs = require('fs');
const jStat = require('jStat');


function filterSignificance(move, sig) {
  const freq = move.count/move.positionCount;
  const odds = Math.pow(1 - freq, move.before);
  if (odds > sig) {
    return false;
  }

  return true;
}

function filterFisher(move) {
  const fisher = fisherExactTest(0, move.count, move.before, move.after - move.count,  'left');
  return fisher > -Math.log(0.01); // reject at p > 0.01
}

function filterFisherCombined(move) {
  const pval = fisherCombined(move);
  return pval < 0.01;
}

function fisherCombinedChiSq(move) {
  let combined = 0;
  combined += fisherExactTest(0, move.count, move.before, move.after - move.count,  'left');

  Object.keys(move.otherMoves).forEach(function(otherMove) {
    const other = move.otherMoves[otherMove];
    const fisher = fisherExactTest(other.before, other.after, move.before - other.before, move.after - other.after, 'left');
    other.fisher = fisher;
    combined += fisher;
  })

  const chiSquare = 2 * combined;
  const df = Object.keys(move.otherMoves).length + 1;
  return 1 - jStat.chisquare.cdf(chiSquare, df);
}

function fisherCombinedBonferroni(move) {
  const df = Object.keys(move.otherMoves).length + 1;
  // this is log(pVal), so large negative numbers are what we want for significance
  let pVal = fisherExactTest(0, move.count, move.before, move.after - move.count,  'left')/df;

  Object.keys(move.otherMoves).forEach(function(otherMove) {
    const other = move.otherMoves[otherMove];
    const fisher = fisherExactTest(other.before, other.after, move.before - other.before, move.after - other.after, 'left');
    other.fisher = fisher;
    pVal = Math.min(pVal, fisher/df);
  })
  return pVal;
}


function run() {
    const startTime = Date.now();

    const data = fs.readFileSync('all_moves_min10_before10.json');
    const moves = JSON.parse(data);


    const moveFisherCombined100 = [];
    moves.forEach(function(move, idx) {
      const pval = fisherCombinedBonferroni(move);
      if (pval < Math.log(0.01)) {
        moveFisherCombined100.push(move);
      }
      if (idx % 100 == 0) {
        console.log(idx+1 + " moves analyzed, " + moveFisherCombined100.length + " novelties found so far.");
      }
    })

    //fs.writeFileSync("novelties_fisherbonferroni100.json", JSON.stringify(moveFisherCombined100, null, " "));

    //const moves100 = moves.filter(function(m){return filterSignificance(m, 0.01);});
                            //.filter(function(m){return !filterFisher(m);});
    //const movesFisher100 = moves.filter(filterFisher);

    //fs.writeFileSync("novelties_fisher100.json", JSON.stringify(movesFisher100, null, " "));

    //console.log("p<0.01 moves: " + moves100.length);
    //console.log("p<0.01 moves (fisher): " + movesFisher100.length);


    /*
    for (let i=0; i < 10; i++) {
      const move = moves100[i];
      const freq = move.count/move.positionCount;
      const fisher = fisherExactTest(0, move.count, move.before, move.after - move.count,  'left');
      const combined = fisherCombined(move);
      console.log(`before: ${move.before} \t\t after: ${move.after} \t\t count: ${move.count} \t \
        ln(p-value): ${Math.round(-100*move.before * Math.log(1-freq))/100} \t\t ln(fisher): ${Math.round(fisher*100)/100} \t \
        fisherCombined: ${combined}`);


      Object.keys(move.otherMoves).forEach(function(otherMove) {
        const other = move.otherMoves[otherMove];
        console.error(`  ${otherMove} \t\t\t before: ${other.before} \t\t after: ${other.after} \t\t fisher: ${Math.round(other.fisher*100)/100}`);
      })
      console.log("");

    }
    */
    console.log("elapsed time: " + (Date.now() - startTime)/1000);
}


const cache = {};
// returns ln(n!)
function factorial(n) {
    if (n === 0 || n === 1) return 0;
    if (n in cache) {
        return cache[n];
    }
    let result = 0;
    for (let i = 2; i <= n; i++) {
        result += Math.log(i);
        cache[i] = result;
    }
    return result;
}

run();

// returns ln(n choose m)
function binomial(m, n) {
    if (m > n) {
        throw new Error("binmomial: m must be less than or equal to n");
    }
    return factorial(n) - factorial(m) - factorial(n-m);
}

// this returns ln(prob) which will be a negative number
function hypergeometric(a, b, c, d) {
    return  (factorial(a + b) + factorial(c + d) + factorial(a + c) + factorial(b + d)
           - factorial(a) - factorial(b) - factorial(c) - factorial(d) - factorial(a + b + c + d));
}
/*
  a: successes group A
  b: successes group B
  c: failures group A
  d: failures group B

  returns ln of the actual probability to avoid underflow, so result will be negative. The bigger the negative number
  the less likely (higher significance)
*/
function fisherExactTest(a,b,c,d, tail = 'two') {

    // Observed probability
    let observedP = hypergeometric(a, b, c, d);

    // One-tailed p-value (left or right)
    let pValueOneTailed = 0;
    if (tail === 'left') {
        for (let x = 0; x <= a; x++) {
            let y = a + b - x;
            let z = a + c - x;
            let w = d - (a - x);
            if (y >= 0 && z >= 0 && w >= 0) {
                pValueOneTailed += hypergeometric(x, y, z, w);
            }
        }
    } else if (tail === 'right') {
        for (let x = a; x <= Math.min(a + b, a + c); x++) {
            let y = a + b - x;
            let z = a + c - x;
            let w = d - (a - x);
            if (y >= 0 && z >= 0 && w >= 0) {
                pValueOneTailed += hypergeometric(x, y, z, w);
            }
        }
    }

    // Two-tailed p-value
    let pValueTwoTailed = 0;
    for (let x = 0; x <= Math.min(a + b, a + c); x++) {
        let y = a + b - x;
        let z = a + c - x;
        let w = d - (a - x);
        if (y >= 0 && z >= 0 && w >= 0) {
            let p = hypergeometric(x, y, z, w);
            if (p <= observedP) {
                pValueTwoTailed += p;
            }
        }
    }

    if (tail === 'two') {
        return pValueTwoTailed;
    } else {
        return pValueOneTailed;
    }
}

/**
 * Combine p-values using Fisher's method
 * @param {number[]} pValues - array of ln(p-values)
 * @return {number} combined p-value
 */
function combinePValues(pValues) {
  const n = pValues.length;
  const chiSquare = -2 * pValues.reduce((sum, p) => sum + p, 0);
  const df = n;
  
  // Calculate combined p-value using jStat's chiSquare.cdf
  const pComb = 1 - jStat.chisquare.cdf(chiSquare, df);
  
  return pComb;
}

module.exports = {fisherExactTest, fisherCombinedChiSq, binomial};