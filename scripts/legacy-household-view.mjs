// Preserve the Stage 0 serialization order solely for replay diagnostics.
const fields = `loans settlements nextCollection seed mortality vulnerability acute risk practice
assets residence closedHouses candidate promise careYear estates heads spouse unions marriage lastBirth
wedding env birth year age region home surname name sex health talent skill cash purse debt income
expenses work dead npcs news chronicle ledger seen pending training queue exposure`.split(/\s+/)

export function legacyView(state) {
  return Object.fromEntries(fields.map(key => [key, state[key]]))
}
