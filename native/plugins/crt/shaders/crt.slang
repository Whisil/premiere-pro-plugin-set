import vekl;

struct CrtParams
{
    float curvature;
    float scanlines;
    float phosphor_mask;
    float convergence;
    float noise_amount;
    float flicker;
    float vignette;
    float bloom;
    float mix_amount;
    float3 _pad0;
};

float signed_noise(uint2 pixel, uint frame_index)
{
    uint value = pixel.x * 1973u + pixel.y * 9277u + frame_index * 26699u + 911u;
    value ^= value << 13u;
    value ^= value >> 17u;
    value ^= value << 5u;
    return float(value) / 4294967295.0 - 0.5;
}

float3 load_rgb(TextureView source, int2 coordinate, uint2 size)
{
    return source.Load(uint2(clamp(coordinate, int2(0), int2(size) - int2(1))), 0u).rgb;
}

[shader("compute")]
[numthreads(16, 16, 1)]
void crt(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<CrtParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy)) return;

    uint2 size = source.Size(0u);
    float2 dimensions = max(float2(size), float2(1.0));
    float2 centered = ((float2(thread_id.xy) + 0.5) / dimensions) * 2.0 - 1.0;
    float radius_squared = dot(centered, centered);
    float warp = 1.0 + clamp(params.curvature, 0.0, 0.5) * radius_squared;
    float2 warped = (centered * warp * 0.5 + 0.5) * dimensions - 0.5;
    bool inside = all(warped >= 0.0) && all(warped <= dimensions - 1.0);
    int2 coordinate = int2(round(warped));
    int convergence = int(round(clamp(params.convergence, 0.0, 12.0)));
    float3 color = float3(0.0);

    if (inside)
    {
        color.r = load_rgb(source, coordinate + int2(convergence, 0), size).r;
        color.g = load_rgb(source, coordinate, size).g;
        color.b = load_rgb(source, coordinate - int2(convergence, 0), size).b;

        float3 glow = float3(0.0);
        glow += max(load_rgb(source, coordinate + int2(-2, 0), size) - 0.55, 0.0);
        glow += max(load_rgb(source, coordinate + int2(2, 0), size) - 0.55, 0.0);
        glow += max(load_rgb(source, coordinate + int2(0, -2), size) - 0.55, 0.0);
        glow += max(load_rgb(source, coordinate + int2(0, 2), size) - 0.55, 0.0);
        color += glow * 0.25 * clamp(params.bloom, 0.0, 2.0);
    }

    float scanline = 1.0 - saturate(params.scanlines) * 0.32 * (0.5 + 0.5 * cos(3.14159265 * float(thread_id.y)));
    float mask_amount = saturate(params.phosphor_mask) * 0.28;
    uint triad = thread_id.x % 3u;
    color.r *= scanline * (triad == 0u ? 1.0 : 1.0 - mask_amount);
    color.g *= scanline * (triad == 1u ? 1.0 : 1.0 - mask_amount);
    color.b *= scanline * (triad == 2u ? 1.0 : 1.0 - mask_amount);

    uint frame_index = uint(floor(max(frame.time, 0.0) * 30.0));
    float grain = signed_noise(thread_id.xy, frame_index) * saturate(params.noise_amount) * 0.14;
    float flicker = 1.0 + saturate(params.flicker) * 0.08 * sin(frame.time * 43.0);
    float edge = max(abs(centered.x), abs(centered.y));
    float vignette = 1.0 - saturate(params.vignette) * smoothstep(0.35, 1.0, edge) * 0.8;
    color = (color + grain) * flicker * vignette;

    float4 original = source.Load(thread_id.xy, 0u);
    output.Store(
        thread_id.xy,
        float4(lerp(original.rgb, color, saturate(params.mix_amount)), original.a));
}
