#!/usr/bin/env python3
"""Guarda o contrato do payload do quiz entre DOIS repos.

quiz.js (aqui) --POST--> QuizLeadIn (~/claud.md/dashboard/backend/main.py) --> JSONL

Pydantic descarta em silencio campo que o modelo nao declara: nada estoura, o dado
some. Foi assim que utm_content ficou de fora ate 2026-08-11, com o anuncio
carimbando {{ad.name}} na URL e ninguem percebendo por semanas.

Uso:  python3 quiz/check-payload-contract.py
      MC_MAIN=/outro/main.py python3 quiz/check-payload-contract.py
"""
import os
import re
import sys

JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "js", "quiz.js")
PY = os.environ.get(
    "MC_MAIN", os.path.expanduser("~/claud.md/dashboard/backend/main.py")
)


def between(text, start, end):
    i = text.index(start)
    return text[i : text.index(end, i)]


def main():
    if not os.path.exists(PY):
        print(f"SKIP  backend nao encontrado em {PY} (defina MC_MAIN)")
        return 0

    js = open(JS).read()
    sent = set(re.findall(r"^\s{4}(\w+)", between(js, "const corpo = {", "};"), re.M))

    py = open(PY).read()
    accepted = set(
        re.findall(
            r"^\s{4}(\w+)\s*:",
            between(py, "class QuizLeadIn(BaseModel):", "@field_validator"),
            re.M,
        )
    )
    # escopar no corpo de quiz_lead: ha outro `rec = {` antes, o de /api/funnel/events
    fn = py[py.index("def quiz_lead(lead: QuizLeadIn):") :]
    stored = set(re.findall(r'"(\w+)":', between(fn, "    rec = {", "    }")))

    problemas = []
    if sent - accepted:
        problemas.append(f"o modelo DESCARTA em silencio: {sorted(sent - accepted)}")
    if (sent & accepted) - stored:
        problemas.append(f"aceito mas NAO gravado: {sorted((sent & accepted) - stored)}")

    if problemas:
        print("FALHOU")
        for p in problemas:
            print("  -", p)
        print(f"\n  enviado: {sorted(sent)}\n  aceito : {sorted(accepted)}\n  gravado: {sorted(stored)}")
        return 1

    print(f"OK  {len(sent)} campos atravessam JS -> modelo -> JSONL")
    return 0


if __name__ == "__main__":
    sys.exit(main())
