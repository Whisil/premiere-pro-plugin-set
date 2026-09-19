struct HalftoneParams {
    float cellSize;
    float angleRadians;
    float contrast;
    float mixAmount;
    float3 foreground;
    float3 background;
    uint shape;
    uint invert;
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<HalftoneParams> params;

[shader("compute")]
[numthreads(16, 16, 1)]
void halftone(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    float4 source = inputTexture.Load(int3(id.xy, 0));
    float2 position = float2(id.xy);
    float sine = sin(params.angleRadians);
    float cosine = cos(params.angleRadians);
    float2 rotated = float2(position.x * cosine - position.y * sine,
                            position.x * sine + position.y * cosine);
    float2 local = frac(rotated / max(params.cellSize, 1.0)) - 0.5;
    float luminance = dot(source.rgb, float3(0.2126, 0.7152, 0.0722));
    luminance = saturate((luminance - 0.5) * max(params.contrast, 0.0) + 0.5);
    if (params.invert != 0) luminance = 1.0 - luminance;
    float coverage = 1.0 - luminance;
    bool inside = params.shape == 0
        ? length(local) <= sqrt(coverage) * 0.5
        : params.shape == 1
            ? max(abs(local.x), abs(local.y)) <= coverage * 0.5
            : abs(local.y) <= coverage * 0.5;
    float3 result = inside ? params.foreground : params.background;
    outputTexture[id.xy] = float4(lerp(source.rgb, result, saturate(params.mixAmount)), source.a);
}
