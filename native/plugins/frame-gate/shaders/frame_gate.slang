import vekl;

struct FrameGateParams
{
    uint mode;
    float head_length;
    float head_mask;
    float tail_length;
    float tail_mask;
    float clip_start_seconds;
    float sequence_fps;
    float total_frames;
    float timeline_seconds;
    float _pad0;
    float _pad1;
    float _pad2;
};

bool mask_bit(uint mask, uint index)
{
    return (mask & (1u << index)) != 0u;
}

bool frame_is_visible(FrameGateParams params)
{
    uint total = max(1u, uint(round(params.total_frames)));
    float elapsed = max(0.0, params.timeline_seconds - params.clip_start_seconds);
    uint frame_index = min(total - 1u, uint(round(elapsed * params.sequence_fps)));
    uint head_length = min(12u, uint(round(params.head_length)));
    uint tail_length = min(12u, uint(round(params.tail_length)));
    uint head_mask = uint(round(params.head_mask));
    uint tail_mask = uint(round(params.tail_mask));

    bool use_head = params.mode == 1u || params.mode == 3u;
    bool use_tail = params.mode == 2u || params.mode == 3u;
    uint head_budget = use_head && use_tail ? (total + 1u) / 2u : total;
    uint head_span = use_head ? min(head_length, head_budget) : 0u;
    uint tail_span = use_tail ? min(tail_length, total - head_span) : 0u;

    if (frame_index < head_span)
        return mask_bit(head_mask, frame_index);

    uint distance_from_end = total - 1u - frame_index;
    if (distance_from_end < tail_span)
        return mask_bit(tail_mask, distance_from_end);

    return true;
}

[shader("compute")]
[numthreads(16, 16, 1)]
void frame_gate(
    uint3 thread_id : SV_DispatchThreadID,
    StructuredBuffer<uint> outgoing,
    StructuredBuffer<uint> incoming,
    RWStructuredBuffer<uint> dst,
    ConstantBuffer<FrameParams> frame,
    ConstantBuffer<FrameGateParams> params)
{
    TextureView source = TextureView(incoming, frame.inDesc);
    RWTextureView output = RWTextureView(dst, frame.dstDesc);
    if (!output.Contains(thread_id.xy))
        return;

    float4 pixel = frame_is_visible(params)
        ? source.Load(thread_id.xy, 0u)
        : float4(0.0, 0.0, 0.0, 0.0);
    output.Store(thread_id.xy, pixel);
}
