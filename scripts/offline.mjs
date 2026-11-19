import { readFileSync, writeFileSync } from 'node:fs'
let page = readFileSync('dist/index.html', 'utf8')
page = page.replace(
  /<script[^>]*src="([^"]+)"[^>]*><\/script>/,
  (_, path) =>
    '<script type="module">' +
    readFileSync('dist' + path, 'utf8').replaceAll('</script', '<\\/script') +
    '</script>',
)
page = page.replace(
  /<link[^>]*href="([^"]+\.css)"[^>]*>/,
  (_, path) => '<style>' + readFileSync('dist' + path, 'utf8') + '</style>',
)
writeFileSync('PLAY.html', page)
