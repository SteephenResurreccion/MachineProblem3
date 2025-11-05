// Need[i] = Max[i] - Hold[i]
export function computeNeed(maxArr, holdArr) {
  return maxArr.map((m, i) => Number(m || 0) - Number(holdArr[i] || 0));
}

// Available = Total - sum(Hold)
export function initialAvailable(total, holdArr) {
  return Number(total || 0) - holdArr.reduce((s, h) => s + Number(h || 0), 0);
}

// Check if the given order is SAFE.
// For each process in 'order':
//   if its need <= available   -> it can finish -> release its hold (available += hold)
//   else                       -> UNSAFE
export function isSafeOrder(order, total, maxArr, holdArr) {
  let available = initialAvailable(total, holdArr);

  for (let step = 0; step < order.length; step++) {
    const i = order[step];
    const need = Number(maxArr[i] || 0) - Number(holdArr[i] || 0);

    if (need <= available) {
      available += Number(holdArr[i] || 0);
    } else {
      return false; // cannot finish at this step -> this order is UNSAFE
    }
  }
  return true; // all finished -> SAFE
}

// Simple, readable permutations via backtracking.
export function listPermutations(n) {
  const used = Array(n).fill(false);
  const path = [];
  const out = [];

  function backtrack() {
    if (path.length === n) {
      out.push(path.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(i);
      backtrack();
      path.pop();
      used[i] = false;
    }
  }

  backtrack();
  return out;
}
