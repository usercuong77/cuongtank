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

export { DefaultTank, Juggernaut, SpeedTank, EngineerTank, MageTank };
