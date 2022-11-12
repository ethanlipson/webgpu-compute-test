const computeSrc = /* wgsl */ `
  struct Data {
    nums : array<f32>
  }

  @group(0) @binding(0) var<storage, read> inData : Data;
  @group(0) @binding(1) var<storage, read_write> outData : Data;

  @compute @workgroup_size(1, 1)
  fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    let num = inData.nums[global_id.x];
    outData.nums[global_id.x] = num * 2;
  }
`;

export default computeSrc;
