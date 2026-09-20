import vekl;

struct ProgressiveBlurParams
{
    float strength;
    float direction_degrees;
    float start;
    float end;
    float feather;
    uint invert;
    uint quality;
    float mix_amount;
};

float blur_mask(float progress, float start, float end, float feather, uint invert)
{
    start = saturate(start);
    end = saturate(end);
    float denominator = end - start;
    float linear = abs(denominator) < 0.000001
        ? (progress >= start ? 1.0 : 0.0)
        : saturate((progress - start) / denominator);
    float smooth = linear * linear * (3.0 - 2.0 * linear);
    float mask = lerp(linear, smooth, saturate(feather));
    return invert != 0u ? 1.0 - mask : mask;
}

[shader("compute")]
[numthreads(16, 16, 1)]
void progressive_blur(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<ProgressiveBlurParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy)) return;

    uint2 size = source.Size(0u);
    float2 dimensions = max(float2(size), float2(1.0));
    float radians = params.direction_degrees * 0.017453292519943295;
    float2 axis = float2(cos(radians), sin(radians));
    float axis_extent = max(abs(axis.x) + abs(axis.y), 0.000001);
    float2 normalized = (float2(thread_id.xy) + 0.5) / dimensions;
    float progress = saturate(0.5 + dot(normalized - 0.5, axis) / axis_extent);
    float radius = max(params.strength, 0.0) * blur_mask(
        progress,
        params.start,
        params.end,
        params.feather,
        params.invert);
    uint sample_count = params.quality == 0u ? 4u : (params.quality == 1u ? 8u : 16u);
    float3 accumulated = float3(0.0);

    for (uint sample_index = 0u; sample_index < 16u; ++sample_index)
    {
        if (sample_index >= sample_count) break;
        float fraction = (float(sample_index) + 0.5) / float(sample_count);
        float angle = float(sample_index) * 2.3999631;
        float distance = radius * sqrt(fraction);
        int2 coordinate = int2(round(float2(thread_id.xy) + float2(cos(angle), sin(angle)) * distance));
        coordinate = clamp(coordinate, int2(0), int2(size) - int2(1));
        accumulated += source.Load(uint2(coordinate), 0u).rgb;
    }

    float4 original = source.Load(thread_id.xy, 0u);
    float3 blurred = accumulated / float(sample_count);
    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, blurred, saturate(params.mix_amount)), original.a));
}
