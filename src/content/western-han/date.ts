export const date = (year: number) =>
  year <= 0 ? '前' + (1 - year) + '年' : '公元' + year + '年'
