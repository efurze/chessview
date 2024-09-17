const fs = require('fs');


function filterSignificance(move, sig) {
  const playerCounts = {};
  const freq = move.count/move.positionCount;
  const odds = Math.pow(1 - freq, move.before);
  if (odds > sig) {
    return false;
  }

  const postFreq = move.count/move.after;
  if (postFreq < 0.10) {
    return false;
  }

    return true;
}

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function hypergeometric(a, b, c, d) {
    return (factorial(a + b) * factorial(c + d) * factorial(a + c) * factorial(b + d)) /
           (factorial(a) * factorial(b) * factorial(c) * factorial(d) * factorial(a + b + c + d));
}
/*
  a: successes group A
  b: successes group B
  c: failures group A
  d: failures group B
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



const data = fs.readFileSync('all_potential_novelties.json');
const moves = JSON.parse(data);

const moves100 = moves.filter(function(m){return filterSignificance(m, 0.1);});

console.log("p<0.01 moves: " + moves100.length);

for (let i=0; i < 10; i++) {
  const m = moves100[i];
  const freq = m.count/m.positionCount;
  const fisher = fisherExactTest(0, m.count, m.before, m.after - m.count,  'left');
  console.log(`before: ${m.before} \t\t after: ${m.after} \t\t count: ${m.count} \t\t \
    log2(p-value): ${Math.round(-100*m.before * Math.log2(1-freq))/100} \t\t fisher: ${((fisher))}`);
  Object.keys(m.otherMoves).forEach(function(other) {
    const fisher = fisherExactTest(m.before - other.before, m.before - other.before, other.before, other.before, 'left');
    console.log(`  ${other} \t\t\t before: ${m.otherMoves[other].before} \t\t after: ${m.otherMoves[other].after} \t\t fisher: ${fisher}`);
  })
  console.log("");
}