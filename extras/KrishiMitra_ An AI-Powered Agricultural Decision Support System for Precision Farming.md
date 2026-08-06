# KrishiMitra: An AI-Powered Agricultural Decision Support System for Precision Farming

## Project Overview

Agriculture is one of the most important sectors of the Indian economy, employing a significant portion of the population and contributing substantially to food security. However, farmers continue to face challenges such as unpredictable weather conditions, inefficient irrigation practices, soil degradation, pest outbreaks, improper fertilizer usage, and fluctuating crop yields. Many farming decisions are still based on traditional knowledge or intuition rather than data-driven insights, resulting in reduced productivity and unnecessary resource consumption.

**KrishiMitra** is an AI-powered Agricultural Decision Support System (ADSS) designed to assist farmers, agricultural experts, and policymakers in making informed farming decisions using real-time environmental data and machine learning. Instead of focusing on a single prediction task, the platform integrates multiple AI models and publicly available datasets to provide comprehensive recommendations throughout the crop lifecycle.

The system collects weather information, soil characteristics, historical crop production data, satellite-based environmental parameters, and rainfall records from official sources. Using these datasets, it predicts crop yield, recommends suitable crops for cultivation, estimates irrigation requirements, identifies potential crop diseases and environmental risks, and provides actionable insights through an interactive dashboard.

Rather than replacing agricultural experts, KrishiMitra serves as an intelligent assistant that combines scientific data, predictive analytics, and explainable artificial intelligence to support sustainable and precision agriculture.

---

## Problem Statement

Farmers make numerous critical decisions during every cropping season, including crop selection, irrigation scheduling, fertilizer application, harvesting time, and disease management. Unfortunately, these decisions are often made without access to integrated environmental data or predictive tools.

Major challenges include:

- Unpredictable rainfall and climate variability.
- Water scarcity due to inefficient irrigation planning.
- Poor crop selection for local soil and weather conditions.
- Lack of early warning systems for crop stress.
- Declining crop productivity.
- Difficulty interpreting large amounts of agricultural and environmental data.

Current agricultural information systems generally provide isolated information such as weather forecasts or soil reports but rarely integrate multiple datasets into a single intelligent platform capable of providing personalized recommendations.

The proposed AI Agricultural Decision Support System addresses this gap by combining data from multiple trusted sources and applying machine learning models to generate actionable insights for farmers.

---

## Objectives

The primary objectives of the project are:

- Predict crop yield before harvest.
- Recommend the most suitable crop based on soil and climatic conditions.
- Estimate irrigation requirements using weather and soil data.
- Identify environmental conditions that increase crop stress.
- Predict drought or water shortage risk.
- Provide explainable AI recommendations that justify every prediction.
- Present all recommendations through an intuitive web dashboard.

---

## Datasets

One of the major strengths of this project is the use of multiple official datasets that can be automatically downloaded using Python scripts during project setup.

### 1. NASA POWER API

Provides satellite-derived environmental information including:

- Temperature
- Solar radiation
- Relative humidity
- Wind speed
- Rainfall
- Evapotranspiration

These parameters are updated regularly and can be fetched using geographic coordinates.

---

### 2. Open-Meteo API

Provides real-time and historical weather information such as:

- Temperature
- Rainfall
- Wind speed
- Humidity
- Weather forecasts

This data helps estimate irrigation needs and crop stress.

---

### 3. SoilGrids

Developed by ISRIC, SoilGrids provides detailed global soil information including:

- Soil pH
- Organic carbon
- Soil texture
- Nitrogen content
- Moisture
- Bulk density

These variables are essential for crop suitability analysis.

---

### 4. FAOSTAT

Maintained by the Food and Agriculture Organization (FAO), FAOSTAT provides historical agricultural statistics such as:

- Crop production
- Yield
- Harvested area
- Food supply
- Fertilizer usage

These data help train crop yield prediction models.

---

### 5. India Open Government Data (optional extension)

Provides district and state-level agricultural datasets, including:

- Crop production
- Rainfall
- Irrigation coverage
- Agricultural land statistics

This allows the system to generate region-specific recommendations for Indian farmers.

---

## System Architecture

The platform follows a modular architecture where different AI components operate independently while sharing a common data pipeline.

Data Acquisition

↓

Data Cleaning & Feature Engineering

↓

Machine Learning Models

↓

Explainable AI

↓

Recommendation Engine

↓

Interactive Dashboard

---

## Module 1: Crop Recommendation System

This module recommends the most suitable crop for cultivation based on environmental conditions.

Inputs include:

- Soil pH
- Nitrogen
- Phosphorus
- Potassium
- Temperature
- Rainfall
- Humidity

The recommendation engine predicts crops that are most likely to achieve high productivity under current conditions.

Possible recommendations include:

- Rice
- Wheat
- Maize
- Cotton
- Pulses
- Sugarcane
- Millets

Machine learning algorithms such as Random Forest, XGBoost, and LightGBM are suitable for this classification task.

---

## Module 2: Crop Yield Prediction

This module estimates expected crop yield before harvesting.

Prediction variables include:

- Historical production
- Weather conditions
- Soil quality
- Rainfall
- Fertilizer usage
- Crop type

The predicted yield helps farmers estimate expected production and plan storage, transportation, and marketing strategies.

Regression algorithms such as XGBoost Regressor and Gradient Boosting are used for this task.

---

## Module 3: Smart Irrigation Recommendation

Efficient water management is critical for sustainable agriculture.

Using weather forecasts, rainfall predictions, soil moisture, and evapotranspiration data, this module estimates:

- Daily irrigation requirement
- Weekly water demand
- Water deficit
- Irrigation schedule

The system also identifies periods when irrigation can be postponed due to expected rainfall, helping conserve water.

---

## Module 4: Environmental Risk Assessment

Climate variability significantly impacts agricultural productivity.

This module continuously monitors environmental parameters to identify potential risks such as:

- Heat stress
- Drought
- Excessive rainfall
- Low soil moisture
- High wind conditions

The system assigns an environmental risk score that alerts farmers before conditions become critical.

---

## Module 5: Explainable Artificial Intelligence

Many AI systems produce predictions without explaining their reasoning.

KrishiMitra incorporates Explainable AI using SHAP to identify the most influential features contributing to every recommendation.

For example:

Recommended Crop: Maize

Confidence: 94%

Key reasons:

- Suitable soil pH
- High nitrogen availability
- Moderate rainfall
- Optimal temperature
- Low drought probability

These explanations improve user confidence and enable farmers to understand why a recommendation has been made.

---

## Module 6: Interactive Agricultural Dashboard

The dashboard serves as the primary interface for users.

It displays:

- Current weather conditions
- Soil characteristics
- Crop recommendation
- Yield prediction
- Irrigation schedule
- Environmental risk score
- Historical weather trends
- Rainfall forecasts
- Crop productivity graphs
- Interactive geographic maps

A color-coded advisory system helps users quickly understand current conditions:

- Green: Safe for cultivation
- Yellow: Monitor environmental conditions
- Orange: Moderate agricultural risk
- Red: Immediate attention required

---

## Machine Learning Pipeline

The AI workflow consists of the following stages:

1. Automatic dataset acquisition using APIs and public repositories.
2. Data cleaning and preprocessing.
3. Feature engineering.
4. Missing value handling.
5. Model training using Random Forest, XGBoost, and LightGBM.
6. Model evaluation using Accuracy, Precision, Recall, F1-score, Mean Absolute Error (MAE), and Root Mean Square Error (RMSE), depending on the prediction task.
7. Explainability using SHAP.
8. Deployment through a Streamlit or Flask-based web application.

The modular design allows new datasets and prediction models to be integrated in future versions.

---

## Technologies Used

- Python
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- LightGBM
- SHAP
- Streamlit or Flask
- Plotly
- Folium for interactive maps
- Requests for API integration
- SQLite or PostgreSQL for data storage

---

## Expected Outcomes

KrishiMitra will provide farmers and agricultural organizations with a unified intelligent platform capable of integrating multiple environmental datasets into meaningful recommendations.

Expected benefits include:

- Improved crop selection based on scientific evidence.
- Increased agricultural productivity through data-driven decisions.
- Reduced water consumption using intelligent irrigation scheduling.
- Early identification of environmental risks.
- Better crop yield estimation before harvest.
- Increased trust through explainable AI.
- Easy-to-use visual dashboards for farmers and agricultural officers.

The modular architecture also allows future enhancements such as satellite image analysis, pest and disease detection using computer vision, market price forecasting, fertilizer optimization, multilingual voice assistants, and IoT sensor integration.

By combining official agricultural datasets, weather information, soil characteristics, predictive analytics, explainable AI, and interactive visualization into a single platform, **KrishiMitra** represents a modern precision agriculture solution that addresses real-world farming challenges. The project demonstrates how artificial intelligence can improve agricultural productivity, promote sustainable resource management, and support informed decision-making for farmers, researchers, and policymakers.