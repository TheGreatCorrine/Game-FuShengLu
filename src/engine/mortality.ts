// Gameplay parameters, not historical population estimates. Each draw covers
// the interval ending at age; age 1 covers birth to the first birthday.
export const defaultMortality = {
  infant: 0.005,
  childhood: 0.001,
  adolescent: 0.0008,
  adult: 0.002,
  senescenceFrom: 40,
  doublingYears: 7,
  illness: 0.09,
  accident: 0.018,
  severityMultiplier: 2.8,
  vulnerabilityMultiplier: 0.75,
  maximumAnnualRisk: 0.8,
}
export type Mortality = typeof defaultMortality
export function configure(overrides: Partial<Mortality> = {}): Mortality {
  const config = { ...defaultMortality, ...overrides }
  for (const [key, value] of Object.entries(config)) {
    if (!Number.isFinite(value) || value < 0)
      throw Error('Invalid mortality parameter: ' + key)
  }
  if (
    !config.doublingYears ||
    !config.maximumAnnualRisk ||
    config.maximumAnnualRisk > 1 ||
    ['infant', 'childhood', 'adolescent', 'adult', 'illness', 'accident'].some(
      (k) => config[k as keyof Mortality] > 1,
    ) ||
    !config.adult
  )
    throw Error('Invalid risk curve')
  return config
}
export function annualHealth(
  age: number,
  condition: number,
  vulnerability: number,
  pressure: number,
  poor: boolean,
  draw: (key: string) => number,
  c: Mortality,
) {
  const illness =
    draw('ill') < Math.min(0.8, c.illness * (1 + pressure + Number(poor) * 0.5))
  const acute = illness ? '病中' : draw('injury') < c.accident ? '受伤' : ''
  const recovery = acute
    ? -(8 + Math.floor(draw('severity') * 18))
    : 4 + Math.floor(draw('rest') * 6)
  const health = Math.max(
    1,
    Math.min(100, condition + recovery - Number(poor) * 2),
  )
  const base =
    age <= 1
      ? c.infant
      : age < 6
        ? c.childhood
        : age < 16
          ? c.adolescent
          : c.adult *
            2 ** (Math.max(0, age - c.senescenceFrom) / c.doublingYears)
  const risk = Math.min(
    c.maximumAnnualRisk,
    base *
      (1 + vulnerability * c.vulnerabilityMultiplier) *
      (1 + (100 - health) / 80) *
      (acute ? c.severityMultiplier : 1),
  )
  const dead = draw('death') < risk
  return { health: dead ? 0 : health, acute, risk, dead }
}
