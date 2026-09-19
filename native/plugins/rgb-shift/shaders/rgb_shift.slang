import vekl;

struct RgbShiftParams
{
    float amount;
    float angle_degrees;
    float red_scale;
    float green_scale;
    float blue_scale;
    float mix_amount;
    float _pad0;
    float _pad1;
};

float4 load_clamped(TextureView source, int2 pixel, uint2 size)
{
    int2 last = int2(size) - int2(1, 1);
    return source.Load(uint2(clamp(pixel, int2(0, 0), last)), 0u);
}

[shader("compute")]
[numthreads(16, 16, 1)]
void rgb_shift(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<RgbShiftParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    uint2 size = source.Size(0u);
    float radians = params.angle_degrees * 0.017453292519943295;
    float2 direction = float2(cos(radians), sin(radians));
    float2 offset = direction * params.amount;
    int2 pixel = int2(thread_id.xy);

    float4 original = source.Load(thread_id.xy, 0u);
    float4 red = load_clamped(source, int2(round(float2(pixel) + offset * params.red_scale)), size);
    float4 green = load_clamped(source, int2(round(float2(pixel) + offset * params.green_scale)), size);
    float4 blue = load_clamped(source, int2(round(float2(pixel) + offset * params.blue_scale)), size);
    float3 shifted = float3(red.r, green.g, blue.b);

    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, shifted, saturate(params.mix_amount)), original.a));
}
