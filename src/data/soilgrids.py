# ISRIC SoilGrids is no longer a runtime soil source; soil comes from the local HWSD v2.0 dataset (src/data/hwsd.py).
# haversine_distance is re-exported for existing importers.
from .hwsd import haversine_distance  # noqa: F401
