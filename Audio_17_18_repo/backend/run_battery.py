"""Run field battery and print results."""
import urllib.request, json, sys

print("POST /api/v1/ops/self-test — running real models on 9 field clips…")
req = urllib.request.Request(
    "http://127.0.0.1:8080/api/v1/ops/self-test",
    data=b"",
    method="POST",
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=300) as resp:
    r = json.loads(resp.read())

print(f"\n{'='*60}")
print(f"  FIELD BATTERY — {r['count']} clips processed")
print(f"{'='*60}")

SEV_ORDER = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵"}

for res in r["results"]:
    top = res["top_events"][0] if res["top_events"] else {}
    alerts = res.get("alerts") or []
    drone_flag = "⚠️  DRONE THREAT" if res["drone_threat"] else "clear"
    print(f"\n  [{res['sample']}]")
    print(f"    Top event  : {top.get('label','?'):40s} {round(top.get('score',0),3):.3f}  [{top.get('category','?')}]")
    print(f"    Drone      : {drone_flag}  score={res['drone_score']:.3f}")
    if alerts:
        for a in alerts:
            print(f"    Alert      : {a}")
    else:
        print(f"    Alert      : (none)")
    if res.get("transcript"):
        print(f"    Transcript : {res['transcript'][:80]}")
    print(f"    Models     : {', '.join(res['models_used'])}")

print(f"\n{'='*60}")
print("  MODEL STATUS")
print(f"{'='*60}")
m = r["models"]
for k in ("yamnet", "panns_cnn14", "whisper", "drone_physics", "dsp_specialists"):
    v = m.get(k, {})
    if isinstance(v, dict):
        status = "✅ ready" if v.get("ready") else f"❌ {v.get('error','?')}"
        extra = f"  (size={v['size']})" if k == "whisper" and v.get("size") else ""
        print(f"  {k:22s}: {status}{extra}")
print(f"  {'OPERATIONAL':22s}: {'✅ YES' if m.get('operational') else '❌ NO'}")
print()
