var tape = require('tape')
var pull = require('pull-stream')

tape('simple', function (t) {
  var ready = false
  var G = require('../')({ max: 3, start: 'A' })

  var addBase = G.createLayer('base')

  G.onReady(function () {
    ready = true
  })

  t.equal(ready, false)

  addBase({
    A: { B: 1 },
  })

  t.equal(ready, true)

  var count = 0,
    last
  pull(
    G.hopStream({ live: true }),
    pull.drain(function (e) {
      console.log('LIVE', e)
      last = e
      count++
    })
  )

  t.deepEqual(G.getHops(), { A: 0, B: 1 })
  t.equal(count, 1)
  t.deepEqual(last, G.getHops())

  var addOver = G.createLayer('override')

  addOver('B', 'C', 1)

  t.deepEqual(G.getHops(), { A: 0, B: 1, C: 2 })
  t.deepEqual(G.getHops({ max: 1 }), { A: 0, B: 1 })
  t.deepEqual(G.getHops({ reverse: true, start: 'B' }), { A: 1, B: 0 })
  t.deepEqual(G.getHops({ max: 4 }), { A: 0, B: 1, C: 2 })

  t.equal(count, 2)
  t.deepEqual(last, { C: 2 })

  addOver('A', 'C', -1)

  t.deepEqual(G.getHops(), { A: 0, B: 1, C: -1 })

  t.equal(count, 3)
  t.deepEqual(last, { C: -1 })

  G.reset()
  t.deepEqual(G.getGraph(), {})

  t.end()
})

tape('null causes to fall through to next layer', function (t) {
  var ready = false
  var G = require('../')({ max: 3, start: 'A' })

  var addBase = G.createLayer('base')

  G.onReady(function () {
    ready = true
  })

  t.equal(ready, false)

  addBase({
    A: { B: 1 },
  })

  t.deepEqual(G.getHops(), { A: 0, B: 1 })

  var addOver = G.createLayer('override')
  addOver({})
  addOver('A', 'B', 0.1)

  t.deepEqual(G.getHops(), { A: 0, B: 0.1 })
  addOver('A', 'B', 1)
  t.deepEqual(G.getHops(), { A: 0, B: 1 })

  addOver('A', 'B', 2)
  t.deepEqual(G.getHops(), { A: 0, B: 2 })

  addOver('A', 'B', null)
  t.deepEqual(G.getHops(), { A: 0, B: 1 })

  addBase('A', 'B', null)

  t.deepEqual(G.getHops(), { A: 0 })

  t.end()
})
