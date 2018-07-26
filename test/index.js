var tape = require('tape')
var pull = require('pull-stream')

tape('simple', function (t) {
  var ready = false
  var G = require('../')({max: 3, start: 'A'})

  var addBase = G.createLayer('base')

  G.onReady(function () {
    ready = true
  })

  t.equal(ready, false)

  addBase({
    A: {B: 1}
  })

  t.equal(ready, true)

  var count = 0, last
  pull(G.hopStream({live: true}), pull.drain(function (e) {
    console.log("LIVE", e)
    last = e
    count ++
  }))


  t.deepEqual(G.getHops(), {A: 0, B: 1})
  t.equal(count, 1)
  t.deepEqual(last, G.getHops())

  var addOver = G.createLayer('override')

  addOver('B', 'C', 1)

  t.deepEqual(G.getHops(), {A: 0, B: 1, C: 2})

  t.equal(count, 2)
  t.deepEqual(last, {C: 2})

  addOver('A', 'C', -1)

  t.deepEqual(G.getHops(), {A: 0, B: 1, C: -1})

  t.equal(count, 3)
  t.deepEqual(last, {C: -1})


  t.end()
})

