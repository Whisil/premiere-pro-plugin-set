import vekl;

struct AsciiParams
{
    float cell_size;
    uint charset;
    float glyph_contrast;
    uint invert;
    uint color_mode;
    uint palette;
    float2 _palette_pad;
    float4 foreground;
    float4 background;
    float mix_amount;
    float3 _pad0;
};

void palette_colors(uint palette, float4 custom_foreground, float4 custom_background, out float3 foreground, out float3 background)
{
    foreground = custom_foreground.rgb;
    background = custom_background.rgb;
    if (palette == 1u) { foreground = float3(1.0, 0.141176, 0.282353); background = float3(0.043137, 0.043137, 0.086275); }
    else if (palette == 2u) { foreground = float3(0.031373, 0.031373, 0.031373); background = float3(0.968627, 0.952941, 0.909804); }
    else if (palette == 3u) { foreground = float3(0.239216, 0.545098, 1.0); background = float3(0.043137, 0.043137, 0.086275); }
    else if (palette == 4u) { foreground = float3(0.780392, 1.0, 0.270588); background = float3(0.070588, 0.129412, 0.043137); }
    else if (palette == 5u) { foreground = float3(0.486275, 1.0, 0.419608); background = float3(0.023529, 0.101961, 0.031373); }
    else if (palette == 6u) { foreground = float3(1.0, 0.690196, 0.0); background = float3(0.101961, 0.050980, 0.0); }
    else if (palette == 7u) { foreground = float3(0.086275, 0.086275, 0.086275); background = float3(0.956863, 0.941176, 0.901961); }
}

bool standard_glyph(uint level, float2 local)
{
    float x = local.x;
    float y = local.y;
    if (level == 0u) return false;
    if (level == 1u) return dot(float2(x, y - 0.28), float2(x, y - 0.28)) <= 0.005625;
    if (level == 2u) return (abs(x) <= 0.06 && abs(y) <= 0.32) || (abs(y) <= 0.06 && abs(x) <= 0.30);
    if (level == 3u) return abs(x - 0.14) <= 0.05 || abs(x + 0.14) <= 0.05 || abs(y - 0.14) <= 0.05 || abs(y + 0.14) <= 0.05;
    float distance = length(local);
    return (distance >= 0.23 && distance <= 0.38) || (x >= 0.02 && x <= 0.28 && y >= -0.02 && y <= 0.08);
}

bool glyph(uint charset, uint level, float2 local, uint2 local_pixel)
{
    if (level == 0u) return false;
    if (charset == 1u) return local.y >= 0.5 - float(level) / 4.0;
    if (charset == 2u)
    {
        float radius = 0.08 + float(level) * 0.09;
        return dot(local, local) <= radius * radius;
    }
    if (charset == 3u)
    {
        if (level <= 2u)
        {
            float distance = length(local);
            return distance >= 0.23 && distance <= 0.38;
        }
        return abs(local.x) <= 0.08 && abs(local.y) <= 0.38;
    }
    if (charset == 4u)
    {
        static const uint bayer[16] = {
            0u, 8u, 2u, 10u,
            12u, 4u, 14u, 6u,
            3u, 11u, 1u, 9u,
            15u, 7u, 13u, 5u
        };
        uint index = (local_pixel.y % 4u) * 4u + (local_pixel.x % 4u);
        return bayer[index] < level * 4u;
    }
    if (charset == 5u)
    {
        uint column = uint(clamp(floor((local.x + 0.5) * 2.0), 0.0, 1.0));
        uint row = uint(clamp(floor((local.y + 0.5) * 4.0), 0.0, 3.0));
        uint dot_index = row * 2u + column;
        float2 center = float2((float(column) + 0.5) / 2.0 - 0.5, (float(row) + 0.5) / 4.0 - 0.5);
        return dot_index < level * 2u && dot(local - center, local - center) <= 0.003025;
    }
    return standard_glyph(level, local);
}

[shader("compute")]
[numthreads(16, 16, 1)]
void ascii(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<AsciiParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy)) return;

    uint2 size = source.Size(0u);
    uint cell = uint(clamp(round(params.cell_size), 4.0, 64.0));
    uint2 local_pixel = thread_id.xy % cell;
    uint2 center = min((thread_id.xy / cell) * cell + cell / 2u, size - 1u);
    float4 sampled = source.Load(center, 0u);
    float luminance = dot(sampled.rgb, float3(0.2126, 0.7152, 0.0722));
    luminance = saturate((luminance - 0.5) * max(params.glyph_contrast, 0.0) + 0.5);
    if (params.invert != 0u) luminance = 1.0 - luminance;
    uint level = uint(round(luminance * 4.0));
    float2 local = (float2(local_pixel) + 0.5) / float(cell) - 0.5;

    float3 foreground;
    float3 background;
    palette_colors(params.palette, params.foreground, params.background, foreground, background);
    if (params.color_mode == 0u) foreground = sampled.rgb;
    else if (params.color_mode == 1u)
    {
        foreground = params.foreground.rgb;
        background = params.background.rgb;
    }
    float3 ascii_color = glyph(params.charset, level, local, local_pixel) ? foreground : background;
    float4 original = source.Load(thread_id.xy, 0u);
    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, ascii_color, saturate(params.mix_amount)), original.a));
}
