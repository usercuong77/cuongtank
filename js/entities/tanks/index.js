// Tank factory

import { DefaultTank } from './DefaultTank.js';
import { Juggernaut } from './Juggernaut.js';
import { SpeedTank } from './SpeedTank.js';
import { EngineerTank } from './EngineerTank.js';
import { MageTank } from './MageTank.js';

export function createPlayerBySystem(systemId) {
  const id = systemId || 'default';
  if (id === 'juggernaut') return new Juggernaut();
  if (id === 'speed') return new SpeedTank();
  if (id === 'engineer') return new EngineerTank();
  if (id === 'mage') return new MageTank();
  return new DefaultTank();
}


// STEP 5.3: Create players by two (possibly different) systems.
// Keep Game deps out of entities by using a pure factory.
export function createPlayersBySystems(systemP1, systemP2, playerCount = 1) {
  const count = (Number(playerCount) === 2) ? 2 : 1;
  const p1 = createPlayerBySystem(systemP1 || 'default');
  p1.playerIndex = 1;
  const players = [p1];

  if (count === 2) {
    const p2 = createPlayerBySystem(systemP2 || systemP1 || 'default');
    p2.playerIndex = 2;
    players.push(p2);
  }

  return players;
}

// STEP 6: Co-op foundation
// Factory helper to create P1/P2 without pushing Game deps into entities.
export function createPlayersBySystem(systemId, playerCount = 1) {
  // Back-compat: create both players with the same system.
  return createPlayersBySystems(systemId, systemId, playerCount);
}

export { DefaultTank, Juggernaut, SpeedTank, EngineerTank, MageTank };
