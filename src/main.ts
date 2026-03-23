import { DiceEngine } from './DiceEngine';
import type { DiceValue } from './types';

const engine = new DiceEngine({
  container: document.body,
  diceCount: 2,
  debug: true,
});

const throwBtn = document.getElementById('throwBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const dice1Select = document.getElementById('dice1Val') as HTMLSelectElement;
const dice2Select = document.getElementById('dice2Val') as HTMLSelectElement;

function doThrow(): void {
  if (engine.isAnimating) return;
  throwBtn.disabled = true;
  statusEl.textContent = 'Throwing...';

  const v1 = parseInt(dice1Select.value) as DiceValue;
  const v2 = parseInt(dice2Select.value) as DiceValue;
  engine.throw([v1, v2]);
}

engine.onSettled((results) => {
  throwBtn.disabled = false;
  statusEl.textContent = `Result: ${results.join(' and ')}`;
});

throwBtn.addEventListener('click', doThrow);

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    doThrow();
  }
});
