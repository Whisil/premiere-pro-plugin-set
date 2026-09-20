struct RgbShiftParams {
    float2 direction;
    float amount;
    float redScale;
    float greenScale;
    float blueScale;
    float mixAmount;
    uint edgeBehavior;
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<RgbShiftParams> params;

int wrapCoordinate(int coordinate, int size) {
    int value = coordinate % size;
    return value < 0 ? value + size : value;
}

int mirrorCoordinate(int coordinate, int size) {
    if (size <= 1) return 0;
    int period = 2 * (size - 1);
    int value = wrapCoordinate(coordinate, period);
    return value < size ? value : period - value;
}

float4 sampleWithEdge(float2 pixel) {
    int2 point = int2(round(pixel));
    int2 size = int2(params.size);
    if (params.edgeBehavior == 1) {
        point = int2(mirrorCoordinate(point.x, size.x), mirrorCoordinate(point.y, size.y));
    } else if (params.edgeBehavior == 2) {
        point = int2(wrapCoordinate(point.x, size.x), wrapCoordinate(point.y, size.y));
    } else {
        point = clamp(point, int2(0), size - int2(1));
    }
    return inputTexture.Load(int3(point, 0));
}

[shader("compute")]
[numthreads(16, 16, 1)]
void rgbShift(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    float2 offset = params.direction * params.amount;
    float4 source = inputTexture.Load(int3(id.xy, 0));
    float4 shifted = float4(
        sampleWithEdge(float2(id.xy) + offset * params.redScale).r,
        sampleWithEdge(float2(id.xy) + offset * params.greenScale).g,
        sampleWithEdge(float2(id.xy) + offset * params.blueScale).b,
        source.a
    );
    outputTexture[id.xy] = float4(lerp(source.rgb, shifted.rgb, saturate(params.mixAmount)), source.a);
}
