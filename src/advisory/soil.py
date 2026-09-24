from typing import Optional


def usda_texture(sand: Optional[float], silt: Optional[float], clay: Optional[float]) -> Optional[str]:
    if sand is None or clay is None:
        return None
    if silt is None:
        silt = max(0.0, 100 - sand - clay)
    total = sand + silt + clay
    if total <= 0:
        return None
    sand, silt, clay = (100 * v / total for v in (sand, silt, clay))

    if silt + 1.5 * clay < 15:
        return "Sand"
    if silt + 1.5 * clay >= 15 and silt + 2 * clay < 30:
        return "Loamy sand"
    if clay >= 40 and silt >= 40:
        return "Silty clay"
    if clay >= 40 and sand <= 45:
        return "Clay"
    if clay >= 35 and sand > 45:
        return "Sandy clay"
    if 27 <= clay < 40 and sand <= 20:
        return "Silty clay loam"
    if 27 <= clay < 40 and 20 < sand <= 45:
        return "Clay loam"
    if 20 <= clay < 35 and silt < 28 and sand > 45:
        return "Sandy clay loam"
    if silt >= 80 and clay < 12:
        return "Silt"
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12):
        return "Silt loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52:
        return "Loam"
    return "Sandy loam"


def ph_class(ph: Optional[float]) -> Optional[dict]:
    if ph is None:
        return None
    classes = [
        (4.5, "Extremely acidic", "critical"),
        (5.5, "Strongly acidic", "critical"),
        (6.0, "Moderately acidic", "caution"),
        (6.5, "Slightly acidic", "ok"),
        (7.3, "Neutral", "ok"),
        (7.8, "Slightly alkaline", "ok"),
        (8.4, "Moderately alkaline", "caution"),
        (9.0, "Strongly alkaline", "critical"),
    ]
    for upper, label, tone in classes:
        if ph <= upper:
            return {"label": label, "tone": tone}
    return {"label": "Very strongly alkaline", "tone": "critical"}


def interpret_soil(soil: dict) -> dict:
    ph = soil.get("phh2o")
    sand, silt, clay = soil.get("sand"), soil.get("silt"), soil.get("clay")
    soc = soil.get("soc")
    cec = soil.get("cec")
    # Prefer the dataset's own USDA texture class (HWSD TEXTURE_USDA); derive from fractions only when it is absent.
    texture = soil.get("texture_class") or usda_texture(sand, silt, clay)
    phc = ph_class(ph)

    constraints, implications, amendments = [], [], []

    if ph is not None:
        if ph < 5.5:
            constraints.append({"severity": "critical", "text": f"pH {ph:.1f} is strongly acidic: phosphorus, calcium and magnesium availability drop and aluminium toxicity becomes likely."})
            amendments.append(f"Liming is indicated at pH {ph:.1f}. The rate must come from a lime-requirement (buffer pH) test.")
            implications.append("Favours acid-tolerant crops (e.g. potato, tea, pineapple); limits most pulses.")
        elif ph < 6.0:
            constraints.append({"severity": "caution", "text": f"pH {ph:.1f} is moderately acidic; sensitive crops (e.g. barley, wheat) may underperform."})
            implications.append("Suits a wide range of crops; pulses and barley may benefit from liming.")
        elif ph <= 7.8:
            implications.append(f"pH {ph:.1f} is in the range most field crops tolerate well.")
        elif ph <= 8.4:
            constraints.append({"severity": "caution", "text": f"pH {ph:.1f} is moderately alkaline: iron, zinc and manganese availability decline."})
            implications.append("Micronutrient (Zn, Fe) deficiency symptoms should be watched in cereals.")
        else:
            constraints.append({"severity": "critical", "text": f"pH {ph:.1f} is strongly alkaline, a possible sign of sodicity."})
            amendments.append("Gypsum may be indicated. Confirm sodicity with an exchangeable-sodium (ESP) test first.")
            implications.append("Restricts crop choice to salt/alkali-tolerant crops (e.g. barley, cotton).")

    if texture in ("Sand", "Loamy sand"):
        constraints.append({"severity": "caution", "text": f"{texture} texture: low water-holding capacity and high nutrient leaching."})
        implications.append("Favour shorter, frequent irrigations and split fertiliser doses.")
    elif texture in ("Clay", "Silty clay", "Sandy clay"):
        constraints.append({"severity": "caution", "text": f"{texture} texture: slow drainage and waterlogging risk in heavy rain."})
        implications.append("Raised beds or furrows help crops sensitive to waterlogging (e.g. pulses, onion).")
    elif texture:
        implications.append(f"{texture} texture offers balanced drainage and water holding.")

    if soc is not None:
        oc_pct = soc / 10
        if oc_pct < 0.5:
            constraints.append({"severity": "caution", "text": f"Organic carbon {oc_pct:.2f} % is low (< 0.5 %)."})
            amendments.append("Low organic carbon: farmyard manure, compost or green manure are indicated.")
        elif oc_pct <= 0.75:
            implications.append(f"Organic carbon {oc_pct:.2f} % is medium (0.5–0.75 %).")
        else:
            implications.append(f"Organic carbon {oc_pct:.2f} % is high (> 0.75 %).")

    if cec is not None and cec < 10:
        constraints.append({"severity": "caution", "text": f"CEC {cec:.1f} cmol(c)/kg is low; the soil holds few nutrients between applications."})

    return {
        "texture": texture,
        "ph_class": phc,
        "organic_carbon_pct": round(soc / 10, 2) if soc is not None else None,
        "constraints": constraints,
        "implications": implications,
        "amendments": amendments,
    }
