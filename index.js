var Notify = require('pull-notify')
var Dijkstra = require('dynamic-dijkstra')
var simple = require('dynamic-dijkstra/simple')
var Once = require('pull-stream/sources/once')
//var Obv = require('obv')

function isObject (o) {
  return o && 'object' === typeof o
}

function isEmpty (o) {
  for(var k in o) return false
  return true
}

module.exports = function (options) {
  var d = Dijkstra(simple)
  var byName = {}, layers = [], notify = Notify(), listeners = []
  var graph = {}, _graph = {}, hops = {}, ready = 0, readyListeners = []
  hops[options.start] = simple.initial()

  var isReady = {}

  return {
    //graph: graphObv,
    createLayer: function (name) {
      var index = layers.push({}) - 1
      name = name || 'unnamed_'+index
      byName[name] = index
      ready ++
      return function update (from, to, value) {
        if(isObject(from)) {
          if(!isReady[name]) {
            isReady[name] = true
            ready --
            if(ready === 0) {
              while(readyListeners.length) readyListeners.shift()()
            }
          }
          var g = from
          layers[index] = g
          layers.forEach(function (g) {
            for(var j in g)
              for(var k in g[j]) {
                graph[j] = graph[j] || {}
                graph[j][k] = g[j][k]
              }
          })
          _graph = d.reverse(graph)
          hops = d.traverse(graph, _graph, options.max, options.start)
          notify(hops)
        }
        else {
          layers[index][from] = layers[index][from] || {}
          layers[index][from][to] = value

          if(listeners.length)
            for(var i = 0; i < listeners.length; i++)
              listeners[i](from, to, value)

          for(var i = index + 1; i < layers.length; i++)
            if(layers[i][from] && layers[i][from][to] != null)
              return

          //update the main graph, if a higher layer doesn't override this.
          var diff = d.update(graph, _graph, hops, options.max, options.start, from, to, value)
          if(diff && !isEmpty(diff)) notify(diff)
        }
        return layers[index] //return graph from this layer
      }

    },
    onReady: function (fn) {
      if(ready == 0) fn()
      else
        readyListeners.push(fn)
    },
    onEdge: function (fn) {
      listeners.push(fn)
      return function () {
        listeners.splice(listeners.indexOf(fn), 1)
      }
    },
    getHops: function (opts) {
      return hops
    },
    hopStream: function (opts) {
      opts = opts || {}
      var live = opts.live === true
      var old = opts.old !== false
      var source
      if(live) {
        source = notify.listen()
        if(old && !isEmpty(hops))
          source.push(hops)
      }
      else
        source = Once(hops)

      return source
    },
    getGraph: function (name) {
      if(name == null) return graph
      else return layers[byName[name]]
    }
  }
}


