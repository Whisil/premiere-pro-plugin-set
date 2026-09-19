struct DitherParams {
    uint scale;
    uint matrixSize;
    float threshold;
    float strength;
    float mixAmount;
    uint colorCount;
    float3 colors[8];
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<DitherParams> params;

float bayer4(uint2 point) {
    static const float values[16] = {
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
    };
    return (values[(point.y & 3) * 4 + (point.x & 3)] + 0.5) / 16.0;
}

[shader("compute")]
[numthreads(16, 16, 1)]
void dither(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    float4 source = inputTexture.Load(int3(id.xy, 0));
    float noise = bayer4(id.xy / max(params.scale, 1)) - 0.5;
    float3 adjusted = saturate(source.rgb + noise * saturate(params.strength) * 0.35 + params.threshold * 0.25);
    float bestDistance = 1e10;
    float3 best = source.rgb;
    for (uint index = 0; index < min(params.colorCount, 8); index++) {
        float3 difference = adjusted - params.colors[index];
        float distance = dot(difference, difference);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = params.colors[index];
        }
    }
    outputTexture[id.xy] = float4(lerp(source.rgb, best, saturate(params.mixAmount)), source.a);
}
