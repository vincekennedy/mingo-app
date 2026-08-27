/** Read Cursor hook stdin JSON; print `command` (or empty). */
let s = ''
process.stdin.on('data', (d) => {
  s += d
})
process.stdin.on('end', () => {
  try {
    process.stdout.write(String(JSON.parse(s).command || ''))
  } catch {
    process.stdout.write('')
  }
})
