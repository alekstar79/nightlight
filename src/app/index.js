// noinspection JSCheckFunctionSignatures

import * as THREE from 'three'

import { mergeBufferGeometries } from 'three/addons/utils/BufferGeometryUtils'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass'
import { RenderPass } from 'three/addons/postprocessing/RenderPass'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass'

class LightEmitterCurve extends THREE.Curve {
	constructor(radius, turns, height) {
		super()
    this.radius = radius
    this.height = height
    this.turns = turns
	}

	getPoint(t, optionalTarget = new THREE.Vector3()) {
		return optionalTarget.setFromCylindricalCoords( this.radius, -Math.PI * 2 * this.turns * t, this.height * t )
	}
}

class LightEmitters extends THREE.Object3D {
  constructor(gu, count, maxR, height, turns, m) {
    super()

    let gsBall = []
    let gsEmitter = []
    let start = maxR / 4
    let totalWidth = maxR * 0.9 - start
    let step = totalWidth / (count - 1)

    // let v3 = new THREE.Vector3()
    // let axis = new THREE.Vector3(0, 1, 0)

    for (let i = 0; i < count; i++) {
      let shift = start + step * i
      let gBall = new THREE.SphereGeometry(0.05, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.5)

      gBall.translate(0, 0, shift)
      gsBall.push(gBall)

      /* this code ////////////////////////////////////////////////////////////////
      let gEmitter = new THREE.CylinderGeometry(0.03, 0.03, height, 16, 200)
      gEmitter.translate(shift, height * 0.5, 0)

      let pos = gEmitter.attributes.position

      for (let i = 0; i < pos.count; i++){
        v3.fromBufferAttribute(pos, i)

        let ratio = v3.y / height
        let angle = -ratio * Math.PI * 2 * turns

        v3.applyAxisAngle(axis, angle)
        pos.setXYZ(i, v3.x, v3.y, v3.z)
      }

      gEmitter.computeVertexNormals()

      */// or this ////////////////////////////////////////////////////////////////
      let lightEmitterCurve = new LightEmitterCurve(shift, turns, height)
      let gEmitter = new THREE.TubeGeometry(lightEmitterCurve, 200, 0.02, 16)

      gsEmitter.push(gEmitter)
    }

    let gBalls = mergeBufferGeometries(gsBall)
    let balls = new THREE.Mesh(gBalls, m.clone())

    balls.userData.nonGlowing = true

    balls.castShadow = true

    this.add(balls)

    let gEmitters = mergeBufferGeometries(gsEmitter)
    let mEmitters = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: new THREE.Color(1, 0.25, 0),
      onBeforeCompile: shader => {
        shader.uniforms.globalBloom = gu.globalBloom
        shader.vertexShader = `
          varying vec3 vPos;
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
            vPos = position;
          `
        )
        shader.fragmentShader = `
          #define ss(a, b, c) smoothstep(a, b, c)
          uniform float globalBloom;
          varying vec3 vPos;
          ${shader.fragmentShader}
        `.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
            vec3 colNonGlow = vec3(1, 0.75, 0.75); // * pow((sin(vUv.x * 200. * PI2) * 0.5 + 0.5) * 0.6 + 0.4, 3.);
            vec3 colGlow = gl_FragColor.rgb;
            gl_FragColor.rgb = mix(colNonGlow, colGlow, globalBloom);
          `
        )
      }
    })

    mEmitters.defines = {"USE_UV" : ""}
    let emitters = new THREE.Mesh(gEmitters, mEmitters)

    emitters.castShadow = true

    this.add(emitters)
  }
}

class Belt extends THREE.Mesh {
  constructor(gu, mainSize, rBig, rSmall, width, m) {
    let m1 = m.clone()
    m1.color.set('gray')

    let hSize = mainSize
    let path = new THREE.Shape()
      .absarc(0, 0, rBig, Math.PI * 1.5, Math.PI)
      .absarc(-hSize + rSmall, -hSize + rSmall, rSmall, Math.PI, Math.PI * 1.5)
      .lineTo(0, -hSize)

    // const hw = width * 0.5
    const segs = 500

    let pathPts = path.getSpacedPoints(segs).reverse()
    let g = new THREE.BoxGeometry(segs, 0.01, width, segs, 1, 1).translate(segs * 0.5, 0.005, 0)
    let vPrev = new THREE.Vector2(), vCurr = new THREE.Vector2(), vNext = new THREE.Vector2()
    let vCP = new THREE.Vector2(),
        vCN = new THREE.Vector2(),
        v2 = new THREE.Vector2(),
        cntr = new THREE.Vector2()

    let pos = g.attributes.position

    for (let i = 0; i < pos.count; i++) {
      let idxCurr = Math.round(pos.getX(i))
      let idxPrev = idxCurr === 0 ? segs - 1 : idxCurr - 1
      let idxNext = idxCurr === segs ? 1 : idxCurr + 1

      vPrev.copy(pathPts[idxPrev])
      vCurr.copy(pathPts[idxCurr])
      vNext.copy(pathPts[idxNext])
      vCP.subVectors(vPrev, vCurr)
      vCN.subVectors(vNext, vCurr)

      let aCP = vCP.angle()
      let aCN = vCN.angle()
      let hA = Math.PI * 0.5 - (aCP - aCN) * 0.5
      let aspect = Math.cos(hA)

      v2.set(vCurr.x, vCurr.y).multiplyScalar(pos.getY(i) / aspect)
      v2.rotateAround(cntr, hA).add(vCurr)
      pos.setXY(i, v2.x, v2.y)
    }

    g.rotateX(-Math.PI * 0.5)
    g.computeVertexNormals()

    super(g, m1)

    // this.receiveShadow = true
    // this.castShadow = true

    this.uniforms = {
      time: { value: 0 },
      angularSpeed: { value: 0 }
    }

    m1.onBeforeCompile = shader => {
      shader.uniforms.globalBloom = gu.globalBloom
      shader.uniforms.time = this.uniforms.time
      shader.uniforms.beltLength = {value: rBig * Math.PI * 1.5 + rSmall * Math.PI * 0.5 + (hSize - rSmall) *2}
      shader.uniforms.angularSpeed = this.uniforms.angularSpeed
      shader.uniforms.rSmall = {value: rSmall}
      shader.fragmentShader = `
        #define ss(a, b, c) smoothstep(a, b, c)
        uniform float globalBloom;
        uniform float time;
        uniform float beltLength;
        uniform float angularSpeed;
        uniform float rSmall;
        ${shader.fragmentShader}
      `.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>
          float linearSpeed = rSmall * angularSpeed;
          float uvX = mod(vUv.x * beltLength + time * linearSpeed, beltLength / 4.);
          float f = step(0.25, uvX) - step(0.75, uvX);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.875), f);
        `
      ).replace(
        `#include <dithering_fragment>`,
        `#include <dithering_fragment>
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);
        `
      )
    }

    m1.defines = {"USE_UV" : ""}
  }
}

class Roller extends THREE.Mesh {
  constructor(r, h, roundR, m) {
    let m1 = m.clone()
    let profile = new THREE.Path()
      .moveTo(0, 0)
      .lineTo(r - roundR, 0)
      .absarc(r - roundR, roundR, roundR, Math.PI * 1.5, Math.PI * 2)
      .absarc(r - roundR, h - roundR, roundR, 0, Math.PI * 0.5)

      .lineTo(0, h)

    let g = new THREE.LatheGeometry(profile.getPoints(50), 100)

    super(g, m1)

    // this.receiveShadow = true
    // this.castShadow = true
  }
}

class Base extends THREE.Mesh {
  constructor(w, h, R, roundR, m) {
    let angleStep = Math.PI * 0.5
    let wwr = w - R - roundR
    let hwrr = h - roundR * 2
    let shape = new THREE.Shape()
      .absarc( wwr,  wwr, R, 0,             angleStep)
      .absarc(-wwr,  wwr, R, angleStep,     angleStep * 2)
      .absarc(-wwr, -wwr, R, angleStep * 2, angleStep * 3)
      .absarc( wwr, -wwr, R, angleStep * 3, angleStep * 4)

    let g = new THREE.ExtrudeGeometry(
      shape,
      {
        depth: hwrr,
        bevelEnabled: true,
        bevelThickness: roundR,
        bevelSize: roundR,
        bevelSegments: 10,
        curveSegments: 20
      }
    )

    g.translate(0, 0, roundR)
    g.rotateX(-Math.PI * 0.5)

    super(g, m.clone())

    // this.receiveShadow = true
    // this.castShadow = true
  }
}

export class Postprocessing {
  constructor(scene, camera, renderer) {
    const renderScene = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.25,
      0.25,
      0
    )

    let samples = 4
    const target1 = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding,
        samples
      }
    )

    this.bloomComposer = new EffectComposer(renderer, target1)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(renderScene)
    this.bloomComposer.addPass(bloomPass)

    const finalPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
        fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) ); }`,
        defines: {}
      }),
      'baseTexture'
    )

    finalPass.needsSwap = true

    const target2 = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding,
        samples
      }
    )

    this.finalComposer = new EffectComposer(renderer, target2)
    this.finalComposer.addPass(renderScene)
    this.finalComposer.addPass(finalPass)
  }
}

export class Device extends THREE.Object3D {
  constructor(gu) {
    super()

    let m = new THREE.MeshLambertMaterial({color: new THREE.Color().setScalar(0.75)})
    let base = new Base(4, 1, 0.5, 0.05, m)

    const rBig = 3.75
    const rSmall = 0.5

    let lightEmitters = new LightEmitters(gu, 15, rBig, rBig * 3, 1.25, m)
    lightEmitters.position.set(0, 0.25, 0)

    let rollerBig = new Roller(rBig, 0.25, 0.05, m)
    rollerBig.material.color.multiplyScalar(0.75)
    rollerBig.position.set(0, 1, 0)
    rollerBig.add(lightEmitters)

    base.add(rollerBig)

    let rotationIndicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 64, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0.75, 1) })
    )

    rotationIndicator.position.set(0.35, 0.25, 0)

    let rollerSmall = new Roller(rSmall, 0.25, 0.05, m)
    rollerSmall.material.color.multiplyScalar(0.75)
    rollerSmall.position.set(-3.25, 1, 3.25)
    rollerSmall.add(rotationIndicator)

    base.add(rollerSmall)

    let belt = new Belt(gu, rBig, rBig, rSmall, 0.125, m)
    belt.position.set(0, 1.125, 0)
    base.add(belt)

    this.add(base)

    const gearRatio = rBig / rSmall
    const angularSpeed = Math.PI

    belt.uniforms.angularSpeed.value = angularSpeed

    this.update = t => {
      let time = t * angularSpeed
      rollerSmall.rotation.y = time
      rollerBig.rotation.y = time / gearRatio
      belt.uniforms.time.value = t
    }

    [rollerSmall, rollerBig, base].forEach(o => {
      o.userData.nonGlowing = true
    })
  }
}

export class Table extends THREE.Mesh {
  constructor(gu, bgColor) {
    let g = new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI * 0.5)
    let m = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setScalar(0.5).getHex(),
      onBeforeCompile: shader => {
        shader.uniforms.globalBloom = gu.globalBloom
        shader.uniforms.bgColor = { value: new THREE.Color(bgColor) }
        shader.fragmentShader = `
          uniform float globalBloom;
          uniform vec3 bgColor;
          ${shader.fragmentShader}
        `.replace(
          `#include <dithering_fragment>`,
          `#include <dithering_fragment>
          
          float uvDist = distance(vUv, vec2(0.5)) * 2.;
          float f = smoothstep(0.5, 1., uvDist);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, bgColor, f);
          
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), globalBloom);
          `
        )
      }
    })

    m.defines = {"USE_UV" : ""}

    super(g, m)

    // this.receiveShadow = true
  }
}
