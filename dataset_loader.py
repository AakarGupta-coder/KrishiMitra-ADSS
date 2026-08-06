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
        print("Success! NASA POWER Data (First 15 samples):")
        print(df.head(15))
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
        print("Success! Open-Meteo Forecast Data (First 15 samples):")
        print(df.head(15))
        return df
    else:
        print("Failed to load Open-Meteo API")

def load_soilgrids(lat, lon):
    print(f"\n--- Loading SoilGrids Parameters Dataset ({lat}, {lon}) ---")
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?lon={lon}&lat={lat}&property=nitrogen&property=phh2o&depth=0-5cm"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        # Parse the JSON response into a simple dataframe
        parsed = {"lat": lat, "lon": lon}
        for layer in data['properties']['layers']:
            name = layer['name']
            mean_val = layer['depths'][0]['values']['mean']
            parsed[name] = mean_val
        df = pd.DataFrame([parsed])
        print("Success! SoilGrids Parameters Data:")
        print(df.head(15))
        return df
    else:
        print("Failed to load SoilGrids API")

def load_local_csv(name, path):
    print(f"\n--- Loading {name} Dataset ---")
    try:
        df = pd.read_csv(path)
        print(f"Success! {name} Data (First 15 samples):")
        print(df.head(15))
        return df
    except Exception as e:
        print(f"Failed to load {name} - {e}")

if __name__ == "__main__":
    lat, lon = 20.59, 78.96 # India
    nasa_df = load_nasa_power(lat, lon, "20230101", "20230120")
    meteo_df = load_open_meteo(lat, lon)
    soil_df = load_soilgrids(lat, lon)
    
    # Load sample local files
    faostat_df = load_local_csv("FAOSTAT Historical Yield", "data/faostat_sample.csv")
    crop_df = load_local_csv("Kaggle Crop Recommendation", "data/crop_recommendation.csv")
