const fs = require('fs');


function filterSignificance(move, sig) {
  const playerCounts = {};
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




const data = fs.readFileSync('all_potential_novelties.json');
const moves = JSON.parse(data);

const moves100 = moves.filter(function(m){return filterSignificance(m, 0.01);});
                        //.filter(function(m){return !filterFisher(m);});
//const movesFisher100 = moves.filter(filterFisher);

console.log("p<0.01 moves: " + moves100.length);
//console.log("p<0.01 moves (fisher): " + movesFisher100.length);



for (let i=0; i < 10; i++) {
  const move = moves100[i];
  const freq = move.count/move.positionCount;
  const fisher = fisherExactTest(0, move.count, move.before, move.after - move.count,  'left');
  console.log(`before: ${move.before} \t\t after: ${move.after} \t\t count: ${move.count} \t\t \
    ln(p-value): ${Math.round(-100*move.before * Math.log(1-freq))/100} \t\t ln(fisher): ${fisher}`);


  Object.keys(move.otherMoves).forEach(function(otherMove) {
    const other = move.otherMoves[otherMove];
    const fisher = fisherExactTest(other.before, other.after, move.before - other.before, move.after - other.after, 'left');
    console.log(`  ${otherMove} \t\t\t before: ${other.before} \t\t after: ${other.after} \t\t fisher: ${fisher}`);
  })
  console.log("");

}





function factorial(n) {
    if (n === 0 || n === 1) return 0;
    let result = 0;
    for (let i = 2; i <= n; i++) {
        result += Math.log(i);
    }
    return result;
}

function hypergeometric(a, b, c, d) {
    return -1 * (factorial(a + b) + factorial(c + d) + factorial(a + c) + factorial(b + d)
           - factorial(a) - factorial(b) - factorial(c) - factorial(d) - factorial(a + b + c + d));
}
/*
  a: successes group A
  b: successes group B
  c: failures group A
  d: failures group B

  returns ln of the actual probability to avoid underflow
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


