import vekl;

struct DotMatrixParams
{
    float spacing;
    float dot_size;
    float softness;
    float angle_degrees;
    uint palette;
    float3 _palette_pad;
    float4 foreground;
    float4 background;
    float mix_amount;
    float3 _pad0;
};

void palette_colors(uint palette, float4 custom_foreground, float4 custom_background, out float3 foreground, out float3 background)
{
    foreground = custom_foreground.rgb;
    background = custom_background.rgb;
    if (palette == 1u) { foreground = float3(1.0, 0.141176, 0.282353); background = float3(0.043137, 0.043137, 0.439216); }
    else if (palette == 2u) { foreground = float3(0.968627, 0.952941, 0.909804); background = float3(0.031373, 0.031373, 0.031373); }
    else if (palette == 3u) { foreground = float3(1.0, 0.192157, 0.333333); background = float3(0.031373, 0.031373, 0.419608); }
    else if (palette == 4u) { foreground = float3(0.780392, 1.0, 0.270588); background = float3(0.070588, 0.129412, 0.043137); }
    else if (palette == 5u) { foreground = float3(0.486275, 1.0, 0.419608); background = float3(0.023529, 0.101961, 0.031373); }
    else if (palette == 6u) { foreground = float3(1.0, 0.690196, 0.0); background = float3(0.101961, 0.050980, 0.0); }
    else if (palette == 7u) { foreground = float3(0.086275, 0.086275, 0.086275); background = float3(0.956863, 0.941176, 0.901961); }
}

[shader("compute")]
[numthreads(16, 16, 1)]
void dot_matrix(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<DotMatrixParams> params)
{
    TextureView source_texture = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    float4 source = source_texture.Load(thread_id.xy, 0u);
    float spacing = max(params.spacing, 1.0);
    float radians = params.angle_degrees * 0.017453292519943295;
    float sine = sin(radians);
    float cosine = cos(radians);
    float2 position = float2(thread_id.xy);
    float2 rotated = float2(
        position.x * cosine - position.y * sine,
        position.x * sine + position.y * cosine);
    float2 local = frac(rotated / spacing) - 0.5;
    float distance_to_center = length(local) * spacing;
    float luminance = saturate(dot(source.rgb, float3(0.2126, 0.7152, 0.0722)));
    float radius = min(max(params.dot_size, 0.0), spacing) * 0.5 * sqrt(luminance);
    float coverage = saturate(
        (radius - distance_to_center) / max(params.softness, 0.001) + 0.5);
    float3 foreground;
    float3 background;
    palette_colors(params.palette, params.foreground, params.background, foreground, background);
    float3 stylized = lerp(background, foreground, coverage);
    output.Store(
        thread_id.xy,
        float4(lerp(source.rgb, stylized, saturate(params.mix_amount)), source.a));
}
