class Lanterns {
  constructor (config) {
    this.config = config

    // generate the raw lights
    this._raw = []

    // allow sparse led-keyed assignments
    Object.keys(config)
      .forEach(key => {
        config[key] = config[key].reduce((memo, item, i) => {
          if(isFinite(item.led)) {
            memo[item.led] = item
            delete item.led
          } else {
            memo[i] = item
          }
          return memo
        }, [])

        for (var i = 0; i < config[key].length; i++)
          if(!config[key][i]) config[key][i] = {}
      })


    this._indices = Object.keys(config)
      .map(key => {
        let n = 0
        config[key]
          .forEach(item => {
            for (var i = 0; i < (item.count || 1); i++) {
              this._raw.push(Object.assign({}, item, {$: [key, n++]}))
            }
          })

        return [key, this._raw.length]
      })

    // clean up
    this._raw.forEach(item => {
      delete item.count
    })

    // interpolate positions
    interpolate(this._raw, 'x')
    interpolate(this._raw, 'y')
    interpolate(this._raw, 'z')


    this._data = new Uint8ClampedArray(this._raw.length * 3)

    // data separated by bunch for sending
    this._datas = []

    // create linked sub arrays in better form for writing
    let from = 0
    this._indices.forEach(([key, to]) => {
      this._datas.push([key, this._data.subarray(from, to * 3)])
      from = to * 3
    })


    this._blocked = () => true

  }

  raw() {
    return this._raw
  }

  asArray() {
    return this._raw.map(light => {
      const {x,y,z} = light
      return {x,y,z}
    })
  }

  writeArray(array) {

    if(this._blocked()) return

    for (var i = 0; i < array.length; i++) {
      this._data[i*3]     = array[i].r
      this._data[i*3 + 1] = array[i].g
      this._data[i*3 + 2] = array[i].b
    }

    this._writes =
      this._datas.map(([key, array]) =>
        key + ' ' + String.fromCharCode.apply(String, array)
      )

    if(this._send) this._send()

  }


  asTHREE() {
    return this._raw.map(light => {
      const {x,y,z} = light

      const geometry = new THREE.SphereGeometry( 0.1, 10, 10 )
      const material = new THREE.MeshBasicMaterial( { color: 0 } )
      const lantern = new THREE.Mesh( geometry, material )

      Object.assign(lantern.position, {x,y,z})

      return lantern
    })
  }

  writeTHREE(meshes) {

    if(this._blocked()) return

    for (var i = 0; i < meshes.length; i++) {
      this._data[i*3]     = meshes[i].material.color.r * 255
      this._data[i*3 + 1] = meshes[i].material.color.g * 255
      this._data[i*3 + 2] = meshes[i].material.color.b * 255
    }

    this._writes =
      this._datas.map(([key, array]) =>
        key + ' ' + String.fromCharCode.apply(String, array)
      )

    if(this._send) this._send()

  }

  writeTHREECorrected(meshes) {

    if(this._blocked()) return


    for (var i = 0; i < meshes.length; i++) {
      const {r,g,b} = meshes[i].material.color;
      
      this._data[i*3]     = r * r * r * 255
      this._data[i*3 + 1] = g * g * g * 255
      this._data[i*3 + 2] = b * b * b * 255
    }

    this._writes =
      this._datas.map(([key, array]) =>
        key + ' ' + String.fromCharCode.apply(String, array)
      )

    if(this._send) this._send()

  }



  // untestedish

  connect(host = location.host) {
    if(this._socket) return console.error("Already connected")

    const socket = this._socket = new ReconnectingWebSocket(`ws://${host}`)

    const throttle = 50

    let _scheduled, _last

    this._blocked = () => _scheduled

    this._send = () => {
      if(_scheduled) return

      const now = ~~window.performance.now()

      const time_passed = now - _last

      if(time_passed < throttle) {
        // console.log("rescheduling because throttling")

        const when = Math.max(throttle - time_passed + 5, 0)

        // console.log(`Time passed: ${time_passed}ms, rescheduling in: ${when}ms`)

        _scheduled = true
        setTimeout(() => {
          // console.log("unscheduled")
          _scheduled = false
          this._send()
        }, when)

        return
      }

      if(socket.readyState == WebSocket.OPEN) {
        // console.log("SEND")
        _last = now
        this._datas.forEach(([key, array]) => {
          socket.send(`${key} ${array.join(',')}`)
        })
      } else {
        console.log("rescheduling because network")
        _scheduled = true

        setTimeout(() => {
          _scheduled = false
          this._send()
        }, 500)
      }
    }
  }

}


if(typeof module != 'undefined') module.exports = Lanterns


function interpolate(arr, prop) {
  var prior = 0
  for (var i = 0; i < arr.length; i++) {
    if(typeof(arr[i][prop]) != 'undefined') {
      prior = arr[i][prop]
      continue
    }

    // look for the next good value
    var next = 0
    for(var j = i; j < arr.length; j++) {
      if(typeof(arr[j][prop]) != 'undefined') {
        next = arr[j][prop]
        break
      }
    }

    // fill in the blanks
    for (var k = i; k < j; k++) {
      const off = (k - i + 1) / (j - i + 1)
      arr[k][prop] = prior + (next - prior) * off
    }
  }

}
