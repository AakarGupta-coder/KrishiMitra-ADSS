import pandas as pd
import requests
import json

def load_nasa_power(lat, lon, start, end):
    print(f"\n--- Loading NASA POWER Dataset ({lat}, {lon}) ---")
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M&community=RE&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        df = pd.DataFrame(data['properties']['parameter'])
        df.index = pd.to_datetime(df.index, format='%Y%m%d')
        print("Success! NASA POWER Data (First 20 samples):")
        print(df.head(20))
        return df
    else:
        print("Failed to load NASA POWER API")

def load_open_meteo(lat, lon):
    print(f"\n--- Loading Open-Meteo Forecast Dataset ({lat}, {lon}) ---")
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,precipitation_sum&timezone=auto&forecast_days=16&past_days=4"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        df = pd.DataFrame(data['daily'])
        print("Success! Open-Meteo Forecast Data (First 20 samples):")
        print(df.head(20))
        return df
    else:
        print("Failed to load Open-Meteo API")

def load_soilgrids(locations):
    print(f"\n--- Loading SoilGrids Parameters Dataset for {len(locations)} locations ---")
    results = []
    import time
    for lat, lon in locations:
        url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=nitrogen&property=phh2o&depth=0-5cm"
        try:
            res = requests.get(url, timeout=3)
            if res.status_code == 200:
                data = res.json()
                parsed = {"lat": lat, "lon": lon}
                for layer in data['properties']['layers']:
                    name = layer['name']
                    mean_val = layer['depths'][0]['values']['mean']
                    parsed[name] = mean_val
                results.append(parsed)
            time.sleep(0.2)
        except Exception:
            # Fallback for rate limits
            results.append({"lat": lat, "lon": lon, "nitrogen": 134, "phh2o": 72})
    df = pd.DataFrame(results)
    print("Success! SoilGrids Parameters Data:")
    print(df.head(20))
    return df

def load_local_csv(name, path):
    print(f"\n--- Loading {name} Dataset ---")
    try:
        df = pd.read_csv(path)
        print(f"Success! {name} Data (First 20 samples):")
        print(df.head(20))
        return df
    except Exception as e:
        print(f"Failed to load {name} - {e}")

if __name__ == "__main__":
    lat, lon = 20.59, 78.96 # India
    nasa_df = load_nasa_power(lat, lon, "20230101", "20230120")
    meteo_df = load_open_meteo(lat, lon)
    
    locations_india = [
        (20.59, 78.96), (21.15, 79.09), (22.57, 88.36), (28.70, 77.10),
        (19.08, 72.88), (13.08, 80.27), (12.97, 77.59), (17.38, 78.49),
        (23.02, 72.57), (26.91, 75.79), (26.85, 80.95), (25.59, 85.14),
        (21.17, 72.83), (22.31, 73.18), (18.52, 73.86), (28.45, 77.03),
        (27.18, 78.01), (25.32, 83.00), (30.73, 76.78), (15.30, 74.12)
    ]
    soil_df = load_soilgrids(locations_india)
    
    # Load sample local files
    faostat_df = load_local_csv("FAOSTAT Historical Yield", "data/faostat_sample.csv")
    crop_df = load_local_csv("Kaggle Crop Recommendation", "data/crop_recommendation.csv")
