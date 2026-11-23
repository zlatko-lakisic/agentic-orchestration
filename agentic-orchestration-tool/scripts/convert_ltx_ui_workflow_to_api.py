"""Convert Lightricks LTX UI workflow JSON to ComfyUI API prompt format."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path


def _set_widgets(inputs: dict, wvals: list, keys: list[str]) -> None:
    """Map widgets_values onto API input keys (skips seed-mode control strings)."""
    wi = 0
    for key in keys:
        while wi < len(wvals) and wvals[wi] in ("fixed", "increment", "decrement", "randomize"):
            wi += 1
        if wi >= len(wvals):
            break
        inputs.setdefault(key, wvals[wi])
        wi += 1


def convert_ui_to_api(ui: dict) -> dict[str, dict]:
    nodes = {n["id"]: n for n in ui.get("nodes") or []}
    out: dict[str, dict] = {}
    for nid, n in nodes.items():
        ctype = n.get("type")
        inputs: dict = {}
        for inp in n.get("inputs") or []:
            name = inp.get("name")
            link = inp.get("link")
            if link is None or name is None:
                continue
            for link_row in ui.get("links") or []:
                if link_row[0] == link:
                    inputs[name] = [str(link_row[1]), link_row[2]]
                    break
        wvals = list(n.get("widgets_values") or [])
        if ctype == "RandomNoise" and wvals:
            inputs["noise_seed"] = wvals[0]
        elif ctype == "CLIPTextEncode" and wvals:
            inputs.setdefault("text", wvals[0])
        elif ctype == "LoadImage" and wvals:
            inputs.setdefault("image", wvals[0])
        elif ctype == "EmptyLTXVLatentVideo" and len(wvals) >= 3:
            inputs.setdefault("width", wvals[0])
            inputs.setdefault("height", wvals[1])
            inputs.setdefault("length", wvals[2])
            if len(wvals) > 3:
                inputs.setdefault("batch_size", wvals[3])
        elif ctype == "PrimitiveInt" and wvals:
            inputs.setdefault("value", wvals[0])
        elif ctype == "PrimitiveFloat" and wvals:
            inputs.setdefault("value", wvals[0])
        elif ctype == "PrimitiveBoolean" and wvals:
            inputs.setdefault("value", bool(wvals[0]))
        elif ctype == "PrimitiveString" and wvals:
            inputs.setdefault("value", wvals[0])
        elif ctype == "CheckpointLoaderSimple" and wvals:
            inputs.setdefault("ckpt_name", wvals[0])
        elif ctype == "LoraLoaderModelOnly" and wvals:
            inputs.setdefault("lora_name", wvals[0])
            if len(wvals) > 1:
                inputs.setdefault("strength_model", wvals[1])
        elif ctype == "KSamplerSelect" and wvals:
            inputs.setdefault("sampler_name", wvals[0])
        elif ctype == "SaveVideo" and wvals:
            inputs.setdefault("filename_prefix", wvals[0])
            if len(wvals) > 1:
                inputs.setdefault("format", wvals[1])
            if len(wvals) > 2:
                inputs.setdefault("codec", wvals[2])
        elif ctype == "CreateVideo" and wvals and isinstance(wvals[0], (int, float)):
            inputs.setdefault("fps", wvals[0])
        elif ctype == "LTXVScheduler" and wvals:
            _set_widgets(
                inputs,
                wvals,
                ["steps", "max_shift", "base_shift", "stretch", "terminal"],
            )
        elif ctype == "ManualSigmas" and wvals:
            inputs.setdefault("sigmas", wvals[0] if len(wvals) == 1 else wvals)
        elif ctype == "CFGGuider" and wvals:
            inputs.setdefault("cfg", wvals[0])
        elif ctype == "GuiderParameters" and wvals:
            # modality, cfg, stg, perturb_attn, rescale, modality_scale, skip_step, cross_attn
            _set_widgets(
                inputs,
                wvals,
                [
                    "modality",
                    "cfg",
                    "stg",
                    "perturb_attn",
                    "rescale",
                    "modality_scale",
                    "skip_step",
                    "cross_attn",
                ],
            )
        elif ctype == "MultimodalGuider" and wvals:
            inputs.setdefault("skip_blocks", wvals[0])
        elif ctype == "LTXVConditioning" and wvals:
            inputs.setdefault("frame_rate", wvals[0])
        elif ctype == "LTXVAudioVAELoader" and wvals:
            inputs.setdefault("ckpt_name", wvals[0])
        elif ctype == "LTXVPreprocess" and wvals:
            inputs.setdefault("img_compression", wvals[0])
        elif ctype == "LTXAVTextEncoderLoader" and wvals:
            # UI widgets follow object_info required order: text_encoder, ckpt_name, device
            _set_widgets(inputs, wvals, ["text_encoder", "ckpt_name", "device"])
        elif ctype == "GemmaAPITextEncode" and wvals:
            inputs.setdefault(
                "text", wvals[0] if isinstance(wvals[0], str) else ""
            )
        elif ctype == "ClownSampler_Beta" and wvals:
            # eta, sampler_name, seed, [control], bongmath
            _set_widgets(inputs, wvals, ["eta", "sampler_name", "seed", "bongmath"])
        elif ctype == "LTXVTiledVAEDecode" and wvals:
            _set_widgets(
                inputs,
                wvals,
                [
                    "horizontal_tiles",
                    "vertical_tiles",
                    "overlap",
                    "last_frame_fix",
                    "working_device",
                    "working_dtype",
                ],
            )
        elif ctype == "LTXVEmptyLatentAudio" and wvals:
            # widgets still listed even when frames_number/frame_rate are linked
            _set_widgets(
                inputs, wvals, ["frames_number", "frame_rate", "batch_size"]
            )
        elif ctype == "ResizeImageMaskNode" and wvals:
            # DYNAMICCOMBO API shape: { "<option key>": { <nested params> } }
            # e.g. widgets ["scale longer dimension", 1536, "lanczos"]
            if len(wvals) >= 2 and isinstance(wvals[0], str):
                key = wvals[0]
                nested: dict = {}
                if "longer" in key:
                    nested["longer_size"] = wvals[1]
                elif "shorter" in key:
                    nested["shorter_size"] = wvals[1]
                elif "multiplier" in key:
                    nested["multiplier"] = wvals[1]
                elif key == "scale width":
                    nested["width"] = wvals[1]
                elif key == "scale height":
                    nested["height"] = wvals[1]
                elif key == "scale dimensions" and len(wvals) >= 3:
                    nested["width"] = wvals[1]
                    nested["height"] = wvals[2]
                    if len(wvals) >= 4 and wvals[2] != wvals[-1]:
                        nested["crop"] = wvals[2]
                inputs.setdefault("resize_type", {key: nested})
            elif wvals:
                inputs.setdefault("resize_type", wvals[0])
            if wvals:
                inputs.setdefault("scale_method", wvals[-1])
        elif ctype == "LTXVImgToVideoConditionOnly" and wvals:
            inputs.setdefault("strength", wvals[0])
        node_out: dict = {"class_type": ctype, "inputs": inputs}
        title = n.get("title")
        if title:
            node_out["_meta"] = {"title": title}
        out[str(nid)] = node_out
    return out


def force_vertical(api: dict[str, dict], *, width: int, height: int, frames: int) -> None:
    for node in api.values():
        if node.get("class_type") == "EmptyLTXVLatentVideo":
            node["inputs"]["width"] = width
            node["inputs"]["height"] = height
            node["inputs"]["length"] = frames


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("ui_json", type=Path)
    ap.add_argument("--t2v-out", type=Path, required=True)
    ap.add_argument("--i2v-out", type=Path, required=True)
    ap.add_argument("--width", type=int, default=544)
    ap.add_argument("--height", type=int, default=960)
    ap.add_argument("--frames", type=int, default=121)
    args = ap.parse_args()
    ui = json.loads(args.ui_json.read_text(encoding="utf-8"))
    api = convert_ui_to_api(ui)
    force_vertical(api, width=args.width, height=args.height, frames=args.frames)
    t2v = copy.deepcopy(api)
    i2v = copy.deepcopy(api)
    args.t2v_out.write_text(json.dumps(t2v, indent=2) + "\n", encoding="utf-8")
    args.i2v_out.write_text(json.dumps(i2v, indent=2) + "\n", encoding="utf-8")
    print("t2v_nodes", len(t2v), "->", args.t2v_out)
    print("i2v_nodes", len(i2v), "->", args.i2v_out)
    for label, graph in ("t2v", t2v), ("i2v", i2v):
        for nid, node in graph.items():
            ct = node["class_type"]
            if ct in (
                "CLIPTextEncode",
                "EmptyLTXVLatentVideo",
                "RandomNoise",
                "LoadImage",
                "SaveVideo",
                "PrimitiveInt",
                "ClownSampler_Beta",
                "GuiderParameters",
                "LTXAVTextEncoderLoader",
                "ResizeImageMaskNode",
                "LTXVTiledVAEDecode",
                "LTXVEmptyLatentAudio",
            ):
                print(label, nid, ct, node.get("inputs"))


if __name__ == "__main__":
    main()
