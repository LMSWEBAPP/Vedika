import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { 
  weld, 
  simplify, 
  prune, 
  dedup, 
  resample, 
  textureCompress,
  reorder,
  quantize
} from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimize() {
  console.log('🚀 Running ultra-compression pass on 3D avatar...');

  const inputPath = path.resolve('public/Physics-avatar.glb');
  const outputPath = path.resolve('public/Physics-avatar-opt.glb');

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.read(inputPath);

  await document.transform(
    weld({ tolerance: 0.0001 }),
    dedup(),
    resample(),
    prune(),

    // Simplify from 1.4M to ~45k vertices (massive bandwidth reduction)
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.04,
      error: 0.002
    }),

    // Compress textures to crisp WebP
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [1024, 1024],
      quality: 80
    }),

    quantize({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12
    }),

    reorder({
      encoder: MeshoptEncoder
    })
  );

  const optimizedBuffer = await io.writeBinary(document);
  fs.writeFileSync(outputPath, optimizedBuffer);

  const initialSize = (fs.statSync(inputPath).size / (1024 * 1024)).toFixed(2);
  const finalSize = (optimizedBuffer.length / (1024 * 1024)).toFixed(2);
  const reduction = (((fs.statSync(inputPath).size - optimizedBuffer.length) / fs.statSync(inputPath).size) * 100).toFixed(1);

  console.log(`🎉 ULTRA COMPLETE! Final size: ${finalSize} MB (${reduction}% reduction from ${initialSize} MB)!`);
}

optimize().catch(console.error);
