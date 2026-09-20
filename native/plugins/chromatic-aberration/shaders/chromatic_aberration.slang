import vekl;

struct ChromaticAberrationParams
{
    float amount;
    float center_x;
    float center_y;
    float falloff;
    uint edge_behavior;
    float mix_amount;
    float _pad0;
    float _pad1;
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
void chromatic_aberration(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<ChromaticAberrationParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    uint2 size = source.Size(0u);
    float2 dimensions = max(float2(size), float2(1.0));
    float2 normalized = (float2(thread_id.xy) + 0.5) / dimensions;
    float2 radial = normalized - saturate(float2(params.center_x, params.center_y));
    float radial_length = length(radial);
    float normalized_distance = saturate(radial_length * 1.41421356237);
    float displacement = max(params.amount, 0.0) * pow(normalized_distance, clamp(params.falloff, 0.1, 4.0));
    float2 direction = radial / max(radial_length, 0.000001);
    float2 offset = direction * displacement;
    int2 pixel = int2(thread_id.xy);

    float4 original = source.Load(thread_id.xy, 0u);
    float4 red = load_with_edge(source, int2(round(float2(pixel) + offset)), size, params.edge_behavior);
    float4 blue = load_with_edge(source, int2(round(float2(pixel) - offset)), size, params.edge_behavior);
    float3 separated = float3(red.r, original.g, blue.b);
    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, separated, saturate(params.mix_amount)), original.a));
}
