import './css/style.css'

import { Postprocessing, Device, Table } from './app'
import { OrbitControls } from 'three/addons/controls/OrbitControls'
import * as THREE from 'three'

const bgColors = {
  on: new THREE.Color(1, 0.25, 0).multiplyScalar(0.1).getHex(),
  off: 0x000000
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(bgColors.off)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 1000)
camera.position.set(-5, 5, 10).setLength(18)

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(innerWidth, innerHeight)

document.body.appendChild(renderer.domElement)
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(innerWidth, innerHeight)

  postprocessing.bloomComposer.setSize(innerWidth, innerHeight)
  postprocessing.finalComposer.setSize(innerWidth, innerHeight)
})

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 4, 0)

const light = new THREE.DirectionalLight(0xffffff, 0.2)
light.castShadow = true
light.shadow.camera.top = 10
light.shadow.camera.bottom = -10
light.shadow.camera.left = -10
light.shadow.camera.right = 10
light.shadow.mapSize.width = 2048
light.shadow.mapSize.height = 2048
light.shadow.camera.near = 0
light.shadow.camera.far = 20
light.position.set(10, 20, 10).setLength(10)

scene.add(light, new THREE.AmbientLight(0xffffff, 0.3))

const gu = {
  globalBloom: { value: 0 }
}

/*
const helper = new THREE.GridHelper()
helper.userData.nonGlowing = true
scene.add(helper)
*/

const device = new Device(gu)
scene.add(device)

const table = new Table(gu, bgColors.on)
scene.add(table)

scene.traverse(child => {
  if (child.userData.nonGlowing) {
    child.material.onBeforeCompile = shader => {
      shader.uniforms.globalBloom = gu.globalBloom
      shader.fragmentShader = `
        uniform float globalBloom;
        ${shader.fragmentShader}
      `.replace(
        `#include <dithering_fragment>`,
        `#include <dithering_fragment>
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);
        `
      )
    }
  }
})

const postprocessing = new Postprocessing(scene, camera, renderer)
const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  let t = clock.getElapsedTime()

  controls.update()
  device.update(t)

  gu.globalBloom.value = 1
  scene.background.set(bgColors.off)
  postprocessing.bloomComposer.render()
  gu.globalBloom.value = 0
  scene.background.set(bgColors.on)
  postprocessing.finalComposer.render()
})
