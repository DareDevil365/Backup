"""
distances.py — Indian city distance matrix and route cost calculator
"""
import re

_DISTANCE_MATRIX = {
    frozenset({"delhi", "jaipur"}): 280,
    frozenset({"delhi", "mumbai"}): 1400,
    frozenset({"delhi", "bangalore"}): 2150,
    frozenset({"delhi", "chennai"}): 2180,
    frozenset({"delhi", "kolkata"}): 1500,
    frozenset({"delhi", "hyderabad"}): 1550,
    frozenset({"delhi", "pune"}): 1450,
    frozenset({"delhi", "ahmedabad"}): 940,
    frozenset({"delhi", "lucknow"}): 555,
    frozenset({"delhi", "chandigarh"}): 245,
    frozenset({"delhi", "agra"}): 230,
    frozenset({"delhi", "surat"}): 1180,
    frozenset({"mumbai", "pune"}): 150,
    frozenset({"mumbai", "bangalore"}): 985,
    frozenset({"mumbai", "chennai"}): 1340,
    frozenset({"mumbai", "hyderabad"}): 710,
    frozenset({"mumbai", "ahmedabad"}): 525,
    frozenset({"mumbai", "kolkata"}): 2030,
    frozenset({"mumbai", "surat"}): 285,
    frozenset({"mumbai", "jaipur"}): 1150,
    frozenset({"bangalore", "chennai"}): 350,
    frozenset({"bangalore", "hyderabad"}): 570,
    frozenset({"bangalore", "kolkata"}): 1870,
    frozenset({"bangalore", "kochi"}): 560,
    frozenset({"chennai", "hyderabad"}): 630,
    frozenset({"chennai", "kolkata"}): 1670,
    frozenset({"kolkata", "patna"}): 600,
    frozenset({"hyderabad", "pune"}): 560,
    frozenset({"ahmedabad", "jaipur"}): 670,
    frozenset({"lucknow", "varanasi"}): 320,
    frozenset({"jaipur", "jodhpur"}): 340,
    frozenset({"jaipur", "udaipur"}): 395,
}

_CITY_ALIASES = {
    "new delhi": "delhi", "bengaluru": "bangalore",
    "calcutta": "kolkata", "bombay": "mumbai",
    "madras": "chennai", "gurugram": "gurgaon",
    "cochin": "kochi", "benaras": "varanasi",
}

def _normalize_city(city: str) -> str:
    c = city.lower().strip()
    return _CITY_ALIASES.get(c, c)

def get_distance(city_a: str, city_b: str):
    a, b = _normalize_city(city_a), _normalize_city(city_b)
    if a == b: return 0
    return _DISTANCE_MATRIX.get(frozenset({a, b}))

def calculate_route_cost(rate_per_km: float, city_a: str, city_b: str):
    dist = get_distance(city_a, city_b)
    if dist is None: return None
    return {"origin": city_a, "destination": city_b, "distance_km": dist,
            "rate_per_km": rate_per_km, "total_cost_inr": round(rate_per_km * dist, 2)}

def extract_cities_from_text(text: str):
    if not text: return None, None
    text_lower = text.lower()
    all_cities = set()
    for pair in _DISTANCE_MATRIX.keys():
        all_cities.update(pair)
    for alias in _CITY_ALIASES:
        all_cities.add(alias)
    sorted_cities = sorted(all_cities, key=len, reverse=True)
    for pattern in [r'from\s+(\w[\w\s]*?)\s+to\s+(\w[\w\s]*?)(?:\s|$|,|\.)',
                    r'(\w[\w\s]*?)\s+to\s+(\w[\w\s]*?)(?:\s+route|\s+shipping|\s|$|,|\.)']:
        m = re.search(pattern, text_lower)
        if m:
            o, d = _normalize_city(m.group(1).strip()), _normalize_city(m.group(2).strip())
            normed = {_normalize_city(c) for c in all_cities}
            if o in normed and d in normed:
                return o, d
    found = []
    for city in sorted_cities:
        if city in text_lower and _normalize_city(city) not in found:
            found.append(_normalize_city(city))
            if len(found) == 2: break
    return (found[0], found[1]) if len(found) == 2 else (None, None)

def enrich_prices_with_route(data, origin: str, dest: str):
    dist = get_distance(origin, dest)
    if dist is None: return data
    def _process(key, value):
        if not isinstance(value, (str, int, float)): return value, None, None
        val_str = str(value).lower()
        m = re.search(r'(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(?:/\s*km|per\s*km)', val_str)
        if not m:
            m = re.search(r'(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|inr)?\s*(?:/\s*km|per\s*km)', val_str)
        if m:
            rate = float(m.group(1))
            cost = round(rate * dist, 2)
            return value, f"{key}_route_cost", f"₹{cost:,.2f} ({dist}km × ₹{rate}/km)"
        return value, None, None
    if isinstance(data, list):
        out = []
        for item in data:
            if isinstance(item, dict):
                new = {}
                for k, v in item.items():
                    new[k] = v
                    _, ck, cv = _process(k, v)
                    if ck: new[ck] = cv
                out.append(new)
            else: out.append(item)
        return out
    elif isinstance(data, dict):
        new = {}
        for k, v in data.items():
            new[k] = v
            _, ck, cv = _process(k, v)
            if ck: new[ck] = cv
        return new
    return data
