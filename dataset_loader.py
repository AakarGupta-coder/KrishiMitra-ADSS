import pandas as pd
import requests

def load_nasa_power(lat, lon, start, end):
    print(f"\n--- Loading NASA POWER Dataset ({lat}, {lon}) ---")
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M&community=RE&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        df = pd.DataFrame(data['properties']['parameter'])
        df.index = pd.to_datetime(df.index, format='%Y%m%d')
        print("Success! NASA POWER Data (First 5 rows):")
        print(df.head())
        return df
    else:
        print("Failed to load NASA POWER API")

def load_open_meteo(lat, lon):
    print(f"\n--- Loading Open-Meteo Forecast Dataset ({lat}, {lon}) ---")
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,precipitation_sum&timezone=auto"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        df = pd.DataFrame(data['daily'])
        print("Success! Open-Meteo Forecast Data (First 5 rows):")
        print(df.head())
        return df
    else:
        print("Failed to load Open-Meteo API")

def load_local_csv(name, path):
    print(f"\n--- Loading {name} Dataset ---")
    try:
        df = pd.read_csv(path)
        print(f"Success! {name} Data (First 5 rows):")
        print(df.head())
        return df
    except Exception as e:
        print(f"Failed to load {name} - {e}")

if __name__ == "__main__":
    lat, lon = 20.59, 78.96 # India
    nasa_df = load_nasa_power(lat, lon, "20230101", "20230110")
    meteo_df = load_open_meteo(lat, lon)
    
    # Load sample local files (simulated historical and soil grids)
    faostat_df = load_local_csv("FAOSTAT Historical Yield", "faostat_sample.csv")
    soil_df = load_local_csv("SoilGrids Parameters", "soilgrids_sample.csv")
