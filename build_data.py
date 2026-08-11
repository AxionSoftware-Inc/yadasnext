import json
import glob
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
OUT = Path(__file__).parent
DATA = OUT / "data"
DATA.mkdir(exist_ok=True)

TOPICS = [
    ("vectors", "Vektorlar va vektor algebra", 1, 6),
    ("analytic-geometry", "Analitik geometriya", 7, 17),
    ("sets", "To‘plamlar va munosabatlar", 18, 22),
    ("matrices", "Determinantlar va matritsalar", 23, 27),
    ("complex-polynomials", "Kompleks sonlar va ko‘phadlar", 28, 39),
    ("functions", "Funksiyalar va akslantirishlar", 40, 41),
    ("functional-intro", "Funksional analizga kirish", 42, 43),
    ("series", "Qatorlar", 44, 46),
    ("integrals", "Integrallar va Furye qatorlari", 47, 49),
    ("analysis", "Matematik analiz", 50, 59),
    ("functional-analysis", "Funksional analiz", 60, 65),
    ("complex-analysis", "Kompleks analiz", 66, 71),
    ("multivariable", "Parametrik va ko‘p o‘zgaruvchili funksiyalar", 72, 73),
    ("differential-equations", "Differensial tenglamalar", 74, 80),
]

def clean(value):
    if isinstance(value, str):
        return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value)
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value

def topic_for(page):
    for key, title, start, end in TOPICS:
        if start <= page <= end:
            return key, title
    raise ValueError(page)

questions = []
for source in sorted(ROOT.glob("YaDas_pages_*_verified.json")):
    payload = json.loads(source.read_text(encoding="utf-8"))
    for raw in payload["questions"]:
        q = clean(raw)
        key, title = topic_for(q["page"])
        q["topic"] = key
        q["topic_title"] = title
        q["has_answer"] = isinstance(q.get("correct_answer"), str) and q["correct_answer"] in {"A", "B", "C", "D"}
        questions.append(q)

questions.sort(key=lambda q: q["id"])
topics = []
for key, title, start, end in TOPICS:
    subset = [q for q in questions if q["topic"] == key]
    topics.append({"id": key, "title": title, "pages": f"{start}–{end}", "count": len(subset)})

bundle = {"title": "YaDas test", "source_pages": "1–80", "topics": topics, "questions": questions}
(OUT / "questions-1-80.json").write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "questions.js").write_text("window.YADAS_DATA = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";", encoding="utf-8")
(DATA / "questions-1-80.json").write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{len(questions)} questions, {len(topics)} topics")
for topic in topics:
    print(f"{topic['title']}: {topic['count']}")
