import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir,stat } from 'node:fs/promises';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await mkdir('assets/models/ring',{recursive:true});
for(const id of ['storyteller','lamp','general','chignon','bronze-head','sancai-horse','court-lady']){
 const doc=await io.read(`assets/models/${id}.glb`);
 const count=()=>doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
 const before=count();await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,100000/before),error:.001}),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:90}),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const target=`assets/models/ring/${id}.glb`;await io.write(target,doc);console.log(id,before,'→',count(),(await stat(target)).size);
}
