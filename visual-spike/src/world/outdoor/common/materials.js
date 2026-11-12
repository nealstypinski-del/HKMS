import * as THREE from 'three'
import { stoneTexture } from './textures.js'
import { registerNightMaterial } from '../environment/outdoorEnvironment.js'

// Gemeinsam genutzte Materialien (wenige Shader Programme, viele Objekte)
let cached
export function sharedMaterials() {
  if (cached) return cached
  const stone = new THREE.MeshStandardMaterial({ color: '#d8d0c0', map: stoneTexture(), roughness: 0.95 })
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#a89f8f', map: stoneTexture(), roughness: 0.95 })
  const stoneFlat = new THREE.MeshStandardMaterial({ color: '#cfc7b6', roughness: 0.95, flatShading: true, vertexColors: true })
  const wood = new THREE.MeshStandardMaterial({ color: '#b98552', roughness: 0.9, flatShading: true, vertexColors: true })
  const metal = new THREE.MeshStandardMaterial({ color: '#3a4256', roughness: 0.6, metalness: 0.3 })
  const copper = new THREE.MeshStandardMaterial({ color: '#4fbfa5', emissive: '#2fd6c0', emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.3, flatShading: true })
  registerNightMaterial(copper, { base: 0.9, min: 0.25 })
  const lampHead = new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffd58a', emissiveIntensity: 0.1, roughness: 0.4 })
  registerNightMaterial(lampHead, { base: 3.2, min: 0.03 })
  cached = { stone, stoneDark, stoneFlat, wood, metal, copper, lampHead }
  return cached
}
