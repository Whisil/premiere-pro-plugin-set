import vekl;

struct BarrelBlurParams
{
    float distortion;
    float blur_radius;
    float center_x;
    float center_y;
    float falloff;
    uint quality;
    uint edge_behavior;
    float mix_amount;
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
void barrel_blur(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<BarrelBlurParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    uint2 size = source.Size(0u);
    float2 dimensions = max(float2(size), float2(1.0));
    float2 center = saturate(float2(params.center_x, params.center_y));
    float2 normalized = (float2(thread_id.xy) + 0.5) / dimensions;
    float2 radial = normalized - center;
    float radial_length = length(radial);
    float2 radial_direction = radial / max(radial_length, 0.000001);
    float radial_amount = saturate(radial_length * 1.41421356237);
    float warp_scale = 1.0 + clamp(params.distortion, -1.0, 1.0) * radial_length * radial_length;
    float2 warped = (center + radial * warp_scale) * dimensions - 0.5;
    float blur = max(params.blur_radius, 0.0) * pow(radial_amount, clamp(params.falloff, 0.1, 4.0));
    uint sample_count = params.quality == 0u ? 4u : (params.quality == 1u ? 8u : 16u);
    float3 accumulated = float3(0.0);

    for (uint sample_index = 0u; sample_index < 16u; ++sample_index)
    {
        if (sample_index >= sample_count)
            break;
        float position = float(sample_index) / float(sample_count - 1u) - 0.5;
        int2 coordinate = int2(round(warped + radial_direction * blur * position));
        accumulated += load_with_edge(source, coordinate, size, params.edge_behavior).rgb;
    }

    float4 original = source.Load(thread_id.xy, 0u);
    float3 blurred = accumulated / float(sample_count);
    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, blurred, saturate(params.mix_amount)), original.a));
}
