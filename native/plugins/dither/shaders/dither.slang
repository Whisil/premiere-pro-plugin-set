import vekl;

struct DitherParams
{
    uint mode;
    float scale;
    float color_count;
    uint palette;
    float threshold;
    float strength;
    float2 _pad0;
    float4 color1;
    float4 color2;
    float4 color3;
    float4 color4;
    float4 color5;
    float4 color6;
    float4 color7;
    float4 color8;
    float mix_amount;
    float3 _pad1;
};

float3 custom_color(DitherParams params, uint index)
{
    if (index == 0u) return params.color1.rgb;
    if (index == 1u) return params.color2.rgb;
    if (index == 2u) return params.color3.rgb;
    if (index == 3u) return params.color4.rgb;
    if (index == 4u) return params.color5.rgb;
    if (index == 5u) return params.color6.rgb;
    if (index == 6u) return params.color7.rgb;
    return params.color8.rgb;
}

float3 palette_color(DitherParams params, uint index)
{
    if (params.palette == 0u) return custom_color(params, index);
    if (params.palette == 1u) {
        if (index == 0u) return float3(1.0, 0.141176, 0.282353);
        if (index == 1u) return float3(0.043137, 0.043137, 0.439216);
        if (index == 2u) return float3(1.0, 0.964706, 0.847059);
        if (index == 3u) return float3(0.223529, 0.890196, 0.615686);
        if (index == 4u) return float3(1.0, 0.8, 0.156863);
        if (index == 5u) return float3(0.949020, 0.160784, 0.831373);
        if (index == 6u) return float3(0.031373, 0.031373, 0.031373);
        return float3(0.239216, 0.545098, 1.0);
    }
    if (params.palette == 2u) {
        if (index % 4u == 0u) return float3(0.968627, 0.952941, 0.909804);
        if (index % 4u == 1u) return float3(0.031373, 0.031373, 0.031373);
        if (index % 4u == 2u) return float3(0.470588, 0.470588, 0.470588);
        return float3(0.847059, 0.827451, 0.784314);
    }
    if (params.palette == 3u) {
        if (index % 5u == 0u) return float3(1.0, 0.192157, 0.333333);
        if (index % 5u == 1u) return float3(0.031373, 0.031373, 0.419608);
        if (index % 5u == 2u) return float3(1.0, 0.949020, 0.721569);
        if (index % 5u == 3u) return float3(0.231373, 0.949020, 0.627451);
        return float3(0.239216, 0.545098, 1.0);
    }
    if (params.palette == 4u) return index % 2u == 0u ? float3(0.780392, 1.0, 0.270588) : float3(0.070588, 0.129412, 0.043137);
    if (params.palette == 5u) return index % 2u == 0u ? float3(0.486275, 1.0, 0.419608) : float3(0.023529, 0.101961, 0.031373);
    if (params.palette == 6u) return index % 2u == 0u ? float3(1.0, 0.690196, 0.0) : float3(0.101961, 0.050980, 0.0);
    return index % 2u == 0u ? float3(0.086275, 0.086275, 0.086275) : float3(0.956863, 0.941176, 0.901961);
}

float bayer_threshold(uint2 point, uint size)
{
    uint x = point.x;
    uint y = point.y;
    uint value = 0u;
    for (uint bit = size / 2u; bit > 0u; bit >>= 1u) {
        value = value * 4u + (((x & 1u) ^ (y & 1u)) * 2u + (y & 1u));
        x >>= 1u;
        y >>= 1u;
    }
    return (float(value) + 0.5) / float(size * size);
}

float blue_noise(uint2 point)
{
    uint value = point.x * 0x9E3779B9u ^ point.y * 0x85EBCA6Bu;
    value ^= value >> 16u;
    value *= 0x7FEB352Du;
    value ^= value >> 15u;
    return float(value & 0xffffu) / 65536.0;
}

float srgb_linear(float value)
{
    return value <= 0.04045 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4);
}

float3 oklab(float3 color)
{
    float3 linear = float3(srgb_linear(color.r), srgb_linear(color.g), srgb_linear(color.b));
    float l = 0.41222146 * linear.r + 0.53633255 * linear.g + 0.051445995 * linear.b;
    float m = 0.2119035 * linear.r + 0.6806995 * linear.g + 0.10739696 * linear.b;
    float s = 0.08830246 * linear.r + 0.28171885 * linear.g + 0.6299787 * linear.b;
    float3 roots = pow(max(float3(l, m, s), 0.0), 1.0 / 3.0);
    return float3(
        0.21045426 * roots.x + 0.7936178 * roots.y - 0.004072047 * roots.z,
        1.9779985 * roots.x - 2.4285922 * roots.y + 0.4505937 * roots.z,
        0.025904037 * roots.x + 0.78277177 * roots.y - 0.80867577 * roots.z);
}

[shader("compute")]
[numthreads(16, 16, 1)]
void dither(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<DitherParams> params)
{
    TextureView source_texture = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy)) return;
    float4 source = source_texture.Load(thread_id.xy, 0u);
    uint scale = max(1u, uint(round(params.scale)));
    uint2 point = thread_id.xy / scale;
    float noise = params.mode == 3u
        ? blue_noise(point)
        : bayer_threshold(point, params.mode == 0u ? 2u : params.mode == 1u ? 4u : 8u);
    float offset = (noise - 0.5) * saturate(params.strength) * 0.35 + clamp(params.threshold, -1.0, 1.0) * 0.25;
    float3 adjusted = saturate(source.rgb + offset);
    float3 target = oklab(adjusted);
    uint count = clamp(uint(round(params.color_count)), 2u, 8u);
    float best_distance = 1e20;
    float3 nearest = source.rgb;
    for (uint index = 0u; index < count; ++index) {
        float3 candidate = palette_color(params, index);
        float3 difference = target - oklab(candidate);
        float distance = dot(difference, difference);
        if (distance < best_distance) { best_distance = distance; nearest = candidate; }
    }
    output.Store(thread_id.xy, float4(lerp(source.rgb, nearest, saturate(params.mix_amount)), source.a));
}
