import * as THREE from 'three';

export const materialsOf = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
function releaseMaterials(materials) {
  const textures = new Set(), images = new Set();
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    for (const uniform of Object.values(material.uniforms || {})) if (uniform?.value?.isTexture) textures.add(uniform.value);
  }
  for (const texture of textures) {
    if (texture.image?.close) images.add(texture.image);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const material of materials) material.dispose();
}
export function disposeObjectTree(root) {
  const geometry = new Set(), materials = new Set(), skeletons = new Set();
  root.traverse(node => {
    if (node.geometry) geometry.add(node.geometry);
    if (node.material) for (const mat of materialsOf(node)) materials.add(mat);
    if (node.skeleton) skeletons.add(node.skeleton);
  });
  geometry.forEach(g=>g.dispose()); releaseMaterials(materials);
  skeletons.forEach(s=>s.dispose()); root.removeFromParent();root.clear();
}
export function prepareAnatomyModel(root, system) {
  const oldMaterials = new Set(), oldGeometry = new Set(), meshes = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.geometry.attributes.position?.count || !mesh.geometry.attributes.position.array.every(Number.isFinite) || !mesh.matrixWorld.elements.every(Number.isFinite)
        || Math.abs(mesh.matrixWorld.determinant()) < 1e-12) throw new Error(`Invalid mesh transform: ${mesh.name}`);
    meshes.push(mesh);
  });
  // Validate the entire tree before replacing any shared resources. If a later
  // node is invalid, the caller can dispose the original tree without losing
  // the materials or geometries formerly attached to earlier nodes.
  for (const mesh of meshes) {
    for (const mat of materialsOf(mesh)) oldMaterials.add(mat);
    oldGeometry.add(mesh.geometry);
    // Vertex colors and opacity are teaching state. Own their buffers/materials
    // once at ingestion; preserve source node transforms and every vertex.
    mesh.geometry = mesh.geometry.clone();
    mesh.material = new THREE.MeshStandardMaterial({roughness:.65,metalness:.03,side:THREE.DoubleSide});
    mesh.userData.anatomyName ||= mesh.name;
    mesh.userData.displayLayer = system==='skeletal' ? 'bones' : system==='articular' ? 'ligaments'
      : system==='muscular' ? 'muscles' : system==='nervous' ? 'nerves'
      : /vein|venous/i.test(mesh.userData.anatomyName) ? 'veins' : 'arteries';
    mesh.geometry.computeBoundingBox();
  }
  releaseMaterials(oldMaterials); oldGeometry.forEach(g=>g.dispose());
  return meshes;
}
// Fetch can be cancelled. A decode that finishes after cancellation is disposed
// rather than being attached to the next scene or left as orphan geometry.
export async function loadAnatomyModel(loader, path, signal) {
  const response = await fetch(path,{signal});
  if (!response.ok) throw new Error(`Model unavailable: ${path}`);
  const bytes = await response.arrayBuffer(); signal.throwIfAborted();
  const model = await loader.parseAsync(bytes,path.slice(0,path.lastIndexOf('/')+1));
  if (signal.aborted) { disposeObjectTree(model.scene); signal.throwIfAborted(); }
  return model;
}
