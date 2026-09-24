"""One-time build of the local HWSD v2.0 lookup used by src/data/hwsd.py.

Inputs (official FAO/IIASA distribution, https://www.fao.org/land-water/resources/tools/databases/hwsd/en):
  HWSD2_RASTER.zip -> HWSD2.bil/.hdr/.prj  (30 arc-second grid, value = HWSD2_SMU_ID, NODATA 65535)
  HWSD2_DB.zip     -> HWSD2.mdb            (exported to CSV by scripts/hwsd/export_mdb.ps1)

Output:
  data/hwsd/HWSD2.bil + .hdr + .prj      raster, read per pixel through a memory map (never loaded whole)
  data/hwsd/hwsd2.sqlite                 HWSD2_SMU, HWSD2_LAYERS (all components, D1..D7) and domain tables

HWSD v2.0 stores missing values as negative codes (-1..-9); they are written as NULL here.

Usage:
  powershell -File scripts/hwsd/export_mdb.ps1
  python scripts/hwsd/build_hwsd.py
"""
import os
import shutil
import sqlite3
import sys

import pandas as pd

RAW = "data/hwsd/raw"
CSV = os.path.join(RAW, "csv")
OUT = "data/hwsd"
DB = os.path.join(OUT, "hwsd2.sqlite")

LAYER_COLS = {
    "HWSD2_SMU_ID": "smu_id", "SEQUENCE": "sequence", "SHARE": "share", "COVERAGE": "coverage",
    "WRB2": "wrb2", "WRB4": "wrb4", "FAO90": "fao90", "LAYER": "layer", "TOPDEP": "topdep", "BOTDEP": "botdep",
    "COARSE": "coarse", "SAND": "sand", "SILT": "silt", "CLAY": "clay", "TEXTURE_USDA": "texture_usda",
    "BULK": "bulk", "REF_BULK": "ref_bulk", "ORG_CARBON": "org_carbon", "PH_WATER": "ph_water", "TOTAL_N": "total_n",
    "CN_RATIO": "cn_ratio", "CEC_SOIL": "cec_soil", "BSAT": "bsat", "ESP": "esp", "TCARBON_EQ": "tcarbon_eq",
    "GYPSUM": "gypsum", "ELEC_COND": "elec_cond", "ROOT_DEPTH": "root_depth", "DRAINAGE": "drainage", "AWC": "awc_mm",
}
SMU_COLS = {
    "HWSD2_SMU_ID": "smu_id", "COVERAGE": "coverage", "SHARE": "share", "WRB2": "wrb2", "WRB4": "wrb4", "FAO90": "fao90",
    "TEXTURE_USDA": "texture_usda", "BULK_DENSITY": "bulk_density", "DRAINAGE": "drainage", "ROOT_DEPTH": "root_depth",
    "AWC": "awc_mm_m",
}
TEXT_COLS = {"wrb2", "wrb4", "fao90", "layer", "drainage"}
DOMAINS = ["D_TEXTURE_USDA", "D_WRB2", "D_FAO90", "D_ROOT_DEPTH", "D_DRAINAGE", "D_COVERAGE"]


def _clean(df: pd.DataFrame, cols: dict) -> pd.DataFrame:
    df = df[list(cols)].rename(columns=cols)
    for c in df.columns:
        if c not in TEXT_COLS:
            df[c] = pd.to_numeric(df[c], errors="coerce")
            if c != "smu_id":
                df.loc[df[c] < 0, c] = None
    return df


def main():
    for f in ("HWSD2.bil", "HWSD2.hdr", "HWSD2.prj"):
        src, dst = os.path.join(RAW, f), os.path.join(OUT, f)
        if os.path.exists(src):
            shutil.move(src, dst)
        if not os.path.exists(dst):
            sys.exit(f"Missing {dst}: unzip HWSD2_RASTER.zip into {RAW} first.")
    if not os.path.exists(os.path.join(CSV, "HWSD2_LAYERS.csv")):
        sys.exit(f"Missing CSV export in {CSV}: run scripts/hwsd/export_mdb.ps1 first.")

    layers = _clean(pd.read_csv(os.path.join(CSV, "HWSD2_LAYERS.csv"), low_memory=False), LAYER_COLS)
    smu = _clean(pd.read_csv(os.path.join(CSV, "HWSD2_SMU.csv"), low_memory=False), SMU_COLS)

    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    layers.to_sql("layers", con, index=False)
    smu.to_sql("smu", con, index=False)
    for d in DOMAINS:
        pd.read_csv(os.path.join(CSV, f"{d}.csv"), dtype=str).to_sql(d.lower(), con, index=False)
    con.executescript("""
        CREATE INDEX ix_layers_smu ON layers(smu_id, layer);
        CREATE UNIQUE INDEX ix_smu ON smu(smu_id);
        CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    """)
    con.executemany("INSERT INTO meta VALUES (?, ?)", [
        ("dataset", "FAO/IIASA Harmonized World Soil Database"), ("dataset_version", "2.0"),
        ("raster", "HWSD2.bil (HWSD2_RASTER.zip)"), ("database", "HWSD2.mdb (HWSD2_DB.zip)"),
        ("built_at", pd.Timestamp.now(tz="UTC").isoformat()),
    ])
    con.commit()
    con.execute("VACUUM")
    con.close()
    print(f"{DB}: {len(smu)} mapping units, {len(layers)} layer rows")


if __name__ == "__main__":
    main()
