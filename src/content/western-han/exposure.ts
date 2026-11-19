import type { State } from '../../engine/types.ts'
import { history } from './catalog.ts'

export function yearImpact(s: Pick<State,'year'|'region'|'age'|'home'>) {
  return history
    .filter((e) => s.year >= 1 - e.from && s.year <= 1 - e.to)
    .map((e) => {
      const load = e.load[s.region],
        heard = load > 0 && s.age >= 7
      return {
        id: e.id,
        load,
        heard,
        cost: 0,
        message: !heard
          ? ''
          : s.home === 3
            ? '家人带回征运的消息，说县里在催办。'
            : s.home === 2
              ? e.market
              : '集上粟价又涨，买回的粮比去年少。',
      }
    })
}
