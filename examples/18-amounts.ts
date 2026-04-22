// Amount helpers — convert between human decimals and base-unit strings.
// Run: tsx examples/18-amounts.ts

import {
  toBaseUnits,
  fromBaseUnits,
  fromBaseUnitsString,
  solToLamports,
  lamportsToSol,
} from '@venumdev/sdk';

console.log('toBaseUnits(1.5, 9)          =', toBaseUnits(1.5, 9));          // "1500000000"
console.log('toBaseUnits("0.000001", 9)   =', toBaseUnits('0.000001', 9));   // "1000"
console.log('toBaseUnits(100, 6)          =', toBaseUnits(100, 6));          // "100000000"

console.log('fromBaseUnitsString(..., 9)  =', fromBaseUnitsString('1500000000', 9)); // "1.5"
console.log('fromBaseUnits(..., 9)        =', fromBaseUnits('1500000000', 9));       // 1.5

console.log('solToLamports(2.5)           =', solToLamports(2.5));           // "2500000000"
console.log('lamportsToSol(1500000000)    =', lamportsToSol(1500000000));    // 1.5

// Use BigInt for precision-critical math on raw amounts
const raw = toBaseUnits(1.25, 9);                 // "1250000000"
const scaled = (BigInt(raw) * 3n).toString();     // "3750000000"
console.log('3 × 1.25 SOL                  =', fromBaseUnitsString(scaled, 9));  // "3.75"
