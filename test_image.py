import requests

key = "d2c842824c96dcad265cc760a8e412d54a29ecac6d36c00a45de6ba68605c5d6"

print("=== TEST SerpAPI - Google Images ===")
url = "https://serpapi.com/search.json"
params = {
    "engine": "google_images",
    "q": "Coca Cola 3L producto",
    "safe": "active",
    "api_key": key,
    "num": 3,
    "hl": "es",
    "gl": "cl"   # Chile
}
r = requests.get(url, params=params, timeout=15)
print(f"Status: {r.status_code}")
data = r.json()

if 'error' in data:
    print(f"ERROR: {data['error']}")
elif 'images_results' in data:
    results = data['images_results']
    print(f"Results: {len(results)}")
    for i, img in enumerate(results[:3]):
        print(f"  [{i+1}] {img.get('original', 'no url')[:100]}")
        print(f"       Source: {img.get('source', '')}")
else:
    print(f"Keys: {list(data.keys())}")
