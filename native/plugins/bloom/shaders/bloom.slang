import vekl;

struct BloomParams
{
    float threshold;
    float knee;
    float radius;
    float intensity;
    float4 tint;
    uint quality;
    float mix_amount;
    float2 _pad0;
};

[shader("compute")]
[numthreads(16, 16, 1)]
void bloom(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<BloomParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy)) return;

    uint2 size = source.Size(0u);
    uint sample_count = params.quality == 0u ? 4u : (params.quality == 1u ? 8u : 16u);
    float3 accumulated = float3(0.0);
    float weight_sum = 0.0;
    float knee = max(params.knee, 0.001);

    for (uint sample_index = 0u; sample_index < 16u; ++sample_index)
    {
        if (sample_index >= sample_count) break;
        float fraction = (float(sample_index) + 0.5) / float(sample_count);
        float angle = float(sample_index) * 2.3999631;
        float distance = max(params.radius, 0.0) * sqrt(fraction);
        int2 coordinate = int2(round(float2(thread_id.xy) + float2(cos(angle), sin(angle)) * distance));
        coordinate = clamp(coordinate, int2(0), int2(size) - int2(1));
        float3 sampled = source.Load(uint2(coordinate), 0u).rgb;
        float luminance = dot(sampled, float3(0.2126, 0.7152, 0.0722));
        float weight = smoothstep(params.threshold - knee, params.threshold + knee, luminance);
        accumulated += sampled * weight;
        weight_sum += weight;
    }

    float3 glow = weight_sum > 0.0 ? accumulated / weight_sum : float3(0.0);
    float4 original = source.Load(thread_id.xy, 0u);
    float3 bloomed = original.rgb + glow * saturate(params.tint.rgb) * max(params.intensity, 0.0);
    output.Store(thread_id.xy, float4(lerp(original.rgb, bloomed, saturate(params.mix_amount)), original.a));
}
