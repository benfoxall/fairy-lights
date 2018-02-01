const test = require('tape')
const tapSpec = require('tap-spec')
const Lanterns = require('./Lanterns')

test.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout)


test('Raw access', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [
      {x: 0, y: 0, z: 0},
      {x: 1, y: 1, z: 1}
    ],
    BB: [
      {x: 2, y: 2, z: 2},
      {x: 3, y: 3, z: 3}
    ]
  })

  const raw = lanterns.raw()

  t.deepEqual(raw, [
    {x: 0, y: 0, z: 0, $:['AA', 0]},
    {x: 1, y: 1, z: 1, $:['AA', 1]},
    {x: 2, y: 2, z: 2, $:['BB', 0]},
    {x: 3, y: 3, z: 3, $:['BB', 1]}
  ])

})



test('Default to 0, 0, 0', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [ {}, {} ]
  })

  const raw = lanterns.raw()

  t.deepEqual(raw, [
    {x: 0, y: 0, z: 0, $:['AA', 0]},
    {x: 0, y: 0, z: 0, $:['AA', 1]}
  ])

})



test('Count', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [
      {x: 0, y: 0, z: 0},
      {x: 1, y: 1, z: 1, count: 2},
      {x: 2, y: 2, z: 2},
      {x: 3, y: 3, z: 3}
    ]
  })

  const raw = lanterns.raw()

  t.deepEqual(raw, [
    {x: 0, y: 0, z: 0, $:['AA', 0]},
    {x: 1, y: 1, z: 1, $:['AA', 1]},
    {x: 1, y: 1, z: 1, $:['AA', 2]},
    {x: 2, y: 2, z: 2, $:['AA', 3]},
    {x: 3, y: 3, z: 3, $:['AA', 4]}
  ])

})


test('Interpolation', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [
      {x: 0, y: 0, z: 0},
      {},{},
      {x: 3, y: 3, z: 3},
      {},
      {x: 5, y: 5, z: 5},
    ]
  })

  const raw = lanterns.raw()

  t.deepEqual(raw, [
    {x: 0, y: 0, z: 0, $:['AA', 0]},
    {x: 1, y: 1, z: 1, $:['AA', 1]},
    {x: 2, y: 2, z: 2, $:['AA', 2]},
    {x: 3, y: 3, z: 3, $:['AA', 3]},
    {x: 4, y: 4, z: 4, $:['AA', 4]},
    {x: 5, y: 5, z: 5, $:['AA', 5]}
  ])

})

test('Indexed', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [
      {led: 0, x: 0, y: 0, z: 0},
      {led: 3, x: 3, y: 3, z: 3},
      {led: 5, x: 5, y: 5, z: 5},
    ]
  })

  const raw = lanterns.raw()

  t.deepEqual(raw, [
    {x: 0, y: 0, z: 0, $:['AA', 0]},
    {x: 1, y: 1, z: 1, $:['AA', 1]},
    {x: 2, y: 2, z: 2, $:['AA', 2]},
    {x: 3, y: 3, z: 3, $:['AA', 3]},
    {x: 4, y: 4, z: 4, $:['AA', 4]},
    {x: 5, y: 5, z: 5, $:['AA', 5]}
  ])
})

test('array access', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [ {x: 0, y: 0, z: 0} ]
  })

  const array = lanterns.asArray()

  t.deepEqual(array, [
    {x: 0, y: 0, z: 0}
  ])

})


test('array write', t => {
  t.plan(1)

  const lanterns = new Lanterns({
    AA: [
      {x: 0, y: 0, z: 0},
      {x: 0, y: 0, z: 0},
    ],
    BB: [
      {x: 0, y: 0, z: 0},
    ]
  })

  lanterns.writeArray([
    {r: 150, g: 120, b: 110},
    {r: 200, g: 220, b: 210},
    {r: 10, g: 20, b: 30},
  ])

  t.deepEqual(lanterns._writes,[
    'AA '+String.fromCharCode(150,120,110, 200,220,210),
    'BB '+String.fromCharCode(10,20,30)
  ])

})



test('THREE', t => {

  t.plan(4)

  // Stub out THREE.js
  function Geometry() {}
  function Material() {
    this.color = {}
  }
  function Mesh(geometry, material) {
    this.position = {}
    this.material = material
    this.geometry = geometry
  }
  THREE = {
    SphereGeometry: Geometry,
    MeshBasicMaterial: Material,
    Mesh: Mesh
  }

  const lanterns = new Lanterns({
    AA: [ {x: 50, y: 100, z: 2000} ]
  })

  const meshes = lanterns.asTHREE()

  t.assert(meshes[0] instanceof Mesh, "returns a THREE.js mesh object")
  t.deepEqual(meshes[0].position, {x: 50, y: 100, z: 2000}, "mesh has appropriate position")

  Object.assign(meshes[0].material.color, {r: 0.5, g: 1, b: 0.2})

  lanterns.writeTHREE(meshes)

  t.deepEqual(lanterns._data, [128, 255, 51], "mech colours are written to data")


  t.deepEqual(lanterns._writes,[
    'AA '+String.fromCharCode(128, 255, 51)
  ], 'works end to end')

})
