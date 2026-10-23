// Conservative adjustments for pale scan textures, shared by all viewers.
export function tuneArtifactMaterials(root,id){
  const pale={general:.76,'court-lady':.76,chignon:.84};
  const factor=pale[id];if(!factor)return;
  const seen=new Set();root.traverse(node=>{if(!node.isMesh)return;for(const material of [node.material].flat()){
    if(seen.has(material))continue;seen.add(material);
    material.color?.multiplyScalar(factor);
    if(material.roughness!==undefined)material.roughness=Math.max(material.roughness,id==='general'?.9:.78);
    material.envMapIntensity=id==='general'?.45:.6;
  }});
}
export const artifactIdByName={'将军俑':'general','唐代坐姿仕女':'court-lady','发髻女子':'chignon'};
