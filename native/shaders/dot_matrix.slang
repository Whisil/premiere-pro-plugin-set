struct DotMatrixParams {
    float spacing;
    float dotSize;
    float softness;
    float angleRadians;
    float mixAmount;
    float3 foreground;
    float3 background;
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<DotMatrixParams> params;

[shader("compute")]
[numthreads(16, 16, 1)]
void dotMatrix(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    float4 source = inputTexture.Load(int3(id.xy, 0));
    float spacing = max(params.spacing, 1.0);
    float sine = sin(params.angleRadians);
    float cosine = cos(params.angleRadians);
    float2 position = float2(id.xy);
    float2 rotated = float2(position.x * cosine - position.y * sine,
                            position.x * sine + position.y * cosine);
    float2 local = frac(rotated / spacing) - 0.5;
    float distance = length(local) * spacing;
    float luminance = saturate(dot(source.rgb, float3(0.2126, 0.7152, 0.0722)));
    float radius = min(max(params.dotSize, 0.0), spacing) * 0.5 * sqrt(luminance);
    float coverage = saturate((radius - distance) / max(params.softness, 0.001) + 0.5);
    float3 stylized = lerp(params.background, params.foreground, coverage);
    outputTexture[id.xy] = float4(lerp(source.rgb, stylized, saturate(params.mixAmount)), source.a);
}
