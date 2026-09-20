import vekl;

struct RgbShiftParams
{
    float amount;
    float angle_degrees;
    float red_scale;
    float green_scale;
    float blue_scale;
    float mix_amount;
    uint edge_behavior;
    float _pad0;
};

int wrap_coordinate(int coordinate, int size)
{
    int value = coordinate % size;
    return value < 0 ? value + size : value;
}

int mirror_coordinate(int coordinate, int size)
{
    if (size <= 1)
        return 0;
    int period = 2 * (size - 1);
    int value = wrap_coordinate(coordinate, period);
    return value < size ? value : period - value;
}

int2 map_edge(int2 pixel, uint2 size, uint behavior)
{
    int2 dimensions = int2(size);
    // prgpu normalizes Adobe's 1-based popup values to 0-based indices.
    if (behavior == 1u)
        return int2(
            mirror_coordinate(pixel.x, dimensions.x),
            mirror_coordinate(pixel.y, dimensions.y));
    if (behavior == 2u)
        return int2(
            wrap_coordinate(pixel.x, dimensions.x),
            wrap_coordinate(pixel.y, dimensions.y));
    return clamp(pixel, int2(0, 0), dimensions - int2(1, 1));
}

float4 load_with_edge(TextureView source, int2 pixel, uint2 size, uint behavior)
{
    return source.Load(uint2(map_edge(pixel, size, behavior)), 0u);
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
    float4 red = load_with_edge(source, int2(round(float2(pixel) + offset * params.red_scale)), size, params.edge_behavior);
    float4 green = load_with_edge(source, int2(round(float2(pixel) + offset * params.green_scale)), size, params.edge_behavior);
    float4 blue = load_with_edge(source, int2(round(float2(pixel) + offset * params.blue_scale)), size, params.edge_behavior);
    float3 shifted = float3(red.r, green.g, blue.b);

    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, shifted, saturate(params.mix_amount)), original.a));
}
