import vekl;

struct HalftoneParams
{
    float cell_size;
    float angle_degrees;
    uint dot_shape;
    float contrast;
    uint palette;
    float3 _palette_pad;
    float4 foreground;
    float4 background;
    uint invert;
    float mix_amount;
    float2 _pad0;
};

void palette_colors(uint palette, float4 custom_foreground, float4 custom_background, out float3 foreground, out float3 background)
{
    foreground = custom_foreground.rgb;
    background = custom_background.rgb;
    if (palette == 1u) { foreground = float3(1.0, 0.141176, 0.282353); background = float3(1.0, 0.964706, 0.847059); }
    else if (palette == 2u) { foreground = float3(0.031373, 0.031373, 0.031373); background = float3(0.968627, 0.952941, 0.909804); }
    else if (palette == 3u) { foreground = float3(1.0, 0.192157, 0.333333); background = float3(1.0, 0.949020, 0.721569); }
    else if (palette == 4u) { foreground = float3(0.780392, 1.0, 0.270588); background = float3(0.070588, 0.129412, 0.043137); }
    else if (palette == 5u) { foreground = float3(0.486275, 1.0, 0.419608); background = float3(0.023529, 0.101961, 0.031373); }
    else if (palette == 6u) { foreground = float3(1.0, 0.690196, 0.0); background = float3(0.101961, 0.050980, 0.0); }
    else if (palette == 7u) { foreground = float3(0.086275, 0.086275, 0.086275); background = float3(0.956863, 0.941176, 0.901961); }
}

[shader("compute")]
[numthreads(16, 16, 1)]
void halftone(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<HalftoneParams> params)
{
    TextureView source_texture = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    float4 source = source_texture.Load(thread_id.xy, 0u);
    float radians = params.angle_degrees * 0.017453292519943295;
    float sine = sin(radians);
    float cosine = cos(radians);
    float2 position = float2(thread_id.xy);
    float2 rotated = float2(
        position.x * cosine - position.y * sine,
        position.x * sine + position.y * cosine);
    float2 local = frac(rotated / max(params.cell_size, 1.0)) - 0.5;
    float luminance = dot(source.rgb, float3(0.2126, 0.7152, 0.0722));
    luminance = saturate((luminance - 0.5) * max(params.contrast, 0.0) + 0.5);
    if (params.invert != 0u)
        luminance = 1.0 - luminance;

    float coverage = 1.0 - luminance;
    bool inside = params.dot_shape == 0u
        ? length(local) <= sqrt(coverage) * 0.5
        : params.dot_shape == 1u
            ? max(abs(local.x), abs(local.y)) <= coverage * 0.5
            : abs(local.y) <= coverage * 0.5;
    float3 foreground;
    float3 background;
    palette_colors(params.palette, params.foreground, params.background, foreground, background);
    float3 halftone_color = inside ? foreground : background;
    output.Store(
        thread_id.xy,
        float4(lerp(source.rgb, halftone_color, saturate(params.mix_amount)), source.a));
}
