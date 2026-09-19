struct FrameGateParams {
    uint frameIndex;
    uint totalFrames;
    uint headLength;
    uint headMask;
    uint tailLength;
    uint tailMask;
    uint mode;
    uint2 size;
};

Texture2D<float4> inputTexture;
RWTexture2D<float4> outputTexture;
ConstantBuffer<FrameGateParams> params;

bool visible() {
    bool useHead = params.mode == 1 || params.mode == 3;
    bool useTail = params.mode == 2 || params.mode == 3;
    uint headBudget = useHead && useTail ? (params.totalFrames + 1) / 2 : params.totalFrames;
    uint headSpan = useHead ? min(params.headLength, headBudget) : 0;
    uint tailSpan = useTail ? min(params.tailLength, params.totalFrames - headSpan) : 0;
    if (params.frameIndex < headSpan) return (params.headMask & (1u << params.frameIndex)) != 0;
    uint distanceFromEnd = params.totalFrames - 1 - params.frameIndex;
    if (distanceFromEnd < tailSpan) return (params.tailMask & (1u << distanceFromEnd)) != 0;
    return true;
}

[shader("compute")]
[numthreads(16, 16, 1)]
void frameGate(uint3 id : SV_DispatchThreadID) {
    if (any(id.xy >= params.size)) return;
    outputTexture[id.xy] = visible() ? inputTexture.Load(int3(id.xy, 0)) : float4(0);
}

