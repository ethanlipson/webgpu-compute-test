import { useEffect, useRef } from 'react';
import computeSrc from '../src/shaders/compute';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const entry = navigator.gpu;
      if (!entry) throw new Error('WebGPU not supported');

      const adapter = await entry.requestAdapter();
      if (!adapter) throw new Error('Adapter is null');

      const device = await adapter.requestDevice();

      const inBuffer = device.createBuffer({
        mappedAtCreation: true,
        size: 16,
        usage: GPUBufferUsage.STORAGE,
      });
      const arrayBuffer = inBuffer.getMappedRange();
      new Float32Array(arrayBuffer).set([0, 1, 2, 3]);
      inBuffer.unmap();

      const outBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: 'read-only-storage',
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ];
      const bindGroupLayout = device.createBindGroupLayout({
        entries: bindGroupLayoutEntries,
      });

      const bindGroupEntries: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: inBuffer } },
        { binding: 1, resource: { buffer: outBuffer } },
      ];
      const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: bindGroupEntries,
      });

      const shaderModule = device.createShaderModule({ code: computeSrc });
      const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(4, 1);
      passEncoder.end();

      const gpuReadBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      commandEncoder.copyBufferToBuffer(outBuffer, 0, gpuReadBuffer, 0, 16);

      const gpuCommands = commandEncoder.finish();
      device.queue.submit([gpuCommands]);

      await gpuReadBuffer.mapAsync(GPUMapMode.READ);
      const readBuffer = gpuReadBuffer.getMappedRange();
      console.log(new Float32Array(readBuffer));
    };

    run();
  }, []);

  return <canvas ref={canvasRef} />;
}
