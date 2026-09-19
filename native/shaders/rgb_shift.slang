struct RgbShiftParams {
    float2 direction;
    float amount;
    float redScale;
    float greenScale;
    float blueScale;
    float mixAmount;
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<RgbShiftParams> params;

float4 sampleClamped(float2 pixel) {
    int2 point = int2(round(clamp(pixel, float2(0), float2(params.size - 1))));
    return inputTexture.Load(int3(point, 0));
}

[shader("compute")]
[numthreads(16, 16, 1)]
void rgbShift(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    float2 offset = params.direction * params.amount;
    float4 source = inputTexture.Load(int3(id.xy, 0));
    float4 shifted = float4(
        sampleClamped(float2(id.xy) + offset * params.redScale).r,
        sampleClamped(float2(id.xy) + offset * params.greenScale).g,
        sampleClamped(float2(id.xy) + offset * params.blueScale).b,
        source.a
    );
    outputTexture[id.xy] = float4(lerp(source.rgb, shifted.rgb, saturate(params.mixAmount)), source.a);
}

